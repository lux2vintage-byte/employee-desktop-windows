import { Employee } from '@prisma/client'
import { EmployeeRepository, EmployeeWithRelations, EmployeeFilterOptions } from '../repositories/EmployeeRepository'
import { PaginatedResult } from '../repositories/BaseRepository'
import { ValidationUtils, ContractType, EmployeeStatus } from '../utils/validation'
import { EncryptionUtil, getEncryptionUtil } from '../utils/encryptionUtil'

/**
 * Create Employee DTO
 */
export interface CreateEmployeeDto {
  employeeCode?: string
  firstName: string
  lastName: string
  identityNumber: string
  emailWork?: string | null
  emailPersonal?: string | null
  phonePrimary?: string | null
  photoUrl?: string | null
  departmentId: number
  positionId: number
  managerId?: number | null
  hireDate: Date | string
  contractType: ContractType
  status?: EmployeeStatus
}

/**
 * Update Employee DTO
 */
export interface UpdateEmployeeDto {
  firstName?: string
  lastName?: string
  identityNumber?: string
  emailWork?: string | null
  emailPersonal?: string | null
  phonePrimary?: string | null
  photoUrl?: string | null
  departmentId?: number
  positionId?: number
  managerId?: number | null
  hireDate?: Date | string
  contractType?: ContractType
  status?: EmployeeStatus
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
 * EmployeeService - Personel iş mantığı
 * CRUD operasyonları, sicil no benzersizliği kontrolü, TC Kimlik şifreleme,
 * durum ve sözleşme tipi validasyonu, yönetici referans kontrolü
 * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.9, 4.10
 */
export class EmployeeService {
  private repository: EmployeeRepository
  private encryptionUtil: EncryptionUtil

  constructor(repository: EmployeeRepository) {
    this.repository = repository
    this.encryptionUtil = getEncryptionUtil()
  }

  /**
   * Tüm personelleri getir
   * Requirements: 4.10
   */
  async findAll(options: EmployeeFilterOptions = {}): Promise<PaginatedResult<EmployeeWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile personel getir
   * Requirements: 4.10
   */
  async findById(id: number): Promise<EmployeeWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Sicil no ile personel getir
   */
  async findByCode(employeeCode: string): Promise<Employee | null> {
    return await this.repository.findByEmployeeCode(employeeCode)
  }

  /**
   * Departman bazlı personelleri getir
   */
  async findByDepartment(departmentId: number): Promise<Employee[]> {
    return await this.repository.findByDepartment(departmentId)
  }

  /**
   * Yönetici bazlı personelleri getir (astlar)
   */
  async findByManager(managerId: number): Promise<Employee[]> {
    return await this.repository.findByManager(managerId)
  }

