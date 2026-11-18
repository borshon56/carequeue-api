import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
export declare class AuthService {
    private readonly dataSource;
    private readonly jwtService;
    constructor(dataSource: DataSource, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        message: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            role: UserRole;
        };
    }>;
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
