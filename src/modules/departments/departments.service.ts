import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { AUDIT_LOGGER, type AuditLogger } from '../../common/audit/audit-logger.js';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department) private readonly repo: Repository<Department>,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}

  async createDepartment(dto: CreateDepartmentDto, actorId: string): Promise<Department> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Department name is required');
    let saved: Department;
    try { saved = await this.repo.save(this.repo.create({ name, description: dto.description ?? null })); }
    catch (error) { this.handleConstraint(error); throw error; }
    await this.audit.log({ actorUserId: actorId, action: 'DEPARTMENT_CREATED', entity: 'departments', entityId: saved.id, newValues: saved });
    return saved;
  }

  getAllDepartments(): Promise<Department[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async getDepartmentById(id: string): Promise<Department> {
    const row = await this.repo.findOneBy({ id });
    if (!row) throw new NotFoundException('Department not found');
    return row;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto, actorId: string): Promise<Department> {
    const row = await this.getDepartmentById(id);
    const before = { name: row.name, description: row.description };
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.description !== undefined) row.description = dto.description;
    if (!row.name) throw new BadRequestException('Department name is required');
    let saved: Department;
    try { saved = await this.repo.save(row); }
    catch (error) { this.handleConstraint(error); throw error; }
    await this.audit.log({ actorUserId: actorId, action: 'DEPARTMENT_UPDATED', entity: 'departments', entityId: id, oldValues: before, newValues: saved });
    return saved;
  }

  async deleteDepartment(id: string, actorId: string): Promise<{ message: string }> {
    const row = await this.getDepartmentById(id);
    try { await this.repo.delete(id); }
    catch (error) { this.handleConstraint(error); throw error; }
    await this.audit.log({ actorUserId: actorId, action: 'DEPARTMENT_DELETED', entity: 'departments', entityId: id, oldValues: row });
    return { message: 'Department deleted' };
  }

  private handleConstraint(error: unknown): void {
    const code = (error as { code?: string })?.code;
    if (code === '23505') throw new ConflictException('Department name already exists');
    if (code === '23503') throw new ConflictException('Department is assigned to a doctor');
  }
}
