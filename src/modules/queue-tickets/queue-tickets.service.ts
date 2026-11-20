import {
  BadRequestException, ConflictException, ForbiddenException,
  Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { QueueTicket, QueueTicketStatus } from './entities/queue-ticket.entity.js';
import { WalkInPatientDto } from '../patients/dto/create-walk-in-patient.dto.js';
import { DailyQueueDto } from './dto/daily-queue.dto.js';
import { UpdateQueueStatusDto } from './dto/update-queue-status.dto.js';
import { PatientsService } from '../patients/patients.service.js';
import { AppointmentsService, hospitalTimeZone } from '../appointments/appointments.service.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { AUDIT_LOGGER, type AuditLogger } from '../../common/audit/audit-logger.js';

@Injectable()
export class QueueTicketsService {
  constructor(
    @InjectRepository(QueueTicket) private readonly queueRepository: Repository<QueueTicket>,
    private readonly dataSource: DataSource,
    private readonly patientsService: PatientsService,
    private readonly appointmentsService: AppointmentsService,
    private readonly doctorsService: DoctorsService,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}

  async registerWalkIn(dto: WalkInPatientDto, actor: AuthenticatedUser, ipAddress?: string) {
    const patient = await this.patientsService.createWalkIn(dto, actor.userId, ipAddress);
    return { message: 'Walk-in patient registered successfully', patient };
  }

  /**
   * Appointment check-in is atomic:
   * lock appointment -> lock doctor/day token counter -> insert ticket ->
   * BOOKED becomes CHECKED_IN -> audit record. Any failure rolls all steps back.
   */
  async checkIn(appointmentId: string, actor: AuthenticatedUser, ipAddress?: string) {
    const ticketId = await this.dataSource.transaction(async (manager) => {
      const info = await this.appointmentsService.lockForCheckIn(manager, appointmentId);
      const dateRows = await manager.query(
        `SELECT ($1::timestamptz AT TIME ZONE $2)::date::text AS "queueDate"`,
        [info.slotStartAt, hospitalTimeZone()],
      ) as Array<{ queueDate: string }>;
      const queueDate = dateRows[0].queueDate;

      // Serialize token allocation for this doctor and service date.
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtext($1))`,
        [`carequeue:${info.doctorId}:${queueDate}`],
      );
      const tokenRows = await manager.query(
        `SELECT COALESCE(MAX(token_number), 0)::int + 1 AS token
           FROM queue_tickets WHERE doctor_id = $1 AND queue_date = $2`,
        [info.doctorId, queueDate],
      ) as Array<{ token: number }>;

      const repo = manager.getRepository(QueueTicket);
      const ticket = await repo.save(repo.create({
        appointmentId: info.appointmentId,
        doctorId: info.doctorId,
        queueDate,
        tokenNumber: Number(tokenRows[0].token),
        status: QueueTicketStatus.WAITING,
        calledAt: null,
        completedAt: null,
      }));

      await this.appointmentsService.markCheckedIn(manager, appointmentId);
      await this.audit.log({
        actorUserId: actor.userId,
        action: 'PATIENT_CHECKED_IN',
        entity: 'queue_tickets',
        entityId: ticket.id,
        newValues: {
          appointmentId, doctorId: info.doctorId,
          queueDate, tokenNumber: ticket.tokenNumber,
          status: QueueTicketStatus.WAITING,
        },
        ipAddress,
      }, manager);
      return ticket.id;
    });

    return this.getById(ticketId);
  }

  async getDailyQueue(query: DailyQueueDto, actor: AuthenticatedUser) {
    let doctorId = query.doctorId;
    if (actor.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsService.getDoctorByUserId(actor.userId);
      if (!doctor) throw new NotFoundException('No doctor profile is linked to this account');
      if (doctorId && doctorId !== doctor.id) {
        throw new ForbiddenException('Doctors can only view their own queue');
      }
      doctorId = doctor.id;
    }

    const date = query.date ?? await this.todayInHospitalTimeZone();
    const qb = this.queueRepository.createQueryBuilder('q')
      .innerJoinAndSelect('q.appointment', 'a')
      .innerJoinAndSelect('a.patient', 'p')
      .innerJoinAndSelect('p.user', 'pu')
      .innerJoinAndSelect('q.doctor', 'd')
      .innerJoinAndSelect('d.user', 'du')
      .where('q.queue_date = :date', { date })
      .orderBy('q.token_number', 'ASC');
    if (doctorId) qb.andWhere('q.doctor_id = :doctorId', { doctorId });

    const tickets = await qb.getMany();
    return {
      date,
      doctorId: doctorId ?? null,
      total: tickets.length,
      items: tickets.map((ticket) => this.toView(ticket)),
    };
  }

  async getMyQueue(actor: AuthenticatedUser) {
    const patient = await this.patientsService.getMyProfile(actor.userId);
    const tickets = await this.queueRepository.createQueryBuilder('q')
      .innerJoinAndSelect('q.appointment', 'a')
      .innerJoinAndSelect('a.patient', 'p')
      .innerJoinAndSelect('p.user', 'pu')
      .innerJoinAndSelect('q.doctor', 'd')
      .innerJoinAndSelect('d.user', 'du')
      .where('a.patient_id = :patientId', { patientId: patient.id })
      .orderBy('q.queue_date', 'DESC')
      .addOrderBy('q.token_number', 'ASC')
      .take(50)
      .getMany();
    return { items: tickets.map((ticket) => this.toView(ticket)) };
  }

  async getById(id: string, actor?: AuthenticatedUser) {
    const ticket = await this.queueRepository.createQueryBuilder('q')
      .innerJoinAndSelect('q.appointment', 'a')
      .innerJoinAndSelect('a.patient', 'p')
      .innerJoinAndSelect('p.user', 'pu')
      .innerJoinAndSelect('q.doctor', 'd')
      .innerJoinAndSelect('d.user', 'du')
      .where('q.id = :id', { id })
      .getOne();
    if (!ticket) throw new NotFoundException('Queue ticket not found');
    if (actor?.role === UserRole.DOCTOR) {
      const doctor = await this.doctorsService.getDoctorByUserId(actor.userId);
      if (!doctor || doctor.id !== ticket.doctorId) {
        throw new ForbiddenException('Doctors can only view their own queue');
      }
    }
    return this.toView(ticket);
  }

  async updateStatus(id: string, dto: UpdateQueueStatusDto, actor: AuthenticatedUser, ipAddress?: string) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(QueueTicket);
      const ticket = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ticket) throw new NotFoundException('Queue ticket not found');

      if (actor.role === UserRole.DOCTOR) {
        const doctor = await this.doctorsService.getDoctorByUserId(actor.userId);
        if (!doctor || doctor.id !== ticket.doctorId) {
          throw new ForbiddenException('Doctors can only update their own queue');
        }
      }

      const oldStatus = ticket.status;
      if (dto.status === QueueTicketStatus.SERVING && oldStatus !== QueueTicketStatus.WAITING) {
        throw new ConflictException('Only WAITING tickets can move to SERVING');
      }
      if (dto.status === QueueTicketStatus.COMPLETED && oldStatus !== QueueTicketStatus.SERVING) {
        throw new ConflictException('Only SERVING tickets can move to COMPLETED');
      }
      if (dto.status === oldStatus) {
        throw new BadRequestException(`Queue ticket is already ${oldStatus}`);
      }

      if (dto.status === QueueTicketStatus.SERVING) ticket.calledAt = new Date();
      if (dto.status === QueueTicketStatus.COMPLETED) {
        ticket.completedAt = new Date();
        await this.appointmentsService.markCompleted(manager, ticket.appointmentId);
      }
      ticket.status = dto.status;
      await repo.save(ticket);

      await this.audit.log({
        actorUserId: actor.userId,
        action: 'QUEUE_STATUS_UPDATED',
        entity: 'queue_tickets',
        entityId: ticket.id,
        oldValues: { status: oldStatus },
        newValues: { status: ticket.status },
        ipAddress,
      }, manager);
    });
    return this.getById(id);
  }

  private async todayInHospitalTimeZone(): Promise<string> {
    const rows = await this.dataSource.query(
      `SELECT (now() AT TIME ZONE $1)::date::text AS today`,
      [hospitalTimeZone()],
    ) as Array<{ today: string }>;
    return rows[0].today;
  }

  private toView(ticket: QueueTicket) {
    return {
      id: ticket.id,
      appointmentId: ticket.appointmentId,
      doctor: {
        id: ticket.doctorId,
        fullName: ticket.doctor?.user?.fullName,
      },
      patient: {
        id: ticket.appointment?.patient?.id,
        fullName: ticket.appointment?.patient?.user?.fullName,
      },
      queueDate: ticket.queueDate,
      tokenNumber: ticket.tokenNumber,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      calledAt: ticket.calledAt,
      completedAt: ticket.completedAt,
    };
  }
}
