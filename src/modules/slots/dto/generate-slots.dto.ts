import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

const TZ = /(?:Z|[+-]\d{2}:\d{2})$/;

export class GenerateSlotsDto {
  @IsOptional() @IsUUID()
  @ApiPropertyOptional() doctorId?: string;

  @IsDateString() @Matches(TZ, { message: 'from must include Z or a timezone offset' })
  @ApiProperty({ example: '2027-01-21T09:00:00+06:00' }) from: string;

  @IsDateString() @Matches(TZ, { message: 'to must include Z or a timezone offset' })
  @ApiProperty({ example: '2027-01-21T13:00:00+06:00' }) to: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(240)
  @ApiPropertyOptional({ example: 30 }) durationMinutes?: number;
}
