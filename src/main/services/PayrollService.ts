import { Payroll, PayrollItem } from '@prisma/client'
import { 
  PayrollRepository, 
  PayrollWithRelations, 
  PayrollFilterOptions 
} from '../repositories/PayrollRepository'
import { 
  PayrollItemRepository,
  VALID_ITEM_TYPES,
  VALID_INCOME_CATEGORIES,
  VALID_DEDUCTION_CATEGORIES,
  ItemType,
  IncomeCategory,
  DeductionCategory
} from '../repositories/PayrollItemRepository'
import { SalaryHistoryRepository } from '../repositories/SalaryHistoryRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create Payroll DTO
 */
export interface CreatePayrollDto {
  employeeId: number
  periodMonth: number
  periodYear: number
  baseSalary?: number // If not provided, will be fetched from current salary
}

/**
 * Create PayrollItem DTO
 */
export interface CreatePayrollItemDto {
  type: ItemType
  category: string
  description?: string
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
 * PayrollService - Bordro iş mantığı
 * Bordro oluşturma, net maaş hesaplama, kalem ekleme/silme, kesinleştirme
 * Requirements: 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */
export class PayrollService {
  private payrollRepository: PayrollRepository
  private payrollItemRepository: PayrollItemRepository
  private salaryRepository: SalaryHistoryRepository | null = null

  constructor(
    payrollRepository: PayrollRepository,
    payrollItemRepository: PayrollItemRepository,
    salaryRepository?: SalaryHistoryRepository
  ) {
    this.payrollRepository = payrollRepository
    this.payrollItemRepository = payrollItemRepository
    this.salaryRepository = salaryRepository || null
  }

  /**
   * Salary repository'yi ayarla
   */
  setSalaryRepository(salaryRepository: SalaryHistoryRepository): void {
    this.salaryRepository = salaryRepository
  }

  /**
   * Tüm bordroları getir
   */
  async findAll(options: PayrollFilterOptions = {}): Promise<PaginatedResult<PayrollWithRelations>> {
    return await this.payrollRepository.findAllWithRelations(options)
  }

  /**
   * ID ile bordro getir
   */
  async findById(id: number): Promise<PayrollWithRelations | null> {
    return await this.payrollRepository.findByIdWithRelations(id)
  }

  /**
   * Personel ve dönem ile bordro getir
   */
  async findByEmployeeAndPeriod(employeeId: number, periodMonth: number, periodYear: number): Promise<PayrollWithRelations | null> {
    return await this.payrollRepository.findByEmployeeAndPeriod(employeeId, periodMonth, periodYear)
  }

  /**
   * Personel bazlı bordroları getir
   */
  async getByEmployee(employeeId: number, year?: number): Promise<PayrollWithRelations[]> {
    return await this.payrollRepository.findByEmployee(employeeId, year)
  }

  /**
   * Dönem bazlı bordroları getir
   */
  async getByPeriod(periodMonth: number, periodYear: number): Promise<PayrollWithRelations[]> {
    return await this.payrollRepository.findByPeriod(periodMonth, periodYear)
  }

  /**
   * Bordro oluştur
   * Requirements: 13.1, 13.2, 13.3
   */
  async generate(employeeId: number, periodMonth: number, periodYear: number, userId?: number): Promise<PayrollWithRelations> {
    // Validasyon
    await this.validateCreate(employeeId, periodMonth, periodYear)

    // Temel maaşı al
    let baseSalary = 0
    if (this.salaryRepository) {
      const currentSalary = await this.salaryRepository.findCurrentSalary(employeeId)
      if (currentSalary) {
        baseSalary = currentSalary.amount
      }
    }

    // Bordro oluştur
    const createData = {
      employeeId,
      periodMonth,
      periodYear,
      baseSalary,
      totalAdditions: 0,
      totalDeductions: 0,
      netSalary: baseSalary, // Başlangıçta net = brüt
      isFinalized: false
    }

    const payroll = await this.payrollRepository.create(createData as any, userId)
    return await this.payrollRepository.findByIdWithRelations(payroll.id) as PayrollWithRelations
  }

  /**
   * Toplu bordro oluştur (tüm aktif personeller için)
   * Requirements: 13.1
   */
  async generateBulk(periodMonth: number, periodYear: number, userId?: number): Promise<PayrollWithRelations[]> {
    // Dönem validasyonu
    this.validatePeriod(periodMonth, periodYear)

    // Bordrosu olmayan aktif personelleri al
    const employeeIds = await this.payrollRepository.getEmployeesWithoutPayroll(periodMonth, periodYear)
    const createdPayrolls: PayrollWithRelations[] = []

    for (const employeeId of employeeIds) {
      try {
        const payroll = await this.generate(employeeId, periodMonth, periodYear, userId)
        createdPayrolls.push(payroll)
      } catch (error) {
        // Hata durumunda devam et (log tutulabilir)
        console.error(`Failed to create payroll for employee ${employeeId}:`, error)
      }
    }

    return createdPayrolls
  }

