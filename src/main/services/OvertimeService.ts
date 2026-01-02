import { Overtime } from '@prisma/client'
import { 
  OvertimeRepository, 
  OvertimeWithRelations, 
  OvertimeFilterOptions,
  DateRange
} from '../repositories/OvertimeRepository'
import { PaginatedResult } from '../repositories/BaseRepository'
import { ValidationUtils, ApprovalStatus } from '../utils/validation'

/**
 * Create Overtime DTO
 */
export interface CreateOvertimeDto {
  employeeId: number
  date: Date | string
  hours: number
  multiplier?: number
  description?: string | null
}

/**
 * Update Overtime DTO
 */
export interface UpdateOvertimeDto {
  date?: Date | string
  hours?: number
  multiplier?: number
  description?: string | null
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
 * OvertimeService - Fazla mesai iş mantığı
 * Mesai kaydı oluşturma, onay/red işlemleri, mesai ücreti hesaplama
 * Requirements: 8.2, 8.3, 8.4, 8.5, 8.6
 */
export class OvertimeService {
  private repository: OvertimeRepository

  constructor(repository: OvertimeRepository) {
    this.repository = repository
  }

  /**
   * Tüm fazla mesai kayıtlarını getir
   */
  async findAll(options: OvertimeFilterOptions = {}): Promise<PaginatedResult<OvertimeWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile fazla mesai kaydı getir
   */
  async findById(id: number): Promise<OvertimeWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Personel bazlı fazla mesai kayıtlarını getir
   */
  async findByEmployee(employeeId: number, dateRange?: DateRange): Promise<Overtime[]> {
    return await this.repository.findByEmployee(employeeId, dateRange)
  }

  /**
   * Bekleyen fazla mesai kayıtlarını getir
   */
  async findPending(): Promise<OvertimeWithRelations[]> {
    return await this.repository.findPending()
  }

  /**
   * Fazla mesai kaydı oluştur
   * Requirements: 8.2, 8.3, 8.6
   */
  async create(data: CreateOvertimeDto, userId?: number): Promise<Overtime> {
    // Validasyon
    await this.validateCreate(data)

    // Tarih dönüşümü
    const date = this.normalizeDate(typeof data.date === 'string' ? new Date(data.date) : data.date)

    const createData = {
      employeeId: data.employeeId,
      date,
      hours: data.hours,
      multiplier: data.multiplier || 1.5,
      description: data.description || null,
      approvalStatus: 'Pending'
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Fazla mesai kaydı güncelle
   * Requirements: 8.3, 8.6
   */
  async update(id: number, data: UpdateOvertimeDto, userId?: number): Promise<Overtime> {
    // Kaydın var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Fazla mesai kaydı bulunamadı', { id })
    }

    // Onaylanmış veya reddedilmiş kayıtlar güncellenemez
    if (existing.approvalStatus !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen kayıtlar güncellenebilir', { 
        id, 
        currentStatus: existing.approvalStatus 
      })
    }

    // Validasyon
    await this.validateUpdate(data)

    // Güncelleme verisi hazırla
    const updateData: any = {}

    if (data.date !== undefined) {
      updateData.date = this.normalizeDate(typeof data.date === 'string' ? new Date(data.date) : data.date)
    }
    if (data.hours !== undefined) {
      updateData.hours = data.hours
    }
    if (data.multiplier !== undefined) {
      updateData.multiplier = data.multiplier
    }
    if (data.description !== undefined) {
      updateData.description = data.description
    }

    return await this.repository.update(id, updateData, userId)
  }

