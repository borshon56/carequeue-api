var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
            }),
            TypeOrmModule.forRootAsync({
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('DB_HOST', 'localhost'),
                    port: Number(config.get('DB_PORT', '5432')),
                    username: config.get('DB_USERNAME', 'postgres'),
                    password: config.get('DB_PASSWORD', ''),
                    database: config.get('DB_NAME', 'carequeue'),
                    autoLoadEntities: true,
                    synchronize: false,
                }),
            }),
            AuthModule,
            UsersModule,
            PatientsModule,
            DoctorsModule,
            DepartmentsModule,
            SpecializationsModule,
            SlotsModule,
            AppointmentsModule,
            QueueTicketsModule,
            AuditLogsModule,
        ],
        controllers: [AppController],
        providers: [AppService],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map