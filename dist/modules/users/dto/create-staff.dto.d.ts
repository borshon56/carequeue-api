import { UserRole } from '../../../common/enums/user-role.enum.js';
export declare class CreateStaffDto {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
}
