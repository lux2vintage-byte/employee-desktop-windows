import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { SalaryService, CreateSalaryDto, BusinessRuleError, ValidationError } from '../services/SalaryService'
import { SalaryHistoryRepository, SalaryHistoryFilterOptions } from '../repositories/SalaryHistoryRepository'
import { AuditLoggerService } from '../services/AuditLoggerService'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * Salary Controller
 * Maaş geçmişi CRUD operasyonları
 * Requirements: 12.1-12.8
 */
export class SalaryController extends BaseController {
  private service: SalaryService
  private repository: SalaryHistoryRepository
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    this.repository = new SalaryHistoryRepository(this.prisma)
    const auditLogger = new AuditLoggerService(this.prisma)
    this.service = new SalaryService(this.repository)
  }

  /**
   * Maaş kaydı oluştur
   * Requirements: 12.2, 12.3, 12.4, 12.6
   */
  async create(employeeId: number, data: CreateSalaryDto, userId?: number): Promise<any> {
    try {
      const salary = await this.service.create(employeeId, data, userId)
      return this.success(salary, 'Maaş kaydı başarıyla oluşturuldu')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Maaş kaydı oluşturma')
    }
  }

  /**
   * Maaş kaydı getir
   */
  async getById(id: number): Promise<any> {
    try {
      const salary = await this.service.findById(id)
      if (!salary) {
        return this.error(['Maaş kaydı bulunamadı'], 404)
      }
      return this.success(salary)
    } catch (error) {
      return this.handleError(error, 'Maaş kaydı getirme')
    }
  }

  /**
   * Personelin güncel maaşını getir
   * Requirements: 12.5, 12.7
   */
  async getCurrentSalary(employeeId: number): Promise<any> {
    try {
      const salary = await this.service.getCurrentSalary(employeeId)
      if (!salary) {
        return this.error(['Güncel maaş kaydı bulunamadı'], 404)
      }
      return this.success(salary)
    } catch (error) {
      return this.handleError(error, 'Güncel maaş getirme')
    }
  }

  /**
   * Personelin maaş geçmişini getir
   * Requirements: 12.8
   */
  async getHistory(employeeId: number): Promise<any> {
    try {
      const history = await this.service.getHistory(employeeId)
      return this.success(history)
    } catch (error) {
      return this.handleError(error, 'Maaş geçmişi getirme')
    }
  }

  /**
   * Tüm maaş kayıtlarını getir
   */
  async getAll(options: SalaryHistoryFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(
        result.data,
        result.total,
        result.page,
        result.limit
      )
    } catch (error) {
      return this.handleError(error, 'Maaş kayıtları listesi getirme')
    }
  }

  /**
   * Maaş güncelle (yeni kayıt oluşturarak)
   * Requirements: 12.4, 12.8
   */
  async updateSalary(employeeId: number, newAmount: number, effectiveDate: Date, userId?: number): Promise<any> {
    try {
      const salary = await this.service.updateSalary(employeeId, newAmount, effectiveDate, userId)
      return this.success(salary, 'Maaş başarıyla güncellendi')
    } catch (error) {
      if (error instanceof BusinessRuleError || error instanceof ValidationError) {
        return this.error([error.message])
      }
      return this.handleError(error, 'Maaş güncelleme')
    }
  }

  /**
   * Belirli bir tarihteki maaşı getir
   */
  async getSalaryAtDate(employeeId: number, date: Date): Promise<any> {
    try {
      const salary = await this.service.getSalaryAtDate(employeeId, date)
      if (!salary) {
        return this.error(['Belirtilen tarihte maaş kaydı bulunamadı'], 404)
      }
      return this.success(salary)
    } catch (error) {
      return this.handleError(error, 'Tarihe göre maaş getirme')
    }
  }

  /**
   * Saatlik ücreti hesapla
   */
  async calculateHourlyRate(monthlySalary: number, workingDaysPerMonth?: number, hoursPerDay?: number): Promise<any> {
    try {
      const hourlyRate = this.service.calculateHourlyRate(monthlySalary, workingDaysPerMonth, hoursPerDay)
      return this.success({ hourlyRate })
    } catch (error) {
      return this.handleError(error, 'Saatlik ücret hesaplama')
    }
  }

  /**
   * Günlük ücreti hesapla
   */
  async calculateDailyRate(monthlySalary: number, daysPerMonth?: number): Promise<any> {
    try {
      const dailyRate = this.service.calculateDailyRate(monthlySalary, daysPerMonth)
      return this.success({ dailyRate })
    } catch (error) {
      return this.handleError(error, 'Günlük ücret hesaplama')
    }
  }
}

export default SalaryController