  /**
   * Bordroyu kesinleştir
   * Requirements: 13.4 - Kesinleştirme sonrası değişiklik yapılamaz
   */
  async finalize(payrollId: number, userId?: number): Promise<PayrollWithRelations> {
    const payroll = await this.payrollRepository.findById(payrollId)
    if (!payroll) {
      throw new BusinessRuleError('Bordro bulunamadı', { payrollId })
    }

    if (payroll.isFinalized) {
      throw new BusinessRuleError('Bordro zaten kesinleştirilmiş', { payrollId })
    }

    await this.payrollRepository.finalize(payrollId, userId)
    return await this.payrollRepository.findByIdWithRelations(payrollId) as PayrollWithRelations
  }

  /**
   * Bordro kalemi ekle
   * Requirements: 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
   */
  async addItem(payrollId: number, item: CreatePayrollItemDto, userId?: number): Promise<PayrollItem> {
    // Bordro kontrolü
    const payroll = await this.payrollRepository.findById(payrollId)
    if (!payroll) {
      throw new BusinessRuleError('Bordro bulunamadı', { payrollId })
    }

    // Kesinleşmiş bordro kontrolü
    // Requirements: 14.7
    if (payroll.isFinalized) {
      throw new BusinessRuleError('Kesinleşmiş bordro için kalem eklenemez', { payrollId })
    }

    // Kalem validasyonu
    this.validateItem(item)

    // Kalem oluştur
    const payrollItem = await this.payrollItemRepository.create({
      payrollId,
      type: item.type,
      category: item.category,
      description: item.description || null,
      amount: item.amount
    } as any, userId)

    // Toplamları güncelle
    // Requirements: 14.5
    await this.recalculateTotals(payrollId, userId)

    return payrollItem
  }

  /**
   * Bordro kalemini sil
   * Requirements: 14.5, 14.7
   */
  async removeItem(itemId: number, userId?: number): Promise<void> {
    const item = await this.payrollItemRepository.findByIdWithRelations(itemId)
    if (!item) {
      throw new BusinessRuleError('Bordro kalemi bulunamadı', { itemId })
    }

    // Kesinleşmiş bordro kontrolü
    // Requirements: 14.7
    if (item.payroll?.isFinalized) {
      throw new BusinessRuleError('Kesinleşmiş bordronun kalemi silinemez', { itemId })
    }

    const payrollId = item.payrollId

    // Kalemi sil
    await this.payrollItemRepository.hardDelete(itemId, userId)

    // Toplamları güncelle
    // Requirements: 14.5
    await this.recalculateTotals(payrollId, userId)
  }

  /**
   * Bordro toplamlarını yeniden hesapla
   * Requirements: 14.5
   */
  async recalculateTotals(payrollId: number, userId?: number): Promise<PayrollWithRelations> {
    const totalAdditions = await this.payrollItemRepository.calculateTotalAdditions(payrollId)
    const totalDeductions = await this.payrollItemRepository.calculateTotalDeductions(payrollId)

    await this.payrollRepository.updateTotals(payrollId, totalAdditions, totalDeductions, userId)
    return await this.payrollRepository.findByIdWithRelations(payrollId) as PayrollWithRelations
  }

  /**
   * Net maaş hesapla
   * Requirements: 13.3 - net_salary = base_salary + total_additions - total_deductions
   */
  calculateNetSalary(baseSalary: number, totalAdditions: number, totalDeductions: number): number {
    return baseSalary + totalAdditions - totalDeductions
  }

  /**
   * Onaylı mesaileri bordro kalemi olarak ekle
   * Requirements: 13.7
   */
  async includeApprovedOvertimes(payrollId: number, overtimes: Array<{ hours: number; multiplier: number; hourlyRate: number }>, userId?: number): Promise<void> {
    const payroll = await this.payrollRepository.findById(payrollId)
    if (!payroll) {
      throw new BusinessRuleError('Bordro bulunamadı', { payrollId })
    }

    if (payroll.isFinalized) {
      throw new BusinessRuleError('Kesinleşmiş bordro için mesai eklenemez', { payrollId })
    }

    for (const overtime of overtimes) {
      const amount = overtime.hours * overtime.multiplier * overtime.hourlyRate
      await this.addItem(payrollId, {
        type: 'Income',
        category: 'Overtime',
        description: `Fazla mesai: ${overtime.hours} saat x ${overtime.multiplier}`,
        amount
      }, userId)
    }
  }

