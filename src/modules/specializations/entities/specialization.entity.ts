import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Doctor } from '../../doctors/entities/doctor.entity.js';

@Entity('specializations')
export class Specialization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToMany('Doctor', (doctor: Doctor) => doctor.specializations)
  doctors: Doctor[];
}
