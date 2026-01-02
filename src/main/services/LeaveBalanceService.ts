import { LeaveBalance } from '@prisma/client'
import { 
  LeaveBalanceRepository, 
  LeaveBalanceWithRelations, 
  LeaveBalanceFilterOptions 
} from '../repositories/LeaveBalanceRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create LeaveBalance DTO
 */
export interface CreateLeaveBalanceDto {
  employeeId: number
  year: number
  annualLeaveEntitlement?: number
  transferredDays?: number
  usedDays?: number
}

/**
 * Update LeaveBalance DTO
 */
export interface UpdateLeaveBalanceDto {
  annualLeaveEntitlement?: number
  transferredDays?: number
  usedDays?: number
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
 * Default settings for leave balance calculation
 */
const DEFAULT_SETTINGS = {
  BASE_ANNUAL_LEAVE_DAYS: 14, // Temel yıllık izin günü
  MAX_TRANSFER_DAYS: 5, // Maksimum devir günü
  TENURE_BONUS_YEARS: [5, 10, 15], // Kıdem bonusu yılları
  TENURE_BONUS_DAYS: [2, 4, 6] // Her kıdem yılı için ek gün
}

/**
 * LeaveBalanceService - İzin bakiyeleri iş mantığı
 * Bakiye oluşturma ve güncelleme, kalan gün hesaplama, kıdeme göre hak hesaplama, yıl sonu devir işlemi
 * Requirements: 11.3, 11.4, 11.5, 11.6, 11.7
 */
export class LeaveBalanceService {
  private repository: LeaveBalanceRepository
  private settings = DEFAULT_SETTINGS

  constructor(repository: LeaveBalanceRepository) {
    this.repository = repository
  }

  /**
   * Ayarları güncelle
   */
  setSettings(settings: Partial<typeof DEFAULT_SETTINGS>): void {
    this.settings = { ...this.settings, ...settings }
  }

  /**
   * Tüm izin bakiyelerini getir
   */
  async findAll(options: LeaveBalanceFilterOptions = {}): Promise<PaginatedResult<LeaveBalanceWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile izin bakiyesi getir
   */
  async findById(id: number): Promise<LeaveBalanceWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Personel ve yıl ile izin bakiyesi getir
   */
  async getBalance(employeeId: number, year: number): Promise<LeaveBalance | null> {
    return await this.repository.findByEmployeeAndYear(employeeId, year)
  }

  /**
   * Personel bazlı izin bakiyelerini getir
   */
  async findByEmployee(employeeId: number): Promise<LeaveBalance[]> {
    return await this.repository.findByEmployee(employeeId)
  }

  /**
   * Yıl bazlı izin bakiyelerini getir
   */
  async findByYear(year: number): Promise<LeaveBalanceWithRelations[]> {
    return await this.repository.findByYear(year)
  }

  /**
   * İzin bakiyesi oluştur
   * Requirements: 11.1, 11.2, 11.3
   */
  async create(employeeId: number, year: number, userId?: number): Promise<LeaveBalance> {
    // Validasyon
    await this.validateCreate(employeeId, year)

    // Kıdeme göre hak hesapla
    // Requirements: 11.5
    const entitlement = await this.calculateEntitlement(employeeId, year)

    const createData = {
      employeeId,
      year,
      annualLeaveEntitlement: entitlement,
      transferredDays: 0,
      usedDays: 0,
      remainingDays: entitlement // Başlangıçta kalan = hak
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * İzin bakiyesi güncelle
   */
  async update(id: number, data: UpdateLeaveBalanceDto, userId?: number): Promise<LeaveBalance> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('İzin bakiyesi bulunamadı', { id })
    }

    // Validasyon
    this.validateUpdate(data)

    // Güncelleme verisi hazırla
    const updateData: any = {}

    let annualLeaveEntitlement = existing.annualLeaveEntitlement
    let transferredDays = existing.transferredDays
    let usedDays = existing.usedDays

    if (data.annualLeaveEntitlement !== undefined) {
      annualLeaveEntitlement = data.annualLeaveEntitlement
      updateData.annualLeaveEntitlement = annualLeaveEntitlement
    }
    if (data.transferredDays !== undefined) {
      transferredDays = data.transferredDays
      updateData.transferredDays = transferredDays
    }
    if (data.usedDays !== undefined) {
      usedDays = data.usedDays
      updateData.usedDays = usedDays
    }

    // Kalan günleri yeniden hesapla
    // Requirements: 11.4
    updateData.remainingDays = this.calculateRemainingDays(annualLeaveEntitlement, transferredDays, usedDays)

    return await this.repository.update(id, updateData, userId)
  }