  /**
   * Fazla mesai kaydı sil (soft delete)
   */
  async delete(id: number, userId?: number): Promise<Overtime> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Fazla mesai kaydı bulunamadı', { id })
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Fazla mesai kaydını onayla
   * Requirements: 8.2, 8.4
   */
  async approve(id: number, approverId: number, userId?: number): Promise<Overtime> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Fazla mesai kaydı bulunamadı', { id })
    }

    if (existing.approvalStatus !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen kayıtlar onaylanabilir', { 
        id, 
        currentStatus: existing.approvalStatus 
      })
    }

    // Onaylayan kişinin aktif yönetici olduğunu kontrol et
    // Requirements: 8.4
    const isManager = await this.repository.isActiveManager(approverId)
    if (!isManager) {
      throw new BusinessRuleError('Onaylayan kişi aktif bir yönetici olmalıdır', { approverId })
    }

    return await this.repository.update(id, {
      approvalStatus: 'Approved',
      approvedBy: approverId
    } as any, userId)
  }

  /**
   * Fazla mesai kaydını reddet
   * Requirements: 8.2
   */
  async reject(id: number, approverId: number, userId?: number): Promise<Overtime> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Fazla mesai kaydı bulunamadı', { id })
    }

    if (existing.approvalStatus !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen kayıtlar reddedilebilir', { 
        id, 
        currentStatus: existing.approvalStatus 
      })
    }

    // Reddeden kişinin aktif yönetici olduğunu kontrol et
    const isManager = await this.repository.isActiveManager(approverId)
    if (!isManager) {
      throw new BusinessRuleError('Reddeden kişi aktif bir yönetici olmalıdır', { approverId })
    }

    return await this.repository.update(id, {
      approvalStatus: 'Rejected',
      approvedBy: approverId
    } as any, userId)
  }

  /**
   * Fazla mesai ücreti hesapla
   * Requirements: 8.5
   * Formül: hours × multiplier × hourlyRate
   */
  calculateOvertimePay(overtime: Overtime, hourlyRate: number): number {
    if (hourlyRate < 0) {
      throw new ValidationError('hourlyRate', hourlyRate, 'Saatlik ücret negatif olamaz')
    }

    return overtime.hours * overtime.multiplier * hourlyRate
  }

  /**
   * Personelin belirli bir aydaki toplam onaylanmış mesai saatini getir
   */
  async getTotalApprovedHours(employeeId: number, month: number, year: number): Promise<number> {
    return await this.repository.getTotalApprovedHours(employeeId, month, year)
  }

  /**
   * Personelin belirli bir aydaki toplam mesai ücretini hesapla
   */
  async calculateMonthlyOvertimePay(employeeId: number, month: number, year: number, hourlyRate: number): Promise<number> {
    const records = await this.repository.findApprovedByMonth(employeeId, month, year)
    
    let totalPay = 0
    for (const record of records) {
      totalPay += this.calculateOvertimePay(record, hourlyRate)
    }

    return Math.round(totalPay * 100) / 100 // 2 ondalık basamak
  }

  /**
   * Tarihi normalize et (saat bilgisini sıfırla)
   */
  private normalizeDate(date: Date): Date {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreateOvertimeDto): Promise<void> {
    // Personel zorunlu
    if (!data.employeeId) {
      throw new ValidationError('employeeId', data.employeeId, 'Personel ID zorunludur')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.repository.employeeExists(data.employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId: data.employeeId })
    }

    // Tarih zorunlu
    if (!data.date) {
      throw new ValidationError('date', data.date, 'Tarih zorunludur')
    }

    // Saat zorunlu ve validasyonu
    // Requirements: 8.6
    if (data.hours === undefined || data.hours === null) {
      throw new ValidationError('hours', data.hours, 'Mesai saati zorunludur')
    }
    if (data.hours <= 0) {
      throw new ValidationError('hours', data.hours, 'Mesai saati 0\'dan büyük olmalıdır')
    }
    if (data.hours > 24) {
      throw new ValidationError('hours', data.hours, 'Mesai saati 24\'ten büyük olamaz')
    }

    // Çarpan validasyonu
    // Requirements: 8.3
    if (data.multiplier !== undefined) {
      if (data.multiplier < 1.0) {
        throw new ValidationError('multiplier', data.multiplier, 'Çarpan 1.0\'dan küçük olamaz')
      }
      if (data.multiplier > 3.0) {
        throw new ValidationError('multiplier', data.multiplier, 'Çarpan 3.0\'dan büyük olamaz')
      }
    }
  }

  /**
   * Update validasyonu
   */
  private async validateUpdate(data: UpdateOvertimeDto): Promise<void> {
    // Saat validasyonu
    // Requirements: 8.6
    if (data.hours !== undefined) {
      if (data.hours <= 0) {
        throw new ValidationError('hours', data.hours, 'Mesai saati 0\'dan büyük olmalıdır')
      }
      if (data.hours > 24) {
        throw new ValidationError('hours', data.hours, 'Mesai saati 24\'ten büyük olamaz')
      }
    }

    // Çarpan validasyonu
    // Requirements: 8.3
    if (data.multiplier !== undefined) {
      if (data.multiplier < 1.0) {
        throw new ValidationError('multiplier', data.multiplier, 'Çarpan 1.0\'dan küçük olamaz')
      }
      if (data.multiplier > 3.0) {
        throw new ValidationError('multiplier', data.multiplier, 'Çarpan 3.0\'dan büyük olamaz')
      }
    }
  }
}

export default OvertimeService
