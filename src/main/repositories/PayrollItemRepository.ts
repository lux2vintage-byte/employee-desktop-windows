import { PrismaClient, PayrollItem } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * PayrollItem with relations type
 */
export interface PayrollItemWithRelations extends PayrollItem {
  payroll?: {
    id: number
    employeeId: number
    periodMonth: number
    periodYear: number
    isFinalized: boolean
  } | null
}

/**
 * PayrollItem filter options
 */
export interface PayrollItemFilterOptions extends FindAllOptions {
  payrollId?: number
  type?: 'Income' | 'Deduction'
  category?: string
}

/**
 * Valid item types
 * Requirements: 14.2
 */
export const VALID_ITEM_TYPES = ['Income', 'Deduction'] as const
export type ItemType = typeof VALID_ITEM_TYPES[number]

/**
 * Valid income categories
 * Requirements: 14.3
 */
export const VALID_INCOME_CATEGORIES = ['Overtime', 'Bonus', 'Transport', 'Food', 'Other'] as const
export type IncomeCategory = typeof VALID_INCOME_CATEGORIES[number]

/**
 * Valid deduction categories
 * Requirements: 14.4
 */
export const VALID_DEDUCTION_CATEGORIES = ['Tax', 'Insurance', 'Advance', 'Absence', 'Other'] as const
export type DeductionCategory = typeof VALID_DEDUCTION_CATEGORIES[number]

/**
 * PayrollItemRepository - Bordro kalemleri veritabanı işlemleri
 * BaseRepository'den türetilmiş, bordro bazlı sorgular içerir
 * Requirements: 14.1
 */
export class PayrollItemRepository extends BaseRepository<PayrollItem> {
  constructor(prisma: PrismaClient) {
    // PayrollItem doesn't have soft delete
    super(prisma, 'payrollItem', false)
  }

  /**
   * Tüm bordro kalemlerini ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: PayrollItemFilterOptions = {}): Promise<PaginatedResult<PayrollItemWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'createdAt',
      order = 'desc',
      payrollId,
      type,
      category
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {}

    // Filtreler
    if (payrollId) whereClause.payrollId = payrollId
    if (type) whereClause.type = type
    if (category) whereClause.category = category

    const [data, total] = await Promise.all([
      this.prisma.payrollItem.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          payroll: {
            select: {
              id: true,
              employeeId: true,
              periodMonth: true,
              periodYear: true,
              isFinalized: true
            }
          }
        }
      }),
      this.prisma.payrollItem.count({ where: whereClause })
    ])

    return {
      data: this.toPlain(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * ID ile bordro kalemini ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number): Promise<PayrollItemWithRelations | null> {
    const result = await this.prisma.payrollItem.findUnique({
      where: { id },
      include: {
        payroll: {
          select: {
            id: true,
            employeeId: true,
            periodMonth: true,
            periodYear: true,
            isFinalized: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Bordro bazlı kalemleri getir
   */
  async findByPayroll(payrollId: number): Promise<PayrollItem[]> {
    const result = await this.prisma.payrollItem.findMany({
      where: { payrollId },
      orderBy: [
        { type: 'asc' },
        { category: 'asc' }
      ]
    })

    return this.toPlain(result)
  }

  /**
   * Bordro bazlı gelir kalemlerini getir
   */
  async findIncomeItems(payrollId: number): Promise<PayrollItem[]> {
    const result = await this.prisma.payrollItem.findMany({
      where: {
        payrollId,
        type: 'Income'
      },
      orderBy: { category: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Bordro bazlı kesinti kalemlerini getir
   */
  async findDeductionItems(payrollId: number): Promise<PayrollItem[]> {
    const result = await this.prisma.payrollItem.findMany({
      where: {
        payrollId,
        type: 'Deduction'
      },
      orderBy: { category: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Bordronun toplam gelirlerini hesapla
   */
  async calculateTotalAdditions(payrollId: number): Promise<number> {
    const result = await this.prisma.payrollItem.aggregate({
      where: {
        payrollId,
        type: 'Income'
      },
      _sum: {
        amount: true
      }
    })

    return result._sum.amount || 0
  }

  /**
   * Bordronun toplam kesintilerini hesapla
   */
  async calculateTotalDeductions(payrollId: number): Promise<number> {
    const result = await this.prisma.payrollItem.aggregate({
      where: {
        payrollId,
        type: 'Deduction'
      },
      _sum: {
        amount: true
      }
    })

    return result._sum.amount || 0
  }

  /**
   * Bordronun kesinleşmiş olup olmadığını kontrol et
   * Requirements: 14.7 - Kesinleşmiş bordrolara kalem eklenemez/silinemez
   */
  async isPayrollFinalized(payrollId: number): Promise<boolean> {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      select: { isFinalized: true }
    })
    return payroll?.isFinalized ?? false
  }

  /**
   * Bordronun var olup olmadığını kontrol et
   */
  async payrollExists(payrollId: number): Promise<boolean> {
    const count = await this.prisma.payroll.count({
      where: {
        id: payrollId,
        deletedAt: null
      }
    })
    return count > 0
  }

  /**
   * Belirli kategorideki kalemleri getir
   */
  async findByCategory(payrollId: number, category: string): Promise<PayrollItem[]> {
    const result = await this.prisma.payrollItem.findMany({
      where: {
        payrollId,
        category
      }
    })

    return this.toPlain(result)
  }

  /**
   * Bordrodaki kalem sayısını getir
   */
  async countByPayroll(payrollId: number): Promise<number> {
    return await this.prisma.payrollItem.count({
      where: { payrollId }
    })
  }

  /**
   * Bordrodaki tüm kalemleri sil
   */
  async deleteByPayroll(payrollId: number): Promise<number> {
    const isFinalized = await this.isPayrollFinalized(payrollId)
    if (isFinalized) {
      throw new Error('Kesinleşmiş bordronun kalemleri silinemez')
    }

    const result = await this.prisma.payrollItem.deleteMany({
      where: { payrollId }
    })

    return result.count
  }

  /**
   * Toplu kalem oluştur
   */
  async createMany(items: Array<{
    payrollId: number
    type: string
    category: string
    description?: string
    amount: number
  }>): Promise<number> {
    // Tüm bordroların kesinleşmemiş olduğunu kontrol et
    const payrollIds = [...new Set(items.map(i => i.payrollId))]
    for (const payrollId of payrollIds) {
      const isFinalized = await this.isPayrollFinalized(payrollId)
      if (isFinalized) {
        throw new Error(`Kesinleşmiş bordro (${payrollId}) için kalem eklenemez`)
      }
    }

    const result = await this.prisma.payrollItem.createMany({
      data: items
    })

    return result.count
  }
}

export default PayrollItemRepository
