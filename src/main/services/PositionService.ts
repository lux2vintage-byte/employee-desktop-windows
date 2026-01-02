import { Position } from '@prisma/client'
import { PositionRepository, PositionWithRelations } from '../repositories/PositionRepository'
import { FindAllOptions, PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create Position DTO
 */
export interface CreatePositionDto {
  title: string
  departmentId: number
  jobDescription?: string | null
  baseSalaryMin?: number | null
  baseSalaryMax?: number | null
}

/**
 * Update Position DTO
 */
export interface UpdatePositionDto {
  title?: string
  departmentId?: number
  jobDescription?: string | null
  baseSalaryMin?: number | null
  baseSalaryMax?: number | null
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
 * PositionService - Pozisyon iş mantığı
 * CRUD operasyonları, unvan benzersizliği kontrolü, maaş skalası validasyonu
 * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6
 */
export class PositionService {
  private repository: PositionRepository

  constructor(repository: PositionRepository) {
    this.repository = repository
  }

  /**
   * Tüm pozisyonları getir
   */
  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult<PositionWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile pozisyon getir
   */
  async findById(id: number): Promise<PositionWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Departman bazlı pozisyonları getir
   * Requirements: 3.6
   */
  async findByDepartment(departmentId: number): Promise<PositionWithRelations[]> {
    return await this.repository.findByDepartmentWithRelations(departmentId)
  }

  /**
   * Pozisyon oluştur
   * Requirements: 3.2, 3.3
   */
  async create(data: CreatePositionDto, userId?: number): Promise<Position> {
    // Validasyon
    await this.validateCreate(data)

    // Oluştur
    return await this.repository.create(data as any, userId)
  }

  /**
   * Pozisyon güncelle
   * Requirements: 3.2, 3.3
   */
  async update(id: number, data: UpdatePositionDto, userId?: number): Promise<Position> {
    // Pozisyonun var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Pozisyon bulunamadı', { id })
    }

    // Validasyon
    await this.validateUpdate(id, data, existing)

    // Güncelle
    return await this.repository.update(id, data as any, userId)
  }

  /**
   * Pozisyon sil (soft delete)
   * Requirements: 3.4
   */
  async delete(id: number, userId?: number): Promise<Position> {
    // Pozisyonun var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Pozisyon bulunamadı', { id })
    }

    // Çalışan kontrolü
    const hasEmployees = await this.repository.hasEmployees(id)
    if (hasEmployees) {
      throw new BusinessRuleError('Çalışanları olan pozisyon silinemez', { id })
    }

    // Soft delete
    return await this.repository.softDelete(id, userId)
  }

  /**
   * Pozisyonu geri yükle
   */
  async restore(id: number, userId?: number): Promise<Position> {
    return await this.repository.restore(id, userId)
  }

  /**
   * Unvana göre pozisyon ara
   */
  async findByTitle(title: string): Promise<Position[]> {
    return await this.repository.findByTitle(title)
  }

  /**
   * Maaş aralığına göre pozisyonları getir
   */
  async findBySalaryRange(minSalary?: number, maxSalary?: number): Promise<Position[]> {
    return await this.repository.findBySalaryRange(minSalary, maxSalary)
  }

  /**
   * Maaşın pozisyon aralığında olup olmadığını kontrol et
   * Requirements: 3.3
   */
  async validateSalaryRange(positionId: number, salary: number): Promise<boolean> {
    return await this.repository.isSalaryInRange(positionId, salary)
  }

  /**
   * Pozisyona atanmış çalışan var mı kontrol et
   */
  async hasEmployees(positionId: number): Promise<boolean> {
    return await this.repository.hasEmployees(positionId)
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreatePositionDto): Promise<void> {
    // Unvan zorunlu
    if (!data.title || data.title.trim() === '') {
      throw new ValidationError('title', data.title, 'Pozisyon unvanı zorunludur')
    }

    // Departman zorunlu
    if (!data.departmentId) {
      throw new ValidationError('departmentId', data.departmentId, 'Departman zorunludur')
    }

    // Departman var mı kontrol et
    const departmentExists = await this.repository.departmentExists(data.departmentId)
    if (!departmentExists) {
      throw new BusinessRuleError('Departman bulunamadı', { departmentId: data.departmentId })
    }

    // Unvan benzersizliği kontrolü (aynı departman içinde)
    // Requirements: 3.2
    const isUnique = await this.repository.isTitleUniqueWithinDepartment(
      data.title,
      data.departmentId
    )
    if (!isUnique) {
      throw new BusinessRuleError('Bu unvanda bir pozisyon zaten mevcut', {
        title: data.title,
        departmentId: data.departmentId
      })
    }

    // Maaş skalası validasyonu
    // Requirements: 3.3
    this.validateSalaryMinMax(data.baseSalaryMin, data.baseSalaryMax)
  }

  /**
   * Update validasyonu
   */
  private async validateUpdate(id: number, data: UpdatePositionDto, existing: Position): Promise<void> {
    // Unvan değişiyorsa benzersizlik kontrolü
    // Requirements: 3.2
    if (data.title !== undefined) {
      if (!data.title || data.title.trim() === '') {
        throw new ValidationError('title', data.title, 'Pozisyon unvanı boş olamaz')
      }

      const departmentId = data.departmentId !== undefined
        ? data.departmentId
        : existing.departmentId

      const isUnique = await this.repository.isTitleUniqueWithinDepartment(
        data.title,
        departmentId,
        id
      )
      if (!isUnique) {
        throw new BusinessRuleError('Bu unvanda bir pozisyon zaten mevcut', {
          title: data.title,
          departmentId
        })
      }
    }

    // Departman değişiyorsa kontroller
    if (data.departmentId !== undefined && data.departmentId !== existing.departmentId) {
      // Departman var mı kontrol et
      const departmentExists = await this.repository.departmentExists(data.departmentId)
      if (!departmentExists) {
        throw new BusinessRuleError('Departman bulunamadı', { departmentId: data.departmentId })
      }

      // Unvan benzersizliği yeni departmanda kontrol edilmeli
      const titleToCheck = data.title ?? existing.title
      const isUnique = await this.repository.isTitleUniqueWithinDepartment(
        titleToCheck,
        data.departmentId,
        id
      )
      if (!isUnique) {
        throw new BusinessRuleError('Hedef departmanda bu unvanda bir pozisyon zaten mevcut', {
          title: titleToCheck,
          departmentId: data.departmentId
        })
      }
    }

    // Maaş skalası validasyonu
    // Requirements: 3.3
    const newMin = data.baseSalaryMin !== undefined ? data.baseSalaryMin : existing.baseSalaryMin
    const newMax = data.baseSalaryMax !== undefined ? data.baseSalaryMax : existing.baseSalaryMax
    this.validateSalaryMinMax(newMin, newMax)
  }

  /**
   * Maaş min/max validasyonu
   * Requirements: 3.3
   */
  private validateSalaryMinMax(min: number | null | undefined, max: number | null | undefined): void {
    // Min negatif olamaz
    if (min !== null && min !== undefined && min < 0) {
      throw new ValidationError('baseSalaryMin', min, 'Minimum maaş negatif olamaz')
    }

    // Max negatif olamaz
    if (max !== null && max !== undefined && max < 0) {
      throw new ValidationError('baseSalaryMax', max, 'Maksimum maaş negatif olamaz')
    }

    // Min <= Max olmalı
    if (
      min !== null && min !== undefined &&
      max !== null && max !== undefined &&
      min > max
    ) {
      throw new ValidationError(
        'baseSalaryMin',
        min,
        `Minimum maaş (${min}) maksimum maaştan (${max}) büyük olamaz`
      )
    }
  }
}

export default PositionService
