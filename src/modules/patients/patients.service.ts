
import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Patient } from './entities/patient.entity.js';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto.js';
import { WalkInPatientDto } from './dto/create-walk-in-patient.dto.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { AUDIT_LOGGER, type AuditLogger } from '../../common/audit/audit-logger.js';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly dataSource: DataSource,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}

  // Return safe patient information
  private toResponse(patient: Patient) {
    return {
      id: patient.id,
      user: {
        id: patient.user.id,
        fullName: patient.user.fullName,
        email: patient.user.email,
        phone: patient.user.phone,
        role: patient.user.role,
        isActive: patient.user.isActive,
      },
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }


  /**
   * Receptionist creates the account and patient profile together.
   * The temporary password is hashed and is never included in the response.
   */
  async createWalkIn(dto: WalkInPatientDto, actorUserId: string, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();
    try {
      const patientId = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const existing = await users.findOne({ where: { email } });
        if (existing) throw new ConflictException('Email already registered');

        const user = await users.save(users.create({
          fullName: dto.fullName.trim(),
          email,
          passwordHash: await bcrypt.hash(dto.temporaryPassword, 12),
          role: UserRole.PATIENT,
          phone: dto.phone?.trim() || null,
          isActive: true,
        }));

        const patients = manager.getRepository(Patient);
        const patient = await patients.save(patients.create({
          user,
          dateOfBirth: dto.dateOfBirth ?? null,
          gender: dto.gender?.trim() || null,
          address: dto.address?.trim() || null,
        }));
        await this.audit.log({
          actorUserId,
          action: 'WALK_IN_PATIENT_REGISTERED',
          entity: 'patients',
          entityId: patient.id,
          newValues: { patientId: patient.id, patientName: user.fullName, email: user.email },
          ipAddress,
        }, manager);
        return patient.id;
      });
      return this.getPatientById(patientId);
    } catch (error) {
      const dbError = error as { code?: string; driverError?: { code?: string } };
      if (dbError.code === '23505' || dbError.driverError?.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  // Get logged-in patient's profile
  async getMyProfile(userId: string) {
    const patient = await this.patientRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    return this.toResponse(patient);
  }

  // Update logged-in patient's profile
  async updateMyProfile(
    userId: string,
    dto: UpdatePatientProfileDto,
  ) {
    const patient = await this.patientRepository.findOne({
      where: {
        user: { id: userId },
      },
      relations: {
        user: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    if (dto.dateOfBirth !== undefined) {
      patient.dateOfBirth = dto.dateOfBirth;
    }

    if (dto.gender !== undefined) {
      patient.gender = dto.gender;
    }

    if (dto.address !== undefined) {
      patient.address = dto.address;
    }

    await this.patientRepository.save(patient);

    return this.getMyProfile(userId);
  }

  // Admin and Receptionist: Get all patients
  async getAllPatients(page = 1, limit = 10) {
    const [patients, total] =
      await this.patientRepository.findAndCount({
        relations: {
          user: true,
        },
        order: {
          createdAt: 'DESC',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      data: patients.map((patient) =>
        this.toResponse(patient),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Staff: Get individual patient
  async getPatientById(id: string) {
    const patient = await this.patientRepository.findOne({
      where: { id },
      relations: {
        user: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return this.toResponse(patient);
  }
}
