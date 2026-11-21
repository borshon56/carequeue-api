import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CheckInDto {
  @ApiProperty({ description: 'ID of an existing BOOKED appointment' })
  @IsUUID()
  appointmentId: string;
}
