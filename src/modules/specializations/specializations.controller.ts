import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SpecializationsService } from './specializations.service.js';
import { CreateSpecializationDto } from './dto/create-specialization.dto.js';
import { UpdateSpecializationDto } from './dto/update-specialization.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Specializations')
@Controller('specializations')
export class SpecializationsController {
  constructor(private readonly service: SpecializationsService) {}

  @Get() getAllSpecializations() { return this.service.getAllSpecializations(); }
  @Get(':id') getSpecializationById(@Param('id', ParseUUIDPipe) id: string) { return this.service.getSpecializationById(id); }

  @Post() @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  createSpecialization(@Body() dto: CreateSpecializationDto, @CurrentUser() user: AuthenticatedUser) { return this.service.createSpecialization(dto, user.userId); }

  @Patch(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  updateSpecialization(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSpecializationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateSpecialization(id, dto, user.userId);
  }

  @Delete(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  deleteSpecialization(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.deleteSpecialization(id, user.userId); }
}
