import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post,
  Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueueTicketsService } from './queue-tickets.service.js';
import { WalkInPatientDto } from '../patients/dto/create-walk-in-patient.dto.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { DailyQueueDto } from './dto/daily-queue.dto.js';
import { UpdateQueueStatusDto } from './dto/update-queue-status.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { ClientIp } from '../../common/decorators/client-ip.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';

@ApiTags('Queue & Check-in')
@ApiBearerAuth()
@Controller('queue-tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueTicketsController {
  constructor(private readonly queueService: QueueTicketsService) {}

  @Post('walk-in')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a walk-in patient account and patient profile' })
  registerWalkIn(
    @Body() dto: WalkInPatientDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientIp() ipAddress: string | undefined,
  ) {
    return this.queueService.registerWalkIn(dto, user, ipAddress);
  }

  @Post('check-in')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Check in a booked appointment and generate the next daily doctor token' })
  checkIn(
    @Body() dto: CheckInDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientIp() ipAddress: string | undefined,
  ) {
    return this.queueService.checkIn(dto.appointmentId, user, ipAddress);
  }

  @Get('daily')
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'View the daily queue; doctors can view only their own queue' })
  getDailyQueue(@Query() query: DailyQueueDto, @CurrentUser() user: AuthenticatedUser) {
    return this.queueService.getDailyQueue(query, user);
  }

  @Get('me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Patient: view own queue tickets' })
  getMyQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.queueService.getMyQueue(user);
  }

  @Get(':id')
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get one queue ticket' })
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.queueService.getById(id, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Move a ticket from WAITING to SERVING or SERVING to COMPLETED' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQueueStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientIp() ipAddress: string | undefined,
  ) {
    return this.queueService.updateStatus(id, dto, user, ipAddress);
  }
}
