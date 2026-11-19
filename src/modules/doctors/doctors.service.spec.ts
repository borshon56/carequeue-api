import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { DoctorsService } from './doctors.service.js';
import { Doctor } from './entities/doctor.entity.js';
import type { UsersService } from '../users/users.service.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { NotFoundException as NotFound } from '@nestjs/common';
import type { DepartmentsService } from '../departments/departments.service.js';
import type { SpecializationsService } from '../specializations/specializations.service.js';
import type { AuditLogger } from '../../common/audit/audit-logger.js';

const actorId = '11111111-1111-4111-8111-111111111111';
const dto = {
  userId: '22222222-2222-4222-8222-222222222222',
  departmentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  licenseNumber: 'BMDC-12345',
};

function makeService(user: { id: string; role: UserRole; isActive: boolean } | null) {
  const doctorRepo = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 'doc-1', ...value })),
  };
  const usersService = { getProfile: vi.fn(async () => { if (!user) throw new NotFound('User not found'); return user; }) };
  const departmentService = { getDepartmentById: vi.fn().mockResolvedValue({ id: dto.departmentId }) };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const service = new DoctorsService(
    doctorRepo as unknown as Repository<Doctor>,
    usersService as unknown as UsersService,
    departmentService as unknown as DepartmentsService,
    {} as SpecializationsService,
    {} as DataSource,
    audit as AuditLogger,
  );
  return { service, doctorRepo, audit };
}

describe('DoctorsService (Person 2)', () => {
  it('requires an existing user', async () => {
    const { service } = makeService(null);
    await expect(service.createDoctor(dto, actorId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an inactive DOCTOR account', async () => {
    const { service } = makeService({ id: dto.userId, role: UserRole.DOCTOR, isActive: false });
    await expect(service.createDoctor(dto, actorId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects linking a PATIENT account as a doctor', async () => {
    const { service } = makeService({ id: dto.userId, role: UserRole.PATIENT, isActive: true });
    await expect(service.createDoctor(dto, actorId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a doctor profile for an active DOCTOR account and audits it', async () => {
    const { service, doctorRepo, audit } = makeService({ id: dto.userId, role: UserRole.DOCTOR, isActive: true });
    const result = await service.createDoctor(dto, actorId);
    expect(result.userId).toBe(dto.userId);
    expect(doctorRepo.save).toHaveBeenCalledOnce();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCTOR_CREATED', actorUserId: actorId }));
  });

  it('returns conflict on duplicate profile/license constraints', async () => {
    const { service, doctorRepo } = makeService({ id: dto.userId, role: UserRole.DOCTOR, isActive: true });
    doctorRepo.save.mockRejectedValueOnce({ code: '23505', detail: 'Key (license_number)=(X) already exists.' });
    await expect(service.createDoctor(dto, actorId)).rejects.toBeInstanceOf(ConflictException);
  });
});
