export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * TC Kimlik No validasyon sonucu
 */
export interface TCKimlikValidationResult {
  isValid: boolean
  error?: string
}

export interface CreateUserData {
  name?: string
  lastname?: string
  email?: string
  password?: string
  phone?: string
}

export interface UpdateUserData {
  name?: string
  lastname?: string
  email?: string
  password?: string
  phone?: string
}

/**
 * Validation Utilities
 */
export class ValidationUtils {
  /**
   * TC Kimlik No validasyonu
   * 
   * TC Kimlik No kuralları:
   * 1. 11 haneli olmalıdır
   * 2. Sadece rakamlardan oluşmalıdır
   * 3. İlk hane 0 olamaz
   * 4. (1. + 3. + 5. + 7. + 9. hanelerin toplamı × 7) - (2. + 4. + 6. + 8. hanelerin toplamı) mod 10 = 10. hane
   * 5. İlk 10 hanenin toplamı mod 10 = 11. hane
   * 
   * @param tcKimlikNo - Kontrol edilecek TC Kimlik No
   * @returns TCKimlikValidationResult - Validasyon sonucu
   */
  static validateTCKimlikNo(tcKimlikNo: string): TCKimlikValidationResult {
    // Null/undefined kontrolü
    if (!tcKimlikNo) {
      return { isValid: false, error: 'TC Kimlik No boş olamaz' }
    }

    // Boşlukları temizle
    const cleanedTCKimlik = tcKimlikNo.trim()

    // 11 haneli olmalı
    if (cleanedTCKimlik.length !== 11) {
      return { isValid: false, error: 'TC Kimlik No 11 haneli olmalıdır' }
    }

    // Sadece rakamlardan oluşmalı
    if (!/^\d{11}$/.test(cleanedTCKimlik)) {
      return { isValid: false, error: 'TC Kimlik No sadece rakamlardan oluşmalıdır' }
    }

    // İlk hane 0 olamaz
    if (cleanedTCKimlik[0] === '0') {
      return { isValid: false, error: 'TC Kimlik No ilk hanesi 0 olamaz' }
    }

    // Rakamları diziye çevir
    const digits = cleanedTCKimlik.split('').map(Number)

    // Checksum algoritması - 10. hane kontrolü
    // (1. + 3. + 5. + 7. + 9. hanelerin toplamı × 7) - (2. + 4. + 6. + 8. hanelerin toplamı) mod 10 = 10. hane
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7]
    const tenthDigitCalculated = ((oddSum * 7) - evenSum) % 10
    
    // Negatif mod sonucu için düzeltme
    const tenthDigit = tenthDigitCalculated < 0 ? tenthDigitCalculated + 10 : tenthDigitCalculated

    if (tenthDigit !== digits[9]) {
      return { isValid: false, error: 'TC Kimlik No checksum hatası (10. hane)' }
    }

