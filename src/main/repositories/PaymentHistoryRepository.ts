import { PrismaClient } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

export interface PaymentHistoryWithEmployee {
  id: number
  employeeId: number
  payrollId: number | null
  paymentType: string
  paymentMethod: string
  amount: number
  currency: string
  paymentDate: Date
  bankName: string | null
  iban: string | null
  referenceNo: string | null
  description: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  }
}

export interface PaymentHistoryFilterOptions extends FindAllOptions {
  employeeId?: number
  paymentType?: string
  paymentMethod?: string
  status?: string
  startDate?: Date
  endDate?: Date
}

export class PaymentHistoryRepository extends BaseRepository<any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'paymentHistory', true)
  }

  async findAllWithRelations(options: PaymentHistoryFilterOptions = {}): Promise<PaginatedResult<PaymentHistoryWithEmployee>> {
    const { page = 1, limit = 25, orderBy = 'paymentDate', order = 'desc', includeDeleted = false, employeeId, paymentType, paymentMethod, status, startDate, endDate } = options
    const skip = (page - 1) * limit

    const whereClause: any = { ...this.getSoftDeleteFilter(includeDeleted) }
    if (employeeId) whereClause.employeeId = employeeId
    if (paymentType) whereClause.paymentType = paymentType
    if (paymentMethod) whereClause.paymentMethod = paymentMethod
    if (status) whereClause.status = status
    if (startDate || endDate) {
      whereClause.paymentDate = {}
      if (startDate) whereClause.paymentDate.gte = startDate
      if (endDate) whereClause.paymentDate.lte = endDate
    }

    const [data, total] = await Promise.all([
      this.prisma.paymentHistory.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }
        }
      }),
      this.prisma.paymentHistory.count({ where: whereClause })
    ])

    return { data: this.toPlain(data), total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findByEmployee(employeeId: number, year?: number): Promise<PaymentHistoryWithEmployee[]> {
    const whereClause: any = { employeeId, deletedAt: null }
    if (year) {
      const startOfYear = new Date(year, 0, 1)
      const endOfYear = new Date(year, 11, 31, 23, 59, 59)
      whereClause.paymentDate = { gte: startOfYear, lte: endOfYear }
    }

    const result = await this.prisma.paymentHistory.findMany({
      where: whereClause,
      orderBy: { paymentDate: 'desc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }
      }
    })
    return this.toPlain(result)
  }

  async getStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalPayments: number
    totalAmount: number
    byMethod: { method: string; count: number; amount: number }[]
    byType: { type: string; count: number; amount: number }[]
  }> {
    const whereClause: any = { deletedAt: null, status: 'Completed' }
    if (startDate || endDate) {
      whereClause.paymentDate = {}
      if (startDate) whereClause.paymentDate.gte = startDate
      if (endDate) whereClause.paymentDate.lte = endDate
    }

    const payments = await this.prisma.paymentHistory.findMany({ where: whereClause })

    const byMethod: Record<string, { count: number; amount: number }> = {}
    const byType: Record<string, { count: number; amount: number }> = {}

    for (const p of payments) {
      if (!byMethod[p.paymentMethod]) byMethod[p.paymentMethod] = { count: 0, amount: 0 }
      byMethod[p.paymentMethod].count++
      byMethod[p.paymentMethod].amount += p.amount

      if (!byType[p.paymentType]) byType[p.paymentType] = { count: 0, amount: 0 }
      byType[p.paymentType].count++
      byType[p.paymentType].amount += p.amount
    }

    return {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      byMethod: Object.entries(byMethod).map(([method, data]) => ({ method, ...data })),
      byType: Object.entries(byType).map(([type, data]) => ({ type, ...data }))
    }
  }

  async getEmployeePaymentSummary(employeeId: number, year: number): Promise<{
    totalPaid: number
    salaryPayments: number
    advancePayments: number
    bonusPayments: number
    otherPayments: number
  }> {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    const payments = await this.prisma.paymentHistory.findMany({
      where: {
        employeeId,
        deletedAt: null,
        status: 'Completed',
        paymentDate: { gte: startOfYear, lte: endOfYear }
      }
    })

    return {
      totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
      salaryPayments: payments.filter(p => p.paymentType === 'Salary').reduce((sum, p) => sum + p.amount, 0),
      advancePayments: payments.filter(p => p.paymentType === 'Advance').reduce((sum, p) => sum + p.amount, 0),
      bonusPayments: payments.filter(p => p.paymentType === 'Bonus').reduce((sum, p) => sum + p.amount, 0),
      otherPayments: payments.filter(p => p.paymentType === 'Other').reduce((sum, p) => sum + p.amount, 0)
    }
  }
}

export default PaymentHistoryRepository
