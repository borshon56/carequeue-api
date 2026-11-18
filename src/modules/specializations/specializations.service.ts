import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialization } from './entities/specialization.entity.js';
import { CreateSpecializationDto } from './dto/create-specialization.dto.js';
import { UpdateSpecializationDto } from './dto/update-specialization.dto.js';
import { AUDIT_LOGGER, type AuditLogger } from '../../common/audit/audit-logger.js';

@Injectable()
export class SpecializationsService {
  constructor(
    @InjectRepository(Specialization) private readonly repo: Repository<Specialization>,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}

  async createSpecialization(dto: CreateSpecializationDto, actorId: string): Promise<Specialization> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Specialization name is required');
    let saved: Specialization;
    try { saved = await this.repo.save(this.repo.create({ name, description: dto.description ?? null })); }
    catch (error) { this.handleConstraint(error); throw error; }
    await this.audit.log({ actorUserId: actorId, action: 'SPECIALIZATION_CREATED', entity: 'specializations', entityId: saved.id, newValues: saved });
    return saved;
  }

  getAllSpecializations(): Promise<Specialization[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async getSpecializationById(id: string): Promise<Specialization> {
    const row = await this.repo.findOneBy({ id });
    if (!row) throw new NotFoundException('Specialization not found');
    return row;
  }

  async updateSpecialization(id: string, dto: UpdateSpecializationDto, actorId: string): Promise<Specialization> {
    const row = await this.getSpecializationById(id);
    const before = { name: row.name, description: row.description };
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.description !== undefined) row.description = dto.description;
    if (!row.name) throw new BadRequestException('Specialization name is required');
    let saved: Specialization;
    try { saved = await this.repo.save(row); }
    catch (error) { this.handleConstraint(error); throw error; }
    await this.audit.log({ actorUserId: actorId, action: 'SPECIALIZATION_UPDATED', entity: 'specializations', entityId: id, oldValues: before, newValues: saved });
    return saved;
  }

  async deleteSpecialization(id: string, actorId: string): Promise<{ message: string }> {
    const row = await this.getSpecializationById(id);
    try { await this.repo.delete(id); }
    catch (error) { this.handleConstraint(error); throw error; }
    await this.audit.log({ actorUserId: actorId, action: 'SPECIALIZATION_DELETED', entity: 'specializations', entityId: id, oldValues: row });
    return { message: 'Specialization deleted' };
  }

  private handleConstraint(error: unknown): void {
    const code = (error as { code?: string })?.code;
    if (code === '23505') throw new ConflictException('Specialization name already exists');
    if (code === '23503') throw new ConflictException('Specialization is assigned to a doctor');
  }
}
