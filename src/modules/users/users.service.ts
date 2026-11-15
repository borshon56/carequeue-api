
import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private safeUser(user: User) {
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

  // Get own profile
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.safeUser(user);
  }

  // Update own profile
  async updateProfile(userId: string, dto: UpdateProfileDto) {
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

  // Admin: view all users with pagination
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

  // Admin: create staff account
  async createStaff(dto: CreateStaffDto) {
    if (![UserRole.DOCTOR, UserRole.RECEPTIONIST].includes(dto.role)) {
      throw new BadRequestException(
        'Only Doctor and Receptionist accounts can be created here',
      );
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
    } catch (error) {
      const dbError = error as {
        code?: string;
        driverError?: { code?: string };
      };

      if (
        dbError.code === '23505' ||
        dbError.driverError?.code === '23505'
      ) {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  // Admin: change user role
  async updateRole(
    id: string,
    dto: UpdateRoleDto,
    adminId: string,
  ) {
    if (id === adminId) {
      throw new ForbiddenException(
        'You cannot change your own role',
      );
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

  // Admin: deactivate user
  async deactivateUser(id: string, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException(
        'You cannot deactivate your own account',
      );
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
}
