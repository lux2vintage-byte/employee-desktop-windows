import { EmployeeDetails } from '@prisma/client'
import { EmployeeDetailsRepository, EmployeeDetailsWithEmployee } from '../repositories/EmployeeDetailsRepository'
import { ValidationUtils, BloodGroup, Gender, MaritalStatus, MilitaryStatus } from '../utils/validation'
import { EncryptionUtil, getEncryptionUtil } from '../utils/encryptionUtil'

/**
 * Create Employee Details DTO
 */
export interface CreateEmployeeDetailsDto {
  employeeId: number
  birthDate?: Date | string | null
  bloodGroup?: BloodGroup | null
  gender?: Gender | null
  maritalStatus?: MaritalStatus | null
  addressHome?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  bankName?: string | null
  iban?: string | null
  socialSecurityNumber?: string | null
  educationLevel?: string | null
  militaryStatus?: MilitaryStatus | null
}

/**
 * Update Employee Details DTO
 */
export interface UpdateEmployeeDetailsDto {
  birthDate?: Date | string | null
  bloodGroup?: BloodGroup | null
  gender?: Gender | null
  maritalStatus?: MaritalStatus | null
  addressHome?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  bankName?: string | null
  iban?: string | null
  socialSecurityNumber?: string | null
  educationLevel?: string | null
  militaryStatus?: MilitaryStatus | null
}

/**
 * Decrypted Employee Details
 */
export interface DecryptedEmployeeDetails extends Omit<EmployeeDetails, 'iban' | 'socialSecurityNumber'> {
  iban: string | null
  socialSecurityNumber: string | null
  decryptedIban?: string | null
  decryptedSocialSecurityNumber?: string | null
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
 * EmployeeDetailsService - Personel detay bilgileri iş mantığı
 * CRUD operasyonları, IBAN ve SGK no şifreleme, enum validasyonları
 * Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */
export class EmployeeDetailsService {
  private repository: EmployeeDetailsRepository
  private encryptionUtil: EncryptionUtil

  constructor(repository: EmployeeDetailsRepository) {
    this.repository = repository
    this.encryptionUtil = getEncryptionUtil()
  }

  /**
   * Personel ID ile detay bilgilerini getir
   */
  async findByEmployeeId(employeeId: number): Promise<EmployeeDetailsWithEmployee | null> {
    return await this.repository.findByEmployeeIdWithEmployee(employeeId)
  }

  /**
   * Personel ID ile çözülmüş detay bilgilerini getir
   */
  async findByEmployeeIdDecrypted(employeeId: number): Promise<DecryptedEmployeeDetails | null> {
    const details = await this.repository.findByEmployeeId(employeeId)
    if (!details) return null

    return this.decryptDetails(details)
  }

