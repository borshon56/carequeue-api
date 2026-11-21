import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Doctor } from './entities/doctor.entity.js';
import { DoctorSlot, SlotStatus } from '../slots/entities/doctor-slot.entity.js';
import { DepartmentsService } from '../departments/departments.service.js';
import { SpecializationsService } from '../specializations/specializations.service.js';
import { UsersService } from '../users/users.service.js';
import { CreateDoctorDto } from './dto/create-doctor.dto.js';
import { UpdateDoctorDto } from './dto/update-doctor.dto.js';
import { SearchDoctorDto } from './dto/search-doctor.dto.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { Paginated } from '../../common/dto/pagination.dto.js';
import { AUDIT_LOGGER, type AuditLogger } from '../../common/audit/audit-logger.js';

export interface DeactivationResult {
  message: string;
  blockedOpenSlots: number;
  futureBookedSlots: Array<{ slotId: string; startAt: Date }>;
}

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor) private readonly doctorsRepo: Repository<Doctor>,
    private readonly usersService: UsersService,
    private readonly departmentsService: DepartmentsService,
    private readonly specializationsService: SpecializationsService,
    private readonly dataSource: DataSource,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}

  async createDoctor(dto: CreateDoctorDto, actorId: string): Promise<Doctor> {
    const user = await this.usersService.getProfile(dto.userId);
    if (!user.isActive) throw new BadRequestException('User account is inactive');
    if (user.role !== UserRole.DOCTOR) throw new BadRequestException('User must have the DOCTOR role');
    const department = await this.departmentsService.getDepartmentById(dto.departmentId);
    const licenseNumber = dto.licenseNumber.trim();
    if (!licenseNumber) throw new BadRequestException('License number required');
    const doctor = this.doctorsRepo.create({
      userId: user.id, departmentId: department.id,
      licenseNumber, bio: dto.bio ?? null, isActive: true,
    });
    let saved: Doctor;
    try { saved = await this.doctorsRepo.save(doctor); }
    catch (error) { this.handleConstraint(error); throw error; }
    await this.audit.log({ actorUserId: actorId, action: 'DOCTOR_CREATED', entity: 'doctors', entityId: saved.id, newValues: saved });
    return saved;
  }

  async getAllDoctors(filters: SearchDoctorDto): Promise<Paginated<Doctor>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const qb = this.doctorsRepo.createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.department', 'department')
      .leftJoinAndSelect('doctor.specializations', 'specialization')
      .innerJoin('doctor.user', 'user')
      .addSelect(['user.id', 'user.fullName'])
      .where('doctor.is_active = true')
      .andWhere('user.is_active = true');
    if (filters.departmentId) qb.andWhere('doctor.department_id = :departmentId', { departmentId: filters.departmentId });
    if (filters.specializationId) {
      qb.andWhere('EXISTS (SELECT 1 FROM doctor_specializations ds WHERE ds.doctor_id = doctor.id AND ds.specialization_id = :specializationId)',
        { specializationId: filters.specializationId });
    }
    if (filters.search?.trim()) {
      qb.andWhere("(LOWER(doctor.license_number) LIKE :search OR LOWER(COALESCE(user.full_name, '')) LIKE :search)",
        { search: `%${filters.search.trim().toLowerCase()}%` });
    }
    const [items, total] = await qb
      .orderBy('user.full_name', 'ASC').addOrderBy('doctor.id', 'ASC')
      .skip((page - 1) * limit).take(limit)
      .getManyAndCount();
    return { items, page, limit, total };
  }

  async getPublicDoctorById(id: string): Promise<Doctor> {
    const doctor = await this.findWithDetails(id);
    if (!doctor || !doctor.isActive || !doctor.user?.isActive) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async getDoctorById(id: string): Promise<Doctor> {
    const doctor = await this.findWithDetails(id);
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async getDoctorByUserId(userId: string): Promise<Doctor | null> {
    return this.doctorsRepo.findOneBy({ userId, isActive: true });
  }

  async getMyProfile(userId: string): Promise<Doctor> {
    const doctor = await this.doctorsRepo.findOneBy({ userId });
    if (!doctor) throw new NotFoundException('No doctor profile is linked to this account. Ask an administrator to create one');
    return this.getDoctorById(doctor.id);
  }

  async updateDoctor(id: string, dto: UpdateDoctorDto, actorId: string): Promise<Doctor> {
    const doctor = await this.getDoctorById(id);
    const before = { departmentId: doctor.departmentId, licenseNumber: doctor.licenseNumber, bio: doctor.bio };
    if (dto.departmentId !== undefined) {
      await this.departmentsService.getDepartmentById(dto.departmentId);
      doctor.departmentId = dto.departmentId;
    }
    if (dto.licenseNumber !== undefined) {
      doctor.licenseNumber = dto.licenseNumber.trim();
      if (!doctor.licenseNumber) throw new BadRequestException('License number required');
    }
    if (dto.bio !== undefined) doctor.bio = dto.bio;
    try {
      await this.doctorsRepo.update(id, {
        departmentId: doctor.departmentId, licenseNumber: doctor.licenseNumber, bio: doctor.bio,
      });
    } catch (error) { this.handleConstraint(error); throw error; }
    await this.audit.log({
      actorUserId: actorId, action: 'DOCTOR_UPDATED', entity: 'doctors', entityId: id, oldValues: before,
      newValues: { departmentId: doctor.departmentId, licenseNumber: doctor.licenseNumber, bio: doctor.bio },
    });
    return this.getDoctorById(id);
  }

  async deactivateDoctor(id: string, actorId: string): Promise<DeactivationResult> {
    return this.dataSource.transaction(async (manager) => {
      const doctor = await manager.getRepository(Doctor).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!doctor) throw new NotFoundException('Doctor not found');
      if (!doctor.isActive) throw new ConflictException('Doctor is already inactive');
      await manager.getRepository(Doctor).update(id, { isActive: false });
      const now = new Date();
      const blocked = await manager.createQueryBuilder().update(DoctorSlot)
        .set({ status: SlotStatus.BLOCKED })
        .where('doctor_id = :id AND status = :open AND start_at > :now', { id, open: SlotStatus.OPEN, now })
        .execute();
      const booked = await manager.getRepository(DoctorSlot).createQueryBuilder('slot')
        .where('slot.doctor_id = :id AND slot.status = :booked AND slot.start_at > :now', { id, booked: SlotStatus.BOOKED, now })
        .orderBy('slot.start_at', 'ASC')
        .getMany();
      await this.audit.log({
        actorUserId: actorId, action: 'DOCTOR_DEACTIVATED', entity: 'doctors', entityId: id,
        newValues: { blockedOpenSlots: blocked.affected ?? 0, futureBookedSlots: booked.length },
      }, manager);
      return {
        message: 'Doctor deactivated; historical records preserved',
        blockedOpenSlots: blocked.affected ?? 0,
        futureBookedSlots: booked.map((slot) => ({ slotId: slot.id, startAt: slot.startAt })),
      };
    });
  }

  async reactivateDoctor(id: string, actorId: string): Promise<Doctor> {
    const doctor = await this.getDoctorById(id);
    if (doctor.isActive) throw new ConflictException('Doctor is already active');
    await this.doctorsRepo.update(id, { isActive: true });
    await this.audit.log({ actorUserId: actorId, action: 'DOCTOR_REACTIVATED', entity: 'doctors', entityId: id });
    return this.getDoctorById(id);
  }

  async assignSpecialization(doctorId: string, specializationId: string, actorId: string): Promise<Doctor> {
    const doctor = await this.getDoctorById(doctorId);
    const specialization = await this.specializationsService.getSpecializationById(specializationId);
    if (doctor.specializations.some((s) => s.id === specializationId)) {
      throw new ConflictException('Doctor already has this specialization');
    }
    try {
      await this.doctorsRepo.createQueryBuilder().relation(Doctor, 'specializations').of(doctorId).add(specialization.id);
    } catch (error) { this.handleConstraint(error); throw error; }
    await this.audit.log({
      actorUserId: actorId, action: 'DOCTOR_SPECIALIZATION_ADDED', entity: 'doctors', entityId: doctorId, newValues: { specializationId },
    });
    return this.getDoctorById(doctorId);
  }

  async removeSpecialization(doctorId: string, specializationId: string, actorId: string): Promise<Doctor> {
    const doctor = await this.getDoctorById(doctorId);
    if (!doctor.specializations.some((s) => s.id === specializationId)) {
      throw new NotFoundException('Doctor does not have this specialization');
    }
    await this.doctorsRepo.createQueryBuilder().relation(Doctor, 'specializations').of(doctorId).remove(specializationId);
    await this.audit.log({
      actorUserId: actorId, action: 'DOCTOR_SPECIALIZATION_REMOVED', entity: 'doctors', entityId: doctorId, oldValues: { specializationId },
    });
    return this.getDoctorById(doctorId);
  }

  private findWithDetails(id: string): Promise<Doctor | null> {
    return this.doctorsRepo.createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.department', 'department')
      .leftJoinAndSelect('doctor.specializations', 'specialization')
      .leftJoin('doctor.user', 'user')
      .addSelect(['user.id', 'user.fullName', 'user.isActive'])
      .where('doctor.id = :id', { id })
      .getOne();
  }

  private handleConstraint(error: unknown): void {
    const code = (error as { code?: string; constraint?: string })?.code;
    const constraint = (error as { constraint?: string })?.constraint ?? '';
    if (code === '23505') {
      if (constraint.includes('license') || /license_number/.test(String((error as { detail?: string }).detail))) {
        throw new ConflictException('License number already exists');
      }
      if (/user_id/.test(String((error as { detail?: string }).detail))) throw new ConflictException('This user already has a doctor profile');
      throw new ConflictException('Duplicate value');
    }
    if (code === '23503') throw new ConflictException('Referenced user or department no longer exists');
  }
}
