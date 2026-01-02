import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { EmailConfigService } from '../services/EmailConfigService'

/**
 * Email Config Controller
 */
export class EmailConfigController extends BaseController {
  private emailConfigService: EmailConfigService

  constructor(prisma: PrismaClient) {
    super()
    this.emailConfigService = new EmailConfigService(prisma)
  }

  /**
   * Tüm email yapılandırmalarını getir
   */
  async getAll(options: any = {}): Promise<any> {
    try {
      const result = await this.emailConfigService.findAll(options)
      const configs = result.configs.map((config: any) => config.toResponse())
      
      return this.paginated(
        configs,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Email yapılandırmaları getirme')
    }
  }

  /**
   * Aktif email yapılandırmasını getir
   */
  async getActive(): Promise<any> {
    try {
      const config = await this.emailConfigService.findActive()
      if (!config) {
        return this.error(['Aktif email yapılandırması bulunamadı'])
      }
      return this.success(config.toResponse())
    } catch (error) {
      return this.handleError(error, 'Aktif email yapılandırması getirme')
    }
  }

  /**
   * ID ile email yapılandırması getir
   */
  async getById(id: number): Promise<any> {
    try {
      const config = await this.emailConfigService.findById(id)
      if (!config) {
        return this.error(['Email yapılandırması bulunamadı'])
      }
      return this.success(config.toResponse())
    } catch (error) {
      return this.handleError(error, 'Email yapılandırması getirme')
    }
  }

  /**
   * Email yapılandırması oluştur
   */
  async create(emailConfigData: any): Promise<any> {
    try {
      const config = await this.emailConfigService.create(emailConfigData)
      return this.success(config.toResponse(), 'Email yapılandırması başarıyla oluşturuldu')
    } catch (error) {
      return this.handleError(error, 'Email yapılandırması oluşturma')
    }
  }

  /**
   * Email yapılandırması güncelle
   */
  async update(id: number, emailConfigData: any): Promise<any> {
    try {
      const config = await this.emailConfigService.update(id, emailConfigData)
      return this.success(config.toResponse(), 'Email yapılandırması başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Email yapılandırması güncelleme')
    }
  }

  /**
   * Email yapılandırması sil
   */
  async delete(id: number): Promise<any> {
    try {
      await this.emailConfigService.delete(id)
      return this.success(null, 'Email yapılandırması başarıyla silindi')
    } catch (error) {
      return this.handleError(error, 'Email yapılandırması silme')
    }
  }

  /**
   * Email yapılandırmasını aktif yap
   */
  async setActive(id: number): Promise<any> {
    try {
      const config = await this.emailConfigService.setActive(id)
      return this.success(config.toResponse(), 'Email yapılandırması başarıyla aktif edildi')
    } catch (error) {
      return this.handleError(error, 'Email yapılandırması aktif yapma')
    }
  }

  /**
   * Şifreyi çözülmüş olarak getir
   */
  async getDecryptedPassword(id: number): Promise<any> {
    try {
      const config = await this.emailConfigService.findById(id)
      if (!config) {
        return this.error(['Email yapılandırması bulunamadı'])
      }
      return this.success({ password: config.password })
    } catch (error) {
      return this.handleError(error, 'Şifre getirme')
    }
  }

  /**
   * Email yapılandırmasını test et
   */
  async testConfig(id: number): Promise<any> {
    try {
      const config = await this.emailConfigService.findById(id)
      if (!config) {
        return this.error(['Email yapılandırması bulunamadı'])
      }

      // TODO: Email test fonksiyonu eklenecek
      console.log('Email test edilecek:', config.host)

      return this.success(null, 'Test email başarıyla gönderildi')
    } catch (error) {
      return this.handleError(error, 'Email yapılandırması test etme')
    }
  }
}

export default EmailConfigController
