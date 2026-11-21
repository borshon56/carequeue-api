
import { Injectable,Inject, NotFoundException, BadRequestException, ConflictException, ForbiddenException} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource,Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { AUDIT_LOGGER, type AuditLogger } from '../../common/audit/audit-logger.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,

    @Inject(AUDIT_LOGGER)
    private readonly audit: AuditLogger,
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
  async createStaff(dto: CreateStaffDto, actorUserId: string) {
  if (
    dto.role !== UserRole.DOCTOR &&
    dto.role !== UserRole.RECEPTIONIST
  ) {
    throw new BadRequestException(
      'Only Doctor and Receptionist accounts can be created here',
    );
  }

  const email = dto.email.trim().toLowerCase();
  const fullName = dto.fullName.trim();

  if (!fullName) {
    throw new BadRequestException('Full name is required');
  }

  const passwordHash = await bcrypt.hash(dto.password, 12);

  try {
    const savedUser = await this.dataSource.transaction(
      async (manager) => {
        const users = manager.getRepository(User);

        const existing = await users.findOne({
          where: { email },
        });

        if (existing) {
          throw new ConflictException('Email already registered');
        }

        const user = await users.save(users.create({
          fullName,
          email,
          passwordHash,
          role: dto.role,
          phone: dto.phone?.trim() || null,
          isActive: true,
        }));

        await this.audit.log({
          actorUserId,
          action: 'STAFF_CREATED',
          entity: 'users',
          entityId: user.id,
          newValues: {
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          },
        }, manager);

        return user;
      },
    );

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

  return this.dataSource.transaction(async (manager) => {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['carequeue:active-admins'],
    );

    const users = manager.getRepository(User);

    const user = await users.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === dto.role) {
      return this.safeUser(user);
    }

    if (user.role === UserRole.ADMIN && user.isActive) {
      const count = await users.count({
        where: {
          role: UserRole.ADMIN,
          isActive: true,
        },
      });

      if (count <= 1) {
        throw new ForbiddenException(
          'Cannot demote the last active administrator',
        );
      }
    }

    const oldRole = user.role;
    user.role = dto.role;

    const updated = await users.save(user);

    await this.audit.log({
      actorUserId: adminId,
      action: 'USER_ROLE_UPDATED',
      entity: 'users',
      entityId: user.id,
      oldValues: { role: oldRole },
      newValues: { role: updated.role },
    }, manager);

    return this.safeUser(updated);
  });
}

  // Admin: deactivate user
  async deactivateUser(id: string, adminId: string) {
  if (id === adminId) {
    throw new ForbiddenException(
      'You cannot deactivate your own account',
    );
  }

  return this.dataSource.transaction(async (manager) => {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['carequeue:active-admins'],
    );

    const users = manager.getRepository(User);

    const user = await users.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      return { message: 'User is already inactive' };
    }

    if (user.role === UserRole.ADMIN) {
      const count = await users.count({
        where: {
          role: UserRole.ADMIN,
          isActive: true,
        },
      });

      if (count <= 1) {
        throw new ForbiddenException(
          'Cannot deactivate the last active administrator',
        );
      }
    }

    const oldValues = { isActive: user.isActive };

    user.isActive = false;
    await users.save(user);

    await this.audit.log({
      actorUserId: adminId,
      action: 'USER_DEACTIVATED',
      entity: 'users',
      entityId: user.id,
      oldValues,
      newValues: { isActive: false },
    }, manager);

    return { message: 'User deactivated successfully' };
  });
}
}