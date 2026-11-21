import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Doctor slot id (doctor_slots.id) from GET /slots/available' })
  @IsUUID()
  slotId: string;

  @ApiPropertyOptional({
    description: 'Patient profile id (patients.id). Required for RECEPTIONIST. A PATIENT books for themself and may omit it.',
  })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ example: 'Chest pain for two days' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reasonForVisit?: string;
}
