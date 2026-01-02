import { DisciplinaryAction } from '@prisma/client'
import { 
  DisciplinaryRepository, 
  DisciplinaryActionWithRelations, 
  DisciplinaryFilterOptions,
  VALID_VIOLATION_TYPES,
  VALID_ACTION_TAKEN_TYPES,
  ViolationType,
  ActionTakenType
} from '../repositories/DisciplinaryRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create Disciplinary Action DTO
 */
export interface CreateDisciplinaryActionDto {
  employeeId: number
  incidentDate: Date
  violationType: ViolationType
  actionTaken: ActionTakenType
  defense?: string
  documentPath?: string
}

/**
 * Update Disciplinary Action DTO
 */
export interface UpdateDisciplinaryActionDto {
  violationType?: ViolationType
  actionTaken?: ActionTakenType
  defense?: string
  documentPath?: string
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
 * Payroll integration callback type
 * Requirements: 18.6
 */
export type PayrollDeductionCallback = (
  employeeId: number,
  amount: number,
  description: string
) => Promise<void>

/**
 * DisciplinaryService - Disiplin kayıtları iş mantığı
 * Disiplin kaydı oluşturma, maaş kesintisi durumunda bordro entegrasyonu
 * Requirements: 18.2, 18.3, 18.4, 18.5, 18.6
 */
export class DisciplinaryService {
  private repository: DisciplinaryRepository
  private payrollDeductionCallback?: PayrollDeductionCallback

  constructor(repository: DisciplinaryRepository) {
    this.repository = repository
  }

  /**
   * Bordro kesinti callback'ini ayarla
   * Requirements: 18.6
   */
  setPayrollDeductionCallback(callback: PayrollDeductionCallback): void {
    this.payrollDeductionCallback = callback
  }

  /**
   * Tüm disiplin kayıtlarını getir
   */
  async findAll(options: DisciplinaryFilterOptions = {}): Promise<PaginatedResult<DisciplinaryActionWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile disiplin kaydı getir
   */
  async findById(id: number): Promise<DisciplinaryActionWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Personel bazlı disiplin kayıtlarını getir
   */
  async findByEmployee(employeeId: number): Promise<DisciplinaryActionWithRelations[]> {
    return await this.repository.findByEmployee(employeeId)
  }

  /**
   * İhlal tipi bazlı disiplin kayıtlarını getir
   * Requirements: 18.1
   */
  async findByViolationType(violationType: ViolationType): Promise<DisciplinaryActionWithRelations[]> {
    return await this.repository.findByViolationType(violationType)
  }

  /**
   * Alınan aksiyon bazlı disiplin kayıtlarını getir
   */
  async findByActionTaken(actionTaken: ActionTakenType): Promise<DisciplinaryActionWithRelations[]> {
    return await this.repository.findByActionTaken(actionTaken)
  }

  /**
   * Tarih aralığında disiplin kayıtlarını getir
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<DisciplinaryActionWithRelations[]> {
    return await this.repository.findByDateRange(startDate, endDate)
  }

  /**
   * Maaş kesintisi olan disiplin kayıtlarını getir
   * Requirements: 18.6
   */
  async findSalaryDeductions(): Promise<DisciplinaryActionWithRelations[]> {
    return await this.repository.findSalaryDeductions()
  }

  /**
   * Disiplin kaydı oluştur
   * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
   */
  async create(data: CreateDisciplinaryActionDto, userId?: number): Promise<DisciplinaryAction> {
    // Validasyon
    await this.validateCreate(data)

    const createData = {
      employeeId: data.employeeId,
      incidentDate: data.incidentDate,
      violationType: data.violationType,
      actionTaken: data.actionTaken,
      defense: data.defense,
      documentPath: data.documentPath
    }

    const disciplinaryAction = await this.repository.create(createData as any, userId)

    // Maaş kesintisi durumunda bordro entegrasyonu
    // Requirements: 18.6
    if (data.actionTaken === 'Maaş Kesintisi' && this.payrollDeductionCallback) {
      // Default deduction amount - in real implementation this would be configurable
      const deductionAmount = 500 // TL
      const description = `Disiplin cezası - ${data.violationType}`
      
      try {
        await this.payrollDeductionCallback(data.employeeId, deductionAmount, description)
      } catch (error) {
        // Log error but don't fail the disciplinary action creation
        console.error('Bordro kesintisi oluşturulamadı:', error)
      }
    }

    return disciplinaryAction
  }

