import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get() getAllDepartments() { return this.service.getAllDepartments(); }
  @Get(':id') getDepartmentById(@Param('id', ParseUUIDPipe) id: string) { return this.service.getDepartmentById(id); }

  @Post() @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  createDepartment(@Body() dto: CreateDepartmentDto, @CurrentUser() user: AuthenticatedUser) { return this.service.createDepartment(dto, user.userId); }

  @Patch(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  updateDepartment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateDepartment(id, dto, user.userId);
  }

  @Delete(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  deleteDepartment(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.deleteDepartment(id, user.userId); }
}
