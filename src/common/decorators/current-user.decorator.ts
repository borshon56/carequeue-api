import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../enums/user-role.enum.js';

/**
 * Shape of request.user, exactly as returned by Person 1's JwtStrategy.validate().
 * If Person 1 changes that return value, update this interface too.
 */
export interface AuthenticatedUser {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
}

/** The authenticated user from the validated JWT. Never read user IDs or roles from the request body. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user,
);