  /**
   * Detay bilgisi oluştur
   * Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
   */
  async create(data: CreateEmployeeDetailsDto, userId?: number): Promise<EmployeeDetails> {
    // Validasyon
    await this.validateCreate(data)

    // Şifreleme
    const createData = this.prepareCreateData(data)

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Detay bilgisi güncelle
   * Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
   */
  async update(employeeId: number, data: UpdateEmployeeDetailsDto, userId?: number): Promise<EmployeeDetails> {
    // Mevcut kaydı kontrol et
    const existing = await this.repository.findByEmployeeId(employeeId)
    if (!existing) {
      throw new BusinessRuleError('Personel detay bilgisi bulunamadı', { employeeId })
    }

    // Validasyon
    await this.validateUpdate(data)

    // Şifreleme
    const updateData = this.prepareUpdateData(data)

    return await this.repository.update(employeeId, updateData, userId)
  }

  /**
   * Detay bilgisi sil
   */
  async delete(employeeId: number, userId?: number): Promise<EmployeeDetails> {
    const existing = await this.repository.findByEmployeeId(employeeId)
    if (!existing) {
      throw new BusinessRuleError('Personel detay bilgisi bulunamadı', { employeeId })
    }

    return await this.repository.delete(employeeId, userId)
  }

  /**
   * Upsert - varsa güncelle, yoksa oluştur
   */
  async upsert(employeeId: number, data: UpdateEmployeeDetailsDto, userId?: number): Promise<EmployeeDetails> {
    const existing = await this.repository.findByEmployeeId(employeeId)

    if (existing) {
      return await this.update(employeeId, data, userId)
    } else {
      return await this.create({ ...data, employeeId }, userId)
    }
  }

  /**
   * Tüm detay bilgilerini getir
   */
  async findAll(): Promise<EmployeeDetailsWithEmployee[]> {
    return await this.repository.findAll()
  }

  /**
   * Kan grubuna göre personelleri getir
   */
  async findByBloodGroup(bloodGroup: BloodGroup): Promise<EmployeeDetailsWithEmployee[]> {
    return await this.repository.findByBloodGroup(bloodGroup)
  }

  /**
   * Askerlik durumuna göre personelleri getir
   */
  async findByMilitaryStatus(militaryStatus: MilitaryStatus): Promise<EmployeeDetailsWithEmployee[]> {
    return await this.repository.findByMilitaryStatus(militaryStatus)
  }

  /**
   * Personel için detay bilgisi var mı kontrol et
   */
  async existsForEmployee(employeeId: number): Promise<boolean> {
    return await this.repository.existsForEmployee(employeeId)
  }

  /**
   * IBAN'ı çöz
   */
  decryptIban(encryptedIban: string): string {
    return this.encryptionUtil.decrypt(encryptedIban)
  }

  /**
   * SGK numarasını çöz
   */
  decryptSocialSecurityNumber(encryptedSSN: string): string {
    return this.encryptionUtil.decrypt(encryptedSSN)
  }

  /**
   * Detay bilgilerini çöz
   */
  private decryptDetails(details: EmployeeDetails): DecryptedEmployeeDetails {
    return {
      ...details,
      decryptedIban: details.iban ? this.encryptionUtil.safeDecrypt(details.iban) : null,
      decryptedSocialSecurityNumber: details.socialSecurityNumber 
        ? this.encryptionUtil.safeDecrypt(details.socialSecurityNumber) 
        : null
    }
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreateEmployeeDetailsDto): Promise<void> {
    // Personel ID zorunlu
    if (!data.employeeId) {
      throw new ValidationError('employeeId', data.employeeId, 'Personel ID zorunludur')
    }

    // Personel var mı kontrol et
    const employeeExists = await this.repository.employeeExists(data.employeeId)
    if (!employeeExists) {
      throw new BusinessRuleError('Personel bulunamadı', { employeeId: data.employeeId })
    }

    // One-to-one kontrolü
    const detailsExist = await this.repository.existsForEmployee(data.employeeId)
    if (detailsExist) {
      throw new BusinessRuleError('Bu personel için detay bilgisi zaten mevcut', { employeeId: data.employeeId })
    }

    // Enum validasyonları
    this.validateEnums(data)

    // IBAN validasyonu
    // Requirements: 5.9
    if (data.iban) {
      const ibanValidation = ValidationUtils.validateIBAN(data.iban)
      if (!ibanValidation.isValid) {
        throw new ValidationError('iban', data.iban, ibanValidation.error!)
      }
    }
  }

  /**
   * Update validasyonu
   */
  private async validateUpdate(data: UpdateEmployeeDetailsDto): Promise<void> {
    // Enum validasyonları
    this.validateEnums(data)

    // IBAN validasyonu
    // Requirements: 5.9
    if (data.iban !== undefined && data.iban !== null) {
      const ibanValidation = ValidationUtils.validateIBAN(data.iban)
      if (!ibanValidation.isValid) {
        throw new ValidationError('iban', data.iban, ibanValidation.error!)
      }
    }
  }

  /**
   * Enum validasyonları
   */
  private validateEnums(data: CreateEmployeeDetailsDto | UpdateEmployeeDetailsDto): void {
    // Kan grubu validasyonu
    // Requirements: 5.5
    if (data.bloodGroup !== undefined && data.bloodGroup !== null) {
      const bloodGroupValidation = ValidationUtils.validateBloodGroup(data.bloodGroup)
      if (!bloodGroupValidation.isValid) {
        throw new ValidationError('bloodGroup', data.bloodGroup, bloodGroupValidation.error!)
      }
    }

    // Cinsiyet validasyonu
    // Requirements: 5.6
    if (data.gender !== undefined && data.gender !== null) {
      const genderValidation = ValidationUtils.validateGender(data.gender)
      if (!genderValidation.isValid) {
        throw new ValidationError('gender', data.gender, genderValidation.error!)
      }
    }

    // Medeni durum validasyonu
    // Requirements: 5.7
    if (data.maritalStatus !== undefined && data.maritalStatus !== null) {
      const maritalStatusValidation = ValidationUtils.validateMaritalStatus(data.maritalStatus)
      if (!maritalStatusValidation.isValid) {
        throw new ValidationError('maritalStatus', data.maritalStatus, maritalStatusValidation.error!)
      }
    }

    // Askerlik durumu validasyonu
    // Requirements: 5.8
    if (data.militaryStatus !== undefined && data.militaryStatus !== null) {
      const militaryStatusValidation = ValidationUtils.validateMilitaryStatus(data.militaryStatus)
      if (!militaryStatusValidation.isValid) {
        throw new ValidationError('militaryStatus', data.militaryStatus, militaryStatusValidation.error!)
      }
    }
  }

  /**
   * Create verisi hazırla (şifreleme dahil)
   */
  private prepareCreateData(data: CreateEmployeeDetailsDto): any {
    const createData: any = {
      employeeId: data.employeeId,
      birthDate: data.birthDate ? (typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate) : null,
      bloodGroup: data.bloodGroup || null,
      gender: data.gender || null,
      maritalStatus: data.maritalStatus || null,
      addressHome: data.addressHome || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      bankName: data.bankName || null,
      educationLevel: data.educationLevel || null,
      militaryStatus: data.militaryStatus || null
    }

    // IBAN şifreleme
    // Requirements: 5.3
    if (data.iban) {
      createData.iban = this.encryptionUtil.encrypt(data.iban)
    }

    // SGK no şifreleme
    // Requirements: 5.4
    if (data.socialSecurityNumber) {
      createData.socialSecurityNumber = this.encryptionUtil.encrypt(data.socialSecurityNumber)
    }

    return createData
  }

  /**
   * Update verisi hazırla (şifreleme dahil)
   */
  private prepareUpdateData(data: UpdateEmployeeDetailsDto): any {
    const updateData: any = {}

    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate 
        ? (typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate) 
        : null
    }
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup
    if (data.gender !== undefined) updateData.gender = data.gender
    if (data.maritalStatus !== undefined) updateData.maritalStatus = data.maritalStatus
    if (data.addressHome !== undefined) updateData.addressHome = data.addressHome
    if (data.emergencyContactName !== undefined) updateData.emergencyContactName = data.emergencyContactName
    if (data.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = data.emergencyContactPhone
    if (data.bankName !== undefined) updateData.bankName = data.bankName
    if (data.educationLevel !== undefined) updateData.educationLevel = data.educationLevel
    if (data.militaryStatus !== undefined) updateData.militaryStatus = data.militaryStatus

    // IBAN şifreleme
    // Requirements: 5.3
    if (data.iban !== undefined) {
      updateData.iban = data.iban ? this.encryptionUtil.encrypt(data.iban) : null
    }

    // SGK no şifreleme
    // Requirements: 5.4
    if (data.socialSecurityNumber !== undefined) {
      updateData.socialSecurityNumber = data.socialSecurityNumber 
        ? this.encryptionUtil.encrypt(data.socialSecurityNumber) 
        : null
    }

    return updateData
  }
}

export default EmployeeDetailsService
