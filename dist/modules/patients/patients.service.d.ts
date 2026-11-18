import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity.js';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto.js';
export declare class PatientsService {
    private readonly patientRepository;
    constructor(patientRepository: Repository<Patient>);
    private toResponse;
    getMyProfile(userId: string): Promise<{
        id: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            phone: string | null;
            role: import("../../common/enums/user-role.enum.js").UserRole;
            isActive: boolean;
        };
        dateOfBirth: string | null;
        gender: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateMyProfile(userId: string, dto: UpdatePatientProfileDto): Promise<{
        id: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            phone: string | null;
            role: import("../../common/enums/user-role.enum.js").UserRole;
            isActive: boolean;
        };
        dateOfBirth: string | null;
        gender: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAllPatients(page?: number, limit?: number): Promise<{
        data: {
            id: string;
            user: {
                id: string;
                fullName: string;
                email: string;
                phone: string | null;
                role: import("../../common/enums/user-role.enum.js").UserRole;
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
            role: import("../../common/enums/user-role.enum.js").UserRole;
            isActive: boolean;
        };
        dateOfBirth: string | null;
        gender: string | null;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
