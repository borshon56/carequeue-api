import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString,
  MinLength, MaxLength,
} from 'class-validator';

export class WalkInPatientDto {
  @ApiProperty({ example: 'Ayesha Rahman' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'ayesha@example.com' })
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({ minLength: 8, example: 'Temporary123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  temporaryPassword: string;

  @ApiPropertyOptional({ example: '01700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '1998-04-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Female' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: 'Dhaka, Bangladesh' })
  @IsOptional()
  @IsString()
  address?: string;
}
