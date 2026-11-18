import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service.js';
import { CreateDoctorDto } from './dto/create-doctor.dto.js';
import { UpdateDoctorDto } from './dto/update-doctor.dto.js';
import { SearchDoctorDto } from './dto/search-doctor.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  // Static routes first so 'me' / 'admin' are not parsed as ':id'.

  @Get()
  @ApiOperation({ summary: 'Public: search active doctors (paginated)' })
  getAllDoctors(@Query() filters: SearchDoctorDto) { return this.doctorsService.getAllDoctors(filters); }

  @Get('me') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: "Logged-in doctor's own profile" })
  getMyProfile(@CurrentUser() user: AuthenticatedUser) { return this.doctorsService.getMyProfile(user.userId); }

  @Get('admin/:id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: any doctor, including inactive' })
  getDoctorForAdmin(@Param('id', ParseUUIDPipe) id: string) { return this.doctorsService.getDoctorById(id); }

  @Get(':id')
  @ApiOperation({ summary: 'Public: one active doctor' })
  getDoctorById(@Param('id', ParseUUIDPipe) id: string) { return this.doctorsService.getPublicDoctorById(id); }

  @Post() @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a doctor profile for an existing DOCTOR user account' })
  createDoctor(@Body() dto: CreateDoctorDto, @CurrentUser() user: AuthenticatedUser) { return this.doctorsService.createDoctor(dto, user.userId); }

  @Patch(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  updateDoctor(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDoctorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.doctorsService.updateDoctor(id, dto, user.userId);
  }

  @Delete(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate (soft delete); blocks future open slots, lists future booked ones' })
  deactivateDoctor(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.doctorsService.deactivateDoctor(id, user.userId);
  }

  @Post(':id/reactivate') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  reactivateDoctor(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.doctorsService.reactivateDoctor(id, user.userId);
  }

  @Post(':id/specializations/:specializationId') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  assignSpecialization(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('specializationId', ParseUUIDPipe) specializationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.doctorsService.assignSpecialization(id, specializationId, user.userId);
  }

  @Delete(':id/specializations/:specializationId') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  removeSpecialization(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('specializationId', ParseUUIDPipe) specializationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.doctorsService.removeSpecialization(id, specializationId, user.userId);
  }
}
