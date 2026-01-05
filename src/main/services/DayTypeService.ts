import { DayType } from '@prisma/client'
import { DayTypeRepository, DayTypeFilterOptions } from '../repositories/DayTypeRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create DayType DTO
 */
export interface CreateDayTypeDto {
  name: string
  abbreviation: string
  color?: string | null
  isActive?: boolean
}

/**
 * Update DayType DTO
 */
export interface UpdateDayTypeDto {
  name?: string
  abbreviation?: string
  color?: string | null
  isActive?: boolean
}

/**
 * Business Rule Error
 */
export class DayTypeBusinessRuleError extends Error {
  constructor(
    public rule: string,
    public details: Record<string, unknown> = {}
  ) {
    super(`İş kuralı ihlali: ${rule}`)
    this.name = 'DayTypeBusinessRuleError'
  }
}

/**
 * Validation Error
 */
export class DayTypeValidationError extends Error {
  constructor(
    public field: string,
    public value: unknown,
    public constraint: string
  ) {
    super(`Doğrulama hatası - ${field}: ${constraint}`)
    this.name = 'DayTypeValidationError'
  }
}

/**
 * DayTypeService - Gün türleri iş mantığı
 * CRUD operasyonları, isim ve kısaltma benzersizliği kontrolü
 */
export class DayTypeService {
  private repository: DayTypeRepository

  constructor(repository: DayTypeRepository) {
    this.repository = repository
  }

  /**
   * Tüm gün türlerini getir
   */
  async findAll(options: DayTypeFilterOptions = {}): Promise<PaginatedResult<DayType>> {
    return await this.repository.findAllWithFilters(options)
  }

  /**
   * Tüm aktif gün türlerini getir (sayfalama olmadan)
   */
  async findAllActive(): Promise<DayType[]> {
    return await this.repository.findAllActive()
  }

  /**
   * Tüm gün türlerini sayfalama olmadan getir
   */
  async findAllWithoutPagination(): Promise<DayType[]> {
    return await this.repository.findAllWithoutPagination()
  }

  /**
   * ID ile gün türü getir
   */
  async findById(id: number): Promise<DayType | null> {
    return await this.repository.findById(id)
  }

  /**
   * İsme göre gün türü getir
   */
  async findByName(name: string): Promise<DayType | null> {
    return await this.repository.findByName(name)
  }

  /**
   * Kısaltmaya göre gün türü getir
   */
  async findByAbbreviation(abbreviation: string): Promise<DayType | null> {
    return await this.repository.findByAbbreviation(abbreviation)
  }

  /**
   * Gün türü oluştur
   */
  async create(data: CreateDayTypeDto, userId?: number): Promise<DayType> {
    // Validasyon
    await this.validateCreate(data)

    const createData = {
      name: data.name.trim(),
      abbreviation: data.abbreviation.trim().toUpperCase(),
      color: data.color?.trim() || null,
      isActive: data.isActive ?? true
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Gün türü güncelle
   */
  async update(id: number, data: UpdateDayTypeDto, userId?: number): Promise<DayType> {
    // Kaydın var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new DayTypeBusinessRuleError('Gün türü bulunamadı', { id })
    }

    // Validasyon
    await this.validateUpdate(id, data)

    // Güncelleme verisi hazırla
    const updateData: any = {}

    if (data.name !== undefined) {
      updateData.name = data.name.trim()
    }
    if (data.abbreviation !== undefined) {
      updateData.abbreviation = data.abbreviation.trim().toUpperCase()
    }
    if (data.color !== undefined) {
      updateData.color = data.color?.trim() || null
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }

    return await this.repository.update(id, updateData, userId)
  }

  /**
   * Gün türü sil (soft delete)
   */
  async delete(id: number, userId?: number): Promise<DayType> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new DayTypeBusinessRuleError('Gün türü bulunamadı', { id })
    }

    // Kullanımda mı kontrol et
    const isInUse = await this.repository.isInUse(id)
    if (isInUse) {
      throw new DayTypeBusinessRuleError('Bu gün türü kullanımda olduğu için silinemez', { id })
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Varsayılan gün türlerini seed et
   */
  async seedDefaults(userId?: number): Promise<DayType[]> {
    return await this.repository.seedDefaults(userId)
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreateDayTypeDto): Promise<void> {
    // İsim zorunlu
    if (!data.name || data.name.trim().length === 0) {
      throw new DayTypeValidationError('name', data.name, 'Gün türü adı zorunludur')
    }

    // İsim uzunluğu kontrolü
    if (data.name.trim().length > 50) {
      throw new DayTypeValidationError('name', data.name, 'Gün türü adı en fazla 50 karakter olabilir')
    }

    // Kısaltma zorunlu
    if (!data.abbreviation || data.abbreviation.trim().length === 0) {
      throw new DayTypeValidationError('abbreviation', data.abbreviation, 'Gün türü kısaltması zorunludur')
    }

    // Kısaltma uzunluğu kontrolü
    if (data.abbreviation.trim().length > 5) {
      throw new DayTypeValidationError('abbreviation', data.abbreviation, 'Gün türü kısaltması en fazla 5 karakter olabilir')
    }

    // İsim benzersizliği kontrolü
    const isNameUnique = await this.repository.isNameUnique(data.name.trim())
    if (!isNameUnique) {
      throw new DayTypeBusinessRuleError('Bu isimde bir gün türü zaten mevcut', { name: data.name })
    }

    // Kısaltma benzersizliği kontrolü
    const isAbbreviationUnique = await this.repository.isAbbreviationUnique(data.abbreviation.trim().toUpperCase())
    if (!isAbbreviationUnique) {
      throw new DayTypeBusinessRuleError('Bu kısaltmada bir gün türü zaten mevcut', { abbreviation: data.abbreviation })
    }
  }

  /**
   * Update validasyonu
   */
  private async validateUpdate(id: number, data: UpdateDayTypeDto): Promise<void> {
    // İsim güncelleniyorsa
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new DayTypeValidationError('name', data.name, 'Gün türü adı boş olamaz')
      }

      if (data.name.trim().length > 50) {
        throw new DayTypeValidationError('name', data.name, 'Gün türü adı en fazla 50 karakter olabilir')
      }

      // İsim benzersizliği kontrolü (kendi ID'si hariç)
      const isNameUnique = await this.repository.isNameUnique(data.name.trim(), id)
      if (!isNameUnique) {
        throw new DayTypeBusinessRuleError('Bu isimde bir gün türü zaten mevcut', { name: data.name })
      }
    }

    // Kısaltma güncelleniyorsa
    if (data.abbreviation !== undefined) {
      if (data.abbreviation.trim().length === 0) {
        throw new DayTypeValidationError('abbreviation', data.abbreviation, 'Gün türü kısaltması boş olamaz')
      }

      if (data.abbreviation.trim().length > 5) {
        throw new DayTypeValidationError('abbreviation', data.abbreviation, 'Gün türü kısaltması en fazla 5 karakter olabilir')
      }

      // Kısaltma benzersizliği kontrolü (kendi ID'si hariç)
      const isAbbreviationUnique = await this.repository.isAbbreviationUnique(data.abbreviation.trim().toUpperCase(), id)
      if (!isAbbreviationUnique) {
        throw new DayTypeBusinessRuleError('Bu kısaltmada bir gün türü zaten mevcut', { abbreviation: data.abbreviation })
      }
    }
  }
}

export default DayTypeService
