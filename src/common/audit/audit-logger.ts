import type { EntityManager } from 'typeorm';

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
  log(entry: AuditEntry, manager?: EntityManager): Promise<void>;
}