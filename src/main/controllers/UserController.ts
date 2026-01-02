import { BaseController } from './BaseController'
import { UserService } from '../services/UserService'
import { ValidationUtils } from '../utils/validation'

/**
 * Kullanıcı Controller
 */
export class UserController extends BaseController {
  private userService: UserService

  constructor() {
    super()
    this.userService = new UserService()
  }

  /**
   * Kullanıcı oluştur
   */
  async create(userData: any): Promise<any> {
    try {
      const validation = ValidationUtils.validateCreateUser(userData)
      if (!validation.isValid) {
        return this.validationError(validation.errors)
      }

      const existingUser = await this.userService.findByEmail(userData.email)
      if (existingUser) {
        return this.error(['Bu e-posta adresi zaten kullanılıyor'])
      }

      const user = await this.userService.create(userData)
      return this.success(user, 'Kullanıcı başarıyla oluşturuldu')
    } catch (error) {
      return this.handleError(error, 'Kullanıcı oluşturma')
    }
  }

  /**
   * Kullanıcı getir
   */
  async getById(id: number): Promise<any> {
    try {
      const user = await this.userService.findById(id)
      if (!user) {
        return this.error(['Kullanıcı bulunamadı'])
      }
      return this.success(user)
    } catch (error) {
      return this.handleError(error, 'Kullanıcı getirme')
    }
  }

  /**
   * Tüm kullanıcıları getir
   */
  async getAll(options: any = {}): Promise<any> {
    try {
      const result = await this.userService.findAll(options)
      return this.paginated(
        result.users,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Kullanıcı listesi getirme')
    }
  }

  /**
   * Kullanıcı güncelle
   */
  async update(id: number, userData: any): Promise<any> {
    try {
      const validation = ValidationUtils.validateUpdateUser(userData)
      if (!validation.isValid) {
        return this.validationError(validation.errors)
      }

      if (userData.email) {
        const existingUser = await this.userService.findByEmail(userData.email)
        if (existingUser && existingUser.id !== id) {
          return this.error(['Bu e-posta adresi zaten kullanılıyor'])
        }
      }

      const user = await this.userService.update(id, userData)
      return this.success(user, 'Kullanıcı başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Kullanıcı güncelleme')
    }
  }

  /**
   * Kullanıcı sil
   */
  async delete(id: number): Promise<any> {
    try {
      await this.userService.delete(id)
      return this.success(null, 'Kullanıcı başarıyla silindi')
    } catch (error) {
      return this.handleError(error, 'Kullanıcı silme')
    }
  }

  /**
   * Şifremi unuttum
   */
  async forgotPassword(email: string): Promise<any> {
    try {
      const result = await this.userService.forgotPassword(email)
      if (!result.success) {
        return this.error(result.errors || [])
      }
      return this.success(null, 'Geçici şifreniz e-posta adresinize gönderildi')
    } catch (error) {
      return this.handleError(error, 'Şifre sıfırlama')
    }
  }

  /**
   * Şifre değiştir
   */
  async changePassword(id: number, currentPassword: string, newPassword: string): Promise<any> {
    try {
      const result = await this.userService.changePassword(id, currentPassword, newPassword)
      if (!result.success) {
        return this.error(result.errors || [])
      }
      return this.success(null, 'Şifre başarıyla değiştirildi')
    } catch (error) {
      return this.handleError(error, 'Şifre değiştirme')
    }
  }

  /**
   * Giriş yap
   */
  async login(email: string, password: string): Promise<any> {
    try {
      const result = await this.userService.login(email, password)
      if (!result.success) {
        return this.error(result.errors || [])
      }
      return this.success(result.user, 'Giriş başarılı')
    } catch (error) {
      return this.handleError(error, 'Giriş')
    }
  }

  /**
   * Profil getir
   */
  async getProfile(userId: number): Promise<any> {
    try {
      const user = await this.userService.findById(userId)
      if (!user) {
        return this.error(['Kullanıcı bulunamadı'])
      }
      return this.success(user)
    } catch (error) {
      return this.handleError(error, 'Profil getirme')
    }
  }

  /**
   * Profil güncelle
   */
  async updateProfile(userId: number, profileData: any): Promise<any> {
    try {
      if (profileData.email) {
        const existingUser = await this.userService.findByEmail(profileData.email)
        if (existingUser && existingUser.id !== userId) {
          return this.error(['Bu e-posta adresi zaten kullanılıyor'])
        }
      }

      const user = await this.userService.update(userId, profileData)
      return this.success(user, 'Profil başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Profil güncelleme')
    }
  }
}

export default UserController
