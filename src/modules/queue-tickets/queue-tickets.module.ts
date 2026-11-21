import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueTicket } from './entities/queue-ticket.entity.js';
import { QueueTicketsController } from './queue-tickets.controller.js';
import { QueueTicketsService } from './queue-tickets.service.js';
import { PatientsModule } from '../patients/patients.module.js';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { AuditHookModule } from '../../common/audit/audit-hook.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([QueueTicket]),
    PatientsModule,
    AppointmentsModule,
    DoctorsModule,
    AuditHookModule,
  ],
  controllers: [QueueTicketsController],
  providers: [QueueTicketsService],
})
export class QueueTicketsModule {}
