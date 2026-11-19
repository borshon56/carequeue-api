import { Injectable, Logger } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

export const AUDIT_LOGGER = Symbol('AUDIT_LOGGER');

export interface AuditEntry {
  actorUserId: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
}

export interface AuditLogger {
  log(entry: AuditEntry, manager?: EntityManager): Promise<void>;
}

@Injectable()
export class ConsoleAuditLogger implements AuditLogger {
  private readonly logger = new Logger('Audit');
  async log(entry: AuditEntry): Promise<void> {
    this.logger.log(`${entry.action} ${entry.entity}:${entry.entityId} by ${entry.actorUserId ?? 'system'}`);
  }
}
