import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { PayrollService, CreatePayrollItemDto, BusinessRuleError, ValidationError } from '../services/PayrollService'
import { PayrollRepository, PayrollFilterOptions } from '../repositories/PayrollRepository'
import { PayrollItemRepository } from '../repositories/PayrollItemRepository'
import { SalaryHistoryRepository } from '../repositories/SalaryHistoryRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Payroll Controller
 * Bordro CRUD operasyonları
 * Requirements: 13.1-13.8, 14.1-14.7
 */
export class PayrollController extends BaseController {
  private service: PayrollService
  private payrollRepository: PayrollRepository
  private payrollItemRepository: PayrollItemRepository
  private salaryRepository: SalaryHistoryRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.payrollRepository = new PayrollRepository(this.prisma)
    this.payrollItemRepository = new PayrollItemRepository(this.prisma)
    this.salaryRepository = new SalaryHistoryRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.payrollRepository.setAuditLogger(auditLogger)
    
    this.service = new PayrollService(
      this.payrollRepository,
      this.payrollItemRepository,
      this.salaryRepository
    )
  }

  /**
   * Bordro oluştur
   * Requirements: 13.1, 13.2, 13.3
   */
  async generate(employeeId: number, periodMonth: number, periodYear: number, userId?: number): Promise<any> {
    try {
      const payroll = await this.service.generate(employeeId, periodMonth, periodYear, userId)
      return this.success(payroll, 'Bordro başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Bordro oluşturma')
    }
  }

  /**
   * Toplu bordro oluştur
   * Requirements: 13.1
   */
  async generateBulk(periodMonth: number, periodYear: number, userId?: number): Promise<any> {
    try {
      const payrolls = await this.service.generateBulk(periodMonth, periodYear, userId)
      return this.success(payrolls, `${payrolls.length} bordro başarıyla oluşturuldu`)
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Toplu bordro oluşturma')
    }
  }

  /**
   * Bordro getir
   */
  async getById(id: number): Promise<any> {
    try {
      const payroll = await this.service.findById(id)
      if (!payroll) {
        return this.error(['Bordro bulunamadı'], 404)
      }
      return this.success(payroll)
    } catch (error) {
      return this.handleError(error, 'Bordro getirme')
    }
  }

  /**
   * Personel ve dönem ile bordro getir
   */
  async getByEmployeeAndPeriod(employeeId: number, periodMonth: number, periodYear: number): Promise<any> {
    try {
      const payroll = await this.service.findByEmployeeAndPeriod(employeeId, periodMonth, periodYear)
      if (!payroll) {
        return this.error(['Bordro bulunamadı'], 404)
      }
      return this.success(payroll)
    } catch (error) {
      return this.handleError(error, 'Bordro getirme')
    }
  }

  /**
   * Tüm bordroları getir
   */
  async getAll(options: PayrollFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Bordro listesi getirme')
    }
  }

  /**
   * Personel bazlı bordroları getir
   */
  async getByEmployee(employeeId: number, year?: number): Promise<any> {
    try {
      const payrolls = await this.service.getByEmployee(employeeId, year)
      return this.success(payrolls)
    } catch (error) {
      return this.handleError(error, 'Personel bordroları getirme')
    }
  }

  /**
   * Dönem bazlı bordroları getir
   */
  async getByPeriod(periodMonth: number, periodYear: number): Promise<any> {
    try {
      const payrolls = await this.service.getByPeriod(periodMonth, periodYear)
      return this.success(payrolls)
    } catch (error) {
      return this.handleError(error, 'Dönem bordroları getirme')
    }
  }

  /**
   * Bordroyu kesinleştir
   * Requirements: 13.4
   */
  async finalize(payrollId: number, userId?: number): Promise<any> {
    try {
      const payroll = await this.service.finalize(payrollId, userId)
      return this.success(payroll, 'Bordro başarıyla kesinleştirildi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Bordro kesinleştirme')
    }
  }

  /**
   * Bordro kalemi ekle
   * Requirements: 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
   */
  async addItem(payrollId: number, item: CreatePayrollItemDto, userId?: number): Promise<any> {
    try {
      const payrollItem = await this.service.addItem(payrollId, item, userId)
      return this.success(payrollItem, 'Bordro kalemi başarıyla eklendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Bordro kalemi ekleme')
    }
  }

  /**
   * Bordro kalemini sil
   * Requirements: 14.5, 14.7
   */
  async removeItem(itemId: number, userId?: number): Promise<any> {
    try {
      await this.service.removeItem(itemId, userId)
      return this.success(null, 'Bordro kalemi başarıyla silindi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Bordro kalemi silme')
    }
  }

  /**
   * Bordro kalemlerini getir
   */
  async getItems(payrollId: number): Promise<any> {
    try {
      const items = await this.service.getItems(payrollId)
      return this.success(items)
    } catch (error) {
      return this.handleError(error, 'Bordro kalemleri getirme')
    }
  }

  /**
   * Dönem istatistiklerini getir
   */
  async getPeriodStatistics(periodMonth: number, periodYear: number): Promise<any> {
    try {
      const statistics = await this.service.getPeriodStatistics(periodMonth, periodYear)
      return this.success(statistics)
    } catch (error) {
      return this.handleError(error, 'Dönem istatistikleri getirme')
    }
  }

  /**
   * Net maaş hesapla
   * Requirements: 13.3
   */
  async calculateNetSalary(baseSalary: number, totalAdditions: number, totalDeductions: number): Promise<any> {
    try {
      const netSalary = this.service.calculateNetSalary(baseSalary, totalAdditions, totalDeductions)
      return this.success({ netSalary })
    } catch (error) {
      return this.handleError(error, 'Net maaş hesaplama')
    }
  }
}

export default PayrollController
