import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity.js';
import { Doctor } from '../../doctors/entities/doctor.entity.js';

export enum QueueTicketStatus {
  WAITING = 'WAITING',
  SERVING = 'SERVING',
  COMPLETED = 'COMPLETED',
}

@Entity('queue_tickets')
@Unique('uq_queue_doctor_date_token', ['doctorId', 'queueDate', 'tokenNumber'])
export class QueueTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'appointment_id', type: 'uuid', unique: true })
  appointmentId: string;

  @ManyToOne(() => Appointment, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Doctor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'queue_date', type: 'date' })
  queueDate: string;

  @Column({ name: 'token_number', type: 'integer' })
  tokenNumber: number;

  @Column({ type: 'enum', enum: QueueTicketStatus, enumName: 'queue_ticket_status', default: QueueTicketStatus.WAITING })
  status: QueueTicketStatus;

  @CreateDateColumn({ name: 'checked_in_at', type: 'timestamptz' })
  checkedInAt: Date;

  @Column({ name: 'called_at', type: 'timestamptz', nullable: true })
  calledAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
