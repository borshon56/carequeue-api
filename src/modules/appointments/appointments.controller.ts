import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';
import { AppointmentQueryDto } from './dto/appointment-query.dto.js';
import { MyAppointmentsQueryDto } from './dto/my-appointments-query.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserRole.PATIENT, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Book a slot (patient for themself, receptionist for a patient)' })
  book(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.book(dto, user);
  }

  // Static route before ':id' so 'me' is not parsed as an id.
  @Get('me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: "Patient: own appointment history (paginated)" })
  getMine(@Query() query: MyAppointmentsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.getMyAppointments(user, query);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Staff: appointments with filters; a doctor sees only their own' })
  getAll(@Query() query: AppointmentQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.getAppointments(user, query);
  }

  @Get(':id')
  @Roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'One appointment (patients and doctors: own only)' })
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.getAppointment(id, user);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a BOOKED appointment and free the slot (patients: up to the cut-off)' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointmentsService.cancel(id, dto, user);
  }

  @Patch(':id/no-show')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark a BOOKED appointment as no-show (after its start time)' })
  noShow(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.markNoShow(id, user);
  }
}
