import { Resignation, ExitInterview } from '@prisma/client'
import { 
  ResignationRepository, 
  ResignationWithRelations, 
  ResignationFilterOptions,
  VALID_REASON_CATEGORIES,
  VALID_RESIGNATION_STATUSES,
  ReasonCategory,
  ResignationStatus
} from '../repositories/ResignationRepository'
import { 
  ExitInterviewRepository, 
  ExitInterviewWithRelations 
} from '../repositories/ExitInterviewRepository'
import { PaginatedResult } from '../repositories/BaseRepository'
import { PrismaClient } from '@prisma/client'

/**
 * Create Resignation DTO
 */
export interface CreateResignationDto {
  employeeId: number
  reasonCategory: ReasonCategory
  reasonDetail?: string
  lastWorkingDay?: Date
}

/**
 * Update Resignation DTO
 */
export interface UpdateResignationDto {
  reasonCategory?: ReasonCategory
  reasonDetail?: string
  lastWorkingDay?: Date
}

/**
 * Create Exit Interview DTO
 */
export interface CreateExitInterviewDto {
  comments?: string
  wouldRehire?: boolean
}

/**
 * Update Exit Interview DTO
 */
export interface UpdateExitInterviewDto {
  comments?: string
  wouldRehire?: boolean
}

/**
 * Final Settlement - Kalan izin ve ödeme hesaplama
 */
export interface FinalSettlement {
  remainingLeaveDays: number
  leavePayoutAmount: number
  pendingAdvances: number
  netSettlement: number
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
 * OffboardingService - İşten ayrılma iş mantığı
 * Ayrılma talebi oluşturma, onay ve tamamlama işlemleri, personel durumu güncelleme,
 * çıkış mülakatı oluşturma, kalan izin hesaplama
 * Requirements: 19.2, 19.3, 19.4, 19.7
 */
export class OffboardingService {
  private resignationRepository: ResignationRepository
  private exitInterviewRepository: ExitInterviewRepository
  private prisma: PrismaClient

  constructor(
    resignationRepository: ResignationRepository,
    exitInterviewRepository: ExitInterviewRepository,
    prisma: PrismaClient
  ) {
    this.resignationRepository = resignationRepository
    this.exitInterviewRepository = exitInterviewRepository
    this.prisma = prisma
  }

  // ==================== RESIGNATION METHODS ====================

  /**
   * Tüm ayrılma kayıtlarını getir
   */
  async findAllResignations(options: ResignationFilterOptions = {}): Promise<PaginatedResult<ResignationWithRelations>> {
    return await this.resignationRepository.findAllWithRelations(options)
  }

  /**
   * ID ile ayrılma kaydı getir
   */
  async findResignationById(id: number): Promise<ResignationWithRelations | null> {
    return await this.resignationRepository.findByIdWithRelations(id)
  }

  /**
   * Personel bazlı ayrılma kaydı getir
   */
  async findResignationByEmployee(employeeId: number): Promise<ResignationWithRelations | null> {
    return await this.resignationRepository.findByEmployee(employeeId)
  }

  /**
   * Bekleyen ayrılma taleplerini getir
   */
  async findPendingResignations(): Promise<ResignationWithRelations[]> {
    return await this.resignationRepository.findPending()
  }

  /**
   * Onaylanmış ayrılma taleplerini getir
   */
  async findApprovedResignations(): Promise<ResignationWithRelations[]> {
    return await this.resignationRepository.findApproved()
  }

  /**
   * Ayrılma talebi oluştur
   * Requirements: 19.1, 19.2, 19.3
   */
  async createResignation(data: CreateResignationDto, userId?: number): Promise<Resignation> {
    // Validasyon
    await this.validateCreateResignation(data)

    const createData = {
      employeeId: data.employeeId,
      reasonCategory: data.reasonCategory,
      reasonDetail: data.reasonDetail,
      lastWorkingDay: data.lastWorkingDay,
      status: 'Pending'
    }

    return await this.resignationRepository.create(createData as any, userId)
  }

  /**
   * Ayrılma talebini güncelle
   */
  async updateResignation(id: number, data: UpdateResignationDto, userId?: number): Promise<Resignation> {
    const resignation = await this.resignationRepository.findById(id)
    if (!resignation) {
      throw new BusinessRuleError('Ayrılma kaydı bulunamadı', { id })
    }

    // Sadece bekleyen talepler güncellenebilir
    if (resignation.status !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen talepler güncellenebilir', { 
        id, 
        currentStatus: resignation.status 
      })
    }

    // Validasyon
    if (data.reasonCategory) {
      this.validateReasonCategory(data.reasonCategory)
    }

