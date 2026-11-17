import { Injectable, Logger } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

/**
 * Audit hook contract owned by Person 4 (AuditLogsModule).
 * Person 2 calls `AUDIT_LOGGER.log(...)` after every doctor / department /
 * specialization / slot change. Until Person 4's AuditService is merged, the
 * ConsoleAuditLogger below just prints the entry.
 *
 * Person 4: implement `AuditLogger` in AuditLogsService and bind it in
 * src/common/audit/audit-hook.module.ts (instructions there).
 * When `manager` is passed, write the audit row with it so the log is saved
 * in the SAME transaction as the change.
 */
export const AUDIT_LOGGER = Symbol('AUDIT_LOGGER');

export interface AuditEntry {
  actorUserId: string | null;
  action: string;          // e.g. SLOT_CREATED, DOCTOR_DEACTIVATED
  entity: string;          // e.g. doctor_slots, doctors
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
