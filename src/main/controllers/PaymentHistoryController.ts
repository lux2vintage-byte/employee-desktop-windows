import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import { PaymentHistoryService, CreatePaymentHistoryDto, UpdatePaymentHistoryDto } from '../services/PaymentHistoryService'
import { PaymentHistoryRepository, PaymentHistoryFilterOptions } from '../repositories/PaymentHistoryRepository'
import { getPrismaClient } from '../database/prisma-manager'

export class PaymentHistoryController extends BaseController {
  private service: PaymentHistoryService
  private prisma: PrismaClient

  constructor() {
    super()
    this.prisma = getPrismaClient()
    const repository = new PaymentHistoryRepository(this.prisma)
    this.service = new PaymentHistoryService(repository)
  }

  async getAll(options: PaymentHistoryFilterOptions = {}): Promise<any> {
    try {
      const result = await this.service.findAll(options)
      return this.paginated(result.data, result.total, result.page, result.limit)
    } catch (error) {
      return this.handleError(error, 'Ödeme geçmişi getirme')
    }
  }

  async getById(id: number): Promise<any> {
    try {
      const item = await this.service.findById(id)
      if (!item) return this.error(['Kayıt bulunamadı'], 404)
      return this.success(item)
    } catch (error) {
      return this.handleError(error, 'Kayıt getirme')
    }
  }

  async getByEmployee(employeeId: number, year?: number): Promise<any> {
    try {
      const items = await this.service.findByEmployee(employeeId, year)
      return this.success(items)
    } catch (error) {
      return this.handleError(error, 'Personel ödemeleri getirme')
    }
  }

  async create(data: CreatePaymentHistoryDto, userId?: number): Promise<any> {
    try {
      const item = await this.service.create(data, userId)
      return this.success(item, 'Ödeme kaydı başarıyla oluşturuldu')
    } catch (error) {
      return this.handleError(error, 'Ödeme kaydı oluşturma')
    }
  }

  async update(id: number, data: UpdatePaymentHistoryDto, userId?: number): Promise<any> {
    try {
      const item = await this.service.update(id, data, userId)
      return this.success(item, 'Ödeme kaydı başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Ödeme kaydı güncelleme')
    }
  }

  async delete(id: number, userId?: number): Promise<any> {
    try {
      await this.service.delete(id, userId)
      return this.success(null, 'Ödeme kaydı başarıyla silindi')
    } catch (error) {
      return this.handleError(error, 'Ödeme kaydı silme')
    }
  }

  async cancel(id: number, userId?: number): Promise<any> {
    try {
      const item = await this.service.cancel(id, userId)
      return this.success(item, 'Ödeme iptal edildi')
    } catch (error) {
      return this.handleError(error, 'Ödeme iptal etme')
    }
  }

  async getStatistics(startDate?: string, endDate?: string): Promise<any> {
    try {
      const start = startDate ? new Date(startDate) : undefined
      const end = endDate ? new Date(endDate) : undefined
      const stats = await this.service.getStatistics(start, end)
      return this.success(stats)
    } catch (error) {
      return this.handleError(error, 'İstatistikler getirme')
    }
  }

  async getEmployeePaymentSummary(employeeId: number, year: number): Promise<any> {
    try {
      const summary = await this.service.getEmployeePaymentSummary(employeeId, year)
      return this.success(summary)
    } catch (error) {
      return this.handleError(error, 'Personel ödeme özeti getirme')
    }
  }

  async recordSalaryPayment(employeeId: number, payrollId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: any, userId?: number): Promise<any> {
    try {
      const item = await this.service.recordSalaryPayment(employeeId, payrollId, amount, paymentMethod, bankDetails, userId)
      return this.success(item, 'Maaş ödemesi kaydedildi')
    } catch (error) {
      return this.handleError(error, 'Maaş ödemesi kaydetme')
    }
  }

  async recordAdvancePayment(employeeId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: any, userId?: number): Promise<any> {
    try {
      const item = await this.service.recordAdvancePayment(employeeId, amount, paymentMethod, bankDetails, userId)
      return this.success(item, 'Avans ödemesi kaydedildi')
    } catch (error) {
      return this.handleError(error, 'Avans ödemesi kaydetme')
    }
  }
}

export default PaymentHistoryController
