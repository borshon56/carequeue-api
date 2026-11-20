import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class DailyQueueDto {
  @ApiPropertyOptional({ description: 'Doctor profile UUID. Doctors are restricted to their own profile.' })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional({ example: '2026-11-21', description: 'Service date in HOSPITAL_TIME_ZONE; defaults to today' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
