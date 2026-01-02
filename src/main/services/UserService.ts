import { BaseService } from './BaseService'
import { UserRepository } from '../repositories/UserRepository'
import { User } from '../entities/User'
import { PasswordUtils } from '../utils/password'
import * as crypto from 'crypto'

interface ForgotPasswordResult {
  success: boolean
  errors?: string[]
}

interface ChangePasswordResult {
  success: boolean
  errors?: string[]
}

interface LoginResult {
  success: boolean
  errors?: string[]
  user?: any
}

/**
 * Kullanıcı Service
 */
export class UserService extends BaseService {
  constructor() {
    const userRepository = new UserRepository()
    super(userRepository)
  }

  /**
   * Kullanıcı oluştur
   */
  async create(userData: any): Promise<User> {
    const user = new User(userData)

    const validationErrors = user.validate()
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '))
    }

    await user.hashPassword()

    const userDataForSave = {
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      password: user.password,
      phone: user.phone,
      role: user.role,
      type: user.type || 'INDIVIDUAL',
      isVerified: user.isVerified || false
    }

    const savedUser = await this.repository.create(userDataForSave)
    return new User(savedUser)
  }

  /**
   * Email ile kullanıcı bul
   */
  async findByEmail(email: string): Promise<User | null> {
    const userData = await this.repository.findByEmail(email)
    return userData ? new User(userData) : null
  }

  /**
   * ID ile kullanıcı bul
   */
  async findById(id: number): Promise<User | null> {
    const userData = await this.repository.findById(id)
    return userData ? new User(userData) : null
  }

  /**
   * Şifremi unuttum
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    try {
      const user = await this.repository.findByEmailWithPassword(email)
      
      if (!user) {
        return { success: false, errors: ['Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı'] }
      }

      const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase()
      const hashedTempPassword = await PasswordUtils.hashPassword(tempPassword)

      await this.repository.updatePassword(user.id, hashedTempPassword)

      // TODO: Email gönderimi eklenecek
      console.log(`Geçici şifre: ${tempPassword} - Email: ${user.email}`)

      return { success: true }
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error)
      return { success: false, errors: ['Şifre sıfırlama işlemi başarısız oldu'] }
    }
  }

  /**
   * Şifre değiştir
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
    const user = await this.repository.findByEmailWithPassword(userId)
    
    if (!user) {
      return { success: false, errors: ['Kullanıcı bulunamadı'] }
    }

    const isCurrentPasswordValid = await PasswordUtils.comparePassword(currentPassword, user.password)
    
    if (!isCurrentPasswordValid) {
      return { success: false, errors: ['Mevcut şifre yanlış'] }
    }

    const hashedNewPassword = await PasswordUtils.hashPassword(newPassword)
    await this.repository.updatePassword(user.id, hashedNewPassword)

    return { success: true }
  }

  /**
   * Giriş yap
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.repository.findByEmailWithPassword(email)
    
    if (!user) {
      return { success: false, errors: ['E-posta veya şifre yanlış'] }
    }

    const isPasswordValid = await PasswordUtils.comparePassword(password, user.password)
    
    if (!isPasswordValid) {
      return { success: false, errors: ['E-posta veya şifre yanlış'] }
    }

    const { password: _, ...userWithoutPassword } = user
    return { success: true, user: userWithoutPassword }
  }

  /**
   * Kullanıcı güncelle
   */
  async update(id: number, userData: any): Promise<any> {
    const updateData = { ...userData }

    if (updateData.password) {
      updateData.password = await PasswordUtils.hashPassword(updateData.password)
    }

    return await this.repository.update(id, updateData)
  }

  /**
   * Şifre güncelle
   */
  async updatePassword(id: number, hashedPassword: string): Promise<any> {
    return await this.repository.updatePassword(id, hashedPassword)
  }
}

export default UserService
