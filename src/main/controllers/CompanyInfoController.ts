import { BaseController } from './BaseController'
import { CompanyInfoService } from '../services/CompanyInfoService'

/**
 * CompanyInfo Controller
 */
export class CompanyInfoController extends BaseController {
  private companyInfoService: CompanyInfoService

  constructor() {
    super()
    this.companyInfoService = new CompanyInfoService()
  }

  /**
   * Şirket bilgisini getir
   */
  async getInfo(): Promise<any> {
    try {
      const companyInfo = await this.companyInfoService.getInfo()
      return this.success(companyInfo.toDetailedInfo())
    } catch (error) {
      return this.handleError(error, 'Şirket bilgisi getirme')
    }
  }

  /**
   * Şirket bilgisini güncelle
   */
  async update(updateData: any): Promise<any> {
    try {
      const companyInfo = await this.companyInfoService.updateInfo(updateData)
      return this.success(companyInfo.toDetailedInfo(), 'Şirket bilgisi başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Şirket bilgisi güncelleme')
    }
  }

  /**
   * Genel bilgileri güncelle
   */
  async updateGeneral(data: any): Promise<any> {
    try {
      const companyInfo = await this.companyInfoService.updateGeneral(data)
      return this.success(companyInfo.toDetailedInfo(), 'Genel bilgiler başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Genel bilgiler güncelleme')
    }
  }

  /**
   * İletişim bilgilerini güncelle
   */
  async updateContact(data: any): Promise<any> {
    try {
      const companyInfo = await this.companyInfoService.updateContact(data)
      return this.success(companyInfo.toDetailedInfo(), 'İletişim bilgileri başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'İletişim bilgileri güncelleme')
    }
  }

  /**
   * Vergi bilgilerini güncelle
   */
  async updateTax(data: any): Promise<any> {
    try {
      const companyInfo = await this.companyInfoService.updateTax(data)
      return this.success(companyInfo.toDetailedInfo(), 'Vergi bilgileri başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Vergi bilgileri güncelleme')
    }
  }

  /**
   * Banka bilgilerini güncelle
   */
  async updateBank(data: any): Promise<any> {
    try {
      const companyInfo = await this.companyInfoService.updateBank(data)
      return this.success(companyInfo.toDetailedInfo(), 'Banka bilgileri başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Banka bilgileri güncelleme')
    }
  }

  /**
   * Logo ve Favicon güncelle
   */
  async updateLogo(data: any): Promise<any> {
    try {
      const companyInfo = await this.companyInfoService.updateLogo(data)
      return this.success(companyInfo.toDetailedInfo(), 'Logo ve favicon başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Logo ve favicon güncelleme')
    }
  }
}

export default CompanyInfoController