  /**
   * Kullanılan günleri düş
   * Requirements: 11.7
   */
  async deductDays(employeeId: number, year: number, days: number, userId?: number): Promise<LeaveBalance> {
    const existing = await this.repository.findByEmployeeAndYear(employeeId, year)
    if (!existing) {
      throw new BusinessRuleError('İzin bakiyesi bulunamadı', { employeeId, year })
    }

    if (days <= 0) {
      throw new ValidationError('days', days, 'Düşülecek gün sayısı pozitif olmalıdır')
    }

    const newUsedDays = existing.usedDays + days
    const newRemainingDays = this.calculateRemainingDays(
      existing.annualLeaveEntitlement,
      existing.transferredDays,
      newUsedDays
    )

    // Negatif bakiye kontrolü (opsiyonel - bazı şirketler izin verebilir)
    if (newRemainingDays < 0) {
      throw new BusinessRuleError('Yetersiz izin bakiyesi', {
        employeeId,
        year,
        requested: days,
        available: existing.remainingDays
      })
    }

    return await this.repository.update(existing.id, {
      usedDays: newUsedDays,
      remainingDays: newRemainingDays
    } as any, userId)
  }

  /**
   * Kullanılan günleri ekle (iptal durumunda)
   */
  async addDays(employeeId: number, year: number, days: number, userId?: number): Promise<LeaveBalance> {
    const existing = await this.repository.findByEmployeeAndYear(employeeId, year)
    if (!existing) {
      throw new BusinessRuleError('İzin bakiyesi bulunamadı', { employeeId, year })
    }

    if (days <= 0) {
      throw new ValidationError('days', days, 'Eklenecek gün sayısı pozitif olmalıdır')
    }

    const newUsedDays = Math.max(0, existing.usedDays - days)
    const newRemainingDays = this.calculateRemainingDays(
      existing.annualLeaveEntitlement,
      existing.transferredDays,
      newUsedDays
    )

    return await this.repository.update(existing.id, {
      usedDays: newUsedDays,
      remainingDays: newRemainingDays
    } as any, userId)
  }

  /**
   * Yıl sonu devir işlemi
   * Requirements: 11.6
   */
  async transferToNextYear(employeeId: number, fromYear: number, userId?: number): Promise<LeaveBalance> {
    // Önceki yılın bakiyesini al
    const previousBalance = await this.repository.findByEmployeeAndYear(employeeId, fromYear)
    if (!previousBalance) {
      throw new BusinessRuleError('Önceki yıl bakiyesi bulunamadı', { employeeId, year: fromYear })
    }

    // Devredilecek gün sayısını hesapla (maksimum limite göre)
    const daysToTransfer = Math.min(
      Math.max(0, previousBalance.remainingDays),
      this.settings.MAX_TRANSFER_DAYS
    )

    const nextYear = fromYear + 1

    // Sonraki yıl bakiyesi var mı kontrol et
    let nextYearBalance = await this.repository.findByEmployeeAndYear(employeeId, nextYear)

    if (nextYearBalance) {
      // Varsa devredilen günleri güncelle
      const newTransferredDays = nextYearBalance.transferredDays + daysToTransfer
      const newRemainingDays = this.calculateRemainingDays(
        nextYearBalance.annualLeaveEntitlement,
        newTransferredDays,
        nextYearBalance.usedDays
      )

      return await this.repository.update(nextYearBalance.id, {
        transferredDays: newTransferredDays,
        remainingDays: newRemainingDays
      } as any, userId)
    } else {
      // Yoksa yeni bakiye oluştur
      const entitlement = await this.calculateEntitlement(employeeId, nextYear)
      const remainingDays = entitlement + daysToTransfer

      const createData = {
        employeeId,
        year: nextYear,
        annualLeaveEntitlement: entitlement,
        transferredDays: daysToTransfer,
        usedDays: 0,
        remainingDays
      }

      return await this.repository.create(createData as any, userId)
    }
  }

