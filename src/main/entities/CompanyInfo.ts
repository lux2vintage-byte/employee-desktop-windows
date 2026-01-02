import { BaseEntity } from './BaseEntity'

export interface CompanyInfoData {
  id?: number | null
  name?: string
  shortName?: string
  address?: string
  phone?: string
  phone2?: string
  phone3?: string
  email?: string
  taxOffice?: string
  taxNumber?: string
  bank1Name?: string
  bank1AccountHolder?: string
  bank1AccountNumber?: string
  bank1IBAN?: string
  bank2Name?: string
  bank2AccountHolder?: string
  bank2AccountNumber?: string
  bank2IBAN?: string
  logo?: string | null
  favicon?: string | null
  createdAt?: Date | null
  updatedAt?: Date | null
}

/**
 * CompanyInfo Entity
 */
export class CompanyInfo extends BaseEntity {
  name: string
  shortName: string
  address: string
  phone: string
  phone2: string
  phone3: string
  email: string
  taxOffice: string
  taxNumber: string
  bank1Name: string
  bank1AccountHolder: string
  bank1AccountNumber: string
  bank1IBAN: string
  bank2Name: string
  bank2AccountHolder: string
  bank2AccountNumber: string
  bank2IBAN: string
  logo: string | null
  favicon: string | null

  constructor(data: CompanyInfoData = {}) {
    super(data)
    
    this.name = data.name || ''
    this.shortName = data.shortName || ''
    this.address = data.address || ''
    this.phone = data.phone || ''
    this.phone2 = data.phone2 || ''
    this.phone3 = data.phone3 || ''
    this.email = data.email || ''
    this.taxOffice = data.taxOffice || ''
    this.taxNumber = data.taxNumber || ''
    this.bank1Name = data.bank1Name || ''
    this.bank1AccountHolder = data.bank1AccountHolder || ''
    this.bank1AccountNumber = data.bank1AccountNumber || ''
    this.bank1IBAN = data.bank1IBAN || ''
    this.bank2Name = data.bank2Name || ''
    this.bank2AccountHolder = data.bank2AccountHolder || ''
    this.bank2AccountNumber = data.bank2AccountNumber || ''
    this.bank2IBAN = data.bank2IBAN || ''
    this.logo = data.logo || null
    this.favicon = data.favicon || null
  }

  validate(): string[] {
    const errors: string[] = []

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Şirket adı gereklidir')
    }

    if (this.name && this.name.length > 255) {
      errors.push('Şirket adı en fazla 255 karakter olmalıdır')
    }

    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('Geçersiz email formatı')
    }

    if (this.phone && this.phone.length < 10) {
      errors.push('Telefon numarası en az 10 karakter olmalıdır')
    }

    if (this.bank1IBAN && !this.isValidIban(this.bank1IBAN)) {
      errors.push('Geçersiz Banka 1 IBAN formatı')
    }

    if (this.bank2IBAN && !this.isValidIban(this.bank2IBAN)) {
      errors.push('Geçersiz Banka 2 IBAN formatı')
    }

    return errors
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private isValidIban(iban: string): boolean {
    const turkishIbanRegex = /^TR[0-9]{2}[0-9]{4}[0-9]{1}[0-9A-Z]{16}$/
    const generalIbanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/
    const cleanIban = iban.replace(/\s/g, '').toUpperCase()
    return turkishIbanRegex.test(cleanIban) || generalIbanRegex.test(cleanIban)
  }

  toSummary(): any {
    return {
      id: this.id,
      name: this.name,
      shortName: this.shortName,
      phone: this.phone,
      email: this.email,
      logo: this.logo,
      favicon: this.favicon
    }
  }

  toPlainObject(): any {
    return {
      id: this.id,
      name: this.name,
      shortName: this.shortName,
      address: this.address,
      phone: this.phone,
      phone2: this.phone2,
      phone3: this.phone3,
      email: this.email,
      taxOffice: this.taxOffice,
      taxNumber: this.taxNumber,
      bank1Name: this.bank1Name,
      bank1AccountHolder: this.bank1AccountHolder,
      bank1AccountNumber: this.bank1AccountNumber,
      bank1IBAN: this.bank1IBAN,
      bank2Name: this.bank2Name,
      bank2AccountHolder: this.bank2AccountHolder,
      bank2AccountNumber: this.bank2AccountNumber,
      bank2IBAN: this.bank2IBAN,
      logo: this.logo,
      favicon: this.favicon,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      updatedAt: this.updatedAt instanceof Date ? this.updatedAt.toISOString() : this.updatedAt
    }
  }

  toDetailedInfo(): any {
    return {
      ...this.toPlainObject(),
      hasBankInfo: !!(this.bank1IBAN || this.bank2IBAN),
      hasContactInfo: !!(this.phone || this.email),
      hasAddress: !!this.address,
      hasTaxInfo: !!(this.taxOffice && this.taxNumber)
    }
  }
}

export default CompanyInfo
