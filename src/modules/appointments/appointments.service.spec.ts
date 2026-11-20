import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import { AppointmentsService } from './appointments.service.js';
import { Appointment, AppointmentStatus } from './entities/appointment.entity.js';
import { DoctorSlot, SlotStatus } from '../slots/entities/doctor-slot.entity.js';
import type { SlotsService } from '../slots/slots.service.js';
import type { PatientsService } from '../patients/patients.service.js';
import type { DoctorsService } from '../doctors/doctors.service.js';
import type { AuditLogger } from '../../common/audit/audit-logger.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

const HOUR = 3_600_000;
const OWN_PATIENT = '11111111-1111-4111-8111-111111111111';
const OTHER_PATIENT = '22222222-2222-4222-8222-222222222222';
const SLOT_ID = '33333333-3333-4333-8333-333333333333';
const APPT_ID = '44444444-4444-4444-8444-444444444444';

const patientUser = { userId: 'u-patient', fullName: 'Pat', email: 'p@t.local', role: UserRole.PATIENT };
const receptionist = { userId: 'u-recep', fullName: 'Rina', email: 'r@t.local', role: UserRole.RECEPTIONIST };

function makeService(opts: { clash?: boolean; startsInHours?: number; status?: AppointmentStatus } = {}) {
  const slot = {
    id: SLOT_ID, doctorId: 'doc-1', status: SlotStatus.OPEN,
    startAt: new Date(Date.now() + (opts.startsInHours ?? 24) * HOUR),
    endAt: new Date(Date.now() + ((opts.startsInHours ?? 24) + 0.5) * HOUR),
  } as DoctorSlot;
  const appointment = {
    id: APPT_ID, patientId: OWN_PATIENT, slotId: SLOT_ID,
    status: opts.status ?? AppointmentStatus.BOOKED,
  } as Appointment;

  const calls: string[] = [];
  const qb = {
    innerJoin: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), andWhere: vi.fn().mockReturnThis(),
    getExists: vi.fn().mockResolvedValue(opts.clash ?? false),
  };
  const appointmentRepo = {
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    create: vi.fn((v) => v),
    save: vi.fn(async (v) => { calls.push('saveAppointment'); return { id: APPT_ID, ...v }; }),
    findOne: vi.fn().mockResolvedValue(appointment),
  };
  const slotRepo = { findOneBy: vi.fn().mockResolvedValue(slot) };
  const manager = {
    getRepository: vi.fn((entity) => (entity === DoctorSlot ? slotRepo : appointmentRepo)),
    query: vi.fn(async () => { calls.push('lockPatient'); return []; }),
  };
  const dataSource = { transaction: vi.fn(async (cb) => cb(manager)) };
  const slotsService = {
    lockSlotForBooking: vi.fn(async () => { calls.push('lockSlot'); return slot; }),
    markSlotBooked: vi.fn(async () => { calls.push('markBooked'); }),
    releaseSlot: vi.fn(async () => { calls.push('releaseSlot'); }),
  };
  const patientsService = {
    getMyProfile: vi.fn().mockResolvedValue({ id: OWN_PATIENT, user: { isActive: true } }),
    getPatientById: vi.fn().mockResolvedValue({ id: OWN_PATIENT, user: { isActive: true } }),
  };
  const audit = { log: vi.fn(async () => { calls.push('audit'); }) };

  const service = new AppointmentsService(
    appointmentRepo as unknown as Repository<Appointment>,
    dataSource as unknown as DataSource,
    slotsService as unknown as SlotsService,
    patientsService as unknown as PatientsService,
    {} as DoctorsService,
    audit as AuditLogger,
  );
  vi.spyOn(service, 'getView').mockResolvedValue({ id: APPT_ID } as never);
  return { service, calls, slotsService, appointment };
}

describe('AppointmentsService (Person 3)', () => {
  it('books in the right order inside one transaction: lock slot, lock patient, mark booked, save, audit', async () => {
    const { service, calls } = makeService();
    await service.book({ slotId: SLOT_ID }, patientUser);
    expect(calls).toEqual(['lockSlot', 'lockPatient', 'markBooked', 'saveAppointment', 'audit']);
  });

  it('stops a patient booking for another patient', async () => {
    const { service } = makeService();
    await expect(service.book({ slotId: SLOT_ID, patientId: OTHER_PATIENT }, patientUser))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires patientId when a receptionist books', async () => {
    const { service } = makeService();
    await expect(service.book({ slotId: SLOT_ID }, receptionist)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a booking that clashes with another appointment of the same patient, without booking the slot', async () => {
    const { service, slotsService } = makeService({ clash: true });
    await expect(service.book({ slotId: SLOT_ID }, patientUser)).rejects.toBeInstanceOf(ConflictException);
    expect(slotsService.markSlotBooked).not.toHaveBeenCalled();
  });

  it('cancels and releases the slot in the same transaction', async () => {
    const { service, calls, appointment } = makeService({ startsInHours: 24 });
    await service.cancel(APPT_ID, { reason: 'busy' }, patientUser);
    expect(appointment.status).toBe(AppointmentStatus.CANCELLED);
    expect(calls).toEqual(['saveAppointment', 'releaseSlot', 'audit']);
  });

  it('blocks a patient from cancelling inside the cut-off window', async () => {
    const { service } = makeService({ startsInHours: 1 });
    await expect(service.cancel(APPT_ID, {}, patientUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets a receptionist cancel inside the cut-off window', async () => {
    const { service, appointment } = makeService({ startsInHours: 1 });
    await service.cancel(APPT_ID, {}, receptionist);
    expect(appointment.status).toBe(AppointmentStatus.CANCELLED);
  });

  it('refuses to cancel an appointment that is not BOOKED', async () => {
    const { service } = makeService({ status: AppointmentStatus.COMPLETED });
    await expect(service.cancel(APPT_ID, {}, receptionist)).rejects.toBeInstanceOf(ConflictException);
  });
});
