import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import type { AuditEntry, AuditLogger } from '../../common/audit/audit-logger.js';

@Injectable()
export class AuditLogsService implements AuditLogger {
  constructor(
    @InjectRepository(AuditLog) private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(AuditLog) : this.auditRepository;
    await repo.save(repo.create({
      userId: entry.actorUserId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      oldValues: this.toJsonObject(entry.oldValues),
      newValues: this.toJsonObject(entry.newValues),
      ipAddress: entry.ipAddress ?? null,
    }));
  }

  async findAll(page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [items, total] = await this.auditRepository.findAndCount({
      relations: { user: true },
      select: {
        id: true, userId: true, action: true, entity: true, entityId: true,
        oldValues: true, newValues: true, ipAddress: true, createdAt: true,
        user: { id: true, fullName: true, email: true },
      },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return { items, page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) };
  }

  private toJsonObject(value: unknown): Record<string, unknown> | null {
    if (value === undefined || value === null) return null;
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    return { value };
  }
}