    // Checksum algoritması - 11. hane kontrolü
    // İlk 10 hanenin toplamı mod 10 = 11. hane
    const first10Sum = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0)
    const eleventhDigit = first10Sum % 10

    if (eleventhDigit !== digits[10]) {
      return { isValid: false, error: 'TC Kimlik No checksum hatası (11. hane)' }
    }

    return { isValid: true }
  }

  /**
   * TC Kimlik No geçerli mi? (Basit boolean dönüş)
   * 
   * @param tcKimlikNo - Kontrol edilecek TC Kimlik No
   * @returns boolean - Geçerli ise true
   */
  static isValidTCKimlikNo(tcKimlikNo: string): boolean {
    return this.validateTCKimlikNo(tcKimlikNo).isValid
  }

  /**
   * Türk IBAN validasyonu
   * 
   * Türk IBAN kuralları:
   * 1. "TR" ile başlamalıdır
   * 2. Toplam 26 karakter olmalıdır (TR + 24 rakam)
   * 3. TR'den sonra sadece rakamlar gelmelidir
   * 4. IBAN mod 97 algoritması ile doğrulanmalıdır
   * 
   * @param iban - Kontrol edilecek IBAN
   * @returns TCKimlikValidationResult - Validasyon sonucu (aynı yapıyı kullanıyoruz)
   */
  static validateIBAN(iban: string): TCKimlikValidationResult {
    // Null/undefined kontrolü
    if (!iban) {
      return { isValid: false, error: 'IBAN boş olamaz' }
    }

    // Boşlukları temizle ve büyük harfe çevir
    const cleanedIBAN = iban.replace(/\s/g, '').toUpperCase()

    // 26 karakter olmalı
    if (cleanedIBAN.length !== 26) {
      return { isValid: false, error: 'IBAN 26 karakter olmalıdır' }
    }

    // TR ile başlamalı
    if (!cleanedIBAN.startsWith('TR')) {
      return { isValid: false, error: 'Türk IBAN\'ı "TR" ile başlamalıdır' }
    }

    // TR'den sonra sadece rakamlar olmalı
    const digitsAfterTR = cleanedIBAN.substring(2)
    if (!/^\d{24}$/.test(digitsAfterTR)) {
      return { isValid: false, error: 'IBAN\'da TR\'den sonra 24 rakam olmalıdır' }
    }

    // IBAN mod 97 algoritması
    // 1. İlk 4 karakteri sona taşı
    // 2. Harfleri sayılara çevir (A=10, B=11, ..., Z=35)
    // 3. Mod 97 hesapla, sonuç 1 olmalı
    const rearranged = cleanedIBAN.substring(4) + cleanedIBAN.substring(0, 4)
    
    // Harfleri sayılara çevir
    let numericString = ''
    for (const char of rearranged) {
      if (char >= 'A' && char <= 'Z') {
        numericString += (char.charCodeAt(0) - 55).toString() // A=10, B=11, etc.
      } else {
        numericString += char
      }
    }

    // Mod 97 hesapla (büyük sayılar için parçalı hesaplama)
    let remainder = 0
    for (const digit of numericString) {
      remainder = (remainder * 10 + parseInt(digit, 10)) % 97
    }

    if (remainder !== 1) {
      return { isValid: false, error: 'IBAN checksum hatası' }
    }

    return { isValid: true }
  }

  /**
   * IBAN geçerli mi? (Basit boolean dönüş)
   * 
   * @param iban - Kontrol edilecek IBAN
   * @returns boolean - Geçerli ise true
   */
  static isValidIBAN(iban: string): boolean {
    return this.validateIBAN(iban).isValid
  }

  /**
   * Email formatı kontrolü
   */
  static isValidEmail(email: string): boolean {
    if (!email) return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Telefon formatı kontrolü
   */
  static isValidPhone(phone: string): boolean {
    if (!phone) return false
    const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/
    return phoneRegex.test(phone)
  }

  /**
   * Kullanıcı oluşturma validasyonu
   */
  static validateCreateUser(data: CreateUserData): ValidationResult {
    const errors: string[] = []

    if (!data.name || data.name.length < 3 || data.name.length > 50) {
      errors.push('İsim 3-50 karakter arasında olmalıdır')
    }

    if (!data.lastname || data.lastname.length < 3 || data.lastname.length > 50) {
      errors.push('Soyisim 3-50 karakter arasında olmalıdır')
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Geçerli bir e-posta adresi girin')
    }

    if (!data.password || data.password.length < 6) {
      errors.push('Şifre en az 6 karakter olmalıdır')
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Geçerli bir telefon numarası girin')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Kullanıcı güncelleme validasyonu
   */
  static validateUpdateUser(data: UpdateUserData): ValidationResult {
    const errors: string[] = []

    if (data.name !== undefined && (data.name.length < 3 || data.name.length > 50)) {
      errors.push('İsim 3-50 karakter arasında olmalıdır')
    }

    if (data.lastname !== undefined && (data.lastname.length < 3 || data.lastname.length > 50)) {
      errors.push('Soyisim 3-50 karakter arasında olmalıdır')
    }

    if (data.email !== undefined && !this.isValidEmail(data.email)) {
      errors.push('Geçerli bir e-posta adresi girin')
    }

    if (data.password !== undefined && data.password.length < 6) {
      errors.push('Şifre en az 6 karakter olmalıdır')
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Geçerli bir telefon numarası girin')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ==================== ENUM VALIDATORS ====================

  /**
   * Enum değerlerini tanımlayan sabitler
   */
  static readonly ENUMS = {
    // Requirement 4.6: Contract Type
    CONTRACT_TYPE: ['Süreli', 'Süresiz', 'Stajyer', 'Freelance'] as const,
    
    // Requirement 4.7: Employee Status
    EMPLOYEE_STATUS: ['Active', 'Passive', 'OnLeave', 'Terminated'] as const,
    
    // Requirement 5.5: Blood Group
    BLOOD_GROUP: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'] as const,
    
    // Requirement 5.6: Gender
    GENDER: ['Erkek', 'Kadın', 'Diğer'] as const,
    
    // Requirement 5.7: Marital Status
    MARITAL_STATUS: ['Bekar', 'Evli', 'Boşanmış', 'Dul'] as const,
    
    // Requirement 5.8: Military Status
    MILITARY_STATUS: ['Yapıldı', 'Muaf', 'Tecilli'] as const,
    
    // Requirement 6.2: Document Type
    DOCUMENT_TYPE: ['Sözleşme', 'Kimlik Fotokopisi', 'Diploma', 'Sağlık Raporu', 'Diğer'] as const,
    
    // Requirement 7.3: Attendance Status
    ATTENDANCE_STATUS: ['Geldi', 'Gelmedi', 'İzinli', 'Tatil'] as const,
    
    // Requirement 8.2: Approval Status (Overtime)
    APPROVAL_STATUS: ['Pending', 'Approved', 'Rejected'] as const,
    
    // Requirement 10.2: Leave Request Status
    LEAVE_REQUEST_STATUS: ['Pending', 'Approved', 'Rejected'] as const,
    
    // Requirement 12.2: Currency
    CURRENCY: ['TRY', 'USD', 'EUR'] as const,
    
    // Requirement 12.3: Period Type
    PERIOD_TYPE: ['Aylık', 'Saatlik'] as const,
    
    // Requirement 14.2: Payroll Item Type
    PAYROLL_ITEM_TYPE: ['Income', 'Deduction'] as const,
    
    // Requirement 14.3: Income Category
    INCOME_CATEGORY: ['Overtime', 'Bonus', 'Transport', 'Food', 'Other'] as const,
    
    // Requirement 14.4: Deduction Category
    DEDUCTION_CATEGORY: ['Tax', 'Insurance', 'Advance', 'Absence', 'Other'] as const,
    
    // Requirement 15.2: Advance Status
    ADVANCE_STATUS: ['Pending', 'Approved', 'Rejected', 'Paid', 'Deducted'] as const,
    
    // Requirement 16.2: Performance Review Status
    PERFORMANCE_STATUS: ['Draft', 'Submitted', 'Acknowledged'] as const,
    
    // Requirement 17.3: Training Status
    TRAINING_STATUS: ['Planned', 'Completed', 'Failed'] as const,
    
    // Requirement 18.2: Violation Type
    VIOLATION_TYPE: ['İşe Geç Kalma', 'İş Güvenliği İhlali', 'Devamsızlık', 'Görev İhmali', 'Diğer'] as const,
    
    // Requirement 18.3: Action Taken
    ACTION_TAKEN: ['Sözlü Uyarı', 'Yazılı Uyarı', 'Tutanak', 'Maaş Kesintisi', 'İşten Çıkarma'] as const,
    
    // Requirement 19.2: Reason Category
    REASON_CATEGORY: ['İstifa', 'Emeklilik', 'Çıkarılma', 'Sözleşme Bitimi'] as const,
    
    // Requirement 19.3: Resignation Status
    RESIGNATION_STATUS: ['Pending', 'Approved', 'Completed'] as const,
  }

  /**
   * Generic enum validator
   * @param value - Kontrol edilecek değer
   * @param validValues - Geçerli değerler dizisi
   * @param enumName - Enum adı (hata mesajı için)
   * @returns TCKimlikValidationResult
   */
  static validateEnum<T extends string>(
    value: string,
    validValues: readonly T[],
    enumName: string
  ): TCKimlikValidationResult {
    if (!value) {
      return { isValid: false, error: `${enumName} boş olamaz` }
    }

    if (!validValues.includes(value as T)) {
      return { 
        isValid: false, 
        error: `Geçersiz ${enumName}: "${value}". Geçerli değerler: ${validValues.join(', ')}` 
      }
    }

    return { isValid: true }
  }

  /**
   * Generic enum validator (boolean return)
   */
  static isValidEnum<T extends string>(value: string, validValues: readonly T[]): boolean {
    return value != null && validValues.includes(value as T)
  }

  // ==================== SPECIFIC ENUM VALIDATORS ====================

  /**
   * Contract Type validasyonu (Requirement 4.6)
   */
  static validateContractType(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.CONTRACT_TYPE, 'Sözleşme Tipi')
  }

  static isValidContractType(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.CONTRACT_TYPE)
  }

  /**
   * Employee Status validasyonu (Requirement 4.7)
   */
  static validateEmployeeStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.EMPLOYEE_STATUS, 'Personel Durumu')
  }

  static isValidEmployeeStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.EMPLOYEE_STATUS)
  }

  /**
   * Blood Group validasyonu (Requirement 5.5)
   */
  static validateBloodGroup(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.BLOOD_GROUP, 'Kan Grubu')
  }

  static isValidBloodGroup(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.BLOOD_GROUP)
  }

  /**
   * Gender validasyonu (Requirement 5.6)
   */
  static validateGender(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.GENDER, 'Cinsiyet')
  }

  static isValidGender(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.GENDER)
  }

  /**
   * Marital Status validasyonu (Requirement 5.7)
   */
  static validateMaritalStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.MARITAL_STATUS, 'Medeni Durum')
  }

  static isValidMaritalStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.MARITAL_STATUS)
  }

  /**
   * Military Status validasyonu (Requirement 5.8)
   */
  static validateMilitaryStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.MILITARY_STATUS, 'Askerlik Durumu')
  }

  static isValidMilitaryStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.MILITARY_STATUS)
  }

  /**
   * Document Type validasyonu (Requirement 6.2)
   */
  static validateDocumentType(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.DOCUMENT_TYPE, 'Belge Tipi')
  }

  static isValidDocumentType(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.DOCUMENT_TYPE)
  }

  /**
   * Attendance Status validasyonu (Requirement 7.3)
   */
  static validateAttendanceStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.ATTENDANCE_STATUS, 'Devamlılık Durumu')
  }

  static isValidAttendanceStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.ATTENDANCE_STATUS)
  }

  /**
   * Approval Status validasyonu (Requirement 8.2)
   */
  static validateApprovalStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.APPROVAL_STATUS, 'Onay Durumu')
  }

  static isValidApprovalStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.APPROVAL_STATUS)
  }

  /**
   * Leave Request Status validasyonu (Requirement 10.2)
   */
  static validateLeaveRequestStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.LEAVE_REQUEST_STATUS, 'İzin Talebi Durumu')
  }

  static isValidLeaveRequestStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.LEAVE_REQUEST_STATUS)
  }

  /**
   * Currency validasyonu (Requirement 12.2)
   */
  static validateCurrency(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.CURRENCY, 'Para Birimi')
  }

  static isValidCurrency(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.CURRENCY)
  }

  /**
   * Period Type validasyonu (Requirement 12.3)
   */
  static validatePeriodType(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.PERIOD_TYPE, 'Dönem Tipi')
  }

  static isValidPeriodType(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.PERIOD_TYPE)
  }

  /**
   * Payroll Item Type validasyonu (Requirement 14.2)
   */
  static validatePayrollItemType(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.PAYROLL_ITEM_TYPE, 'Bordro Kalemi Tipi')
  }

  static isValidPayrollItemType(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.PAYROLL_ITEM_TYPE)
  }

  /**
   * Income Category validasyonu (Requirement 14.3)
   */
  static validateIncomeCategory(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.INCOME_CATEGORY, 'Gelir Kategorisi')
  }

  static isValidIncomeCategory(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.INCOME_CATEGORY)
  }

  /**
   * Deduction Category validasyonu (Requirement 14.4)
   */
  static validateDeductionCategory(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.DEDUCTION_CATEGORY, 'Kesinti Kategorisi')
  }

  static isValidDeductionCategory(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.DEDUCTION_CATEGORY)
  }

  /**
   * Advance Status validasyonu (Requirement 15.2)
   */
  static validateAdvanceStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.ADVANCE_STATUS, 'Avans Durumu')
  }

  static isValidAdvanceStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.ADVANCE_STATUS)
  }

  /**
   * Performance Review Status validasyonu (Requirement 16.2)
   */
  static validatePerformanceStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.PERFORMANCE_STATUS, 'Performans Değerlendirme Durumu')
  }

  static isValidPerformanceStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.PERFORMANCE_STATUS)
  }

  /**
   * Training Status validasyonu (Requirement 17.3)
   */
  static validateTrainingStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.TRAINING_STATUS, 'Eğitim Durumu')
  }

  static isValidTrainingStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.TRAINING_STATUS)
  }

  /**
   * Violation Type validasyonu (Requirement 18.2)
   */
  static validateViolationType(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.VIOLATION_TYPE, 'İhlal Tipi')
  }

  static isValidViolationType(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.VIOLATION_TYPE)
  }

  /**
   * Action Taken validasyonu (Requirement 18.3)
   */
  static validateActionTaken(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.ACTION_TAKEN, 'Alınan Aksiyon')
  }

  static isValidActionTaken(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.ACTION_TAKEN)
  }

  /**
   * Reason Category validasyonu (Requirement 19.2)
   */
  static validateReasonCategory(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.REASON_CATEGORY, 'Ayrılma Nedeni')
  }

  static isValidReasonCategory(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.REASON_CATEGORY)
  }

  /**
   * Resignation Status validasyonu (Requirement 19.3)
   */
  static validateResignationStatus(value: string): TCKimlikValidationResult {
    return this.validateEnum(value, this.ENUMS.RESIGNATION_STATUS, 'İşten Ayrılma Durumu')
  }

  static isValidResignationStatus(value: string): boolean {
    return this.isValidEnum(value, this.ENUMS.RESIGNATION_STATUS)
  }
}

