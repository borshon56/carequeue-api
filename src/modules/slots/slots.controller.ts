import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SlotsService } from './slots.service.js';
import { CreateSlotDto } from './dto/create-slot.dto.js';
import { UpdateSlotDto } from './dto/update-slot.dto.js';
import { GenerateSlotsDto } from './dto/generate-slots.dto.js';
import { AvailableSlotsDto } from './dto/available-slots.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Doctor slots')
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  // Static routes are declared before ':id' so they are matched first.

  @Get('available')
  @ApiOperation({ summary: 'Public: future OPEN slots of active doctors (paginated)' })
  getAvailableSlots(@Query() dto: AvailableSlotsDto) { return this.slotsService.getAvailableSlots(dto); }

  @Get('me') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: "Logged-in doctor's own slots" })
  getMySlots(@CurrentUser() user: AuthenticatedUser) { return this.slotsService.getMySlots(user); }

  @Get('doctor/:doctorId') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  getDoctorSlots(@Param('doctorId', ParseUUIDPipe) doctorId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.slotsService.getDoctorSlots(doctorId, user);
  }

  @Post() @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create one slot (doctorId optional for doctors)' })
  createSlot(@Body() dto: CreateSlotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.slotsService.createSlot(dto, user);
  }

  @Post('generate') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create back-to-back slots for a working block (all or nothing)' })
  generateSlots(@Body() dto: GenerateSlotsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.slotsService.generateSlots(dto, user);
  }

  @Get(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  getSlotById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.slotsService.getSlotByIdForActor(id, user);
  }

  @Patch(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  updateSlot(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSlotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.slotsService.updateSlot(id, dto, user);
  }

  @Delete(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  deleteSlot(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.slotsService.deleteSlot(id, user);
  }
}
