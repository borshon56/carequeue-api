import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, Matches } from 'class-validator';
import { SlotStatus } from '../entities/doctor-slot.entity.js';

const TZ = /(?:Z|[+-]\d{2}:\d{2})$/;

export class UpdateSlotDto {
  @IsOptional() @IsDateString() @Matches(TZ, { message: 'startAt must include Z or a timezone offset' })
  @ApiPropertyOptional({ example: '2027-01-20T09:00:00+06:00' }) startAt?: string;

  @IsOptional() @IsDateString() @Matches(TZ, { message: 'endAt must include Z or a timezone offset' })
  @ApiPropertyOptional({ example: '2027-01-20T09:30:00+06:00' }) endAt?: string;

  @IsOptional() @IsIn([SlotStatus.OPEN, SlotStatus.BLOCKED])
  @ApiPropertyOptional({ example: 'BLOCKED' }) status?: SlotStatus.OPEN | SlotStatus.BLOCKED;
}