  /**
   * Onaylı avansları bordro kesintisi olarak ekle
   * Requirements: 13.8
   */
  async includeApprovedAdvances(payrollId: number, advances: Array<{ id: number; amount: number }>, userId?: number): Promise<void> {
    const payroll = await this.payrollRepository.findById(payrollId)
    if (!payroll) {
      throw new BusinessRuleError('Bordro bulunamadı', { payrollId })
    }

    if (payroll.isFinalized) {
      throw new BusinessRuleError('Kesinleşmiş bordro için avans kesintisi eklenemez', { payrollId })
    }

    for (const advance of advances) {
      await this.addItem(payrollId, {
        type: 'Deduction',
        category: 'Advance',
        description: `Avans kesintisi #${advance.id}`,
        amount: advance.amount
      }, userId)
    }
  }

  /**
   * Bordro kalemlerini getir
   */
  async getItems(payrollId: number): Promise<PayrollItem[]> {
    return await this.payrollItemRepository.findByPayroll(payrollId)
  }

  /**
   * Dönem istatistiklerini getir
   */
  async getPeriodStatistics(periodMonth: number, periodYear: number): Promise<{
    totalPayrolls: number
    totalBaseSalary: number
    totalAdditions: number
    totalDeductions: number
    totalNetSalary: number
    finalizedCount: number
    pendingCount: number
  }> {
    return await this.payrollRepository.getPeriodStatistics(periodMonth, periodYear)
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(employeeId: number, periodMonth: number, periodYear: number): Promise<void> {
    // Personel zorunlu
    if (!employeeId) {
      throw new ValidationError('employeeId', employeeId, 'Personel ID zorunludur')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.payrollRepository.employeeExists(employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId })
    }

    // Dönem validasyonu
    this.validatePeriod(periodMonth, periodYear)

    // Benzersizlik kontrolü
    // Requirements: 13.2
    const isUnique = await this.payrollRepository.isUniquePeriod(employeeId, periodMonth, periodYear)
    if (!isUnique) {
      throw new BusinessRuleError('Bu personel ve dönem için zaten bordro kaydı var', { employeeId, periodMonth, periodYear })
    }
  }

  /**
   * Dönem validasyonu
   * Requirements: 13.5, 13.6
   */
  private validatePeriod(periodMonth: number, periodYear: number): void {
    // Ay validasyonu (1-12)
    // Requirements: 13.5
    if (!periodMonth || periodMonth < 1 || periodMonth > 12) {
      throw new ValidationError('periodMonth', periodMonth, 'Ay 1-12 arasında olmalıdır')
    }

    // Yıl validasyonu (2000-2100)
    // Requirements: 13.6
    if (!periodYear || periodYear < 2000 || periodYear > 2100) {
      throw new ValidationError('periodYear', periodYear, 'Yıl 2000-2100 arasında olmalıdır')
    }
  }

  /**
   * Kalem validasyonu
   * Requirements: 14.2, 14.3, 14.4, 14.6
   */
  private validateItem(item: CreatePayrollItemDto): void {
    // Tip validasyonu
    // Requirements: 14.2
    if (!VALID_ITEM_TYPES.includes(item.type)) {
      throw new ValidationError('type', item.type, `Geçerli tipler: ${VALID_ITEM_TYPES.join(', ')}`)
    }

    // Kategori validasyonu
    // Requirements: 14.3, 14.4
    if (item.type === 'Income') {
      if (!VALID_INCOME_CATEGORIES.includes(item.category as IncomeCategory)) {
        throw new ValidationError('category', item.category, `Geçerli gelir kategorileri: ${VALID_INCOME_CATEGORIES.join(', ')}`)
      }
    } else {
      if (!VALID_DEDUCTION_CATEGORIES.includes(item.category as DeductionCategory)) {
        throw new ValidationError('category', item.category, `Geçerli kesinti kategorileri: ${VALID_DEDUCTION_CATEGORIES.join(', ')}`)
      }
    }

    // Tutar validasyonu
    // Requirements: 14.6
    if (!item.amount || item.amount <= 0) {
      throw new ValidationError('amount', item.amount, 'Tutar pozitif olmalıdır')
    }
  }

  /**
   * Tip validasyonu
   */
  isValidItemType(type: string): boolean {
    return VALID_ITEM_TYPES.includes(type as ItemType)
  }

  /**
   * Gelir kategorisi validasyonu
   */
  isValidIncomeCategory(category: string): boolean {
    return VALID_INCOME_CATEGORIES.includes(category as IncomeCategory)
  }

  /**
   * Kesinti kategorisi validasyonu
   */
  isValidDeductionCategory(category: string): boolean {
    return VALID_DEDUCTION_CATEGORIES.includes(category as DeductionCategory)
  }
}

export default PayrollService
