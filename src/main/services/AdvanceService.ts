import { SalaryAdvance } from '@prisma/client'
import { 
  AdvanceRepository, 
  AdvanceWithRelations, 
  AdvanceFilterOptions,
  VALID_ADVANCE_STATUSES,
  AdvanceStatus
} from '../repositories/AdvanceRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create Advance DTO
 */
export interface CreateAdvanceDto {
  employeeId: number
  amount: number
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
 * Default settings for advance limits
 */
const DEFAULT_SETTINGS = {
  MAX_ADVANCE_PERCENTAGE: 50, // Maaşın maksimum %50'si
  DEDUCTION_PERIOD_FORMAT: /^\d{4}-(0[1-9]|1[0-2])$/ // YYYY-MM format
}

/**
 * AdvanceService - Avans iş mantığı
 * Avans talebi oluşturma, onay/red işlemleri, ödeme ve kesinti durumu güncelleme
 * Requirements: 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
 */
export class AdvanceService {
  private repository: AdvanceRepository
  private settings = DEFAULT_SETTINGS

  constructor(repository: AdvanceRepository) {
    this.repository = repository
  }

  /**
   * Ayarları güncelle
   */
  setSettings(settings: Partial<typeof DEFAULT_SETTINGS>): void {
    this.settings = { ...this.settings, ...settings }
  }

  /**
   * Tüm avansları getir
   */
  async findAll(options: AdvanceFilterOptions = {}): Promise<PaginatedResult<AdvanceWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile avans getir
   */
  async findById(id: number): Promise<AdvanceWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Personel bazlı avansları getir
   */
  async findByEmployee(employeeId: number): Promise<AdvanceWithRelations[]> {
    return await this.repository.findByEmployee(employeeId)
  }

  /**
   * Bekleyen avansları getir
   */
  async findPending(): Promise<AdvanceWithRelations[]> {
    return await this.repository.findPending()
  }

  /**
   * Kesinti dönemi bazlı avansları getir
   */
  async findByDeductionPeriod(deductionPeriod: string): Promise<AdvanceWithRelations[]> {
    return await this.repository.findByDeductionPeriod(deductionPeriod)
  }

  /**
   * Avans talebi oluştur
   * Requirements: 15.1, 15.5, 15.7
   */
  async request(employeeId: number, data: CreateAdvanceDto, userId?: number): Promise<SalaryAdvance> {
    // Validasyon
    await this.validateRequest(employeeId, data)

    // Avans talebi oluştur
    const createData = {
      employeeId,
      amount: data.amount,
      requestDate: new Date(),
      status: 'Pending'
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Avansı onayla
   * Requirements: 15.3
   */
  async approve(id: number, approverId: number, deductionPeriod: string, userId?: number): Promise<SalaryAdvance> {
    const advance = await this.repository.findById(id)
    if (!advance) {
      throw new BusinessRuleError('Avans bulunamadı', { id })
    }

    if (advance.status !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen avanslar onaylanabilir', { id, currentStatus: advance.status })
    }

    // Kesinti dönemi formatı kontrolü
    // Requirements: 15.3
    if (!this.settings.DEDUCTION_PERIOD_FORMAT.test(deductionPeriod)) {
      throw new ValidationError('deductionPeriod', deductionPeriod, 'Kesinti dönemi YYYY-MM formatında olmalıdır')
    }

    return await this.repository.approve(id, approverId, deductionPeriod, userId)
  }

  /**
   * Avansı reddet
   */
  async reject(id: number, approverId: number, userId?: number): Promise<SalaryAdvance> {
    const advance = await this.repository.findById(id)
    if (!advance) {
      throw new BusinessRuleError('Avans bulunamadı', { id })
    }

    if (advance.status !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen avanslar reddedilebilir', { id, currentStatus: advance.status })
    }

    return await this.repository.reject(id, approverId, userId)
  }

  /**
   * Avansı ödenmiş olarak işaretle
   * Requirements: 15.4
   */
  async markAsPaid(id: number, paymentDate: Date, userId?: number): Promise<SalaryAdvance> {
    const advance = await this.repository.findById(id)
    if (!advance) {
      throw new BusinessRuleError('Avans bulunamadı', { id })
    }

    if (advance.status !== 'Approved') {
      throw new BusinessRuleError('Sadece onaylanmış avanslar ödenmiş olarak işaretlenebilir', { id, currentStatus: advance.status })
    }

    return await this.repository.markAsPaid(id, paymentDate, userId)
  }

  /**
   * Avansı kesilmiş olarak işaretle
   * Requirements: 15.6
   */
  async markAsDeducted(id: number, userId?: number): Promise<SalaryAdvance> {
    const advance = await this.repository.findById(id)
    if (!advance) {
      throw new BusinessRuleError('Avans bulunamadı', { id })
    }

    if (advance.status !== 'Paid') {
      throw new BusinessRuleError('Sadece ödenmiş avanslar kesilmiş olarak işaretlenebilir', { id, currentStatus: advance.status })
    }

    return await this.repository.markAsDeducted(id, userId)
  }

  /**
   * Avans tutarının geçerli olup olmadığını kontrol et
   * Requirements: 15.5
   */
  async validateAmount(employeeId: number, amount: number): Promise<boolean> {
    const currentSalary = await this.repository.getEmployeeCurrentSalary(employeeId)
    if (!currentSalary) {
      return false
    }

    const maxAllowed = (currentSalary * this.settings.MAX_ADVANCE_PERCENTAGE) / 100
    return amount <= maxAllowed
  }

  /**
   * Personelin bekleyen avansı var mı kontrol et
   * Requirements: 15.7
   */
  async hasPendingAdvance(employeeId: number): Promise<boolean> {
    return await this.repository.hasPendingAdvance(employeeId)
  }

  /**
   * Personelin maksimum avans tutarını hesapla
   * Requirements: 15.5
   */
  async getMaxAdvanceAmount(employeeId: number): Promise<number> {
    const currentSalary = await this.repository.getEmployeeCurrentSalary(employeeId)
    if (!currentSalary) {
      return 0
    }

    return (currentSalary * this.settings.MAX_ADVANCE_PERCENTAGE) / 100
  }

  /**
   * Request validasyonu
   */
  private async validateRequest(employeeId: number, data: CreateAdvanceDto): Promise<void> {
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
    if (!data.amount || data.amount <= 0) {
      throw new ValidationError('amount', data.amount, 'Avans tutarı pozitif olmalıdır')
    }

    // Tutar limiti kontrolü
    // Requirements: 15.5
    const isValidAmount = await this.validateAmount(employeeId, data.amount)
    if (!isValidAmount) {
      const maxAmount = await this.getMaxAdvanceAmount(employeeId)
      throw new BusinessRuleError('Avans tutarı maaşın %' + this.settings.MAX_ADVANCE_PERCENTAGE + '\'ini aşamaz', {
        employeeId,
        requestedAmount: data.amount,
        maxAllowed: maxAmount
      })
    }

    // Bekleyen avans kontrolü
    // Requirements: 15.7
    const hasPending = await this.hasPendingAdvance(employeeId)
    if (hasPending) {
      throw new BusinessRuleError('Bu personelin zaten bekleyen bir avans talebi var', { employeeId })
    }
  }

  /**
   * Durum validasyonu
   */
  isValidStatus(status: string): boolean {
    return VALID_ADVANCE_STATUSES.includes(status as AdvanceStatus)
  }

  /**
   * Kesinti dönemi formatı validasyonu
   */
  isValidDeductionPeriod(period: string): boolean {
    return this.settings.DEDUCTION_PERIOD_FORMAT.test(period)
  }
}

export default AdvanceService
