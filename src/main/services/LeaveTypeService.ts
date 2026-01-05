import { LeaveType } from '@prisma/client'
import { LeaveTypeRepository, LeaveTypeFilterOptions } from '../repositories/LeaveTypeRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create LeaveType DTO
 */
export interface CreateLeaveTypeDto {
  name: string
  abbreviation?: string | null
  isPaid?: boolean
  deductsFromAnnual?: boolean
  limitDays?: number | null
}

/**
 * Update LeaveType DTO
 */
export interface UpdateLeaveTypeDto {
  name?: string
  abbreviation?: string | null
  isPaid?: boolean
  deductsFromAnnual?: boolean
  limitDays?: number | null
}

/**
 * Business Rule Error
 */
export class BusinessRuleError extends Error {
  constructor(
    public rule: string,
    public details: Record<string, unknown> = {}
  ) {
    super(`İş kuralı ihlali: ${rule}`)
    this.name = 'BusinessRuleError'
  }
}

/**
 * Validation Error
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public value: unknown,
    public constraint: string
  ) {
    super(`Doğrulama hatası - ${field}: ${constraint}`)
    this.name = 'ValidationError'
  }
}

/**
 * LeaveTypeService - İzin türleri iş mantığı
 * CRUD operasyonları, isim benzersizliği kontrolü
 * Requirements: 9.2, 9.3, 9.4, 9.5
 */
export class LeaveTypeService {
  private repository: LeaveTypeRepository

  constructor(repository: LeaveTypeRepository) {
    this.repository = repository
  }

  /**
   * Tüm izin türlerini getir
   */
  async findAll(options: LeaveTypeFilterOptions = {}): Promise<PaginatedResult<LeaveType>> {
    return await this.repository.findAllWithFilters(options)
  }

  /**
   * Tüm izin türlerini sayfalama olmadan getir
   */
  async findAllWithoutPagination(): Promise<LeaveType[]> {
    return await this.repository.findAllWithoutPagination()
  }

  /**
   * ID ile izin türü getir
   */
  async findById(id: number): Promise<LeaveType | null> {
    return await this.repository.findById(id)
  }

  /**
   * İsme göre izin türü getir
   */
  async findByName(name: string): Promise<LeaveType | null> {
    return await this.repository.findByName(name)
  }

  /**
   * Ücretli izin türlerini getir
   * Requirements: 9.3
   */
  async findPaidLeaveTypes(): Promise<LeaveType[]> {
    return await this.repository.findPaidLeaveTypes()
  }

  /**
   * Ücretsiz izin türlerini getir
   * Requirements: 9.3
   */
  async findUnpaidLeaveTypes(): Promise<LeaveType[]> {
    return await this.repository.findUnpaidLeaveTypes()
  }

  /**
   * Yıllık izinden düşen izin türlerini getir
   * Requirements: 9.4
   */
  async findDeductingLeaveTypes(): Promise<LeaveType[]> {
    return await this.repository.findDeductingLeaveTypes()
  }

  /**
   * İzin türü oluştur
   * Requirements: 9.1, 9.2
   */
  async create(data: CreateLeaveTypeDto, userId?: number): Promise<LeaveType> {
    // Validasyon
    await this.validateCreate(data)

    const createData = {
      name: data.name.trim(),
      abbreviation: data.abbreviation?.trim() || null,
      isPaid: data.isPaid ?? true,
      deductsFromAnnual: data.deductsFromAnnual ?? false,
      limitDays: data.limitDays ?? null
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * İzin türü güncelle
   * Requirements: 9.2
   */
  async update(id: number, data: UpdateLeaveTypeDto, userId?: number): Promise<LeaveType> {
    // Kaydın var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('İzin türü bulunamadı', { id })
    }

    // Validasyon
    await this.validateUpdate(id, data)

    // Güncelleme verisi hazırla
    const updateData: any = {}

    if (data.name !== undefined) {
      updateData.name = data.name.trim()
    }
    if (data.abbreviation !== undefined) {
      updateData.abbreviation = data.abbreviation?.trim() || null
    }
    if (data.isPaid !== undefined) {
      updateData.isPaid = data.isPaid
    }
    if (data.deductsFromAnnual !== undefined) {
      updateData.deductsFromAnnual = data.deductsFromAnnual
    }
    if (data.limitDays !== undefined) {
      updateData.limitDays = data.limitDays
    }

    return await this.repository.update(id, updateData, userId)
  }

  /**
   * İzin türü sil (soft delete)
   */
  async delete(id: number, userId?: number): Promise<LeaveType> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('İzin türü bulunamadı', { id })
    }

    // Kullanımda mı kontrol et
    const isInUse = await this.repository.isInUse(id)
    if (isInUse) {
      throw new BusinessRuleError('Bu izin türü kullanımda olduğu için silinemez', { id })
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Varsayılan izin türlerini seed et
   * Requirements: 9.6
   */
  async seedDefaults(userId?: number): Promise<LeaveType[]> {
    return await this.repository.seedDefaults(userId)
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreateLeaveTypeDto): Promise<void> {
    // İsim zorunlu
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('name', data.name, 'İzin türü adı zorunludur')
    }

    // İsim uzunluğu kontrolü
    if (data.name.trim().length > 100) {
      throw new ValidationError('name', data.name, 'İzin türü adı en fazla 100 karakter olabilir')
    }

    // İsim benzersizliği kontrolü
    // Requirements: 9.2
    const isUnique = await this.repository.isNameUnique(data.name.trim())
    if (!isUnique) {
      throw new BusinessRuleError('Bu isimde bir izin türü zaten mevcut', { name: data.name })
    }

    // Limit days validasyonu
    // Requirements: 9.5
    if (data.limitDays !== undefined && data.limitDays !== null) {
      if (data.limitDays < 0) {
        throw new ValidationError('limitDays', data.limitDays, 'Limit gün sayısı negatif olamaz')
      }
      if (!Number.isInteger(data.limitDays)) {
        throw new ValidationError('limitDays', data.limitDays, 'Limit gün sayısı tam sayı olmalıdır')
      }
    }
  }

  /**
   * Update validasyonu
   */
  private async validateUpdate(id: number, data: UpdateLeaveTypeDto): Promise<void> {
    // İsim güncelleniyorsa
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new ValidationError('name', data.name, 'İzin türü adı boş olamaz')
      }

      if (data.name.trim().length > 100) {
        throw new ValidationError('name', data.name, 'İzin türü adı en fazla 100 karakter olabilir')
      }

      // İsim benzersizliği kontrolü (kendi ID'si hariç)
      // Requirements: 9.2
      const isUnique = await this.repository.isNameUnique(data.name.trim(), id)
      if (!isUnique) {
        throw new BusinessRuleError('Bu isimde bir izin türü zaten mevcut', { name: data.name })
      }
    }

    // Limit days validasyonu
    // Requirements: 9.5
    if (data.limitDays !== undefined && data.limitDays !== null) {
      if (data.limitDays < 0) {
        throw new ValidationError('limitDays', data.limitDays, 'Limit gün sayısı negatif olamaz')
      }
      if (!Number.isInteger(data.limitDays)) {
        throw new ValidationError('limitDays', data.limitDays, 'Limit gün sayısı tam sayı olmalıdır')
      }
    }
  }
}

export default LeaveTypeService
