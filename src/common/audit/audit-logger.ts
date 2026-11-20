import type { EntityManager } from 'typeorm';

/** Shared audit contract used by Persons 2, 3 and 4. */
export const AUDIT_LOGGER = Symbol('AUDIT_LOGGER');

export interface AuditEntry {
  actorUserId: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
}

export interface AuditLogger {
  /** When a manager is supplied, the audit row joins the caller's transaction. */
  log(entry: AuditEntry, manager?: EntityManager): Promise<void>;
}
