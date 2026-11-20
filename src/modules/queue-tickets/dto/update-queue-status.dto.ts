import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { QueueTicketStatus } from '../entities/queue-ticket.entity.js';

export class UpdateQueueStatusDto {
  @ApiProperty({ enum: QueueTicketStatus, example: QueueTicketStatus.SERVING })
  @IsEnum(QueueTicketStatus)
  status: QueueTicketStatus;
}
