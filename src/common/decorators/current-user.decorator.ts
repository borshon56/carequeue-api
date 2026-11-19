import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../enums/user-role.enum.js';

export interface AuthenticatedUser {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
);
