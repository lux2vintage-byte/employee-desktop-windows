import { AttendanceLog } from '@prisma/client'
import { 
  AttendanceRepository, 
  AttendanceWithRelations, 
  AttendanceFilterOptions,
  BulkAttendanceDto,
  DateRange,
  MonthlyAttendanceReport
} from '../repositories/AttendanceRepository'
import { PaginatedResult } from '../repositories/BaseRepository'
import { ValidationUtils, AttendanceStatus } from '../utils/validation'

/**
 * Create Attendance DTO
 */
export interface CreateAttendanceDto {
  employeeId: number
  date: Date | string
  checkInTime?: Date | string | null
  checkOutTime?: Date | string | null
  breakDuration?: number
  status?: AttendanceStatus
  dailyNote?: string | null
}

/**
 * Update Attendance DTO
 */
export interface UpdateAttendanceDto {
  checkInTime?: Date | string | null
  checkOutTime?: Date | string | null
  breakDuration?: number
  status?: AttendanceStatus
  dailyNote?: string | null
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
 * AttendanceService - Puantaj iş mantığı
 * Check-in/check-out işlemleri, zaman sıralaması validasyonu, çalışma saati hesaplama, aylık rapor oluşturma
 * Requirements: 7.3, 7.4, 7.5, 7.6
 */
export class AttendanceService {
  private repository: AttendanceRepository

  constructor(repository: AttendanceRepository) {
    this.repository = repository
  }

  /**
   * Tüm puantaj kayıtlarını getir
   */
  async findAll(options: AttendanceFilterOptions = {}): Promise<PaginatedResult<AttendanceWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile puantaj kaydı getir
   */
  async findById(id: number): Promise<AttendanceWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Personel bazlı puantaj kayıtlarını getir
   */
  async findByEmployee(employeeId: number, dateRange?: DateRange): Promise<AttendanceLog[]> {
    return await this.repository.findByEmployee(employeeId, dateRange)
  }

  /**
   * Tarih bazlı puantaj kayıtlarını getir
   */
  async findByDate(date: Date): Promise<AttendanceWithRelations[]> {
    return await this.repository.findByDate(date)
  }

