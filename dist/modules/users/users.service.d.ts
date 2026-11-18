import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
export declare class UsersService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    private safeUser;
    getProfile(userId: string): Promise<{
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAllUsers(page?: number, limit?: number): Promise<{
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
    updateRole(id: string, dto: UpdateRoleDto, adminId: string): Promise<{
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivateUser(id: string, adminId: string): Promise<{
        message: string;
    }>;
}
