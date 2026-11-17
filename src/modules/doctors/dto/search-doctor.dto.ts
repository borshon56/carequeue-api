import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class SearchDoctorDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() specializationId?: string;
  /** Matches doctor name or license number (case-insensitive). */
  @ApiPropertyOptional({ example: 'rahman' }) @IsOptional() @IsString() @MaxLength(100) search?: string;
}
