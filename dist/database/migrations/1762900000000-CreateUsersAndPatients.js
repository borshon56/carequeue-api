import { Table, TableForeignKey, TableUnique, } from 'typeorm';
export class CreateUsersAndPatients1762900000000 {
    name = 'CreateUsersAndPatients1762900000000';
    async up(queryRunner) {
        await queryRunner.createTable(new Table({
            name: 'users',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'gen_random_uuid()',
                },
                {
                    name: 'full_name',
                    type: 'varchar',
                    length: '100',
                    isNullable: false,
                },
                {
                    name: 'email',
                    type: 'varchar',
                    length: '150',
                    isNullable: false,
                },
                {
                    name: 'password_hash',
                    type: 'varchar',
                    length: '255',
                    isNullable: false,
                },
                {
                    name: 'role',
                    type: 'enum',
                    enum: [
                        'PATIENT',
                        'RECEPTIONIST',
                        'DOCTOR',
                        'ADMIN',
                    ],
                    enumName: 'users_role_enum',
                    default: "'PATIENT'",
                },
                {
                    name: 'phone',
                    type: 'varchar',
                    length: '20',
                    isNullable: true,
                },
                {
                    name: 'is_active',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamptz',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamptz',
                    default: 'now()',
                },
            ],
        }));
        await queryRunner.createUniqueConstraint('users', new TableUnique({
            name: 'UQ_users_email',
            columnNames: ['email'],
        }));
        await queryRunner.createTable(new Table({
            name: 'patients',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'gen_random_uuid()',
                },
                {
                    name: 'user_id',
                    type: 'uuid',
                    isNullable: false,
                },
                {
                    name: 'date_of_birth',
                    type: 'date',
                    isNullable: true,
                },
                {
                    name: 'gender',
                    type: 'varchar',
                    length: '20',
                    isNullable: true,
                },
                {
                    name: 'address',
                    type: 'text',
                    isNullable: true,
                },
                {
                    name: 'created_at',
                    type: 'timestamptz',
                    default: 'now()',
                },
                {
                    name: 'updated_at',
                    type: 'timestamptz',
                    default: 'now()',
                },
            ],
        }));
        await queryRunner.createUniqueConstraint('patients', new TableUnique({
            name: 'UQ_patients_user_id',
            columnNames: ['user_id'],
        }));
        await queryRunner.createForeignKey('patients', new TableForeignKey({
            name: 'FK_patients_users',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropTable('patients');
        await queryRunner.dropTable('users');
    }
}
//# sourceMappingURL=1762900000000-CreateUsersAndPatients.js.map