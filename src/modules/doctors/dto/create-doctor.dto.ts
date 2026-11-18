import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty() @IsUUID() userId: string;
  @ApiProperty() @IsUUID() departmentId: string;

  @IsString() @IsNotEmpty() @MaxLength(80)
  @ApiProperty({ example: 'BMDC-12345' }) licenseNumber: string;

  @IsOptional() @IsString() @MaxLength(4000)
  @ApiPropertyOptional({ example: 'Consultant cardiologist' }) bio?: string;
}
