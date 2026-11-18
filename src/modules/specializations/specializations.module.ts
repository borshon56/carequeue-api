import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Specialization } from './entities/specialization.entity.js';
import { SpecializationsService } from './specializations.service.js';
import { SpecializationsController } from './specializations.controller.js';
import { AuditHookModule } from '../../common/audit/audit-hook.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Specialization]), AuditHookModule],
  controllers: [SpecializationsController],
  providers: [SpecializationsService],
  exports: [SpecializationsService],
})
export class SpecializationsModule {}