    return await this.resignationRepository.update(id, data, userId)
  }

  /**
   * Ayrılma talebini onayla
   * Requirements: 19.3
   */
  async approveResignation(id: number, lastWorkingDay?: Date, userId?: number): Promise<Resignation> {
    const resignation = await this.resignationRepository.findById(id)
    if (!resignation) {
      throw new BusinessRuleError('Ayrılma kaydı bulunamadı', { id })
    }

    if (resignation.status !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen talepler onaylanabilir', { 
        id, 
        currentStatus: resignation.status 
      })
    }

    // Son çalışma günü zorunlu
    const finalLastWorkingDay = lastWorkingDay || resignation.lastWorkingDay
    if (!finalLastWorkingDay) {
      throw new BusinessRuleError('Son çalışma günü belirtilmelidir', { id })
    }

    // Güncelle
    await this.resignationRepository.update(id, { 
      status: 'Approved',
      lastWorkingDay: finalLastWorkingDay
    }, userId)

    return await this.resignationRepository.findById(id) as Resignation
  }

  /**
   * Ayrılma talebini tamamla ve personel durumunu güncelle
   * Requirements: 19.4
   */
  async completeResignation(id: number, userId?: number): Promise<Resignation> {
    const resignation = await this.resignationRepository.findByIdWithRelations(id)
    if (!resignation) {
      throw new BusinessRuleError('Ayrılma kaydı bulunamadı', { id })
    }

    if (resignation.status !== 'Approved') {
      throw new BusinessRuleError('Sadece onaylanmış talepler tamamlanabilir', { 
        id, 
        currentStatus: resignation.status 
      })
    }

    // Personel durumunu Terminated olarak güncelle
    // Requirements: 19.4
    await this.prisma.employee.update({
      where: { id: resignation.employeeId },
      data: { status: 'Terminated' }
    })

    // Ayrılma durumunu Completed olarak güncelle
    await this.resignationRepository.update(id, { status: 'Completed' }, userId)

    return await this.resignationRepository.findById(id) as Resignation
  }

  /**
   * Ayrılma talebini sil (soft delete)
   */
  async deleteResignation(id: number, userId?: number): Promise<Resignation> {
    const resignation = await this.resignationRepository.findById(id)
    if (!resignation) {
      throw new BusinessRuleError('Ayrılma kaydı bulunamadı', { id })
    }

    // Tamamlanmış talepler silinemez
    if (resignation.status === 'Completed') {
      throw new BusinessRuleError('Tamamlanmış talepler silinemez', { 
        id, 
        currentStatus: resignation.status 
      })
    }

    return await this.resignationRepository.softDelete(id, userId)
  }

  // ==================== EXIT INTERVIEW METHODS ====================

  /**
   * Tüm çıkış mülakatlarını getir
   */
  async findAllExitInterviews(): Promise<ExitInterviewWithRelations[]> {
    return await this.exitInterviewRepository.findAll()
  }

  /**
   * ID ile çıkış mülakatı getir
   */
  async findExitInterviewById(id: number): Promise<ExitInterviewWithRelations | null> {
    return await this.exitInterviewRepository.findById(id)
  }

  /**
   * Resignation ID ile çıkış mülakatı getir
   */
  async findExitInterviewByResignation(resignationId: number): Promise<ExitInterviewWithRelations | null> {
    return await this.exitInterviewRepository.findByResignationId(resignationId)
  }

  /**
   * Çıkış mülakatı oluştur
   * Requirements: 19.5, 19.6
   */
  async createExitInterview(resignationId: number, data: CreateExitInterviewDto, userId?: number): Promise<ExitInterview> {
    // Validasyon
    await this.validateCreateExitInterview(resignationId)

    return await this.exitInterviewRepository.create({
      resignationId,
      comments: data.comments,
      wouldRehire: data.wouldRehire
    }, userId)
  }

  /**
   * Çıkış mülakatını güncelle
   */
  async updateExitInterview(id: number, data: UpdateExitInterviewDto, userId?: number): Promise<ExitInterview> {
    const exitInterview = await this.exitInterviewRepository.findById(id)
    if (!exitInterview) {
      throw new BusinessRuleError('Çıkış mülakatı bulunamadı', { id })
    }

    return await this.exitInterviewRepository.update(id, data, userId)
  }

  /**
   * Çıkış mülakatını sil
   */
  async deleteExitInterview(id: number, userId?: number): Promise<ExitInterview> {
    const exitInterview = await this.exitInterviewRepository.findById(id)
    if (!exitInterview) {
      throw new BusinessRuleError('Çıkış mülakatı bulunamadı', { id })
    }

    return await this.exitInterviewRepository.delete(id, userId)
  }

  // ==================== SETTLEMENT METHODS ====================

  /**
   * Kalan izin ve ödeme hesaplama
   * Requirements: 19.7
   */
  async calculateFinalSettlement(resignationId: number): Promise<FinalSettlement> {
    const resignation = await this.resignationRepository.findByIdWithRelations(resignationId)
    if (!resignation) {
      throw new BusinessRuleError('Ayrılma kaydı bulunamadı', { resignationId })
    }

    const employeeId = resignation.employeeId
    const currentYear = new Date().getFullYear()

    // Kalan izin günlerini hesapla
    const leaveBalance = await this.prisma.leaveBalance.findFirst({
      where: {
        employeeId,
        year: currentYear
      }
    })

    const remainingLeaveDays = leaveBalance?.remainingDays || 0

    // Güncel maaşı al
    const currentSalary = await this.prisma.salaryHistory.findFirst({
      where: {
        employeeId,
        endDate: null
      },
      orderBy: { startDate: 'desc' }
    })

    // Günlük maaş hesapla (aylık maaş / 30)
    const dailyRate = currentSalary ? currentSalary.amount / 30 : 0
    const leavePayoutAmount = remainingLeaveDays * dailyRate

    // Bekleyen avansları hesapla
    const pendingAdvances = await this.prisma.salaryAdvance.aggregate({
      where: {
        employeeId,
        status: { in: ['Approved', 'Paid'] },
        deletedAt: null
      },
      _sum: { amount: true }
    })

    const pendingAdvanceAmount = pendingAdvances._sum.amount || 0

    // Net ödeme hesapla
    const netSettlement = leavePayoutAmount - pendingAdvanceAmount

    return {
      remainingLeaveDays,
      leavePayoutAmount,
      pendingAdvances: pendingAdvanceAmount,
      netSettlement
    }
  }

  // ==================== VALIDATION METHODS ====================

  /**
   * Reason category validasyonu
   * Requirements: 19.2
   */
  validateReasonCategory(reasonCategory: string): void {
    if (!VALID_REASON_CATEGORIES.includes(reasonCategory as ReasonCategory)) {
      throw new ValidationError('reasonCategory', reasonCategory, 
        `Geçerli değerler: ${VALID_REASON_CATEGORIES.join(', ')}`)
    }
  }

  /**
   * Status validasyonu
   * Requirements: 19.3
   */
  validateStatus(status: string): void {
    if (!VALID_RESIGNATION_STATUSES.includes(status as ResignationStatus)) {
      throw new ValidationError('status', status, 
        `Geçerli değerler: ${VALID_RESIGNATION_STATUSES.join(', ')}`)
    }
  }

  /**
   * Geçerli reason category mi kontrol et
   */
  isValidReasonCategory(reasonCategory: string): boolean {
    return VALID_REASON_CATEGORIES.includes(reasonCategory as ReasonCategory)
  }

  /**
   * Geçerli status mi kontrol et
   */
  isValidStatus(status: string): boolean {
    return VALID_RESIGNATION_STATUSES.includes(status as ResignationStatus)
  }

  /**
   * Durum geçişi geçerli mi kontrol et
   * Requirements: 19.3, 19.4
   */
  isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'Pending': ['Approved'],
      'Approved': ['Completed'],
      'Completed': []
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  /**
   * Create resignation validasyonu
   */
  private async validateCreateResignation(data: CreateResignationDto): Promise<void> {
    // Personel zorunlu
    if (!data.employeeId) {
      throw new ValidationError('employeeId', data.employeeId, 'Personel ID zorunludur')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.resignationRepository.employeeExists(data.employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId: data.employeeId })
    }

    // Aktif ayrılma talebi var mı kontrol et
    const hasActive = await this.resignationRepository.hasActiveResignation(data.employeeId)
    if (hasActive) {
      throw new BusinessRuleError('Bu personelin zaten aktif bir ayrılma talebi var', { 
        employeeId: data.employeeId 
      })
    }

    // Reason category zorunlu ve geçerli olmalı
    if (!data.reasonCategory) {
      throw new ValidationError('reasonCategory', data.reasonCategory, 'Ayrılma nedeni zorunludur')
    }
    this.validateReasonCategory(data.reasonCategory)
  }

  /**
   * Create exit interview validasyonu
   * Requirements: 19.6
   */
  private async validateCreateExitInterview(resignationId: number): Promise<void> {
    // Resignation var mı kontrol et
    const resignationExists = await this.exitInterviewRepository.resignationExists(resignationId)
    if (!resignationExists) {
      throw new BusinessRuleError('Ayrılma kaydı bulunamadı', { resignationId })
    }

    // One-to-one kontrolü - zaten mülakat var mı
    // Requirements: 19.6
    const existsForResignation = await this.exitInterviewRepository.existsForResignation(resignationId)
    if (existsForResignation) {
      throw new BusinessRuleError('Bu ayrılma kaydı için zaten çıkış mülakatı var', { resignationId })
    }
  }
}

export default OffboardingService
