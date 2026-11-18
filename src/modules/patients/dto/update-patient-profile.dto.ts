
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePatientProfileDto {
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;
}
