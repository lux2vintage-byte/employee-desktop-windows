import { Training, EmployeeTraining } from '@prisma/client'
import { 
  TrainingRepository, 
  TrainingWithRelations, 
  TrainingFilterOptions 
} from '../repositories/TrainingRepository'
import { 
  EmployeeTrainingRepository, 
  EmployeeTrainingWithRelations, 
  EmployeeTrainingFilterOptions,
  VALID_TRAINING_STATUSES,
  TrainingStatus
} from '../repositories/EmployeeTrainingRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create Training DTO
 */
export interface CreateTrainingDto {
  title: string
  provider?: string
  durationHours: number
  category?: string
}

/**
 * Update Training DTO
 */
export interface UpdateTrainingDto {
  title?: string
  provider?: string
  durationHours?: number
  category?: string
}

/**
 * Assign Employee DTO
 */
export interface AssignEmployeeDto {
  employeeId: number
  trainingId: number
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
 * TrainingService - Eğitim yönetimi iş mantığı
 * Eğitim CRUD operasyonları, personel atama, tamamlama/başarısızlık işlemleri
 * Requirements: 17.3, 17.4, 17.5, 17.6, 17.7
 */
export class TrainingService {
  private trainingRepository: TrainingRepository
  private employeeTrainingRepository: EmployeeTrainingRepository

  constructor(
    trainingRepository: TrainingRepository,
    employeeTrainingRepository: EmployeeTrainingRepository
  ) {
    this.trainingRepository = trainingRepository
    this.employeeTrainingRepository = employeeTrainingRepository
  }

  // ==================== TRAINING CATALOG OPERATIONS ====================

  /**
   * Tüm eğitimleri getir
   */
  async findAllTrainings(options: TrainingFilterOptions = {}): Promise<PaginatedResult<TrainingWithRelations>> {
    return await this.trainingRepository.findAllWithRelations(options)
  }

  /**
   * ID ile eğitim getir
   */
  async findTrainingById(id: number): Promise<TrainingWithRelations | null> {
    return await this.trainingRepository.findByIdWithRelations(id)
  }

  /**
   * Eğitim oluştur
   * Requirements: 17.1
   */
  async createTraining(data: CreateTrainingDto, userId?: number): Promise<Training> {
    // Validasyon
    this.validateTrainingData(data)

    const createData = {
      title: data.title,
      provider: data.provider,
      durationHours: data.durationHours,
      category: data.category
    }

    return await this.trainingRepository.create(createData as any, userId)
  }

  /**
   * Eğitim güncelle
   */
  async updateTraining(id: number, data: UpdateTrainingDto, userId?: number): Promise<Training> {
    const training = await this.trainingRepository.findById(id)
    if (!training) {
      throw new BusinessRuleError('Eğitim bulunamadı', { id })
    }

    // Validasyon
    if (data.durationHours !== undefined) {
      this.validateDurationHours(data.durationHours)
    }

    if (data.title !== undefined && data.title.trim() === '') {
      throw new ValidationError('title', data.title, 'Eğitim başlığı boş olamaz')
    }

    return await this.trainingRepository.update(id, data, userId)
  }

  /**
   * Eğitim sil (soft delete)
   */
  async deleteTraining(id: number, userId?: number): Promise<Training> {
    const training = await this.trainingRepository.findById(id)
    if (!training) {
      throw new BusinessRuleError('Eğitim bulunamadı', { id })
    }

    // Atanmış personel var mı kontrol et
    const hasAssigned = await this.trainingRepository.hasAssignedEmployees(id)
    if (hasAssigned) {
      throw new BusinessRuleError('Bu eğitime atanmış personeller var, silinemez', { id })
    }

    return await this.trainingRepository.softDelete(id, userId)
  }

  /**
   * Kategori bazlı eğitimleri getir
   */
  async findTrainingsByCategory(category: string): Promise<Training[]> {
    return await this.trainingRepository.findByCategory(category)
  }

  /**
   * Sağlayıcı bazlı eğitimleri getir
   */
  async findTrainingsByProvider(provider: string): Promise<Training[]> {
    return await this.trainingRepository.findByProvider(provider)
  }

  /**
   * Tüm kategorileri getir
   */
  async getAllCategories(): Promise<string[]> {
    return await this.trainingRepository.getAllCategories()
  }

  /**
   * Tüm sağlayıcıları getir
   */
  async getAllProviders(): Promise<string[]> {
    return await this.trainingRepository.getAllProviders()
  }

  // ==================== EMPLOYEE TRAINING OPERATIONS ====================

  /**
   * Tüm personel eğitim kayıtlarını getir
   */
  async findAllEmployeeTrainings(options: EmployeeTrainingFilterOptions = {}): Promise<PaginatedResult<EmployeeTrainingWithRelations>> {
    return await this.employeeTrainingRepository.findAllWithRelations(options)
  }

  /**
   * ID ile personel eğitim kaydı getir
   */
  async findEmployeeTrainingById(id: number): Promise<EmployeeTrainingWithRelations | null> {
    return await this.employeeTrainingRepository.findByIdWithRelations(id)
  }

  /**
   * Personel bazlı eğitim kayıtlarını getir
   */
  async findEmployeeTrainings(employeeId: number): Promise<EmployeeTrainingWithRelations[]> {
    return await this.employeeTrainingRepository.findByEmployee(employeeId)
  }

  /**
   * Eğitim bazlı personel kayıtlarını getir
   */
  async findTrainingParticipants(trainingId: number): Promise<EmployeeTrainingWithRelations[]> {
    return await this.employeeTrainingRepository.findByTraining(trainingId)
  }

