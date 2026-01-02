import { BaseEntity } from './BaseEntity'

export interface EmailConfigData {
  id?: number | null
  host?: string
  port?: number
  secure?: boolean
  user?: string
  password?: string
  fromName?: string
  fromAddress?: string
  isActive?: boolean
  createdAt?: Date | null
  updatedAt?: Date | null
}

export interface EmailConfigValidation {
  isValid: boolean
  errors: string[]
}

/**
 * Email Yapılandırması Entity
 */
export class EmailConfig extends BaseEntity {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromName: string
  fromAddress: string
  isActive: boolean

  constructor(data: EmailConfigData = {}) {
    super(data)
    
    this.host = data.host || ''
    this.port = data.port || 587
    this.secure = data.secure !== undefined ? data.secure : false
    this.user = data.user || ''
    this.password = data.password || ''
    this.fromName = data.fromName || ''
    this.fromAddress = data.fromAddress || ''
    this.isActive = data.isActive !== undefined ? data.isActive : true
  }

  validateConfig(): EmailConfigValidation {
    const errors: string[] = []

    if (!this.host || this.host.trim() === '') {
      errors.push('SMTP sunucu adresi gereklidir')
    }

    if (!this.port || this.port < 1 || this.port > 65535) {
      errors.push('Geçerli bir port numarası gereklidir (1-65535)')
    }

    if (!this.user || this.user.trim() === '') {
      errors.push('SMTP kullanıcı adı gereklidir')
    }

    if (!this.password || this.password.trim() === '') {
      errors.push('SMTP şifresi gereklidir')
    }

    if (!this.fromName || this.fromName.trim() === '') {
      errors.push('Gönderici adı gereklidir')
    }

    if (!this.fromAddress || this.fromAddress.trim() === '') {
      errors.push('Gönderici e-posta adresi gereklidir')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (this.fromAddress && !emailRegex.test(this.fromAddress)) {
      errors.push('Geçerli bir e-posta adresi giriniz')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  toResponse(): any {
    const { password, ...rest } = this.toJSON()
    return rest
  }

  toJSON(): any {
    return {
      id: this.id,
      host: this.host,
      port: this.port,
      secure: this.secure,
      user: this.user,
      password: this.password,
      fromName: this.fromName,
      fromAddress: this.fromAddress,
      isActive: this.isActive,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      updatedAt: this.updatedAt instanceof Date ? this.updatedAt.toISOString() : this.updatedAt
    }
  }
}

export default EmailConfig
