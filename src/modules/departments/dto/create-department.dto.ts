import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  @ApiProperty({ example: 'Cardiology' }) name: string;

  @IsOptional() @IsString() @MaxLength(2000)
  @ApiPropertyOptional({ example: 'Heart specialists' }) description?: string;
}
