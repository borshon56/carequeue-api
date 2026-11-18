import * as bcrypt from 'bcrypt';
import dataSource from '../data-source.js';
import { User } from '../../modules/users/entities/user.entity.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
async function seedAdmin() {
    try {
        const fullName = process.env.ADMIN_FULL_NAME?.trim();
        const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD;
        if (!email || !password) {
            throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env');
        }
        await dataSource.initialize();
        const userRepository = dataSource.getRepository(User);
        const existingUser = await userRepository.findOne({
            where: { email },
        });
        if (existingUser) {
            if (existingUser.role === UserRole.ADMIN) {
                console.log('Admin account already exists.');
                return;
            }
            throw new Error('This email already belongs to a non-admin user.');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const admin = userRepository.create({
            fullName: fullName || 'System Administrator',
            email,
            passwordHash,
            role: UserRole.ADMIN,
            phone: null,
            isActive: true,
        });
        await userRepository.save(admin);
        console.log('Admin account created successfully!');
        console.log(`Email: ${email}`);
    }
    finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}
seedAdmin().catch((error) => {
    console.error('Admin seeding failed:', error);
    process.exitCode = 1;
});
//# sourceMappingURL=admin.seed.js.map