  /**
   * Kıdeme göre yıllık izin hakkı hesapla
   * Requirements: 11.5
   */
  async calculateEntitlement(employeeId: number, year: number): Promise<number> {
    const hireDate = await this.repository.getEmployeeHireDate(employeeId)
    if (!hireDate) {
      return this.settings.BASE_ANNUAL_LEAVE_DAYS
    }

    // Kıdem yılı hesapla
    const yearStart = new Date(year, 0, 1)
    const tenureYears = Math.floor(
      (yearStart.getTime() - new Date(hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    )

    // Temel izin hakkı
    let entitlement = this.settings.BASE_ANNUAL_LEAVE_DAYS

    // Kıdem bonusu ekle
    for (let i = 0; i < this.settings.TENURE_BONUS_YEARS.length; i++) {
      if (tenureYears >= this.settings.TENURE_BONUS_YEARS[i]) {
        entitlement = this.settings.BASE_ANNUAL_LEAVE_DAYS + this.settings.TENURE_BONUS_DAYS[i]
      }
    }

    return entitlement
  }

  /**
   * Yıllık bakiyeleri toplu oluştur
   * Requirements: 11.3
   */
  async initializeYearlyBalances(year: number, userId?: number): Promise<LeaveBalance[]> {
    const employeesWithoutBalance = await this.repository.getEmployeesWithoutBalance(year)
    const createdBalances: LeaveBalance[] = []

    for (const employeeId of employeesWithoutBalance) {
      try {
        const balance = await this.create(employeeId, year, userId)
        createdBalances.push(balance)
      } catch (error) {
        // Hata durumunda devam et (log tutulabilir)
        console.error(`Failed to create balance for employee ${employeeId}:`, error)
      }
    }

    return createdBalances
  }

  /**
   * Kalan gün hesapla
   * Requirements: 11.4
   * Formül: remaining_days = annual_leave_entitlement + transferred_days - used_days
   */
  calculateRemainingDays(annualLeaveEntitlement: number, transferredDays: number, usedDays: number): number {
    return annualLeaveEntitlement + transferredDays - usedDays
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(employeeId: number, year: number): Promise<void> {
    // Personel zorunlu
    if (!employeeId) {
      throw new ValidationError('employeeId', employeeId, 'Personel ID zorunludur')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.repository.employeeExists(employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId })
    }

    // Yıl zorunlu
    if (!year || year < 2000 || year > 2100) {
      throw new ValidationError('year', year, 'Geçerli bir yıl giriniz (2000-2100)')
    }

    // Benzersizlik kontrolü
    // Requirements: 11.2
    const isUnique = await this.repository.isUniqueEmployeeYear(employeeId, year)
    if (!isUnique) {
      throw new BusinessRuleError('Bu personel ve yıl için zaten bakiye kaydı var', { employeeId, year })
    }
  }

  /**
   * Update validasyonu
   */
  private validateUpdate(data: UpdateLeaveBalanceDto): void {
    if (data.annualLeaveEntitlement !== undefined && data.annualLeaveEntitlement < 0) {
      throw new ValidationError('annualLeaveEntitlement', data.annualLeaveEntitlement, 'Yıllık izin hakkı negatif olamaz')
    }

    if (data.transferredDays !== undefined && data.transferredDays < 0) {
      throw new ValidationError('transferredDays', data.transferredDays, 'Devredilen gün sayısı negatif olamaz')
    }

    if (data.usedDays !== undefined && data.usedDays < 0) {
      throw new ValidationError('usedDays', data.usedDays, 'Kullanılan gün sayısı negatif olamaz')
    }
  }
}

export default LeaveBalanceService
