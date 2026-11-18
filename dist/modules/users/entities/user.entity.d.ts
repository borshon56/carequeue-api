import { UserRole } from '../../../common/enums/user-role.enum.js';
export declare class User {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