  /**
   * Personel oluştur
   * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9
   */
  async create(data: CreateEmployeeDto, userId?: number): Promise<Employee> {
    // Validasyon
    await this.validateCreate(data)

    // Sicil no üret veya kontrol et
    let employeeCode = data.employeeCode
    if (!employeeCode) {
      employeeCode = await this.repository.generateEmployeeCode()
    } else {
      // Sicil no benzersizliği kontrolü
      // Requirements: 4.3
      const isUnique = await this.repository.isEmployeeCodeUnique(employeeCode)
      if (!isUnique) {
        throw new BusinessRuleError('Bu sicil numarası zaten kullanılıyor', { employeeCode })
      }
    }

    // TC Kimlik No şifrele
    // Requirements: 4.5
    const encryptedIdentityNumber = this.encryptionUtil.encrypt(data.identityNumber)

    // Tarih dönüşümü
    const hireDate = typeof data.hireDate === 'string' ? new Date(data.hireDate) : data.hireDate

    // Oluştur
    const createData = {
      employeeCode,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      identityNumber: encryptedIdentityNumber,
      emailWork: data.emailWork || null,
      emailPersonal: data.emailPersonal || null,
      phonePrimary: data.phonePrimary || null,
      photoUrl: data.photoUrl || null,
      departmentId: data.departmentId,
      positionId: data.positionId,
      managerId: data.managerId || null,
      hireDate,
      contractType: data.contractType,
      status: data.status || 'Active'
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Personel güncelle
   * Requirements: 4.4, 4.5, 4.6, 4.7, 4.9
   */
  async update(id: number, data: UpdateEmployeeDto, userId?: number): Promise<Employee> {
    // Personelin var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Personel bulunamadı', { id })
    }

    // Validasyon
    await this.validateUpdate(id, data, existing)

    // Güncelleme verisi hazırla
    const updateData: any = {}

    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim()
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim()
    
    // TC Kimlik No değişiyorsa şifrele
    // Requirements: 4.5
    if (data.identityNumber !== undefined) {
      updateData.identityNumber = this.encryptionUtil.encrypt(data.identityNumber)
    }

    if (data.emailWork !== undefined) updateData.emailWork = data.emailWork
    if (data.emailPersonal !== undefined) updateData.emailPersonal = data.emailPersonal
    if (data.phonePrimary !== undefined) updateData.phonePrimary = data.phonePrimary
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId
    if (data.positionId !== undefined) updateData.positionId = data.positionId
    if (data.managerId !== undefined) updateData.managerId = data.managerId
    if (data.hireDate !== undefined) {
      updateData.hireDate = typeof data.hireDate === 'string' ? new Date(data.hireDate) : data.hireDate
    }
    if (data.contractType !== undefined) updateData.contractType = data.contractType
    if (data.status !== undefined) updateData.status = data.status

    return await this.repository.update(id, updateData, userId)
  }

  /**
   * Personel sil (soft delete)
   */
  async delete(id: number, userId?: number): Promise<Employee> {
    // Personelin var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Personel bulunamadı', { id })
    }

    // Astları var mı kontrol et
    const hasSubordinates = await this.repository.hasSubordinates(id)
    if (hasSubordinates) {
      throw new BusinessRuleError('Astları olan personel silinemez', { id })
    }

    // Yönettiği departmanlar var mı kontrol et
    const hasManagedDepartments = await this.repository.hasManagedDepartments(id)
    if (hasManagedDepartments) {
      throw new BusinessRuleError('Yönettiği departmanlar olan personel silinemez', { id })
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Personeli geri yükle
   */
  async restore(id: number, userId?: number): Promise<Employee> {
    return await this.repository.restore(id, userId)
  }

  /**
   * Personel durumunu değiştir
   * Requirements: 4.7
   */
  async changeStatus(id: number, status: EmployeeStatus, userId?: number): Promise<Employee> {
    // Personelin var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Personel bulunamadı', { id })
    }

    // Durum validasyonu
    const statusValidation = ValidationUtils.validateEmployeeStatus(status)
    if (!statusValidation.isValid) {
      throw new ValidationError('status', status, statusValidation.error!)
    }

    return await this.repository.update(id, { status } as any, userId)
  }

  /**
   * Benzersiz sicil no üret
   * Requirements: 4.2
   */
  async generateEmployeeCode(): Promise<string> {
    return await this.repository.generateEmployeeCode()
  }

  /**
   * TC Kimlik No'yu çöz
   */
  decryptIdentityNumber(encryptedIdentityNumber: string): string {
    return this.encryptionUtil.decrypt(encryptedIdentityNumber)
  }

  /**
   * Personel ile birlikte çözülmüş TC Kimlik No getir
   */
  async findByIdWithDecryptedIdentity(id: number): Promise<(EmployeeWithRelations & { decryptedIdentityNumber: string }) | null> {
    const employee = await this.repository.findByIdWithRelations(id)
    if (!employee) return null

    return {
      ...employee,
      decryptedIdentityNumber: this.encryptionUtil.decrypt(employee.identityNumber)
    }
  }

  /**
   * İsim ve soyisime göre personel ara
   */
  async searchByName(searchTerm: string): Promise<Employee[]> {
    return await this.repository.searchByName(searchTerm)
  }

  /**
   * Aktif personel sayısını getir
   */
  async getActiveCount(): Promise<number> {
    return await this.repository.getActiveCount()
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreateEmployeeDto): Promise<void> {
    // Ad zorunlu
    if (!data.firstName || data.firstName.trim() === '') {
      throw new ValidationError('firstName', data.firstName, 'Ad zorunludur')
    }

    // Soyad zorunlu
    if (!data.lastName || data.lastName.trim() === '') {
      throw new ValidationError('lastName', data.lastName, 'Soyad zorunludur')
    }

    // TC Kimlik No zorunlu ve validasyonu
    // Requirements: 4.4
    if (!data.identityNumber) {
      throw new ValidationError('identityNumber', data.identityNumber, 'TC Kimlik No zorunludur')
    }
    const tcValidation = ValidationUtils.validateTCKimlikNo(data.identityNumber)
    if (!tcValidation.isValid) {
      throw new ValidationError('identityNumber', data.identityNumber, tcValidation.error!)
    }

    // Departman zorunlu ve var mı kontrol et
    if (!data.departmentId) {
      throw new ValidationError('departmentId', data.departmentId, 'Departman zorunludur')
    }
    const departmentExists = await this.repository.departmentExists(data.departmentId)
    if (!departmentExists) {
      throw new BusinessRuleError('Departman bulunamadı', { departmentId: data.departmentId })
    }

    // Pozisyon zorunlu ve var mı kontrol et
    if (!data.positionId) {
      throw new ValidationError('positionId', data.positionId, 'Pozisyon zorunludur')
    }
    const positionExists = await this.repository.positionExists(data.positionId)
    if (!positionExists) {
      throw new BusinessRuleError('Pozisyon bulunamadı', { positionId: data.positionId })
    }

    // İşe giriş tarihi zorunlu
    if (!data.hireDate) {
      throw new ValidationError('hireDate', data.hireDate, 'İşe giriş tarihi zorunludur')
    }

    // Sözleşme tipi validasyonu
    // Requirements: 4.6
    const contractTypeValidation = ValidationUtils.validateContractType(data.contractType)
    if (!contractTypeValidation.isValid) {
      throw new ValidationError('contractType', data.contractType, contractTypeValidation.error!)
    }

    // Durum validasyonu (opsiyonel)
    // Requirements: 4.7
    if (data.status) {
      const statusValidation = ValidationUtils.validateEmployeeStatus(data.status)
      if (!statusValidation.isValid) {
        throw new ValidationError('status', data.status, statusValidation.error!)
      }
    }

    // Yönetici kontrolü (opsiyonel)
    // Requirements: 4.9
    if (data.managerId) {
      const managerExists = await this.repository.managerExists(data.managerId)
      if (!managerExists) {
        throw new BusinessRuleError('Yönetici olarak atanacak aktif personel bulunamadı', { managerId: data.managerId })
      }
    }

    // İş e-postası benzersizliği kontrolü (opsiyonel)
    if (data.emailWork) {
      const isEmailUnique = await this.repository.isEmailWorkUnique(data.emailWork)
      if (!isEmailUnique) {
        throw new BusinessRuleError('Bu iş e-postası zaten kullanılıyor', { emailWork: data.emailWork })
      }
    }
  }

  /**
   * Update validasyonu
   */
  private async validateUpdate(id: number, data: UpdateEmployeeDto, existing: Employee): Promise<void> {
    // Ad değişiyorsa kontrol et
    if (data.firstName !== undefined && data.firstName.trim() === '') {
      throw new ValidationError('firstName', data.firstName, 'Ad boş olamaz')
    }

    // Soyad değişiyorsa kontrol et
    if (data.lastName !== undefined && data.lastName.trim() === '') {
      throw new ValidationError('lastName', data.lastName, 'Soyad boş olamaz')
    }

    // TC Kimlik No değişiyorsa validasyon
    // Requirements: 4.4
    if (data.identityNumber !== undefined) {
      const tcValidation = ValidationUtils.validateTCKimlikNo(data.identityNumber)
      if (!tcValidation.isValid) {
        throw new ValidationError('identityNumber', data.identityNumber, tcValidation.error!)
      }
    }

    // Departman değişiyorsa kontrol et
    if (data.departmentId !== undefined && data.departmentId !== existing.departmentId) {
      const departmentExists = await this.repository.departmentExists(data.departmentId)
      if (!departmentExists) {
        throw new BusinessRuleError('Departman bulunamadı', { departmentId: data.departmentId })
      }
    }

    // Pozisyon değişiyorsa kontrol et
    if (data.positionId !== undefined && data.positionId !== existing.positionId) {
      const positionExists = await this.repository.positionExists(data.positionId)
      if (!positionExists) {
        throw new BusinessRuleError('Pozisyon bulunamadı', { positionId: data.positionId })
      }
    }

    // Sözleşme tipi değişiyorsa validasyon
    // Requirements: 4.6
    if (data.contractType !== undefined) {
      const contractTypeValidation = ValidationUtils.validateContractType(data.contractType)
      if (!contractTypeValidation.isValid) {
        throw new ValidationError('contractType', data.contractType, contractTypeValidation.error!)
      }
    }

    // Durum değişiyorsa validasyon
    // Requirements: 4.7
    if (data.status !== undefined) {
      const statusValidation = ValidationUtils.validateEmployeeStatus(data.status)
      if (!statusValidation.isValid) {
        throw new ValidationError('status', data.status, statusValidation.error!)
      }
    }

    // Yönetici değişiyorsa kontrol et
    // Requirements: 4.9
    if (data.managerId !== undefined && data.managerId !== existing.managerId) {
      if (data.managerId !== null) {
        // Kendisini yönetici olarak atayamaz
        if (data.managerId === id) {
          throw new BusinessRuleError('Personel kendisinin yöneticisi olamaz', { id, managerId: data.managerId })
        }

        const managerExists = await this.repository.managerExists(data.managerId)
        if (!managerExists) {
          throw new BusinessRuleError('Yönetici olarak atanacak aktif personel bulunamadı', { managerId: data.managerId })
        }
      }
    }

    // İş e-postası değişiyorsa benzersizlik kontrolü
    if (data.emailWork !== undefined && data.emailWork !== existing.emailWork) {
      if (data.emailWork !== null) {
        const isEmailUnique = await this.repository.isEmailWorkUnique(data.emailWork, id)
        if (!isEmailUnique) {
          throw new BusinessRuleError('Bu iş e-postası zaten kullanılıyor', { emailWork: data.emailWork })
        }
      }
    }
  }
}

export default EmployeeService
