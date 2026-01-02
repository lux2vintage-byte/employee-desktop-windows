import { LeaveRequest } from '@prisma/client'
import { 
  LeaveRequestRepository, 
  LeaveRequestWithRelations, 
  LeaveRequestFilterOptions,
  DateRange
} from '../repositories/LeaveRequestRepository'
import { PaginatedResult } from '../repositories/BaseRepository'
import { ValidationUtils, LeaveRequestStatus } from '../utils/validation'

/**
 * Create LeaveRequest DTO
 */
export interface CreateLeaveRequestDto {
  employeeId: number
  leaveTypeId: number
  startDate: Date | string
  endDate: Date | string
  reason?: string | null
  isHalfDay?: boolean
}

/**
 * Update LeaveRequest DTO
 */
export interface UpdateLeaveRequestDto {
  startDate?: Date | string
  endDate?: Date | string
  reason?: string | null
  isHalfDay?: boolean
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
 * LeaveRequestService - İzin talepleri iş mantığı
 * Talep oluşturma ve gün hesaplama, yarım gün desteği, onay/red işlemleri, çakışma kontrolü, dönüş tarihi hesaplama
 * Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9
 */
export class LeaveRequestService {
  private repository: LeaveRequestRepository
  private leaveBalanceUpdateCallback?: (employeeId: number, year: number, days: number) => Promise<void>

  constructor(repository: LeaveRequestRepository) {
    this.repository = repository
  }

  /**
   * İzin bakiyesi güncelleme callback'ini ayarla
   * Bu, LeaveBalanceService ile entegrasyon için kullanılır
   */
  setLeaveBalanceUpdateCallback(callback: (employeeId: number, year: number, days: number) => Promise<void>): void {
    this.leaveBalanceUpdateCallback = callback
  }

  /**
   * Tüm izin taleplerini getir
   */
  async findAll(options: LeaveRequestFilterOptions = {}): Promise<PaginatedResult<LeaveRequestWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile izin talebi getir
   */
  async findById(id: number): Promise<LeaveRequestWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Personel bazlı izin taleplerini getir
   */
  async findByEmployee(employeeId: number): Promise<LeaveRequestWithRelations[]> {
    return await this.repository.findByEmployee(employeeId)
  }

  /**
   * Bekleyen izin taleplerini getir
   */
  async findPending(): Promise<LeaveRequestWithRelations[]> {
    return await this.repository.findPending()
  }

