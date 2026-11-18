
import { Injectable, ConflictException, UnauthorizedException} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity.js';
import { Patient } from '../patients/entities/patient.entity.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const patientRepo = manager.getRepository(Patient);

        const email = dto.email.toLowerCase().trim();

        const existingUser = await userRepo.findOne({
          where: { email },
        });

        if (existingUser) {
          throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const user = userRepo.create({
          fullName: dto.fullName,
          email,
          passwordHash,
          phone: dto.phone ?? null,
          role: UserRole.PATIENT,
        });

        const savedUser = await userRepo.save(user);

        const patient = patientRepo.create({
          user: savedUser,
          dateOfBirth: dto.dateOfBirth ?? null,
          gender: dto.gender ?? null,
          address: dto.address ?? null,
        });

        await patientRepo.save(patient);

        return {
          message: 'Registration successful',
          user: {
            id: savedUser.id,
            fullName: savedUser.fullName,
            email: savedUser.email,
            role: savedUser.role,
          },
        };
      });
    } catch (error) {
      const dbError = error as { driverError?: { code?: string } };

      if (dbError.driverError?.code === '23505') {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async login(dto: LoginDto) {
    const userRepo = this.dataSource.getRepository(User);

    const user = await userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
      select: {
        id: true,
        fullName: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
