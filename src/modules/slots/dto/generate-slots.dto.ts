import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

const TZ = /(?:Z|[+-]\d{2}:\d{2})$/;

/** Create back-to-back slots, e.g. 09:00-13:00 in 30-minute slots = 8 slots in one request. */
export class GenerateSlotsDto {
  /** Required for ADMIN; a DOCTOR may omit it. */
  @IsOptional() @IsUUID()
  @ApiPropertyOptional() doctorId?: string;

  /** Start of the working block, e.g. 2026-12-01T09:00:00+06:00 */
  @IsDateString() @Matches(TZ, { message: 'from must include Z or a timezone offset' })
  @ApiProperty({ example: '2027-01-21T09:00:00+06:00' }) from: string;

  /** End of the working block, e.g. 2026-12-01T13:00:00+06:00 */
  @IsDateString() @Matches(TZ, { message: 'to must include Z or a timezone offset' })
  @ApiProperty({ example: '2027-01-21T13:00:00+06:00' }) to: string;

  /** Defaults to SLOT_DURATION_MINUTES (30). */
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(240)
  @ApiPropertyOptional({ example: 30 }) durationMinutes?: number;
}
