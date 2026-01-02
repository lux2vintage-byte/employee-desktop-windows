import { PerformanceReview } from '@prisma/client'
import { 
  PerformanceRepository, 
  PerformanceReviewWithRelations, 
  PerformanceFilterOptions,
  VALID_PERFORMANCE_STATUSES,
  PerformanceStatus
} from '../repositories/PerformanceRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create Performance Review DTO
 */
export interface CreatePerformanceReviewDto {
  employeeId: number
  reviewerId: number
  reviewPeriod: string
  score?: number
  feedback?: string
}

/**
 * Update Performance Review DTO
 */
export interface UpdatePerformanceReviewDto {
  score?: number
  feedback?: string
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
 * Score range constants
 * Requirements: 16.3
 */
const SCORE_MIN = 0
const SCORE_MAX = 100

/**
 * PerformanceService - Performans değerlendirme iş mantığı
 * Değerlendirme oluşturma ve güncelleme, puan aralığı validasyonu,
 * kendi kendini değerlendirme engeli, gönderim sonrası immutability
 * Requirements: 16.2, 16.3, 16.4, 16.5, 16.6, 16.7
 */
export class PerformanceService {
  private repository: PerformanceRepository

  constructor(repository: PerformanceRepository) {
    this.repository = repository
  }

  /**
   * Tüm performans değerlendirmelerini getir
   */
  async findAll(options: PerformanceFilterOptions = {}): Promise<PaginatedResult<PerformanceReviewWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile performans değerlendirmesi getir
   */
  async findById(id: number): Promise<PerformanceReviewWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Personel bazlı performans değerlendirmelerini getir
   * Requirements: 16.7
   */
  async findByEmployee(employeeId: number): Promise<PerformanceReviewWithRelations[]> {
    return await this.repository.findByEmployee(employeeId)
  }

  /**
   * Değerlendirici bazlı performans değerlendirmelerini getir
   */
  async findByReviewer(reviewerId: number): Promise<PerformanceReviewWithRelations[]> {
    return await this.repository.findByReviewer(reviewerId)
  }

  /**
   * Dönem bazlı performans değerlendirmelerini getir
   * Requirements: 16.6
   */
  async findByPeriod(reviewPeriod: string): Promise<PerformanceReviewWithRelations[]> {
    return await this.repository.findByPeriod(reviewPeriod)
  }

