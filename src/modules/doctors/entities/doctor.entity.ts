import {
  Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne,
  OneToMany, OneToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import type { Department } from '../../departments/entities/department.entity.js';
import type { Specialization } from '../../specializations/entities/specialization.entity.js';
import type { DoctorSlot } from '../../slots/entities/doctor-slot.entity.js';
import type { User } from '../../users/entities/user.entity.js';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne('User', { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne('Department', (department: Department) => department.doctors, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'license_number', type: 'varchar', length: 80, unique: true })
  licenseNumber: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToMany('Specialization', (specialization: Specialization) => specialization.doctors)
  @JoinTable({
    name: 'doctor_specializations',
    joinColumn: { name: 'doctor_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'specialization_id', referencedColumnName: 'id' },
  })
  specializations: Specialization[];

  @OneToMany('DoctorSlot', (slot: DoctorSlot) => slot.doctor)
  slots: DoctorSlot[];
}
