
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

import { AuthModule } from '../auth/auth.module.js';
import { AuditHookModule } from '../../common/audit/audit-hook.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
    AuditHookModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
