import { PartialType } from '@nestjs/swagger';
import { CreateSpecializationDto } from './create-specialization.dto.js';
export class UpdateSpecializationDto extends PartialType(CreateSpecializationDto) {}
