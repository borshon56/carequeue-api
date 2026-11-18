import { User } from '../../users/entities/user.entity.js';
export declare class Patient {
    id: string;
    user: User;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
}
