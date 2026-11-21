
import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { PatientsService } from './patients.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto.js';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: UserRole;
  };
}
@ApiBearerAuth()
@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
  ) {}

  // Patient: View own profile
  @Get('me')
  @Roles(UserRole.PATIENT)
  @UseGuards(RolesGuard)
  getMyProfile(@Req() req: AuthenticatedRequest) {
    return this.patientsService.getMyProfile(
      req.user.userId,
    );
  }

  // Patient: Update own profile
  @Patch('me')
  @Roles(UserRole.PATIENT)
  @UseGuards(RolesGuard)
  updateMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientsService.updateMyProfile(
      req.user.userId,
      dto,
    );
  }

  // Admin and Receptionist: View all patients
  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @UseGuards(RolesGuard)
  getAllPatients(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,

    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    return this.patientsService.getAllPatients(
      safePage,
      safeLimit,
    );
  }

  // Admin, Receptionist and Doctor: View individual patient
  @Get(':id')
  @Roles(
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.DOCTOR,
  )
  @UseGuards(RolesGuard)
 getPatientById(
  @Param('id', ParseUUIDPipe) id: string,
  @CurrentUser() actor: AuthenticatedUser,
) {
  return this.patientsService.getPatientByIdForActor(id, actor);
}
}
