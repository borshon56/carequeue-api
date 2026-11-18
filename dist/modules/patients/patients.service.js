var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity.js';
let PatientsService = class PatientsService {
    patientRepository;
    constructor(patientRepository) {
        this.patientRepository = patientRepository;
    }
    toResponse(patient) {
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
    async getMyProfile(userId) {
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
    async updateMyProfile(userId, dto) {
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
    async getAllPatients(page = 1, limit = 10) {
        const [patients, total] = await this.patientRepository.findAndCount({
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
            data: patients.map((patient) => this.toResponse(patient)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getPatientById(id) {
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
};
PatientsService = __decorate([
    Injectable(),
    __param(0, InjectRepository(Patient)),
    __metadata("design:paramtypes", [Repository])
], PatientsService);
export { PatientsService };
//# sourceMappingURL=patients.service.js.map