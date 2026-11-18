import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    getProfile(req: {
        user: {
            userId: string;
            fullName: string;
            email: string;
            role: UserRole;
        };
    }): {
        userId: string;
        fullName: string;
        email: string;
        role: UserRole;
    };
    register(dto: RegisterDto): Promise<{
        message: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            role: UserRole;
        };
    }>;
    adminCheck(): {
        message: string;
    };
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            role: UserRole;
        };
    }>;
}
