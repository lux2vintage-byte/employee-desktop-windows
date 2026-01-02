import { PaymentHistoryRepository, PaymentHistoryWithEmployee, PaymentHistoryFilterOptions } from '../repositories/PaymentHistoryRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

export interface CreatePaymentHistoryDto {
  employeeId: number
  payrollId?: number
  paymentType: 'Salary' | 'Advance' | 'Bonus' | 'Other'
  paymentMethod: 'Bank' | 'Cash' | 'Check'
  amount: number
  currency?: string
  paymentDate: string | Date
  bankName?: string
  iban?: string
  referenceNo?: string
  description?: string
  status?: string
}

export interface UpdatePaymentHistoryDto {
  paymentMethod?: string
  amount?: number
  paymentDate?: string | Date
  bankName?: string
  iban?: string
  referenceNo?: string
  description?: string
  status?: string
}

export class PaymentHistoryService {
  constructor(private repository: PaymentHistoryRepository) {}

  async findAll(options: PaymentHistoryFilterOptions = {}): Promise<PaginatedResult<PaymentHistoryWithEmployee>> {
    return await this.repository.findAllWithRelations(options)
  }

  async findById(id: number): Promise<PaymentHistoryWithEmployee | null> {
    return await this.repository.findById(id)
  }

  async findByEmployee(employeeId: number, year?: number): Promise<PaymentHistoryWithEmployee[]> {
    return await this.repository.findByEmployee(employeeId, year)
  }

  async create(data: CreatePaymentHistoryDto, userId?: number): Promise<PaymentHistoryWithEmployee> {
    const createData = {
      ...data,
      paymentDate: new Date(data.paymentDate),
      currency: data.currency || 'TRY',
      status: data.status || 'Completed'
    }
    return await this.repository.create(createData as any, userId)
  }

  async update(id: number, data: UpdatePaymentHistoryDto, userId?: number): Promise<PaymentHistoryWithEmployee> {
    const updateData: any = { ...data }
    if (data.paymentDate) {
      updateData.paymentDate = new Date(data.paymentDate)
    }
    return await this.repository.update(id, updateData, userId)
  }

  async delete(id: number, userId?: number): Promise<void> {
    await this.repository.softDelete(id, userId)
  }

  async cancel(id: number, userId?: number): Promise<PaymentHistoryWithEmployee> {
    return await this.repository.update(id, { status: 'Cancelled' } as any, userId)
  }

  async getStatistics(startDate?: Date, endDate?: Date) {
    return await this.repository.getStatistics(startDate, endDate)
  }

  async getEmployeePaymentSummary(employeeId: number, year: number) {
    return await this.repository.getEmployeePaymentSummary(employeeId, year)
  }

  async recordSalaryPayment(employeeId: number, payrollId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: { bankName?: string; iban?: string; referenceNo?: string }, userId?: number): Promise<PaymentHistoryWithEmployee> {
    return await this.create({
      employeeId,
      payrollId,
      paymentType: 'Salary',
      paymentMethod,
      amount,
      paymentDate: new Date(),
      bankName: bankDetails?.bankName,
      iban: bankDetails?.iban,
      referenceNo: bankDetails?.referenceNo,
      description: `Maaş ödemesi - Bordro #${payrollId}`
    }, userId)
  }

  async recordAdvancePayment(employeeId: number, amount: number, paymentMethod: 'Bank' | 'Cash' | 'Check', bankDetails?: { bankName?: string; iban?: string; referenceNo?: string }, userId?: number): Promise<PaymentHistoryWithEmployee> {
    return await this.create({
      employeeId,
      paymentType: 'Advance',
      paymentMethod,
      amount,
      paymentDate: new Date(),
      bankName: bankDetails?.bankName,
      iban: bankDetails?.iban,
      referenceNo: bankDetails?.referenceNo,
      description: 'Avans ödemesi'
    }, userId)
  }
}

export default PaymentHistoryService
