import {
  BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Doctor } from '../doctors/entities/doctor.entity.js';
import { User } from '../users/entities/user.entity.js';
import { DoctorSlot, SlotStatus } from './entities/doctor-slot.entity.js';
import { CreateSlotDto } from './dto/create-slot.dto.js';
import { UpdateSlotDto } from './dto/update-slot.dto.js';
import { GenerateSlotsDto } from './dto/generate-slots.dto.js';
import { AvailableSlotsDto } from './dto/available-slots.dto.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { Paginated } from '../../common/dto/pagination.dto.js';
import { AUDIT_LOGGER, type AuditLogger } from '../../common/audit/audit-logger.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const DEFAULT_SLOT_MINUTES = Number(process.env.SLOT_DURATION_MINUTES ?? 30);
export const MIN_SLOT_MINUTES = 10;
export const MAX_SLOT_MINUTES = 240;
export const MAX_SLOTS_PER_GENERATE = 48;

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(DoctorSlot) private readonly slotsRepo: Repository<DoctorSlot>,
    private readonly dataSource: DataSource,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}

  async createSlot(dto: CreateSlotDto, actor: AuthenticatedUser): Promise<DoctorSlot> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.validateRange(startAt, endAt);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const doctor = await this.lockDoctor(manager, await this.resolveDoctorId(manager, dto.doctorId, actor));
        this.authorizeDoctor(actor, doctor);
        await this.assertNoOverlap(manager, doctor.id, startAt, endAt);
        const repo = manager.getRepository(DoctorSlot);
        const slot = await repo.save(repo.create({
          doctorId: doctor.id, startAt, endAt, status: dto.status ?? SlotStatus.OPEN,
        }));
        await this.audit.log({
          actorUserId: actor.userId, action: 'SLOT_CREATED', entity: 'doctor_slots', entityId: slot.id, newValues: slot,
        }, manager);
        return slot;
      });
    } catch (error) { this.handleConstraint(error); throw error; }
  }

  async generateSlots(dto: GenerateSlotsDto, actor: AuthenticatedUser): Promise<{ created: number; slots: DoctorSlot[] }> {
    const from = new Date(dto.from);
    const to = new Date(dto.to);
    const minutes = dto.durationMinutes ?? DEFAULT_SLOT_MINUTES;
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) throw new BadRequestException('Invalid timestamps');
    if (from.getTime() <= Date.now()) throw new BadRequestException('from must be in the future');
    if (to.getTime() <= from.getTime()) throw new BadRequestException('to must be after from');
    if (to.getTime() - from.getTime() > DAY) throw new BadRequestException('A generated block can cover at most 24 hours');
    const span = to.getTime() - from.getTime();
    if (span % (minutes * MINUTE) !== 0) {
      throw new BadRequestException(`The block length must be a whole multiple of ${minutes} minutes`);
    }
    const count = span / (minutes * MINUTE);
    if (count > MAX_SLOTS_PER_GENERATE) throw new BadRequestException(`At most ${MAX_SLOTS_PER_GENERATE} slots per request`);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const doctor = await this.lockDoctor(manager, await this.resolveDoctorId(manager, dto.doctorId, actor));
        this.authorizeDoctor(actor, doctor);
        await this.assertNoOverlap(manager, doctor.id, from, to);
        const repo = manager.getRepository(DoctorSlot);
        const rows = Array.from({ length: count }, (_, i) => repo.create({
          doctorId: doctor.id,
          startAt: new Date(from.getTime() + i * minutes * MINUTE),
          endAt: new Date(from.getTime() + (i + 1) * minutes * MINUTE),
          status: SlotStatus.OPEN,
        }));
        const slots = await repo.save(rows);
        await this.audit.log({
          actorUserId: actor.userId, action: 'SLOTS_GENERATED', entity: 'doctors', entityId: doctor.id,
          newValues: { from, to, durationMinutes: minutes, count },
        }, manager);
        return { created: slots.length, slots };
      });
    } catch (error) { this.handleConstraint(error); throw error; }
  }

  async updateSlot(id: string, dto: UpdateSlotDto, actor: AuthenticatedUser): Promise<DoctorSlot> {
    const original = await this.getSlotById(id);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const doctor = await this.lockDoctor(manager, original.doctorId);
        this.authorizeDoctor(actor, doctor);
        const repo = manager.getRepository(DoctorSlot);
        const slot = await repo.findOneBy({ id });
        if (!slot) throw new NotFoundException('Slot not found');
        if (slot.startAt.getTime() <= Date.now()) throw new ConflictException('Cannot edit a started/past slot');
        if (slot.status === SlotStatus.BOOKED) {
          throw new ConflictException('Slot is booked. Cancel the appointment first (Appointments module), then edit or block the slot');
        }
        const before = { startAt: slot.startAt, endAt: slot.endAt, status: slot.status };
        const startAt = dto.startAt ? new Date(dto.startAt) : slot.startAt;
        const endAt = dto.endAt ? new Date(dto.endAt) : slot.endAt;
        this.validateRange(startAt, endAt);
        await this.assertNoOverlap(manager, doctor.id, startAt, endAt, id);
        slot.startAt = startAt;
        slot.endAt = endAt;
        if (dto.status !== undefined) slot.status = dto.status;
        const saved = await repo.save(slot);
        await this.audit.log({
          actorUserId: actor.userId, action: 'SLOT_UPDATED', entity: 'doctor_slots', entityId: id, oldValues: before, newValues: saved,
        }, manager);
        return saved;
      });
    } catch (error) { this.handleConstraint(error); throw error; }
  }

  async deleteSlot(id: string, actor: AuthenticatedUser): Promise<{ message: string }> {
    const original = await this.getSlotById(id);
    try {
      await this.dataSource.transaction(async (manager) => {
        const doctor = await this.lockDoctor(manager, original.doctorId);
        this.authorizeDoctor(actor, doctor);
        const slot = await manager.getRepository(DoctorSlot).findOneBy({ id });
        if (!slot) throw new NotFoundException('Slot not found');
        if (slot.startAt.getTime() <= Date.now()) throw new ConflictException('Cannot delete a started/past slot');
        if (slot.status === SlotStatus.BOOKED) throw new ConflictException('Cannot delete a booked slot');
        await manager.getRepository(DoctorSlot).delete(id);
        await this.audit.log({
          actorUserId: actor.userId, action: 'SLOT_DELETED', entity: 'doctor_slots', entityId: id, oldValues: slot,
        }, manager);
      });
      return { message: 'Slot deleted' };
    } catch (error) { this.handleConstraint(error); throw error; }
  }

  async getSlotById(id: string): Promise<DoctorSlot> {
    const slot = await this.slotsRepo.findOneBy({ id });
    if (!slot) throw new NotFoundException('Slot not found');
    return slot;
  }

  async getSlotByIdForActor(id: string, actor: AuthenticatedUser): Promise<DoctorSlot> {
    const slot = await this.getSlotById(id);
    const doctor = await this.dataSource.getRepository(Doctor).findOneBy({ id: slot.doctorId });
    if (!doctor) throw new NotFoundException('Doctor not found');
    this.authorizeDoctor(actor, doctor);
    return slot;
  }

  async getDoctorSlots(doctorId: string, actor: AuthenticatedUser): Promise<DoctorSlot[]> {
    const doctor = await this.dataSource.getRepository(Doctor).findOneBy({ id: doctorId });
    if (!doctor) throw new NotFoundException('Doctor not found');
    this.authorizeDoctor(actor, doctor);
    return this.slotsRepo.find({ where: { doctorId }, order: { startAt: 'ASC' } });
  }

  async getMySlots(actor: AuthenticatedUser): Promise<DoctorSlot[]> {
    const doctor = await this.dataSource.getRepository(Doctor).findOneBy({ userId: actor.userId });
    if (!doctor) throw new NotFoundException('No doctor profile is linked to this account');
    return this.slotsRepo.find({ where: { doctorId: doctor.id }, order: { startAt: 'ASC' } });
  }

  async getAvailableSlots(dto: AvailableSlotsDto): Promise<Paginated<DoctorSlot>> {
    const now = new Date();
    const from = dto.from ? new Date(Math.max(new Date(dto.from).getTime(), now.getTime())) : now;
    const to = dto.to ? new Date(dto.to) : new Date(from.getTime() + 30 * DAY);
    if (!(to.getTime() > from.getTime()) || to.getTime() - from.getTime() > 31 * DAY) {
      throw new BadRequestException('Range must be positive and at most 31 days');
    }
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const qb = this.slotsRepo.createQueryBuilder('slot')
      .innerJoin('slot.doctor', 'doctor')
      .innerJoin('doctor.user', 'user')
      .addSelect(['doctor.id', 'doctor.departmentId', 'user.id', 'user.fullName'])
      .where('slot.status = :status', { status: SlotStatus.OPEN })
      .andWhere('doctor.is_active = true')
      .andWhere('user.is_active = true')
      .andWhere('slot.start_at >= :from', { from })
      .andWhere('slot.start_at < :to', { to });
    if (dto.doctorId) qb.andWhere('slot.doctor_id = :doctorId', { doctorId: dto.doctorId });
    if (dto.departmentId) qb.andWhere('doctor.department_id = :departmentId', { departmentId: dto.departmentId });
    const [items, total] = await qb
      .orderBy('slot.start_at', 'ASC').addOrderBy('slot.id', 'ASC')
      .skip((page - 1) * limit).take(limit)
      .getManyAndCount();
    return { items, page, limit, total };
  }

  async lockSlotForBooking(manager: EntityManager, slotId: string): Promise<DoctorSlot> {
    const slot = await manager.getRepository(DoctorSlot).findOne({
      where: { id: slotId }, lock: { mode: 'pessimistic_write' },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status !== SlotStatus.OPEN) throw new ConflictException('Slot is not available');
    if (slot.startAt.getTime() <= Date.now()) throw new ConflictException('Slot has already started');
    const doctor = await manager.getRepository(Doctor).findOneBy({ id: slot.doctorId, isActive: true });
    if (!doctor) throw new ConflictException('Doctor is not active');
    const account = await manager.getRepository(User).findOneBy({ id: doctor.userId, isActive: true });
    if (!account) throw new ConflictException('Doctor account is inactive');
    return slot;
  }

  async markSlotBooked(manager: EntityManager, slotId: string): Promise<void> {
    const result = await manager.createQueryBuilder().update(DoctorSlot)
      .set({ status: SlotStatus.BOOKED })
      .where('id = :slotId AND status = :open', { slotId, open: SlotStatus.OPEN })
      .execute();
    if (!result.affected) throw new ConflictException('Slot is not available');
  }

  async releaseSlot(manager: EntityManager, slotId: string): Promise<void> {
    const slot = await manager.getRepository(DoctorSlot).findOne({
      where: { id: slotId }, lock: { mode: 'pessimistic_write' },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status !== SlotStatus.BOOKED) return;
    const doctor = await manager.getRepository(Doctor).findOneBy({ id: slot.doctorId });
    const reopen = slot.startAt.getTime() > Date.now() && !!doctor?.isActive;
    slot.status = reopen ? SlotStatus.OPEN : SlotStatus.BLOCKED;
    await manager.getRepository(DoctorSlot).save(slot);
  }

  private async resolveDoctorId(manager: EntityManager, requested: string | undefined, actor: AuthenticatedUser): Promise<string> {
    if (actor.role === UserRole.DOCTOR) {
      const own = await manager.getRepository(Doctor).findOneBy({ userId: actor.userId });
      if (!own) throw new NotFoundException('No doctor profile is linked to this account');
      if (requested && requested !== own.id) throw new ForbiddenException('Doctor can only manage their own slots');
      return own.id;
    }
    if (!requested) throw new BadRequestException('doctorId is required');
    return requested;
  }

  private async lockDoctor(manager: EntityManager, doctorId: string): Promise<Doctor> {
    const doctor = await manager.getRepository(Doctor).findOne({
      where: { id: doctorId, isActive: true }, lock: { mode: 'pessimistic_write' },
    });
    if (!doctor) throw new NotFoundException('Active doctor not found');
    return doctor;
  }

  private authorizeDoctor(actor: AuthenticatedUser, doctor: Doctor): void {
    if (actor.role !== UserRole.ADMIN && !(actor.role === UserRole.DOCTOR && doctor.userId === actor.userId)) {
      throw new ForbiddenException('Only an administrator or the owning doctor can manage these slots');
    }
  }

  private validateRange(startAt: Date, endAt: Date): void {
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime())) {
      throw new BadRequestException('Invalid timestamps');
    }
    if (startAt.getTime() <= Date.now()) throw new BadRequestException('Start time must be in the future');
    if (endAt.getTime() <= startAt.getTime()) throw new BadRequestException('End time must be after start time');
    const minutes = (endAt.getTime() - startAt.getTime()) / MINUTE;
    if (minutes < MIN_SLOT_MINUTES || minutes > MAX_SLOT_MINUTES) {
      throw new BadRequestException(`A slot must be between ${MIN_SLOT_MINUTES} and ${MAX_SLOT_MINUTES} minutes`);
    }
  }

  private async assertNoOverlap(manager: EntityManager, doctorId: string, startAt: Date, endAt: Date, excludeId?: string): Promise<void> {
    const qb = manager.getRepository(DoctorSlot).createQueryBuilder('slot')
      .where('slot.doctor_id = :doctorId', { doctorId })
      .andWhere('slot.start_at < :endAt', { endAt })
      .andWhere('slot.end_at > :startAt', { startAt });
    if (excludeId) qb.andWhere('slot.id != :excludeId', { excludeId });
    if (await qb.getExists()) throw new ConflictException('Doctor already has an overlapping slot');
  }

  private handleConstraint(error: unknown): void {
    const code = (error as { code?: string })?.code;
    if (code === '23P01') throw new ConflictException('Doctor already has an overlapping slot');
    if (code === '23503') throw new ConflictException('Slot has appointment history; block it instead of deleting it');
    if (code === '23514') throw new BadRequestException('End time must be after start time');
  }
}
