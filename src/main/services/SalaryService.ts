import { SalaryHistory } from '@prisma/client'
import { 
  SalaryHistoryRepository, 
  SalaryHistoryWithRelations, 
  SalaryHistoryFilterOptions 
} from '../repositories/SalaryHistoryRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Valid currency values
 * Requirements: 12.2
 */
export const VALID_CURRENCIES = ['TRY', 'USD', 'EUR'] as const
export type Currency = typeof VALID_CURRENCIES[number]

/**
 * Valid period type values
 * Requirements: 12.3
 */
export const VALID_PERIOD_TYPES = ['Aylık', 'Saatlik'] as const
export type PeriodType = typeof VALID_PERIOD_TYPES[number]

/**
 * Create Salary DTO
 */
export interface CreateSalaryDto {
  employeeId: number
  amount: number
  currency?: Currency
  periodType?: PeriodType
  startDate?: Date
}

/**
 * Update Salary DTO
 */
export interface UpdateSalaryDto {
  amount?: number
  currency?: Currency
  periodType?: PeriodType
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
 * SalaryService - Maaş geçmişi iş mantığı
 * Maaş kaydı oluşturma, önceki kaydı kapatma, güncel maaş sorgulama
 * Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
 */
export class SalaryService {
  private repository: SalaryHistoryRepository

  constructor(repository: SalaryHistoryRepository) {
    this.repository = repository
  }

  /**
   * Tüm maaş geçmişlerini getir
   */
  async findAll(options: SalaryHistoryFilterOptions = {}): Promise<PaginatedResult<SalaryHistoryWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile maaş kaydı getir
   */
  async findById(id: number): Promise<SalaryHistoryWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Personelin güncel maaşını getir
   * Requirements: 12.5, 12.7 - end_date = null olan kayıt güncel maaştır
   */
  async getCurrentSalary(employeeId: number): Promise<SalaryHistory | null> {
    return await this.repository.findCurrentSalary(employeeId)
  }

  /**
   * Personelin maaş geçmişini getir
   * Requirements: 12.8 - Maaş geçmişi korunmalı
   */
  async getHistory(employeeId: number): Promise<SalaryHistory[]> {
    return await this.repository.findByEmployee(employeeId)
  }

  /**
   * Yeni maaş kaydı oluştur
   * Requirements: 12.2, 12.3, 12.4, 12.6
   */
  async create(employeeId: number, data: CreateSalaryDto, userId?: number): Promise<SalaryHistory> {
    // Validasyon
    await this.validateCreate(employeeId, data)

    const startDate = data.startDate || new Date()
    
    // Önceki aktif maaş kaydını kapat
    // Requirements: 12.4 - Yeni kayıt oluşturulduğunda önceki kaydın end_date'i set edilmeli
    const previousDay = new Date(startDate)
    previousDay.setDate(previousDay.getDate() - 1)
    await this.repository.closeCurrentSalary(employeeId, previousDay)

    // Yeni maaş kaydı oluştur
    const createData = {
      employeeId,
      amount: data.amount,
      currency: data.currency || 'TRY',
      periodType: data.periodType || 'Aylık',
      startDate,
      endDate: null // Aktif kayıt
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Maaş güncelle (yeni kayıt oluşturarak)
   * Requirements: 12.4, 12.8 - Maaş geçmişi korunmalı, üzerine yazılmamalı
   */
  async updateSalary(employeeId: number, newAmount: number, effectiveDate: Date, userId?: number): Promise<SalaryHistory> {
    // Validasyon
    if (newAmount <= 0) {
      throw new ValidationError('amount', newAmount, 'Maaş tutarı pozitif olmalıdır')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.repository.employeeExists(employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId })
    }

    // Mevcut maaşı al (para birimi ve dönem tipi için)
    const currentSalary = await this.repository.findCurrentSalary(employeeId)
    
    // Önceki aktif maaş kaydını kapat
    const previousDay = new Date(effectiveDate)
    previousDay.setDate(previousDay.getDate() - 1)
    await this.repository.closeCurrentSalary(employeeId, previousDay)

    // Yeni maaş kaydı oluştur
    const createData = {
      employeeId,
      amount: newAmount,
      currency: currentSalary?.currency || 'TRY',
      periodType: currentSalary?.periodType || 'Aylık',
      startDate: effectiveDate,
      endDate: null
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Belirli bir tarihteki maaşı getir
   */
  async getSalaryAtDate(employeeId: number, date: Date): Promise<SalaryHistory | null> {
    return await this.repository.findSalaryAtDate(employeeId, date)
  }

  /**
   * Saatlik ücreti hesapla (aylık maaştan)
   * Varsayılan: Ayda 22 iş günü, günde 8 saat
   */
  calculateHourlyRate(monthlySalary: number, workingDaysPerMonth: number = 22, hoursPerDay: number = 8): number {
    if (monthlySalary <= 0 || workingDaysPerMonth <= 0 || hoursPerDay <= 0) {
      return 0
    }
    return monthlySalary / (workingDaysPerMonth * hoursPerDay)
  }

  /**
   * Günlük ücreti hesapla (aylık maaştan)
   * Varsayılan: Ayda 30 gün
   */
  calculateDailyRate(monthlySalary: number, daysPerMonth: number = 30): number {
    if (monthlySalary <= 0 || daysPerMonth <= 0) {
      return 0
    }
    return monthlySalary / daysPerMonth
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(employeeId: number, data: CreateSalaryDto): Promise<void> {
    // Personel zorunlu
    if (!employeeId) {
      throw new ValidationError('employeeId', employeeId, 'Personel ID zorunludur')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.repository.employeeExists(employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId })
    }

    // Tutar zorunlu ve pozitif olmalı
    // Requirements: 12.6
    if (!data.amount || data.amount <= 0) {
      throw new ValidationError('amount', data.amount, 'Maaş tutarı pozitif olmalıdır')
    }

    // Para birimi validasyonu
    // Requirements: 12.2
    if (data.currency && !VALID_CURRENCIES.includes(data.currency)) {
      throw new ValidationError('currency', data.currency, `Geçerli para birimleri: ${VALID_CURRENCIES.join(', ')}`)
    }

    // Dönem tipi validasyonu
    // Requirements: 12.3
    if (data.periodType && !VALID_PERIOD_TYPES.includes(data.periodType)) {
      throw new ValidationError('periodType', data.periodType, `Geçerli dönem tipleri: ${VALID_PERIOD_TYPES.join(', ')}`)
    }
  }

  /**
   * Para birimi validasyonu
   */
  isValidCurrency(currency: string): boolean {
    return VALID_CURRENCIES.includes(currency as Currency)
  }

  /**
   * Dönem tipi validasyonu
   */
  isValidPeriodType(periodType: string): boolean {
    return VALID_PERIOD_TYPES.includes(periodType as PeriodType)
  }
}

export default SalaryService
