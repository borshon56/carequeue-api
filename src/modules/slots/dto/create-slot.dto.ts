import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { SlotStatus } from '../entities/doctor-slot.entity.js';

const TZ = /(?:Z|[+-]\d{2}:\d{2})$/;

export class CreateSlotDto {
  /** Required for ADMIN. A DOCTOR may omit it: their own doctor profile is taken from the JWT. */
  @IsOptional() @IsUUID()
  @ApiPropertyOptional() doctorId?: string;

  @IsDateString() @Matches(TZ, { message: 'startAt must include Z or a timezone offset' })
  @ApiProperty({ example: '2027-01-20T09:00:00+06:00' }) startAt: string;

  @IsDateString() @Matches(TZ, { message: 'endAt must include Z or a timezone offset' })
  @ApiProperty({ example: '2027-01-20T09:30:00+06:00' }) endAt: string;

  /** BOOKED is never accepted from clients; only Person 3's booking transaction sets it. */
  @IsOptional() @IsIn([SlotStatus.OPEN, SlotStatus.BLOCKED])
  @ApiPropertyOptional({ example: 'BLOCKED' }) status?: SlotStatus.OPEN | SlotStatus.BLOCKED;
}
