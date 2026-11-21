import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateDoctorDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional({ example: 'BMDC-12345' }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) licenseNumber?: string;
  @ApiPropertyOptional({ example: 'Consultant cardiologist' }) @IsOptional() @IsString() @MaxLength(4000) bio?: string;
}
