import { BaseService } from './BaseService'
import { CompanyInfoRepository } from '../repositories/CompanyInfoRepository'
import { CompanyInfo } from '../entities/CompanyInfo'

/**
 * CompanyInfo Service
 */
export class CompanyInfoService extends BaseService {
  constructor() {
    const companyInfoRepository = new CompanyInfoRepository()
    super(companyInfoRepository)
  }

  /**
   * Şirket bilgisini getir
   */
  async getInfo(): Promise<CompanyInfo> {
    try {
      const data = await this.repository.findOne()
      
      if (!data) {
        const defaultData = {
          name: 'Şirket Adı',
          shortName: 'Şirket'
        }
        const created = await this.repository.createOrUpdate(defaultData)
        return new CompanyInfo(created)
      }
      
      return new CompanyInfo(data)
    } catch (error: any) {
      throw new Error(`Şirket bilgisi alınamadı: ${error.message}`)
    }
  }

  /**
   * Şirket bilgisini güncelle
   */
  async updateInfo(updateData: any): Promise<CompanyInfo> {
    try {
      const existing = await this.getInfo()

      const mergedData = {
        ...existing.toPlainObject(),
        ...updateData
      }

      const companyInfo = new CompanyInfo(mergedData)

      const validationErrors = companyInfo.validate()
      if (validationErrors.length > 0) {
        throw new Error(`Doğrulama hatası: ${validationErrors.join(', ')}`)
      }

      const updated = await this.repository.updateInfo(companyInfo.toPlainObject())
      return new CompanyInfo(updated)
    } catch (error: any) {
      if (error.message.startsWith('Doğrulama hatası')) {
        throw error
      }
      throw new Error(`Şirket bilgisi güncellenemedi: ${error.message}`)
    }
  }

  /**
   * Genel bilgileri güncelle
   */
  async updateGeneral(data: any): Promise<CompanyInfo> {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.shortName !== undefined) updateData.shortName = data.shortName
    return await this.updateInfo(updateData)
  }

  /**
   * İletişim bilgilerini güncelle
   */
  async updateContact(data: any): Promise<CompanyInfo> {
    const updateData: any = {}
    if (data.address !== undefined) updateData.address = data.address
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.phone2 !== undefined) updateData.phone2 = data.phone2
    if (data.phone3 !== undefined) updateData.phone3 = data.phone3
    if (data.email !== undefined) updateData.email = data.email
    return await this.updateInfo(updateData)
  }

  /**
   * Vergi bilgilerini güncelle
   */
  async updateTax(data: any): Promise<CompanyInfo> {
    const updateData: any = {}
    if (data.taxOffice !== undefined) updateData.taxOffice = data.taxOffice
    if (data.taxNumber !== undefined) updateData.taxNumber = data.taxNumber
    return await this.updateInfo(updateData)
  }

  /**
   * Banka bilgilerini güncelle
   */
  async updateBank(data: any): Promise<CompanyInfo> {
    const updateData: any = {}
    if (data.bank1Name !== undefined) updateData.bank1Name = data.bank1Name
    if (data.bank1AccountHolder !== undefined) updateData.bank1AccountHolder = data.bank1AccountHolder
    if (data.bank1AccountNumber !== undefined) updateData.bank1AccountNumber = data.bank1AccountNumber
    if (data.bank1IBAN !== undefined) updateData.bank1IBAN = data.bank1IBAN
    if (data.bank2Name !== undefined) updateData.bank2Name = data.bank2Name
    if (data.bank2AccountHolder !== undefined) updateData.bank2AccountHolder = data.bank2AccountHolder
    if (data.bank2AccountNumber !== undefined) updateData.bank2AccountNumber = data.bank2AccountNumber
    if (data.bank2IBAN !== undefined) updateData.bank2IBAN = data.bank2IBAN
    return await this.updateInfo(updateData)
  }

  /**
   * Logo ve Favicon güncelle
   */
  async updateLogo(data: any): Promise<CompanyInfo> {
    const updateData: any = {}
    if (data.logo !== undefined) updateData.logo = data.logo
    if (data.favicon !== undefined) updateData.favicon = data.favicon
    return await this.updateInfo(updateData)
  }
}

export default CompanyInfoService
