import { Module } from '@nestjs/common';
import { AUDIT_LOGGER, ConsoleAuditLogger } from './audit-logger.js';

/**
 * Temporary provider for the AUDIT_LOGGER contract, imported by Person 2's modules.
 * Person 4: when AuditLogsService implements AuditLogger, change this module to
 *   imports: [AuditLogsModule],
 *   providers: [{ provide: AUDIT_LOGGER, useExisting: AuditLogsService }],
 * Nothing in Person 2's code needs to change.
 */
@Module({
  providers: [{ provide: AUDIT_LOGGER, useClass: ConsoleAuditLogger }],
  exports: [AUDIT_LOGGER],
})
export class AuditHookModule {}
