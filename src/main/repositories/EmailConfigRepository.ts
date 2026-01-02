import { PrismaClient } from '@prisma/client'
import { EmailConfig } from '../entities/EmailConfig'

export interface EmailConfigFindAllOptions {
  page?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

export interface EmailConfigFindAllResult {
  configs: EmailConfig[]
  total: number
  page: number
  limit: number
}

/**
 * Email Config Repository
 */
export class EmailConfigRepository {
  protected prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * ID ile email yapılandırması getir
   */
  async findById(id: number): Promise<EmailConfig | null> {
    try {
      const data = await this.prisma.emailConfig.findUnique({
        where: { id }
      })

      if (!data) return null
      return new EmailConfig(data)
    } catch (error: any) {
      throw new Error(`Email yapılandırması getirme hatası: ${error.message}`)
    }
  }

  /**
   * Aktif email yapılandırmasını getir
   */
  async findActive(): Promise<EmailConfig | null> {
    try {
      const data = await this.prisma.emailConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })

      if (!data) return null
      return new EmailConfig(data)
    } catch (error: any) {
      throw new Error(`Aktif email yapılandırması getirme hatası: ${error.message}`)
    }
  }

  /**
   * Tüm email yapılandırmalarını getir
   */
  async findAll(options: EmailConfigFindAllOptions = {}): Promise<EmailConfigFindAllResult> {
    try {
      const { page = 1, limit = 10, orderBy = 'createdAt', order = 'desc' } = options
      const skip = (page - 1) * limit

      const [data, total] = await Promise.all([
        this.prisma.emailConfig.findMany({
          skip,
          take: limit,
          orderBy: { [orderBy]: order }
        }),
        this.prisma.emailConfig.count()
      ])

      return {
        configs: data.map(item => new EmailConfig(item)),
        total,
        page,
        limit
      }
    } catch (error: any) {
      throw new Error(`Email yapılandırmaları listeleme hatası: ${error.message}`)
    }
  }

  /**
   * Email config oluştur
   */
  async create(emailConfigData: any): Promise<EmailConfig> {
    try {
      if (emailConfigData.isActive) {
        await this.deactivateAll()
      }

      const count = await this.prisma.emailConfig.count()
      if (count === 0) {
        emailConfigData.isActive = true
      }

      const data = await this.prisma.emailConfig.create({
        data: emailConfigData
      })

      return new EmailConfig(data)
    } catch (error: any) {
      throw new Error(`Email yapılandırması oluşturma hatası: ${error.message}`)
    }
  }

  /**
   * Email config güncelle
   */
  async update(id: number, emailConfigData: any): Promise<EmailConfig> {
    try {
      if (emailConfigData.isActive) {
        await this.deactivateAll(id)
      }

      if (emailConfigData.isActive === false) {
        const current = await this.findById(id)
        if (current && current.isActive) {
          const activeCount = await this.prisma.emailConfig.count({
            where: { isActive: true }
          })
          if (activeCount <= 1) {
            throw new Error('Son aktif email yapılandırması pasif yapılamaz')
          }
        }
      }

      const data = await this.prisma.emailConfig.update({
        where: { id },
        data: emailConfigData
      })

      return new EmailConfig(data)
    } catch (error: any) {
      throw new Error(`Email yapılandırması güncelleme hatası: ${error.message}`)
    }
  }

  /**
   * Email config sil
   */
  async delete(id: number): Promise<boolean> {
    try {
      const config = await this.findById(id)
      if (config && config.isActive) {
        throw new Error('Aktif email yapılandırması silinemez. Önce başka bir yapılandırmayı aktif yapın.')
      }

      await this.prisma.emailConfig.delete({
        where: { id }
      })

      return true
    } catch (error: any) {
      throw new Error(`Email yapılandırması silme hatası: ${error.message}`)
    }
  }

  /**
   * Belirli bir config'i aktif yap
   */
  async setActive(id: number): Promise<EmailConfig> {
    try {
      await this.deactivateAll(id)

      const data = await this.prisma.emailConfig.update({
        where: { id },
        data: { isActive: true }
      })

      return new EmailConfig(data)
    } catch (error: any) {
      throw new Error(`Email yapılandırması aktif yapma hatası: ${error.message}`)
    }
  }

  /**
   * Tüm email config'leri pasif yap (belirtilen id hariç)
   */
  async deactivateAll(excludeId: number | null = null): Promise<void> {
    try {
      const where: any = excludeId ? { id: { not: excludeId } } : {}

      await this.prisma.emailConfig.updateMany({
        where: {
          ...where,
          isActive: true
        },
        data: { isActive: false }
      })
    } catch (error: any) {
      throw new Error(`Email yapılandırmalarını pasif yapma hatası: ${error.message}`)
    }
  }
}

export default EmailConfigRepository
