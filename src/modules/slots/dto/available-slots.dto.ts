import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID, Matches } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

const TZ = /(?:Z|[+-]\d{2}:\d{2})$/;

export class AvailableSlotsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() doctorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;

  @IsOptional() @IsDateString() @Matches(TZ, { message: 'from must include Z or a timezone offset' })
  @ApiPropertyOptional({ example: '2027-01-21T09:00:00+06:00' }) from?: string;

  @IsOptional() @IsDateString() @Matches(TZ, { message: 'to must include Z or a timezone offset' })
  @ApiPropertyOptional({ example: '2027-01-21T13:00:00+06:00' }) to?: string;
}
