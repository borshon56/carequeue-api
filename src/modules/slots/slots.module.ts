import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorSlot } from './entities/doctor-slot.entity.js';
import { SlotsService } from './slots.service.js';
import { SlotsController } from './slots.controller.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { AuditHookModule } from '../../common/audit/audit-hook.module.js';

/** Exports SlotsService: Person 3 uses lockSlotForBooking / markSlotBooked / releaseSlot. */
@Module({
  imports: [TypeOrmModule.forFeature([DoctorSlot]), DoctorsModule, AuditHookModule],
  controllers: [SlotsController],
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