  /**
   * Disiplin kaydını güncelle
   * Requirements: 18.2, 18.3
   */
  async update(id: number, data: UpdateDisciplinaryActionDto, userId?: number): Promise<DisciplinaryAction> {
    const disciplinaryAction = await this.repository.findById(id)
    if (!disciplinaryAction) {
      throw new BusinessRuleError('Disiplin kaydı bulunamadı', { id })
    }

    // Validasyon
    if (data.violationType !== undefined) {
      this.validateViolationType(data.violationType)
    }

    if (data.actionTaken !== undefined) {
      this.validateActionTaken(data.actionTaken)
    }

    return await this.repository.update(id, data, userId)
  }

  /**
   * Disiplin kaydını sil (soft delete)
   */
  async delete(id: number, userId?: number): Promise<DisciplinaryAction> {
    const disciplinaryAction = await this.repository.findById(id)
    if (!disciplinaryAction) {
      throw new BusinessRuleError('Disiplin kaydı bulunamadı', { id })
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Personelin disiplin kaydı sayısını getir
   */
  async getCountByEmployee(employeeId: number): Promise<number> {
    return await this.repository.getCountByEmployee(employeeId)
  }

  /**
   * Personelin belirli ihlal tipindeki kayıt sayısını getir
   */
  async getCountByEmployeeAndViolationType(
    employeeId: number, 
    violationType: ViolationType
  ): Promise<number> {
    return await this.repository.getCountByEmployeeAndViolationType(employeeId, violationType)
  }

  // ==================== VALIDATION HELPERS ====================

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreateDisciplinaryActionDto): Promise<void> {
    // Personel zorunlu
    if (!data.employeeId) {
      throw new ValidationError('employeeId', data.employeeId, 'Personel ID zorunludur')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.repository.employeeExists(data.employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId: data.employeeId })
    }

    // Olay tarihi zorunlu
    if (!data.incidentDate) {
      throw new ValidationError('incidentDate', data.incidentDate, 'Olay tarihi zorunludur')
    }

    // İhlal tipi validasyonu
    // Requirements: 18.2
    this.validateViolationType(data.violationType)

    // Alınan aksiyon validasyonu
    // Requirements: 18.3
    this.validateActionTaken(data.actionTaken)
  }

  /**
   * İhlal tipi validasyonu
   * Requirements: 18.2
   */
  validateViolationType(violationType: string): void {
    if (!violationType) {
      throw new ValidationError('violationType', violationType, 'İhlal tipi zorunludur')
    }

    if (!VALID_VIOLATION_TYPES.includes(violationType as ViolationType)) {
      throw new ValidationError(
        'violationType', 
        violationType, 
        `Geçersiz ihlal tipi. Geçerli değerler: ${VALID_VIOLATION_TYPES.join(', ')}`
      )
    }
  }

  /**
   * Alınan aksiyon validasyonu
   * Requirements: 18.3
   */
  validateActionTaken(actionTaken: string): void {
    if (!actionTaken) {
      throw new ValidationError('actionTaken', actionTaken, 'Alınan aksiyon zorunludur')
    }

    if (!VALID_ACTION_TAKEN_TYPES.includes(actionTaken as ActionTakenType)) {
      throw new ValidationError(
        'actionTaken', 
        actionTaken, 
        `Geçersiz aksiyon tipi. Geçerli değerler: ${VALID_ACTION_TAKEN_TYPES.join(', ')}`
      )
    }
  }

  /**
   * İhlal tipi geçerli mi kontrol et
   */
  isValidViolationType(violationType: string): boolean {
    return VALID_VIOLATION_TYPES.includes(violationType as ViolationType)
  }

  /**
   * Alınan aksiyon geçerli mi kontrol et
   */
  isValidActionTaken(actionTaken: string): boolean {
    return VALID_ACTION_TAKEN_TYPES.includes(actionTaken as ActionTakenType)
  }

  /**
   * Maaş kesintisi gerektiren aksiyon mu kontrol et
   * Requirements: 18.6
   */
  requiresSalaryDeduction(actionTaken: string): boolean {
    return actionTaken === 'Maaş Kesintisi'
  }
}

export default DisciplinaryService
