import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { ReportService } from '../services/ReportService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Report Controller
 * Raporlama ve analiz operasyonları
 */
export class ReportController extends BaseController {
  private service: ReportService
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.service = new ReportService(this.prisma)
  }

  // ==================== PERSONEL DAĞILIM RAPORU ====================

  /**
   * Personel dağılım raporu - tüm kategoriler
   */
  async getEmployeeDistribution(): Promise<any> {
    try {
      const [byDepartment, byGender, byAge, byContractType, byEducation, bySeniority] = await Promise.all([
        this.service.getEmployeeDistributionByDepartment(),
        this.service.getEmployeeDistributionByGender(),
        this.service.getEmployeeDistributionByAge(),
        this.service.getEmployeeDistributionByContractType(),
        this.service.getEmployeeDistributionByEducation(),
        this.service.getEmployeeDistributionBySeniority()
      ])

      const totalEmployees = byDepartment.reduce((sum, d) => sum + d.count, 0)

      return this.success({
        totalEmployees,
        byDepartment,
        byGender,
        byAge,
        byContractType,
        byEducation,
        bySeniority
      })
    } catch (error) {
      return this.handleError(error, 'Personel dağılım raporu')
    }
  }

  /**
   * Departman bazlı personel dağılımı
   */
  async getDistributionByDepartment(): Promise<any> {
    try {
      const data = await this.service.getEmployeeDistributionByDepartment()
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'Departman dağılımı')
    }
  }

  /**
   * Cinsiyet bazlı personel dağılımı
   */
  async getDistributionByGender(): Promise<any> {
    try {
      const data = await this.service.getEmployeeDistributionByGender()
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'Cinsiyet dağılımı')
    }
  }

  /**
   * Yaş bazlı personel dağılımı
   */
  async getDistributionByAge(): Promise<any> {
    try {
      const data = await this.service.getEmployeeDistributionByAge()
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'Yaş dağılımı')
    }
  }

  // ==================== PERSONEL MALİYET RAPORU ====================

  /**
   * Aylık maliyet raporu
   */
  async getMonthlyCostReport(year: number, month: number): Promise<any> {
    try {
      const data = await this.service.getMonthlyCostReport(year, month)
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'Aylık maliyet raporu')
    }
  }

  /**
   * Yıllık maliyet raporu
   */
  async getYearlyCostReport(year: number): Promise<any> {
    try {
      const data = await this.service.getYearlyCostReport(year)
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'Yıllık maliyet raporu')
    }
  }

  // ==================== TURNOVER RAPORU ====================

  /**
   * Personel devir hızı raporu
   */
  async getTurnoverReport(year: number): Promise<any> {
    try {
      const data = await this.service.getTurnoverReport(year)
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'Turnover raporu')
    }
  }

  // ==================== İZİN KULLANIM RAPORU ====================

  /**
   * İzin kullanım raporu
   */
  async getLeaveUsageReport(year: number): Promise<any> {
    try {
      const data = await this.service.getLeaveUsageReport(year)
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'İzin kullanım raporu')
    }
  }

  // ==================== BORDRO ÖZET RAPORU ====================

  /**
   * Bordro özet raporu
   */
  async getPayrollSummaryReport(year: number, month?: number): Promise<any> {
    try {
      const data = await this.service.getPayrollSummaryReport(year, month)
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'Bordro özet raporu')
    }
  }

  // ==================== SGK / İŞKUR RAPORLARI ====================

  /**
   * SGK bildirim raporu
   */
  async getSGKReport(year: number, month: number): Promise<any> {
    try {
      const data = await this.service.getSGKReport(year, month)
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'SGK raporu')
    }
  }

  /**
   * İşkur bildirim raporu
   */
  async getIskurReport(year: number, month: number): Promise<any> {
    try {
      const data = await this.service.getIskurReport(year, month)
      return this.success(data)
    } catch (error) {
      return this.handleError(error, 'İşkur raporu')
    }
  }
}

export default ReportController