  /**
   * Puantaj kaydı oluştur
   * Requirements: 7.1, 7.2
   */
  async create(data: CreateAttendanceDto, userId?: number): Promise<AttendanceLog> {
    // Validasyon
    await this.validateCreate(data)

    // Tarih dönüşümü
    const date = this.normalizeDate(typeof data.date === 'string' ? new Date(data.date) : data.date)
    const checkInTime = data.checkInTime ? this.parseDateTime(data.checkInTime) : null
    const checkOutTime = data.checkOutTime ? this.parseDateTime(data.checkOutTime) : null

    // Zaman sıralaması validasyonu
    // Requirements: 7.4
    if (checkInTime && checkOutTime) {
      this.validateTimeOrdering(checkInTime, checkOutTime)
    }

    const createData = {
      employeeId: data.employeeId,
      date,
      checkInTime,
      checkOutTime,
      breakDuration: data.breakDuration || 0,
      status: data.status || 'Geldi',
      dailyNote: data.dailyNote || null
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Puantaj kaydı güncelle
   * Requirements: 7.4
   */
  async update(id: number, data: UpdateAttendanceDto, userId?: number): Promise<AttendanceLog> {
    // Kaydın var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Puantaj kaydı bulunamadı', { id })
    }

    // Validasyon
    await this.validateUpdate(data, existing)

    // Güncelleme verisi hazırla
    const updateData: any = {}

    if (data.checkInTime !== undefined) {
      updateData.checkInTime = data.checkInTime ? this.parseDateTime(data.checkInTime) : null
    }
    if (data.checkOutTime !== undefined) {
      updateData.checkOutTime = data.checkOutTime ? this.parseDateTime(data.checkOutTime) : null
    }
    if (data.breakDuration !== undefined) {
      updateData.breakDuration = data.breakDuration
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.dailyNote !== undefined) {
      updateData.dailyNote = data.dailyNote
    }

    // Zaman sıralaması validasyonu
    // Requirements: 7.4
    const finalCheckInTime = updateData.checkInTime !== undefined ? updateData.checkInTime : existing.checkInTime
    const finalCheckOutTime = updateData.checkOutTime !== undefined ? updateData.checkOutTime : existing.checkOutTime
    
    if (finalCheckInTime && finalCheckOutTime) {
      this.validateTimeOrdering(finalCheckInTime, finalCheckOutTime)
    }

    return await this.repository.update(id, updateData, userId)
  }

  /**
   * Puantaj kaydı sil (soft delete)
   */
  async delete(id: number, userId?: number): Promise<AttendanceLog> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Puantaj kaydı bulunamadı', { id })
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Check-in işlemi
   * Requirements: 7.3
   */
  async checkIn(employeeId: number, time?: Date, userId?: number): Promise<AttendanceLog> {
    const checkInTime = time || new Date()
    const date = this.normalizeDate(checkInTime)

    // Bugün için kayıt var mı kontrol et
    const existing = await this.repository.findByEmployeeAndDate(employeeId, date)
    
    if (existing) {
      // Kayıt varsa güncelle
      if (existing.checkInTime) {
        throw new BusinessRuleError('Bu tarih için zaten giriş yapılmış', { employeeId, date })
      }
      return await this.repository.update(existing.id, { checkInTime } as any, userId)
    }

    // Yeni kayıt oluştur
    return await this.create({
      employeeId,
      date,
      checkInTime,
      status: 'Geldi'
    }, userId)
  }

  /**
   * Check-out işlemi
   * Requirements: 7.3, 7.4
   */
  async checkOut(employeeId: number, time?: Date, userId?: number): Promise<AttendanceLog> {
    const checkOutTime = time || new Date()
    const date = this.normalizeDate(checkOutTime)

    // Bugün için kayıt var mı kontrol et
    const existing = await this.repository.findByEmployeeAndDate(employeeId, date)
    
    if (!existing) {
      throw new BusinessRuleError('Bu tarih için giriş kaydı bulunamadı', { employeeId, date })
    }

    if (existing.checkOutTime) {
      throw new BusinessRuleError('Bu tarih için zaten çıkış yapılmış', { employeeId, date })
    }

    // Zaman sıralaması validasyonu
    // Requirements: 7.4
    if (existing.checkInTime) {
      this.validateTimeOrdering(existing.checkInTime, checkOutTime)
    }

    return await this.repository.update(existing.id, { checkOutTime } as any, userId)
  }

  /**
   * Mola süresi ayarla
   * Requirements: 7.5
   */
  async setBreakDuration(logId: number, minutes: number, userId?: number): Promise<AttendanceLog> {
    if (minutes < 0) {
      throw new ValidationError('breakDuration', minutes, 'Mola süresi negatif olamaz')
    }

    const existing = await this.repository.findById(logId)
    if (!existing) {
      throw new BusinessRuleError('Puantaj kaydı bulunamadı', { id: logId })
    }

    return await this.repository.update(logId, { breakDuration: minutes } as any, userId)
  }

  /**
   * Durum ayarla
   * Requirements: 7.3
   */
  async setStatus(logId: number, status: AttendanceStatus, leaveTypeId?: number | null, userId?: number): Promise<AttendanceLog> {
    const statusValidation = ValidationUtils.validateAttendanceStatus(status)
    if (!statusValidation.isValid) {
      throw new ValidationError('status', status, statusValidation.error!)
    }

    const existing = await this.repository.findById(logId)
    if (!existing) {
      throw new BusinessRuleError('Puantaj kaydı bulunamadı', { id: logId })
    }

    // İzinli durumunda leaveTypeId zorunlu
    const updateData: any = { status }
    if (status === 'İzinli') {
      if (!leaveTypeId) {
        throw new ValidationError('leaveTypeId', leaveTypeId, 'İzinli durumu için izin türü zorunludur')
      }
      updateData.leaveTypeId = leaveTypeId
    } else {
      // İzinli değilse leaveTypeId'yi temizle
      updateData.leaveTypeId = null
    }

    return await this.repository.update(logId, updateData, userId)
  }

  /**
   * Toplu puantaj kaydı oluştur
   * Requirements: 7.7
   */
  async bulkCreate(records: BulkAttendanceDto[], userId?: number): Promise<AttendanceLog[]> {
    // Her kayıt için validasyon
    for (const record of records) {
      // Personel var mı kontrol et
      const employeeExists = await this.repository.employeeExists(record.employeeId)
      if (!employeeExists) {
        throw new BusinessRuleError('Personel bulunamadı', { employeeId: record.employeeId })
      }

      // Benzersizlik kontrolü
      const isUnique = await this.repository.isUniqueEmployeeDate(record.employeeId, record.date)
      if (!isUnique) {
        throw new BusinessRuleError('Bu personel ve tarih için zaten kayıt var', { 
          employeeId: record.employeeId, 
          date: record.date 
        })
      }

      // Durum validasyonu
      if (record.status) {
        const statusValidation = ValidationUtils.validateAttendanceStatus(record.status)
        if (!statusValidation.isValid) {
          throw new ValidationError('status', record.status, statusValidation.error!)
        }
      }

      // Zaman sıralaması validasyonu
      if (record.checkInTime && record.checkOutTime) {
        this.validateTimeOrdering(record.checkInTime, record.checkOutTime)
      }
    }

    return await this.repository.bulkCreate(records, userId)
  }

  /**
   * Çalışma saati hesapla
   * Requirements: 7.6
   * Formül: (check_out_time - check_in_time) - break_duration
   */
  calculateWorkingHours(log: AttendanceLog): number {
    if (!log.checkInTime || !log.checkOutTime) {
      return 0
    }

    const checkIn = new Date(log.checkInTime)
    const checkOut = new Date(log.checkOutTime)
    
    // Milisaniye cinsinden fark
    const diffMs = checkOut.getTime() - checkIn.getTime()
    
    // Saat cinsine çevir
    const diffHours = diffMs / (1000 * 60 * 60)
    
    // Mola süresini çıkar (dakikadan saate çevir)
    const breakHours = (log.breakDuration || 0) / 60
    
    const workingHours = diffHours - breakHours
    
    // Negatif değer döndürme
    return Math.max(0, workingHours)
  }

  /**
   * Aylık rapor oluştur
   * Requirements: 7.6
   */
  async getMonthlyReport(employeeId: number, month: number, year: number): Promise<MonthlyAttendanceReport> {
    const records = await this.repository.findByMonth(employeeId, month, year)

    let presentDays = 0
    let absentDays = 0
    let leaveDays = 0
    let holidayDays = 0
    let totalWorkingHours = 0
    let totalBreakMinutes = 0

    for (const record of records) {
      switch (record.status) {
        case 'Geldi':
          presentDays++
          totalWorkingHours += this.calculateWorkingHours(record)
          totalBreakMinutes += record.breakDuration || 0
          break
        case 'Gelmedi':
          absentDays++
          break
        case 'İzinli':
          leaveDays++
          break
        case 'Tatil':
          holidayDays++
          break
      }
    }

    return {
      employeeId,
      month,
      year,
      totalDays: records.length,
      presentDays,
      absentDays,
      leaveDays,
      holidayDays,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100, // 2 ondalık basamak
      totalBreakMinutes,
      records
    }
  }

  /**
   * Personel ve tarih ile puantaj kaydı getir
   */
  async findByEmployeeAndDate(employeeId: number, date: Date): Promise<AttendanceLog | null> {
    return await this.repository.findByEmployeeAndDate(employeeId, date)
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
   * Tarih/saat string'ini Date'e çevir
   */
  private parseDateTime(value: Date | string): Date {
    if (value instanceof Date) {
      return value
    }
    return new Date(value)
  }

  /**
   * Zaman sıralaması validasyonu
   * Requirements: 7.4
   */
  private validateTimeOrdering(checkInTime: Date, checkOutTime: Date): void {
    const checkIn = new Date(checkInTime)
    const checkOut = new Date(checkOutTime)

    if (checkOut <= checkIn) {
      throw new ValidationError(
        'checkOutTime', 
        checkOutTime, 
        'Çıkış zamanı giriş zamanından sonra olmalıdır'
      )
    }
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreateAttendanceDto): Promise<void> {
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

    const date = typeof data.date === 'string' ? new Date(data.date) : data.date

    // Benzersizlik kontrolü
    // Requirements: 7.2
    const isUnique = await this.repository.isUniqueEmployeeDate(data.employeeId, date)
    if (!isUnique) {
      throw new BusinessRuleError('Bu personel ve tarih için zaten kayıt var', { 
        employeeId: data.employeeId, 
        date 
      })
    }

    // Durum validasyonu
    // Requirements: 7.3
    if (data.status) {
      const statusValidation = ValidationUtils.validateAttendanceStatus(data.status)
      if (!statusValidation.isValid) {
        throw new ValidationError('status', data.status, statusValidation.error!)
      }
    }

    // Mola süresi validasyonu
    // Requirements: 7.5
    if (data.breakDuration !== undefined && data.breakDuration < 0) {
      throw new ValidationError('breakDuration', data.breakDuration, 'Mola süresi negatif olamaz')
    }
  }

  /**
   * Update validasyonu
   */
  private async validateUpdate(data: UpdateAttendanceDto, existing: AttendanceLog): Promise<void> {
    // Durum validasyonu
    // Requirements: 7.3
    if (data.status !== undefined) {
      const statusValidation = ValidationUtils.validateAttendanceStatus(data.status)
      if (!statusValidation.isValid) {
        throw new ValidationError('status', data.status, statusValidation.error!)
      }
    }

    // Mola süresi validasyonu
    // Requirements: 7.5
    if (data.breakDuration !== undefined && data.breakDuration < 0) {
      throw new ValidationError('breakDuration', data.breakDuration, 'Mola süresi negatif olamaz')
    }
  }
}

export default AttendanceService
