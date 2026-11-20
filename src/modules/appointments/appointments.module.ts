import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Appointment } from './entities/appointment.entity.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';

import { SlotsModule } from '../slots/slots.module.js';
import { PatientsModule } from '../patients/patients.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { AuditHookModule } from '../../common/audit/audit-hook.module.js';

/**
 * Person 3: appointments.
 * Uses Person 2's SlotsService (lock/mark/release), Person 1's PatientsService,
 * and the shared audit hook. Exports AppointmentsService so the queue (Person 4)
 * can check in and complete appointments inside its own transaction.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), SlotsModule, PatientsModule, DoctorsModule, AuditHookModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
