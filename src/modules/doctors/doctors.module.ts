import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from './entities/doctor.entity.js';
import { DoctorsService } from './doctors.service.js';
import { DoctorsController } from './doctors.controller.js';
import { DepartmentsModule } from '../departments/departments.module.js';
import { SpecializationsModule } from '../specializations/specializations.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuditHookModule } from '../../common/audit/audit-hook.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor]), DepartmentsModule, SpecializationsModule, UsersModule, AuditHookModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
