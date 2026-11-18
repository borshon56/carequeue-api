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
import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
let UsersService = class UsersService {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    safeUser(user) {
        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            phone: user.phone,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
    async getProfile(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return this.safeUser(user);
    }
    async updateProfile(userId, dto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (dto.fullName !== undefined) {
            user.fullName = dto.fullName;
        }
        if (dto.phone !== undefined) {
            user.phone = dto.phone;
        }
        const updatedUser = await this.userRepository.save(user);
        return this.safeUser(updatedUser);
    }
    async getAllUsers(page = 1, limit = 10) {
        const [users, total] = await this.userRepository.findAndCount({
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            data: users.map((user) => this.safeUser(user)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async createStaff(dto) {
        if (![UserRole.DOCTOR, UserRole.RECEPTIONIST].includes(dto.role)) {
            throw new BadRequestException('Only Doctor and Receptionist accounts can be created here');
        }
        const email = dto.email.toLowerCase().trim();
        const existingUser = await this.userRepository.findOne({
            where: { email },
        });
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = this.userRepository.create({
            fullName: dto.fullName,
            email,
            passwordHash,
            role: dto.role,
            phone: dto.phone ?? null,
        });
        try {
            const savedUser = await this.userRepository.save(user);
            return this.safeUser(savedUser);
        }
        catch (error) {
            const dbError = error;
            if (dbError.code === '23505' ||
                dbError.driverError?.code === '23505') {
                throw new ConflictException('Email already registered');
            }
            throw error;
        }
    }
    async updateRole(id, dto, adminId) {
        if (id === adminId) {
            throw new ForbiddenException('You cannot change your own role');
        }
        const user = await this.userRepository.findOne({
            where: { id },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        user.role = dto.role;
        const updatedUser = await this.userRepository.save(user);
        return this.safeUser(updatedUser);
    }
    async deactivateUser(id, adminId) {
        if (id === adminId) {
            throw new ForbiddenException('You cannot deactivate your own account');
        }
        const user = await this.userRepository.findOne({
            where: { id },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        user.isActive = false;
        await this.userRepository.save(user);
        return {
            message: 'User deactivated successfully',
        };
    }
};
UsersService = __decorate([
    Injectable(),
    __param(0, InjectRepository(User)),
    __metadata("design:paramtypes", [Repository])
], UsersService);
export { UsersService };
//# sourceMappingURL=users.service.js.map