import { HiringRequest } from '@prisma/client'
import { HiringRequestRepository, HiringRequestWithRelations } from '../repositories/HiringRequestRepository'
import { FindAllOptions, PaginatedResult } from '../repositories/BaseRepository'

export interface CreateHiringRequestDto {
  departmentId: number
  positionId: number
  requestedBy: number
  quantity?: number
  priority?: string
  employmentType: string
  salaryRangeMin?: number
  salaryRangeMax?: number
  requirements?: string
  description?: string
  targetDate?: Date
  notes?: string
}

export interface UpdateHiringRequestDto {
  departmentId?: number
  positionId?: number
  quantity?: number
  priority?: string
  employmentType?: string
  salaryRangeMin?: number
  salaryRangeMax?: number
  requirements?: string
  description?: string
  targetDate?: Date
  notes?: string
}

export class BusinessRuleError extends Error {
  constructor(public rule: string, public details: Record<string, unknown> = {}) {
    super(`İş kuralı ihlali: ${rule}`)
    this.name = 'BusinessRuleError'
  }
}

export class HiringRequestService {
  constructor(private repository: HiringRequestRepository) {}

  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult<HiringRequestWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  async findById(id: number): Promise<HiringRequestWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  async findByStatus(status: string): Promise<HiringRequest[]> {
    return await this.repository.findByStatus(status)
  }

  async findByDepartment(departmentId: number): Promise<HiringRequest[]> {
    return await this.repository.findByDepartment(departmentId)
  }

  async create(data: CreateHiringRequestDto, userId?: number): Promise<HiringRequest> {
    const requestCode = await this.repository.generateRequestCode()
    return await this.repository.create({ ...data, requestCode } as any, userId)
  }

  async update(id: number, data: UpdateHiringRequestDto, userId?: number): Promise<HiringRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('İşe alım talebi bulunamadı', { id })
    return await this.repository.update(id, data as any, userId)
  }

  async approve(id: number, approverId: number, userId?: number): Promise<HiringRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('İşe alım talebi bulunamadı', { id })
    if (existing.status !== 'Pending') throw new BusinessRuleError('Sadece bekleyen talepler onaylanabilir', { status: existing.status })
    return await this.repository.update(id, { status: 'Approved', approvedBy: approverId, approvalDate: new Date() } as any, userId)
  }

  async reject(id: number, approverId: number, userId?: number): Promise<HiringRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('İşe alım talebi bulunamadı', { id })
    if (existing.status !== 'Pending') throw new BusinessRuleError('Sadece bekleyen talepler reddedilebilir', { status: existing.status })
    return await this.repository.update(id, { status: 'Rejected', approvedBy: approverId, approvalDate: new Date() } as any, userId)
  }

  async startProcess(id: number, userId?: number): Promise<HiringRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('İşe alım talebi bulunamadı', { id })
    if (existing.status !== 'Approved') throw new BusinessRuleError('Sadece onaylı talepler başlatılabilir', { status: existing.status })
    return await this.repository.update(id, { status: 'InProgress' } as any, userId)
  }

  async complete(id: number, userId?: number): Promise<HiringRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('İşe alım talebi bulunamadı', { id })
    if (existing.status !== 'InProgress') throw new BusinessRuleError('Sadece devam eden talepler tamamlanabilir', { status: existing.status })
    return await this.repository.update(id, { status: 'Completed', completedDate: new Date() } as any, userId)
  }

  async cancel(id: number, userId?: number): Promise<HiringRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('İşe alım talebi bulunamadı', { id })
    if (['Completed', 'Cancelled'].includes(existing.status)) throw new BusinessRuleError('Bu talep iptal edilemez', { status: existing.status })
    return await this.repository.update(id, { status: 'Cancelled' } as any, userId)
  }

  async delete(id: number, userId?: number): Promise<HiringRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('İşe alım talebi bulunamadı', { id })
    return await this.repository.softDelete(id, userId)
  }

  async getStats() {
    return await this.repository.getStats()
  }
}

export default HiringRequestService