export default ValidationUtils

// Export enum types for use in other modules
export type ContractType = typeof ValidationUtils.ENUMS.CONTRACT_TYPE[number]
export type EmployeeStatus = typeof ValidationUtils.ENUMS.EMPLOYEE_STATUS[number]
export type BloodGroup = typeof ValidationUtils.ENUMS.BLOOD_GROUP[number]
export type Gender = typeof ValidationUtils.ENUMS.GENDER[number]
export type MaritalStatus = typeof ValidationUtils.ENUMS.MARITAL_STATUS[number]
export type MilitaryStatus = typeof ValidationUtils.ENUMS.MILITARY_STATUS[number]
export type DocumentType = typeof ValidationUtils.ENUMS.DOCUMENT_TYPE[number]
export type AttendanceStatus = typeof ValidationUtils.ENUMS.ATTENDANCE_STATUS[number]
export type ApprovalStatus = typeof ValidationUtils.ENUMS.APPROVAL_STATUS[number]
export type LeaveRequestStatus = typeof ValidationUtils.ENUMS.LEAVE_REQUEST_STATUS[number]
export type Currency = typeof ValidationUtils.ENUMS.CURRENCY[number]
export type PeriodType = typeof ValidationUtils.ENUMS.PERIOD_TYPE[number]
export type PayrollItemType = typeof ValidationUtils.ENUMS.PAYROLL_ITEM_TYPE[number]
export type IncomeCategory = typeof ValidationUtils.ENUMS.INCOME_CATEGORY[number]
export type DeductionCategory = typeof ValidationUtils.ENUMS.DEDUCTION_CATEGORY[number]
export type AdvanceStatus = typeof ValidationUtils.ENUMS.ADVANCE_STATUS[number]
export type PerformanceStatus = typeof ValidationUtils.ENUMS.PERFORMANCE_STATUS[number]
export type TrainingStatus = typeof ValidationUtils.ENUMS.TRAINING_STATUS[number]
export type ViolationType = typeof ValidationUtils.ENUMS.VIOLATION_TYPE[number]
export type ActionTaken = typeof ValidationUtils.ENUMS.ACTION_TAKEN[number]
export type ReasonCategory = typeof ValidationUtils.ENUMS.REASON_CATEGORY[number]
export type ResignationStatus = typeof ValidationUtils.ENUMS.RESIGNATION_STATUS[number]
