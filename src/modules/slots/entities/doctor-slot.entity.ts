import { Check, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Doctor } from '../../doctors/entities/doctor.entity.js';

export enum SlotStatus { OPEN = 'OPEN', BLOCKED = 'BLOCKED', BOOKED = 'BOOKED' }

@Entity('doctor_slots')
@Check('"end_at" > "start_at"')
export class DoctorSlot {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'doctor_id', type: 'uuid' }) doctorId: string;

  @ManyToOne('Doctor', (doctor: Doctor) => doctor.slots, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'start_at', type: 'timestamptz' }) startAt: Date;
  @Column({ name: 'end_at', type: 'timestamptz' }) endAt: Date;

  @Column({ type: 'enum', enum: SlotStatus, enumName: 'slot_status', default: SlotStatus.OPEN })
  status: SlotStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