  /**
   * Personeli eğitime ata
   * Requirements: 17.7
   */
  async assignEmployee(trainingId: number, employeeId: number, userId?: number): Promise<EmployeeTraining> {
    // Eğitim var mı kontrol et
    const trainingExists = await this.employeeTrainingRepository.trainingExists(trainingId)
    if (!trainingExists) {
      throw new BusinessRuleError('Eğitim bulunamadı', { trainingId })
    }

    // Personel var mı kontrol et
    const employeeExists = await this.employeeTrainingRepository.employeeExists(employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId })
    }

    // Zaten atanmış mı kontrol et
    const alreadyAssigned = await this.employeeTrainingRepository.assignmentExists(employeeId, trainingId)
    if (alreadyAssigned) {
      throw new BusinessRuleError('Personel bu eğitime zaten atanmış', { employeeId, trainingId })
    }

    const createData = {
      employeeId,
      trainingId,
      status: 'Planned'
    }

    return await this.employeeTrainingRepository.create(createData as any, userId)
  }

  /**
   * Eğitimi tamamla
   * Requirements: 17.4, 17.6
   */
  async completeTraining(employeeTrainingId: number, certificateUrl?: string, userId?: number): Promise<EmployeeTraining> {
    const employeeTraining = await this.employeeTrainingRepository.findById(employeeTrainingId)
    if (!employeeTraining) {
      throw new BusinessRuleError('Personel eğitim kaydı bulunamadı', { employeeTrainingId })
    }

    if (employeeTraining.status === 'Completed') {
      throw new BusinessRuleError('Eğitim zaten tamamlanmış', { employeeTrainingId })
    }

    // Tamamlama tarihi zorunlu - Requirements: 17.4
    const completionDate = new Date()

    return await this.employeeTrainingRepository.updateStatus(
      employeeTrainingId, 
      'Completed', 
      completionDate, 
      certificateUrl,
      userId
    )
  }

  /**
   * Eğitimi başarısız olarak işaretle
   * Requirements: 17.3
   */
  async failTraining(employeeTrainingId: number, userId?: number): Promise<EmployeeTraining> {
    const employeeTraining = await this.employeeTrainingRepository.findById(employeeTrainingId)
    if (!employeeTraining) {
      throw new BusinessRuleError('Personel eğitim kaydı bulunamadı', { employeeTrainingId })
    }

    if (employeeTraining.status === 'Failed') {
      throw new BusinessRuleError('Eğitim zaten başarısız olarak işaretlenmiş', { employeeTrainingId })
    }

    if (employeeTraining.status === 'Completed') {
      throw new BusinessRuleError('Tamamlanmış eğitim başarısız olarak işaretlenemez', { employeeTrainingId })
    }

    return await this.employeeTrainingRepository.updateStatus(
      employeeTrainingId, 
      'Failed',
      undefined,
      undefined,
      userId
    )
  }

  /**
   * Personel eğitim kaydını sil
   */
  async removeEmployeeFromTraining(employeeTrainingId: number, userId?: number): Promise<EmployeeTraining> {
    const employeeTraining = await this.employeeTrainingRepository.findById(employeeTrainingId)
    if (!employeeTraining) {
      throw new BusinessRuleError('Personel eğitim kaydı bulunamadı', { employeeTrainingId })
    }

    // Tamamlanmış eğitimler silinemez
    if (employeeTraining.status === 'Completed') {
      throw new BusinessRuleError('Tamamlanmış eğitim kaydı silinemez', { employeeTrainingId })
    }

    return await this.employeeTrainingRepository.hardDelete(employeeTrainingId, userId)
  }

  /**
   * Personelin tamamlanmış eğitim sayısını getir
   */
  async getCompletedTrainingCount(employeeId: number): Promise<number> {
    return await this.employeeTrainingRepository.getCompletedCount(employeeId)
  }

  /**
   * Personelin planlanan eğitim sayısını getir
   */
  async getPlannedTrainingCount(employeeId: number): Promise<number> {
    return await this.employeeTrainingRepository.getPlannedCount(employeeId)
  }

  // ==================== VALIDATION HELPERS ====================

  /**
   * Eğitim verisi validasyonu
   */
  private validateTrainingData(data: CreateTrainingDto): void {
    // Başlık zorunlu
    if (!data.title || data.title.trim() === '') {
      throw new ValidationError('title', data.title, 'Eğitim başlığı zorunludur')
    }

    // Süre validasyonu
    this.validateDurationHours(data.durationHours)
  }

  /**
   * Süre validasyonu
   * Requirements: 17.6
   */
  validateDurationHours(durationHours: number): void {
    if (durationHours === undefined || durationHours === null) {
      throw new ValidationError('durationHours', durationHours, 'Eğitim süresi zorunludur')
    }

    if (!Number.isInteger(durationHours)) {
      throw new ValidationError('durationHours', durationHours, 'Eğitim süresi tam sayı olmalıdır')
    }

    if (durationHours <= 0) {
      throw new ValidationError('durationHours', durationHours, 'Eğitim süresi pozitif olmalıdır')
    }
  }

  /**
   * Süre pozitif mi kontrol et
   * Requirements: 17.6
   */
  isDurationPositive(durationHours: number): boolean {
    return Number.isInteger(durationHours) && durationHours > 0
  }

  /**
   * Durum validasyonu
   */
  isValidStatus(status: string): boolean {
    return VALID_TRAINING_STATUSES.includes(status as TrainingStatus)
  }

  /**
   * Tamamlanmış eğitimde tarih var mı kontrol et
   * Requirements: 17.4
   */
  hasCompletionDateWhenCompleted(status: string, completionDate: Date | null | undefined): boolean {
    if (status === 'Completed') {
      return completionDate !== null && completionDate !== undefined
    }
    return true
  }
}

export default TrainingService