  /**
   * Performans değerlendirmesi oluştur
   * Requirements: 16.1, 16.3, 16.4
   */
  async create(data: CreatePerformanceReviewDto, userId?: number): Promise<PerformanceReview> {
    // Validasyon
    await this.validateCreate(data)

    // Değerlendirme oluştur
    const createData = {
      employeeId: data.employeeId,
      reviewerId: data.reviewerId,
      reviewPeriod: data.reviewPeriod,
      score: data.score,
      feedback: data.feedback,
      status: 'Draft'
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Performans değerlendirmesini güncelle
   * Requirements: 16.5
   */
  async update(id: number, data: UpdatePerformanceReviewDto, userId?: number): Promise<PerformanceReview> {
    const review = await this.repository.findById(id)
    if (!review) {
      throw new BusinessRuleError('Performans değerlendirmesi bulunamadı', { id })
    }

    // Gönderilmiş değerlendirmeler güncellenemez (sadece Acknowledged'a geçiş hariç)
    // Requirements: 16.5
    if (review.status === 'Submitted' || review.status === 'Acknowledged') {
      throw new BusinessRuleError('Gönderilmiş veya onaylanmış değerlendirmeler güncellenemez', { 
        id, 
        currentStatus: review.status 
      })
    }

    // Puan validasyonu
    if (data.score !== undefined) {
      this.validateScore(data.score)
    }

    return await this.repository.update(id, data, userId)
  }

  /**
   * Performans değerlendirmesini gönder
   * Requirements: 16.5
   */
  async submit(id: number, userId?: number): Promise<PerformanceReview> {
    const review = await this.repository.findById(id)
    if (!review) {
      throw new BusinessRuleError('Performans değerlendirmesi bulunamadı', { id })
    }

    if (review.status !== 'Draft') {
      throw new BusinessRuleError('Sadece taslak değerlendirmeler gönderilebilir', { 
        id, 
        currentStatus: review.status 
      })
    }

    // Puan zorunlu
    if (review.score === null || review.score === undefined) {
      throw new BusinessRuleError('Değerlendirme göndermek için puan zorunludur', { id })
    }

    return await this.repository.updateStatus(id, 'Submitted', userId)
  }

  /**
   * Performans değerlendirmesini onayla (personel tarafından)
   * Requirements: 16.2
   */
  async acknowledge(id: number, userId?: number): Promise<PerformanceReview> {
    const review = await this.repository.findById(id)
    if (!review) {
      throw new BusinessRuleError('Performans değerlendirmesi bulunamadı', { id })
    }

    if (review.status !== 'Submitted') {
      throw new BusinessRuleError('Sadece gönderilmiş değerlendirmeler onaylanabilir', { 
        id, 
        currentStatus: review.status 
      })
    }

    return await this.repository.updateStatus(id, 'Acknowledged', userId)
  }

  /**
   * Performans değerlendirmesini sil (soft delete)
   */
  async delete(id: number, userId?: number): Promise<PerformanceReview> {
    const review = await this.repository.findById(id)
    if (!review) {
      throw new BusinessRuleError('Performans değerlendirmesi bulunamadı', { id })
    }

    // Gönderilmiş değerlendirmeler silinemez
    if (review.status === 'Submitted' || review.status === 'Acknowledged') {
      throw new BusinessRuleError('Gönderilmiş veya onaylanmış değerlendirmeler silinemez', { 
        id, 
        currentStatus: review.status 
      })
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Puan validasyonu
   * Requirements: 16.3
   */
  validateScore(score: number): void {
    if (score < SCORE_MIN || score > SCORE_MAX) {
      throw new ValidationError('score', score, `Puan ${SCORE_MIN} ile ${SCORE_MAX} arasında olmalıdır`)
    }
  }

  /**
   * Puan aralığında mı kontrol et
   * Requirements: 16.3
   */
  isScoreInRange(score: number): boolean {
    return score >= SCORE_MIN && score <= SCORE_MAX
  }

  /**
   * Kendi kendini değerlendirme kontrolü
   * Requirements: 16.4
   */
  isSelfReview(employeeId: number, reviewerId: number): boolean {
    return employeeId === reviewerId
  }

  /**
   * Durum validasyonu
   */
  isValidStatus(status: string): boolean {
    return VALID_PERFORMANCE_STATUSES.includes(status as PerformanceStatus)
  }

  /**
   * Değerlendirme güncellenebilir mi kontrol et
   * Requirements: 16.5
   */
  isReviewEditable(status: string): boolean {
    return status === 'Draft'
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreatePerformanceReviewDto): Promise<void> {
    // Personel zorunlu
    if (!data.employeeId) {
      throw new ValidationError('employeeId', data.employeeId, 'Personel ID zorunludur')
    }

    // Değerlendirici zorunlu
    if (!data.reviewerId) {
      throw new ValidationError('reviewerId', data.reviewerId, 'Değerlendirici ID zorunludur')
    }

    // Dönem zorunlu
    if (!data.reviewPeriod || data.reviewPeriod.trim() === '') {
      throw new ValidationError('reviewPeriod', data.reviewPeriod, 'Değerlendirme dönemi zorunludur')
    }

    // Kendi kendini değerlendirme engeli
    // Requirements: 16.4
    if (this.isSelfReview(data.employeeId, data.reviewerId)) {
      throw new BusinessRuleError('Personel kendi kendini değerlendiremez', { 
        employeeId: data.employeeId, 
        reviewerId: data.reviewerId 
      })
    }

    // Personel var mı kontrol et
    const employeeExists = await this.repository.employeeExists(data.employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId: data.employeeId })
    }

    // Değerlendirici var mı kontrol et
    const reviewerExists = await this.repository.employeeExists(data.reviewerId)
    if (!reviewerExists) {
      throw new BusinessRuleError('Değerlendirici bulunamadı', { reviewerId: data.reviewerId })
    }

    // Puan validasyonu (opsiyonel)
    if (data.score !== undefined && data.score !== null) {
      this.validateScore(data.score)
    }
  }
}

export default PerformanceService