  /**
   * Tarih aralığında izin taleplerini getir
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<LeaveRequestWithRelations[]> {
    return await this.repository.findByDateRange({ startDate, endDate })
  }

  /**
   * İzin talebi oluştur
   * Requirements: 10.1, 10.3, 10.4, 10.7, 10.8, 10.9
   */
  async create(data: CreateLeaveRequestDto, userId?: number): Promise<LeaveRequest> {
    // Validasyon
    await this.validateCreate(data)

    // Tarih dönüşümü
    const startDate = this.normalizeDate(typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate)
    const endDate = this.normalizeDate(typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate)

    // Gün sayısı hesapla
    // Requirements: 10.3, 10.4
    const dayCount = this.calculateDayCount(startDate, endDate, data.isHalfDay)

    const createData = {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate,
      endDate,
      dayCount,
      reason: data.reason || null,
      status: 'Pending',
      returnDate: null,
      approvedBy: null
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * İzin talebi güncelle (sadece Pending durumunda)
   */
  async update(id: number, data: UpdateLeaveRequestDto, userId?: number): Promise<LeaveRequest> {
    // Kaydın var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('İzin talebi bulunamadı', { id })
    }

    // Sadece Pending durumunda güncelleme yapılabilir
    if (existing.status !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen izin talepleri güncellenebilir', { status: existing.status })
    }

    // Validasyon
    await this.validateUpdate(id, data, existing)

    // Güncelleme verisi hazırla
    const updateData: any = {}

    let startDate = existing.startDate
    let endDate = existing.endDate

    if (data.startDate !== undefined) {
      startDate = this.normalizeDate(typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate)
      updateData.startDate = startDate
    }
    if (data.endDate !== undefined) {
      endDate = this.normalizeDate(typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate)
      updateData.endDate = endDate
    }
    if (data.reason !== undefined) {
      updateData.reason = data.reason
    }

    // Tarihler değiştiyse gün sayısını yeniden hesapla
    if (data.startDate !== undefined || data.endDate !== undefined) {
      updateData.dayCount = this.calculateDayCount(startDate, endDate, data.isHalfDay)
    }

    return await this.repository.update(id, updateData, userId)
  }

  /**
   * İzin talebini onayla
   * Requirements: 10.5, 10.6
   */
  async approve(id: number, approverId: number, userId?: number): Promise<LeaveRequest> {
    const existing = await this.repository.findByIdWithRelations(id)
    if (!existing) {
      throw new BusinessRuleError('İzin talebi bulunamadı', { id })
    }

    if (existing.status !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen izin talepleri onaylanabilir', { status: existing.status })
    }

    // Onaylayan kişi var mı kontrol et
    const approverExists = await this.repository.employeeExists(approverId)
    if (!approverExists) {
      throw new BusinessRuleError('Onaylayan personel bulunamadı', { approverId })
    }

    // Dönüş tarihi hesapla
    // Requirements: 10.5
    const returnDate = this.calculateReturnDate(existing.endDate)

    const updateData = {
      status: 'Approved',
      approvedBy: approverId,
      returnDate
    }

    const updated = await this.repository.update(id, updateData as any, userId)

    // İzin bakiyesini güncelle
    // Requirements: 10.6
    if (this.leaveBalanceUpdateCallback && existing.leaveType?.deductsFromAnnual) {
      const year = new Date(existing.startDate).getFullYear()
      await this.leaveBalanceUpdateCallback(existing.employeeId, year, existing.dayCount)
    }

    return updated
  }

  /**
   * İzin talebini reddet
   */
  async reject(id: number, approverId: number, userId?: number): Promise<LeaveRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('İzin talebi bulunamadı', { id })
    }

    if (existing.status !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen izin talepleri reddedilebilir', { status: existing.status })
    }

    // Reddeden kişi var mı kontrol et
    const approverExists = await this.repository.employeeExists(approverId)
    if (!approverExists) {
      throw new BusinessRuleError('Reddeden personel bulunamadı', { approverId })
    }

    const updateData = {
      status: 'Rejected',
      approvedBy: approverId
    }

    return await this.repository.update(id, updateData as any, userId)
  }

