import { PrismaClient, LeaveType } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Default leave types for seeding
 * Requirements: 9.6
 */
export const DEFAULT_LEAVE_TYPES = [
  { name: 'Yıllık İzin', abbreviation: 'Yİ', isPaid: true, deductsFromAnnual: true, limitDays: null },
  { name: 'Mazeret İzni', abbreviation: 'Mİ', isPaid: true, deductsFromAnnual: false, limitDays: 5 },
  { name: 'Rapor', abbreviation: 'RP', isPaid: true, deductsFromAnnual: false, limitDays: null },
  { name: 'Babalık İzni', abbreviation: 'Bİ', isPaid: true, deductsFromAnnual: false, limitDays: 5 },
  { name: 'Doğum İzni', abbreviation: 'Dİ', isPaid: true, deductsFromAnnual: false, limitDays: 112 },
  { name: 'Evlilik İzni', abbreviation: 'Eİ', isPaid: true, deductsFromAnnual: false, limitDays: 3 },
  { name: 'Ölüm İzni', abbreviation: 'Öİ', isPaid: true, deductsFromAnnual: false, limitDays: 3 },
  { name: 'Evlat Edinme İzni', abbreviation: 'EE', isPaid: true, deductsFromAnnual: false, limitDays: 3 },
  { name: 'Engelli Yakını İzni', abbreviation: 'EY', isPaid: true, deductsFromAnnual: false, limitDays: 10 }
] as const

/**
 * LeaveType filter options
 */
export interface LeaveTypeFilterOptions extends FindAllOptions {
  isPaid?: boolean
  deductsFromAnnual?: boolean
}

/**
 * LeaveTypeRepository - İzin türleri veritabanı işlemleri
 * BaseRepository'den türetilmiş, varsayılan izin türleri seed desteği içerir
 * Requirements: 9.1, 9.6
 */
export class LeaveTypeRepository extends BaseRepository<LeaveType> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'leaveType', true)
  }

  /**
   * Tüm izin türlerini filtrelerle getir
   */
  async findAllWithFilters(options: LeaveTypeFilterOptions = {}): Promise<PaginatedResult<LeaveType>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'name',
      order = 'asc',
      includeDeleted = false,
      isPaid,
      deductsFromAnnual
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (isPaid !== undefined) whereClause.isPaid = isPaid
    if (deductsFromAnnual !== undefined) whereClause.deductsFromAnnual = deductsFromAnnual

    const [data, total] = await Promise.all([
      this.prisma.leaveType.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order }
      }),
      this.prisma.leaveType.count({ where: whereClause })
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
   * İsme göre izin türü bul
   * Requirements: 9.2 - Unique name validation
   */
  async findByName(name: string, includeDeleted: boolean = false): Promise<LeaveType | null> {
    const whereClause: any = {
      name,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.leaveType.findFirst({
      where: whereClause
    })

    return this.toPlain(result)
  }

  /**
   * İsmin benzersiz olup olmadığını kontrol et
   * Requirements: 9.2
   */
  async isNameUnique(name: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = {
      name,
      deletedAt: null
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.leaveType.count({ where: whereClause })
    return count === 0
  }

  /**
   * Ücretli izin türlerini getir
   * Requirements: 9.3
   */
  async findPaidLeaveTypes(includeDeleted: boolean = false): Promise<LeaveType[]> {
    const whereClause: any = {
      isPaid: true,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.leaveType.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Ücretsiz izin türlerini getir
   * Requirements: 9.3
   */
  async findUnpaidLeaveTypes(includeDeleted: boolean = false): Promise<LeaveType[]> {
    const whereClause: any = {
      isPaid: false,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.leaveType.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Yıllık izinden düşen izin türlerini getir
   * Requirements: 9.4
   */
  async findDeductingLeaveTypes(includeDeleted: boolean = false): Promise<LeaveType[]> {
    const whereClause: any = {
      deductsFromAnnual: true,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.leaveType.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Varsayılan izin türlerini seed et
   * Requirements: 9.6
   */
  async seedDefaults(userId?: number): Promise<LeaveType[]> {
    const createdTypes: LeaveType[] = []

    for (const defaultType of DEFAULT_LEAVE_TYPES) {
      // Zaten var mı kontrol et
      const existing = await this.findByName(defaultType.name, true)
      
      if (!existing) {
        const created = await this.create(defaultType as any, userId)
        createdTypes.push(created)
      } else if (existing.deletedAt) {
        // Silinmişse geri yükle
        const restored = await this.restore(existing.id, userId)
        createdTypes.push(restored)
      }
    }

    return createdTypes
  }

  /**
   * İzin türünün kullanımda olup olmadığını kontrol et
   * (İzin taleplerinde kullanılıyor mu?)
   */
  async isInUse(leaveTypeId: number): Promise<boolean> {
    const count = await this.prisma.leaveRequest.count({
      where: {
        leaveTypeId,
        deletedAt: null
      }
    })
    return count > 0
  }
}

export default LeaveTypeRepository
