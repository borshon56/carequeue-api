import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PatientsModule } from './modules/patients/patients.module.js';
import { DoctorsModule } from './modules/doctors/doctors.module.js';
import { DepartmentsModule } from './modules/departments/departments.module.js';
import { SpecializationsModule } from './modules/specializations/specializations.module.js';
import { SlotsModule } from './modules/slots/slots.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { QueueTicketsModule } from './modules/queue-tickets/queue-tickets.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';

@Module({
  imports: [AuthModule, UsersModule, PatientsModule, DoctorsModule, DepartmentsModule, SpecializationsModule, SlotsModule, AppointmentsModule, QueueTicketsModule, AuditLogsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
