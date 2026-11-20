import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Appointment, AppointmentStatus } from './entities/appointment.entity.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';
import { AppointmentQueryDto } from './dto/appointment-query.dto.js';
import { MyAppointmentsQueryDto } from './dto/my-appointments-query.dto.js';

import { SlotsService } from '../slots/slots.service.js';
import { DoctorSlot } from '../slots/entities/doctor-slot.entity.js';
import { PatientsService } from '../patients/patients.service.js';
import { DoctorsService } from '../doctors/doctors.service.js';

import { UserRole } from '../../common/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import type { Paginated } from '../../common/dto/pagination.dto.js';
import { AUDIT_LOGGER, type AuditLogger } from '../../common/audit/audit-logger.js';

const HOUR = 3_600_000;

/** Pending team decision; blueprint default is 2 hours. Override with CANCELLATION_CUTOFF_HOURS in .env. */
export function cancellationCutoffHours(): number {
  const value = Number(process.env.CANCELLATION_CUTOFF_HOURS ?? 2);
  return Number.isFinite(value) && value >= 0 ? value : 2;
}

/** Hospital calendar for "which day is this appointment". Default Asia/Dhaka. */
export function hospitalTimeZone(): string {
  return process.env.HOSPITAL_TIME_ZONE || 'Asia/Dhaka';
}

/** What the API returns: only safe fields (no emails, no password hashes). */
export interface AppointmentView {
  id: string;
  status: AppointmentStatus;
  reasonForVisit: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  bookedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  slot: { id: string; startAt: Date; endAt: Date };
  doctor: { id: string; fullName: string };
  patient: { id: string; fullName: string };
}

