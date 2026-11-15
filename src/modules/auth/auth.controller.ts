
import { Controller, Post, Body, HttpCode, HttpStatus} from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import {
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from './guards/roles.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
@UseGuards(JwtAuthGuard)
getProfile(
  @Req() req: {
    user: {
      userId: string;
      fullName: string;
      email: string;
      role: UserRole;
    };
  },
) {
  return req.user;
}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
  @Get('admin-check')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
adminCheck() {
  return {
    message: 'Admin access granted',
  };
}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
