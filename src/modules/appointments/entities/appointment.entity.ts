import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Patient } from '../../patients/entities/patient.entity.js';
import { DoctorSlot } from '../../slots/entities/doctor-slot.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * Appointment lifecycle:
 *   BOOKED -> CANCELLED   (patient/receptionist/admin; frees the slot)
 *   BOOKED -> CHECKED_IN  (receptionist check-in at the queue, Person 4)
 *   CHECKED_IN -> COMPLETED (doctor completes the queue ticket, Person 4)
 *   BOOKED -> NO_SHOW     (receptionist/admin, after the start time)
 */
export enum AppointmentStatus {
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'slot_id', type: 'uuid' })
  slotId: string;

  @ManyToOne(() => DoctorSlot, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'slot_id' })
  slot: DoctorSlot;

  /** Who made the booking: the patient themself, or a receptionist. */
  @Column({ name: 'booked_by_user_id', type: 'uuid' })
  bookedByUserId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booked_by_user_id' })
  bookedBy: User;

  @Column({ name: 'reason_for_visit', type: 'text', nullable: true })
  reasonForVisit: string | null;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    enumName: 'appointment_status',
    default: AppointmentStatus.BOOKED,
  })
  status: AppointmentStatus;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
