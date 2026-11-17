import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { Doctor } from '../doctors/entities/doctor.entity.js';
import { DoctorSlot, SlotStatus } from './entities/doctor-slot.entity.js';
import { SlotsService } from './slots.service.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { AuditLogger } from '../../common/audit/audit-logger.js';

const doctorId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerId = '22222222-2222-4222-8222-222222222222';
const adminId = '11111111-1111-4111-8111-111111111111';
const doctor = { id: doctorId, userId: ownerId, isActive: true } as Doctor;
const owner = { userId: ownerId, fullName: 'Dr. Owner', email: 'owner@test.local', role: UserRole.DOCTOR };
const admin = { userId: adminId, fullName: 'Admin', email: 'admin@test.local', role: UserRole.ADMIN };
const H = 3_600_000;

function makeService(overlap = false) {
  const qb = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getExists: vi.fn().mockResolvedValue(overlap),
  };
  const slotRepo = {
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => Array.isArray(data)
      ? data.map((d, i) => ({ id: `slot-${i}`, ...d }))
      : ({ id: 'generated-slot', ...data })),
  };
  const doctorRepo = {
    findOne: vi.fn().mockResolvedValue(doctor),
    findOneBy: vi.fn(async (where: { userId?: string }) => (where.userId && where.userId !== ownerId ? null : doctor)),
  };
  const manager = { getRepository: vi.fn((entity) => (entity === Doctor ? doctorRepo : slotRepo)) };
  const dataSource = { transaction: vi.fn(async (cb) => cb(manager)) };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const service = new SlotsService(
    slotRepo as unknown as Repository<DoctorSlot>, dataSource as unknown as DataSource, audit as AuditLogger,
  );
  const startAt = new Date(Date.now() + H).toISOString();
  const endAt = new Date(Date.now() + 1.5 * H).toISOString();
  return { service, slotRepo, audit, startAt, endAt };
}

describe('SlotsService (Person 2)', () => {
  it('rejects slot start times in the past', async () => {
    const { service } = makeService();
    await expect(service.createSlot({
      startAt: new Date(Date.now() - H).toISOString(), endAt: new Date(Date.now() - 0.5 * H).toISOString(),
    }, owner)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a slot with end before start', async () => {
    const { service, startAt, endAt } = makeService();
    await expect(service.createSlot({ startAt: endAt, endAt: startAt }, owner)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a slot longer than the maximum length', async () => {
    const { service, startAt } = makeService();
    const tooLong = new Date(new Date(startAt).getTime() + 5 * H).toISOString();
    await expect(service.createSlot({ startAt, endAt: tooLong }, owner)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stops a doctor from adding slots for another doctor', async () => {
    const { service, startAt, endAt } = makeService();
    await expect(service.createSlot({ doctorId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', startAt, endAt }, owner))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires doctorId when an admin creates a slot', async () => {
    const { service, startAt, endAt } = makeService();
    await expect(service.createSlot({ startAt, endAt }, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects overlapping availability periods', async () => {
    const { service, startAt, endAt } = makeService(true);
    await expect(service.createSlot({ startAt, endAt }, owner)).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets the owning doctor create a slot without sending doctorId, and audits it', async () => {
    const { service, slotRepo, audit, startAt, endAt } = makeService();
    const result = await service.createSlot({ startAt, endAt }, owner);
    expect(result.doctorId).toBe(doctorId);
    expect(result.status).toBe(SlotStatus.OPEN);
    expect(slotRepo.save).toHaveBeenCalledOnce();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'SLOT_CREATED' }), expect.anything());
  });

  it('generates back-to-back 30-minute slots for a 4-hour block', async () => {
    const { service } = makeService();
    const from = new Date(Math.ceil((Date.now() + 2 * H) / H) * H);
    const to = new Date(from.getTime() + 4 * H);
    const result = await service.generateSlots({ from: from.toISOString(), to: to.toISOString(), durationMinutes: 30 }, owner);
    expect(result.created).toBe(8);
    expect(new Date(result.slots[7].endAt).getTime()).toBe(to.getTime());
  });

  it('rejects a generate block that is not a multiple of the slot length', async () => {
    const { service } = makeService();
    const from = new Date(Date.now() + 2 * H);
    const to = new Date(from.getTime() + 50 * 60_000);
    await expect(service.generateSlots({ from: from.toISOString(), to: to.toISOString(), durationMinutes: 30 }, owner))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
