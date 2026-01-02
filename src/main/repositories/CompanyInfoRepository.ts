import { BaseRepository } from './BaseRepository'
import { getPrisma } from '../database/config'
import { CompanyInfo } from '@prisma/client'

/**
 * CompanyInfo Repository
 */
export class CompanyInfoRepository extends BaseRepository<CompanyInfo> {
  constructor() {
    const prisma = getPrisma()
    super(prisma, 'companyInfo', false) // CompanyInfo soft delete desteklemiyor
  }

  /**
   * Model'e erişim (override)
   */
  get model(): any {
    return this.prisma.companyInfo
  }

  /**
   * Data temizleme (prisma için)
   */
  private _cleanData(data: any): any {
    const cleaned = { ...data }
    
    // ID ve timestamp alanlarını kaldır
    delete cleaned.id
    delete cleaned.createdAt
    delete cleaned.updatedAt
    delete cleaned.createdBy
    delete cleaned.updatedBy
    delete cleaned.deletedAt
    delete cleaned.deletedBy
    
    // Boş string'leri null yap (opsiyonel alanlar için)
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === '') {
        cleaned[key] = null
      }
    })
    
    return cleaned
  }

  /**
   * Şirket bilgisini getir (tek kayıt olduğu için)
   */
  async findOne(): Promise<any | null> {
    try {
      const result = await this.model.findFirst()
      // Prisma objesini plain object'e çevir (IPC serialize için)
      return result ? JSON.parse(JSON.stringify(result)) : null
    } catch (error: any) {
      throw new Error(`Şirket bilgisi okunamadı: ${error.message}`)
    }
  }

  /**
   * Şirket bilgisi oluştur veya güncelle
   */
  async createOrUpdate(data: any): Promise<any> {
    try {
      const cleanedData = this._cleanData(data)
      const existing = await this.model.findFirst()

      let result
      if (existing) {
        result = await this.model.update({
          where: { id: existing.id },
          data: cleanedData
        })
      } else {
        result = await this.model.create({
          data: cleanedData
        })
      }
      // Prisma objesini plain object'e çevir
      return JSON.parse(JSON.stringify(result))
    } catch (error: any) {
      throw new Error(`Şirket bilgisi kaydedilemedi: ${error.message}`)
    }
  }

  /**
   * Şirket bilgisini güncelle
   */
  async updateInfo(data: any): Promise<any> {
    try {
      const cleanedData = this._cleanData(data)
      const existing = await this.model.findFirst()

      let result
      if (!existing) {
        // Kayıt yoksa oluştur
        result = await this.model.create({
          data: cleanedData
        })
      } else {
        result = await this.model.update({
          where: { id: existing.id },
          data: cleanedData
        })
      }
      // Prisma objesini plain object'e çevir
      return JSON.parse(JSON.stringify(result))
    } catch (error: any) {
      throw new Error(`Şirket bilgisi güncellenemedi: ${error.message}`)
    }
  }
}

export default CompanyInfoRepository
