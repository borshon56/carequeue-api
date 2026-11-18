import { UsersService } from './users.service.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
interface AuthenticatedRequest {
    user: {
        userId: string;
        role: UserRole;
    };
}
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: AuthenticatedRequest): Promise<{
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(req: AuthenticatedRequest, dto: UpdateProfileDto): Promise<{
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAllUsers(page: number, limit: number): Promise<{
        data: {
            id: string;
            fullName: string;
            email: string;
            role: UserRole;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createStaff(dto: CreateStaffDto): Promise<{
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRole(id: string, dto: UpdateRoleDto, req: AuthenticatedRequest): Promise<{
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivateUser(id: string, req: AuthenticatedRequest): Promise<{
        message: string;
    }>;
}
export {};