/** What the queue (Person 4) needs at check-in. */
export interface CheckInInfo {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  slotStartAt: Date;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentsRepo: Repository<Appointment>,
    private readonly dataSource: DataSource,
    private readonly slotsService: SlotsService,
    private readonly patientsService: PatientsService,
    private readonly doctorsService: DoctorsService,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}

  // ------------------------------------------------------------------ booking

  /**
   * Book a slot. ONE transaction:
   *   1. lock the slot row (SlotsService.lockSlotForBooking) -> a 2nd booking of the same slot waits here
   *   2. lock the patient (advisory lock) -> the same patient can't book two clashing slots at once
   *   3. reject if the patient already has an appointment at that time
   *   4. slot OPEN -> BOOKED (SlotsService.markSlotBooked)
   *   5. insert the appointment + audit log
   * Any error rolls everything back; the slot stays OPEN.
   * Backstop: unique index uq_appointments_active_slot (one active appointment per slot).
   */
  async book(dto: CreateAppointmentDto, actor: AuthenticatedUser): Promise<AppointmentView> {
    const patientId = await this.resolvePatientForBooking(dto.patientId, actor);
    const patient = await this.patientsService.getPatientById(patientId);
    if (!patient.user.isActive) throw new BadRequestException('Patient account is inactive');

    try {
      const appointmentId = await this.dataSource.transaction(async (manager) => {
        const slot = await this.slotsService.lockSlotForBooking(manager, dto.slotId);

        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`patient:${patientId}`]);
        await this.assertNoPatientClash(manager, patientId, slot);

        await this.slotsService.markSlotBooked(manager, slot.id);

        const repo = manager.getRepository(Appointment);
        const saved = await repo.save(repo.create({
          patientId,
          slotId: slot.id,
          bookedByUserId: actor.userId,
          reasonForVisit: dto.reasonForVisit?.trim() || null,
          status: AppointmentStatus.BOOKED,
          cancelledAt: null,
          cancellationReason: null,
        }));

        await this.audit.log({
          actorUserId: actor.userId,
          action: 'APPOINTMENT_BOOKED',
          entity: 'appointments',
          entityId: saved.id,
          newValues: { patientId, slotId: slot.id, doctorId: slot.doctorId, startAt: slot.startAt },
        }, manager);

        return saved.id;
      });
      return this.getView(appointmentId);
    } catch (error) {
      this.handleConstraint(error);
      throw error;
    }
  }

  // ------------------------------------------------------------------ cancel / no-show

  /**
   * Cancel a BOOKED appointment and free the slot, in one transaction.
   * - PATIENT: own appointments only, and at least CANCELLATION_CUTOFF_HOURS before the start.
   * - RECEPTIONIST / ADMIN: any BOOKED appointment, any time before the start.
   */
  async cancel(id: string, dto: CancelAppointmentDto, actor: AuthenticatedUser): Promise<AppointmentView> {
    const ownPatientId = actor.role === UserRole.PATIENT
      ? (await this.patientsService.getMyProfile(actor.userId)).id
      : null;

    await this.dataSource.transaction(async (manager) => {
      const appointment = await this.lockAppointment(manager, id);
      if (ownPatientId && appointment.patientId !== ownPatientId) {
        throw new ForbiddenException('You can only cancel your own appointments');
      }
      if (appointment.status !== AppointmentStatus.BOOKED) {
        throw new ConflictException(`Only BOOKED appointments can be cancelled (current status: ${appointment.status})`);
      }

      const slot = await this.getSlot(manager, appointment.slotId);
      const msUntilStart = slot.startAt.getTime() - Date.now();
      if (msUntilStart <= 0) {
        throw new ConflictException('The appointment time has passed; mark it as no-show instead');
      }
      const cutoff = cancellationCutoffHours();
      if (ownPatientId && msUntilStart < cutoff * HOUR) {
        throw new BadRequestException(
          `Patients can cancel up to ${cutoff} hours before the appointment. Please contact reception.`,
        );
      }

      appointment.status = AppointmentStatus.CANCELLED;
      appointment.cancelledAt = new Date();
      appointment.cancellationReason = dto.reason?.trim() || null;
      await manager.getRepository(Appointment).save(appointment);

      await this.slotsService.releaseSlot(manager, appointment.slotId); // BOOKED -> OPEN

      await this.audit.log({
        actorUserId: actor.userId,
        action: 'APPOINTMENT_CANCELLED',
        entity: 'appointments',
        entityId: appointment.id,
        oldValues: { status: AppointmentStatus.BOOKED },
        newValues: { status: AppointmentStatus.CANCELLED, reason: appointment.cancellationReason },
      }, manager);
    });
    return this.getView(id);
  }

  /** RECEPTIONIST / ADMIN: the patient did not come. Only after the start time. The slot stays BOOKED (it is in the past). */
  async markNoShow(id: string, actor: AuthenticatedUser): Promise<AppointmentView> {
    await this.dataSource.transaction(async (manager) => {
      const appointment = await this.lockAppointment(manager, id);
      if (appointment.status !== AppointmentStatus.BOOKED) {
        throw new ConflictException(`Only BOOKED appointments can be marked no-show (current status: ${appointment.status})`);
      }
      const slot = await this.getSlot(manager, appointment.slotId);
      if (slot.startAt.getTime() > Date.now()) {
        throw new ConflictException('The appointment has not started yet');
      }
      appointment.status = AppointmentStatus.NO_SHOW;
      await manager.getRepository(Appointment).save(appointment);
      await this.audit.log({
        actorUserId: actor.userId,
        action: 'APPOINTMENT_NO_SHOW',
        entity: 'appointments',
        entityId: appointment.id,
        oldValues: { status: AppointmentStatus.BOOKED },
        newValues: { status: AppointmentStatus.NO_SHOW },
      }, manager);
    });
    return this.getView(id);
  }

  // ------------------------------------------------------------------ reads

  /** PATIENT: own appointment history, newest first. */
  async getMyAppointments(actor: AuthenticatedUser, query: MyAppointmentsQueryDto): Promise<Paginated<AppointmentView>> {
    const patient = await this.patientsService.getMyProfile(actor.userId);
    return this.search({ patientId: patient.id, status: query.status }, query.page ?? 1, query.limit ?? 20);
  }

  /** ADMIN / RECEPTIONIST: all, with filters. DOCTOR: only their own appointments. */
  async getAppointments(actor: AuthenticatedUser, query: AppointmentQueryDto): Promise<Paginated<AppointmentView>> {
    let doctorId = query.doctorId;
    if (actor.role === UserRole.DOCTOR) {
      const own = await this.doctorsService.getDoctorByUserId(actor.userId);
      if (!own) throw new NotFoundException('No doctor profile is linked to this account');
      if (doctorId && doctorId !== own.id) throw new ForbiddenException('Doctors can only view their own appointments');
      doctorId = own.id;
    }
    return this.search(
      { doctorId, patientId: query.patientId, status: query.status, date: query.date },
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  /** One appointment. PATIENT: own only. DOCTOR: own only. RECEPTIONIST / ADMIN: any. */
  async getAppointment(id: string, actor: AuthenticatedUser): Promise<AppointmentView> {
    const view = await this.getView(id);
    if (actor.role === UserRole.PATIENT) {
      const patient = await this.patientsService.getMyProfile(actor.userId);
      if (view.patient.id !== patient.id) throw new ForbiddenException('You can only view your own appointments');
    }
    if (actor.role === UserRole.DOCTOR) {
      const own = await this.doctorsService.getDoctorByUserId(actor.userId);
      if (!own || view.doctor.id !== own.id) throw new ForbiddenException('You can only view your own appointments');
    }
    return view;
  }

  // ------------------------------------------------------------------ exported for the queue (Person 4)
  // Call these with the EntityManager of the queue's own transaction, so check-in / completion
  // and the queue ticket are saved together or not at all.

  /** Locks a BOOKED appointment for check-in. Check-in is only allowed on the appointment's day (hospital time zone). */
  async lockForCheckIn(manager: EntityManager, appointmentId: string): Promise<CheckInInfo> {
    const appointment = await this.lockAppointment(manager, appointmentId);
    if (appointment.status !== AppointmentStatus.BOOKED) {
      throw new ConflictException(`Only BOOKED appointments can be checked in (current status: ${appointment.status})`);
    }
    const rows = await manager.query(
      `SELECT doctor_id AS "doctorId", start_at AS "startAt",
              (start_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date AS "isToday"
         FROM doctor_slots WHERE id = $1`,
      [appointment.slotId, hospitalTimeZone()],
    ) as Array<{ doctorId: string; startAt: Date; isToday: boolean }>;
    const slot = rows[0];
    if (!slot) throw new NotFoundException('Slot not found');
    if (!slot.isToday) throw new ConflictException('Check-in is only possible on the day of the appointment');
    return { appointmentId: appointment.id, patientId: appointment.patientId, doctorId: slot.doctorId, slotStartAt: slot.startAt };
  }

  /** BOOKED -> CHECKED_IN. Call right after creating the queue ticket, in the same transaction. */
  async markCheckedIn(manager: EntityManager, appointmentId: string): Promise<void> {
    await this.transition(manager, appointmentId, AppointmentStatus.BOOKED, AppointmentStatus.CHECKED_IN);
  }

  /** CHECKED_IN -> COMPLETED. Call when the doctor completes the queue ticket, in the same transaction. */
  async markCompleted(manager: EntityManager, appointmentId: string): Promise<void> {
    await this.transition(manager, appointmentId, AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED);
  }

  // ------------------------------------------------------------------ helpers

  /** PATIENT books for themself (id from the JWT). RECEPTIONIST must say which patient. */
  private async resolvePatientForBooking(requested: string | undefined, actor: AuthenticatedUser): Promise<string> {
    if (actor.role === UserRole.PATIENT) {
      const own = await this.patientsService.getMyProfile(actor.userId);
      if (requested && requested !== own.id) throw new ForbiddenException('Patients can only book for themselves');
      return own.id;
    }
    if (!requested) throw new BadRequestException('patientId is required when booking for a patient');
    return requested;
  }

  /** A patient can't have two active appointments at overlapping times (with any doctor). */
  private async assertNoPatientClash(manager: EntityManager, patientId: string, slot: DoctorSlot): Promise<void> {
    const clash = await manager.getRepository(Appointment).createQueryBuilder('a')
      .innerJoin('a.slot', 's')
      .where('a.patient_id = :patientId', { patientId })
      .andWhere('a.status IN (:...active)', { active: [AppointmentStatus.BOOKED, AppointmentStatus.CHECKED_IN] })
      .andWhere('s.start_at < :endAt AND s.end_at > :startAt', { startAt: slot.startAt, endAt: slot.endAt })
      .getExists();
    if (clash) throw new ConflictException('Patient already has an appointment at this time');
  }

  private async lockAppointment(manager: EntityManager, id: string): Promise<Appointment> {
    const appointment = await manager.getRepository(Appointment).findOne({
      where: { id }, lock: { mode: 'pessimistic_write' },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  private async getSlot(manager: EntityManager, slotId: string): Promise<DoctorSlot> {
    const slot = await manager.getRepository(DoctorSlot).findOneBy({ id: slotId });
    if (!slot) throw new NotFoundException('Slot not found');
    return slot;
  }

  private async transition(manager: EntityManager, id: string, from: AppointmentStatus, to: AppointmentStatus): Promise<void> {
    const result = await manager.createQueryBuilder().update(Appointment)
      .set({ status: to })
      .where('id = :id AND status = :from', { id, from })
      .execute();
    if (!result.affected) throw new ConflictException(`Appointment must be ${from} to become ${to}`);
  }

  private async search(
    filters: { patientId?: string; doctorId?: string; status?: AppointmentStatus; date?: string },
    page: number,
    limit: number,
  ): Promise<Paginated<AppointmentView>> {
    const qb = this.baseQuery();
    if (filters.patientId) qb.andWhere('a.patient_id = :patientId', { patientId: filters.patientId });
    if (filters.doctorId) qb.andWhere('s.doctor_id = :doctorId', { doctorId: filters.doctorId });
    if (filters.status) qb.andWhere('a.status = :status', { status: filters.status });
    if (filters.date) {
      // CAST(... AS date), not '::date': TypeORM would read '::date' as a ':date' parameter.
      qb.andWhere('CAST(s.start_at AT TIME ZONE :tz AS date) = :date', { tz: hospitalTimeZone(), date: filters.date });
    }
    const [rows, total] = await qb
      .orderBy('s.start_at', 'DESC').addOrderBy('a.id', 'ASC')
      .skip((page - 1) * limit).take(limit)
      .getManyAndCount();
    return { items: rows.map((row) => this.toView(row)), page, limit, total };
  }

  async getView(id: string): Promise<AppointmentView> {
    const row = await this.baseQuery().andWhere('a.id = :id', { id }).getOne();
    if (!row) throw new NotFoundException('Appointment not found');
    return this.toView(row);
  }

  /** Joins slot, doctor and patient, selecting only safe user fields (id, full name). */
  private baseQuery() {
    return this.appointmentsRepo.createQueryBuilder('a')
      .innerJoin('a.slot', 's')
      .innerJoin('s.doctor', 'd')
      .innerJoin('d.user', 'du')
      .innerJoin('a.patient', 'p')
      .innerJoin('p.user', 'pu')
      .addSelect(['s.id', 's.startAt', 's.endAt', 'd.id', 'du.id', 'du.fullName', 'p.id', 'pu.id', 'pu.fullName'])
      .where('1 = 1');
  }

  private toView(a: Appointment): AppointmentView {
    return {
      id: a.id,
      status: a.status,
      reasonForVisit: a.reasonForVisit,
      cancelledAt: a.cancelledAt,
      cancellationReason: a.cancellationReason,
      bookedByUserId: a.bookedByUserId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      slot: { id: a.slot.id, startAt: a.slot.startAt, endAt: a.slot.endAt },
      doctor: { id: a.slot.doctor.id, fullName: a.slot.doctor.user.fullName },
      patient: { id: a.patient.id, fullName: a.patient.user.fullName },
    };
  }

  /** The unique index is the last line of defence against double booking. */
  private handleConstraint(error: unknown): void {
    const err = error as { code?: string; constraint?: string; driverError?: { code?: string; constraint?: string } };
    const code = err.code ?? err.driverError?.code;
    const constraint = err.constraint ?? err.driverError?.constraint ?? '';
    if (code === '23505' && constraint.includes('uq_appointments_active_slot')) {
      throw new ConflictException('Slot is already booked');
    }
    if (code === '23503') throw new ConflictException('Referenced patient, slot or user no longer exists');
  }
}
