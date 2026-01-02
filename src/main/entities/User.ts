import { BaseEntity } from './BaseEntity'
import { PasswordUtils } from '../utils/password'
import { ValidationUtils } from '../utils/validation'

export enum UserType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface UserData {
  id?: number | null
  companyname?: string | null
  name?: string
  lastname?: string
  taxoffice?: string | null
  taxnumber?: string | null
  type?: string
  email?: string
  password?: string
  phone?: string | null
  discountRate?: number
  role?: string
  profilePic?: string | null
  verificationToken?: string | null
  isVerified?: boolean
  verified?: Date | null
  passwordToken?: string | null
  passwordTokenExpirationDate?: Date | null
  hashedRefreshToken?: string | null
  createdAt?: Date | null
  updatedAt?: Date | null
}

/**
 * User Entity
 */
export class User extends BaseEntity {
  companyname: string | null
  name: string
  lastname: string
  taxoffice: string | null
  taxnumber: string | null
  type: string
  email: string
  password: string
  phone: string | null
  discountRate: number
  role: string
  profilePic: string | null
  verificationToken: string | null
  isVerified: boolean
  verified: Date | null
  passwordToken: string | null
  passwordTokenExpirationDate: Date | null
  hashedRefreshToken: string | null

  constructor(data: UserData = {}) {
    super(data)
    
    this.companyname = data.companyname || null
    this.name = data.name || ''
    this.lastname = data.lastname || ''
    this.taxoffice = data.taxoffice || null
    this.taxnumber = data.taxnumber || null
    this.type = data.type || 'CORPORATE'
    this.email = data.email || ''
    this.password = data.password || ''
    this.phone = data.phone || null
    this.discountRate = data.discountRate || 0
    this.role = data.role || 'USER'
    this.profilePic = data.profilePic || null
    this.verificationToken = data.verificationToken || null
    this.isVerified = data.isVerified || false
    this.verified = data.verified || null
    this.passwordToken = data.passwordToken || null
    this.passwordTokenExpirationDate = data.passwordTokenExpirationDate || null
    this.hashedRefreshToken = data.hashedRefreshToken || null
  }

  validate(): string[] {
    const errors: string[] = []

    if (!this.name || this.name.length < 3 || this.name.length > 50) {
      errors.push('İsim 3-50 karakter arasında olmalıdır')
    }

    if (!this.lastname || this.lastname.length < 3 || this.lastname.length > 50) {
      errors.push('Soyisim 3-50 karakter arasında olmalıdır')
    }

    if (!this.email || !ValidationUtils.isValidEmail(this.email)) {
      errors.push('Geçerli bir e-posta adresi girin')
    }

    if (!this.password || this.password.length < 6) {
      errors.push('Şifre en az 6 karakter olmalıdır')
    }

    if (this.phone && !ValidationUtils.isValidPhone(this.phone)) {
      errors.push('Geçerli bir telefon numarası girin')
    }

    if (this.role && !Object.values(UserRole).includes(this.role as UserRole)) {
      errors.push('Geçerli bir kullanıcı rolü seçin')
    }

    return errors
  }

  async hashPassword(): Promise<User> {
    if (this.password && !PasswordUtils.isPasswordHashed(this.password)) {
      this.password = await PasswordUtils.hashPassword(this.password)
    }
    return this
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return await PasswordUtils.comparePassword(candidatePassword, this.password)
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN
  }

  isCustomer(): boolean {
    return this.role === UserRole.USER
  }

  isEmailVerified(): boolean {
    return this.isVerified === true
  }

  isCorporate(): boolean {
    return this.type === UserType.CORPORATE
  }

  isIndividual(): boolean {
    return this.type === UserType.INDIVIDUAL
  }

  getFullName(): string {
    return `${this.name} ${this.lastname}`.trim()
  }

  getDisplayName(): string {
    if (this.isCorporate() && this.companyname) {
      return this.companyname
    }
    return this.getFullName()
  }

  getParsedProfilePic(): any {
    if (typeof this.profilePic === 'string') {
      try {
        return JSON.parse(this.profilePic)
      } catch (error) {
        return null
      }
    }
    return this.profilePic
  }

  setProfilePic(profilePic: any): User {
    if (typeof profilePic === 'object') {
      this.profilePic = JSON.stringify(profilePic)
    } else {
      this.profilePic = profilePic
    }
    return this
  }

  generateVerificationToken(): string {
    this.verificationToken = PasswordUtils.generateRandomToken(32)
    return this.verificationToken
  }

  generatePasswordResetToken(): string {
    this.passwordToken = PasswordUtils.generateRandomToken(32)
    this.passwordTokenExpirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    return this.passwordToken
  }

  verifyEmail(): User {
    this.isVerified = true
    this.verified = new Date()
    this.verificationToken = null
    return this
  }

  isPasswordResetTokenValid(): boolean {
    return !!(this.passwordToken && 
           this.passwordTokenExpirationDate && 
           new Date() < this.passwordTokenExpirationDate)
  }

  clearPasswordResetToken(): User {
    this.passwordToken = null
    this.passwordTokenExpirationDate = null
    return this
  }

  toJSON(): any {
    const obj = super.toJSON()
    delete obj.password
    delete obj.hashedRefreshToken
    delete obj.passwordToken
    delete obj.verificationToken
    
    // Date alanlarını ISO string'e çevir
    if (this.verified) {
      obj.verified = this.verified instanceof Date ? this.verified.toISOString() : this.verified
    }
    if (this.passwordTokenExpirationDate) {
      obj.passwordTokenExpirationDate = this.passwordTokenExpirationDate instanceof Date 
        ? this.passwordTokenExpirationDate.toISOString() 
        : this.passwordTokenExpirationDate
    }
    
    if (obj.profilePic) {
      obj.profilePic = this.getParsedProfilePic()
    }
    return obj
  }

  toSafeJSON(): any {
    return {
      id: this.id,
      name: this.name,
      lastname: this.lastname,
      email: this.email,
      role: this.role,
      type: this.type,
      isVerified: this.isVerified,
      profilePic: this.getParsedProfilePic()
    }
  }
}

export default User
