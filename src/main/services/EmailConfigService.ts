import { PrismaClient } from '@prisma/client'
import { BaseService } from './BaseService'
import { EmailConfigRepository } from '../repositories/EmailConfigRepository'
import { EmailConfig } from '../entities/EmailConfig'
import { getEncryptionUtil, EncryptionUtil } from '../utils/encryptionUtil'

/**
 * Email Config Service
 */
export class EmailConfigService extends BaseService {
  private encryptionUtil: EncryptionUtil

  constructor(prisma: PrismaClient) {
    const repository = new EmailConfigRepository(prisma)
    super(repository)
    this.encryptionUtil = getEncryptionUtil()
  }

  /**
   * Hassas verileri şifrele
   */
  encryptSensitiveData(config: any): any {
    if (config.password) {
      config.password = this.encryptionUtil.encrypt(config.password)
    }
    return config
  }

  /**
   * Hassas verileri çöz
   */
  decryptSensitiveData(config: any): any {
    if (config.password) {
      config.password = this.encryptionUtil.safeDecrypt(config.password)
    }
    return config
  }

  /**
   * Config dizisini çöz
   */
  decryptConfigsArray(configs: any[]): any[] {
    return configs.map(config => this.decryptSensitiveData(config))
  }

  /**
   * Aktif email yapılandırmasını getir
   */
  async findActive(): Promise<EmailConfig | null> {
    try {
      const config = await this.repository.findActive()
      if (!config) return null
      return this.decryptSensitiveData(config)
    } catch (error) {
      throw error
    }
  }

  /**
   * Tüm email yapılandırmalarını getir
   */
  async findAll(options: any = {}): Promise<any> {
    try {
      const result = await this.repository.findAll(options)
      result.configs = this.decryptConfigsArray(result.configs)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * ID ile email yapılandırması getir
   */
  async findById(id: number): Promise<EmailConfig | null> {
    try {
      const config = await this.repository.findById(id)
      return this.decryptSensitiveData(config)
    } catch (error) {
      throw error
    }
  }

  /**
   * Email yapılandırması oluştur
   */
  async create(emailConfigData: any): Promise<EmailConfig> {
    try {
      const emailConfig = new EmailConfig(emailConfigData)

      const validation = emailConfig.validateConfig()
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      const encryptedData = { ...emailConfigData }
      this.encryptSensitiveData(encryptedData)

      const created = await this.repository.create(encryptedData)
      return this.decryptSensitiveData(created)
    } catch (error) {
      throw error
    }
  }

  /**
   * Email yapılandırması güncelle
   */
  async update(id: number, emailConfigData: any): Promise<EmailConfig> {
    try {
      await this.repository.findById(id)

      const updateData = { ...emailConfigData }
      if (updateData.password) {
        this.encryptSensitiveData(updateData)
      }

      const updated = await this.repository.update(id, updateData)
      return this.decryptSensitiveData(updated)
    } catch (error) {
      throw error
    }
  }

  /**
   * Email yapılandırması sil
   */
  async delete(id: number): Promise<boolean> {
    try {
      return await this.repository.delete(id)
    } catch (error) {
      throw error
    }
  }

  /**
   * Email yapılandırmasını aktif yap
   */
  async setActive(id: number): Promise<EmailConfig> {
    try {
      const config = await this.repository.setActive(id)
      return this.decryptSensitiveData(config)
    } catch (error) {
      throw error
    }
  }
}

export default EmailConfigService
