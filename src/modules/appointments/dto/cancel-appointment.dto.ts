import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAppointmentDto {
  @ApiPropertyOptional({ example: 'Cannot attend, will rebook next week' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