  /**
   * İzin talebini iptal et
   */
  async cancel(id: number, userId?: number): Promise<LeaveRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('İzin talebi bulunamadı', { id })
    }

    // Sadece Pending durumunda iptal edilebilir
    if (existing.status !== 'Pending') {
      throw new BusinessRuleError('Sadece bekleyen izin talepleri iptal edilebilir', { status: existing.status })
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * İzin talebi sil (soft delete)
   */
  async delete(id: number, userId?: number): Promise<LeaveRequest> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('İzin talebi bulunamadı', { id })
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Gün sayısı hesapla
   * Requirements: 10.3, 10.4
   * Formül: end_date - start_date + 1 (yarım gün desteği dahil)
   */
  calculateDayCount(startDate: Date, endDate: Date, isHalfDay: boolean = false): number {
    const start = this.normalizeDate(startDate)
    const end = this.normalizeDate(endDate)

    // Milisaniye cinsinden fark
    const diffMs = end.getTime() - start.getTime()
    
    // Gün cinsine çevir ve 1 ekle (başlangıç günü dahil)
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

    // Yarım gün desteği
    // Requirements: 10.4
    if (isHalfDay && diffDays === 1) {
      return 0.5
    }

    return diffDays
  }

  /**
   * Çakışma kontrolü
   * Requirements: 10.9
   */
  async checkOverlap(employeeId: number, startDate: Date, endDate: Date, excludeId?: number): Promise<boolean> {
    return await this.repository.hasOverlap(employeeId, startDate, endDate, excludeId)
  }

  /**
   * Dönüş tarihi hesapla
   * Requirements: 10.5
   * Bitiş tarihinin bir sonraki iş günü
   */
  calculateReturnDate(endDate: Date): Date {
    const returnDate = new Date(endDate)
    returnDate.setDate(returnDate.getDate() + 1)

    // Hafta sonu kontrolü (basit implementasyon)
    // Cumartesi ise Pazartesi'ye, Pazar ise Pazartesi'ye
    const dayOfWeek = returnDate.getDay()
    if (dayOfWeek === 6) { // Cumartesi
      returnDate.setDate(returnDate.getDate() + 2)
    } else if (dayOfWeek === 0) { // Pazar
      returnDate.setDate(returnDate.getDate() + 1)
    }

    return returnDate
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
  private async validateCreate(data: CreateLeaveRequestDto): Promise<void> {
    // Personel zorunlu
    if (!data.employeeId) {
      throw new ValidationError('employeeId', data.employeeId, 'Personel ID zorunludur')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.repository.employeeExists(data.employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId: data.employeeId })
    }

    // İzin türü zorunlu
    if (!data.leaveTypeId) {
      throw new ValidationError('leaveTypeId', data.leaveTypeId, 'İzin türü ID zorunludur')
    }

    // İzin türü var mı kontrol et
    const leaveTypeExists = await this.repository.leaveTypeExists(data.leaveTypeId)
    if (!leaveTypeExists) {
      throw new BusinessRuleError('İzin türü bulunamadı', { leaveTypeId: data.leaveTypeId })
    }

    // Tarihler zorunlu
    if (!data.startDate) {
      throw new ValidationError('startDate', data.startDate, 'Başlangıç tarihi zorunludur')
    }
    if (!data.endDate) {
      throw new ValidationError('endDate', data.endDate, 'Bitiş tarihi zorunludur')
    }

    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate
    const endDate = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate

    // Tarih sıralaması kontrolü
    // Requirements: 10.8
    if (endDate < startDate) {
      throw new ValidationError('endDate', endDate, 'Bitiş tarihi başlangıç tarihinden önce olamaz')
    }

    // Geçmiş tarih kontrolü
    // Requirements: 10.7
    const today = this.normalizeDate(new Date())
    const normalizedStartDate = this.normalizeDate(startDate)
    if (normalizedStartDate < today) {
      throw new ValidationError('startDate', startDate, 'Başlangıç tarihi geçmiş bir tarih olamaz')
    }

    // Çakışma kontrolü
    // Requirements: 10.9
    const hasOverlap = await this.repository.hasOverlap(data.employeeId, startDate, endDate)
    if (hasOverlap) {
      throw new BusinessRuleError('Bu tarih aralığında zaten onaylanmış bir izin var', {
        employeeId: data.employeeId,
        startDate,
        endDate
      })
    }
  }

  /**
   * Update validasyonu
   */
  private async validateUpdate(id: number, data: UpdateLeaveRequestDto, existing: LeaveRequest): Promise<void> {
    let startDate = existing.startDate
    let endDate = existing.endDate

    if (data.startDate !== undefined) {
      startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate
    }
    if (data.endDate !== undefined) {
      endDate = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate
    }

    // Tarih sıralaması kontrolü
    // Requirements: 10.8
    if (endDate < startDate) {
      throw new ValidationError('endDate', endDate, 'Bitiş tarihi başlangıç tarihinden önce olamaz')
    }

    // Geçmiş tarih kontrolü
    // Requirements: 10.7
    if (data.startDate !== undefined) {
      const today = this.normalizeDate(new Date())
      const normalizedStartDate = this.normalizeDate(startDate)
      if (normalizedStartDate < today) {
        throw new ValidationError('startDate', startDate, 'Başlangıç tarihi geçmiş bir tarih olamaz')
      }
    }

    // Çakışma kontrolü (tarihler değiştiyse)
    // Requirements: 10.9
    if (data.startDate !== undefined || data.endDate !== undefined) {
      const hasOverlap = await this.repository.hasOverlap(existing.employeeId, startDate, endDate, id)
      if (hasOverlap) {
        throw new BusinessRuleError('Bu tarih aralığında zaten onaylanmış bir izin var', {
          employeeId: existing.employeeId,
          startDate,
          endDate
        })
      }
    }
  }
}

export default LeaveRequestService
