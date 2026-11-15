import { Module } from '@nestjs/common';
import { QueueTicketsController } from './queue-tickets.controller.js';
import { QueueTicketsService } from './queue-tickets.service.js';

@Module({
  controllers: [QueueTicketsController],
  providers: [QueueTicketsService]
})
export class QueueTicketsModule {}
