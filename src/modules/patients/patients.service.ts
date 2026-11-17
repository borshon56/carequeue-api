
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Patient } from './entities/patient.entity.js';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto.js';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
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
