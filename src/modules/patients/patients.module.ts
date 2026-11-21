import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Patient } from './entities/patient.entity.js';
import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';

import { AuthModule } from '../auth/auth.module.js';
import { AuditHookModule } from '../../common/audit/audit-hook.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient]),
    AuthModule,
    AuditHookModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
