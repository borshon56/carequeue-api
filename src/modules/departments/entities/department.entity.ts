import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Doctor } from '../../doctors/entities/doctor.entity.js';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany('Doctor', (doctor: Doctor) => doctor.department)
  doctors: Doctor[];
}
