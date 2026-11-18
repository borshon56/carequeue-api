import { PatientsService } from './patients.service.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto.js';
interface AuthenticatedRequest {
    user: {
        userId: string;
        role: UserRole;
    };
}
export declare class PatientsController {
    private readonly patientsService;
    constructor(patientsService: PatientsService);
    getMyProfile(req: AuthenticatedRequest): Promise<{
        id: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            phone: string | null;
            role: UserRole;
            isActive: boolean;
        };
        dateOfBirth: string | null;
        gender: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateMyProfile(req: AuthenticatedRequest, dto: UpdatePatientProfileDto): Promise<{
        id: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            phone: string | null;
            role: UserRole;
            isActive: boolean;
        };
        dateOfBirth: string | null;
        gender: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAllPatients(page: number, limit: number): Promise<{
        data: {
            id: string;
            user: {
                id: string;
                fullName: string;
                email: string;
                phone: string | null;
                role: UserRole;
                isActive: boolean;
            };
            dateOfBirth: string | null;
            gender: string | null;
            address: string | null;
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
    getPatientById(id: string): Promise<{
        id: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            phone: string | null;
            role: UserRole;
            isActive: boolean;
        };
        dateOfBirth: string | null;
        gender: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
