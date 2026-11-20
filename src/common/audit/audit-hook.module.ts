import { Module } from '@nestjs/common';
import { AUDIT_LOGGER } from './audit-logger.js';
import { AuditLogsModule } from '../../modules/audit-logs/audit-logs.module.js';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service.js';

/** Shared persistent audit provider used by Persons 2, 3 and 4. */
@Module({
  imports: [AuditLogsModule],
  providers: [{ provide: AUDIT_LOGGER, useExisting: AuditLogsService }],
  exports: [AUDIT_LOGGER],
})
export class AuditHookModule {}
