import { PrismaClient, DayType } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Default day types for seeding
 */
export const DEFAULT_DAY_TYPES = [
  { name: 'Normal Gün', abbreviation: 'NG', color: '#d4edda', isActive: true },
  { name: 'Hafta Tatili', abbreviation: 'HT', color: '#fff3cd', isActive: true },
  { name: 'Resmi Bayram', abbreviation: 'RB', color: '#cce5ff', isActive: true },
  { name: 'Dini Bayram', abbreviation: 'DB', color: '#d1ecf1', isActive: true },
  { name: 'Arefe Günü', abbreviation: 'AG', color: '#e2e3e5', isActive: true }
] as const

/**
 * DayType filter options
 */
export interface DayTypeFilterOptions extends FindAllOptions {
  isActive?: boolean
  search?: string
}

/**
 * DayTypeRepository - Gün türleri veritabanı işlemleri
 * BaseRepository'den türetilmiş
 */
export class DayTypeRepository extends BaseRepository<DayType> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'dayType', true)
  }

  /**
   * Tüm gün türlerini filtrelerle getir
   */
  async findAllWithFilters(options: DayTypeFilterOptions = {}): Promise<PaginatedResult<DayType>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'name',
      order = 'asc',
      includeDeleted = false,
      isActive,
      search
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (isActive !== undefined) whereClause.isActive = isActive
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { abbreviation: { contains: search } }
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.dayType.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order }
      }),
      this.prisma.dayType.count({ where: whereClause })
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
   * Tüm aktif gün türlerini getir (sayfalama olmadan)
   */
  async findAllActive(): Promise<DayType[]> {
    const result = await this.prisma.dayType.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      orderBy: { name: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * İsme göre gün türü bul
   */
  async findByName(name: string, includeDeleted: boolean = false): Promise<DayType | null> {
    const whereClause: any = {
      name,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.dayType.findFirst({
      where: whereClause
    })

    return this.toPlain(result)
  }

  /**
   * Kısaltmaya göre gün türü bul
   */
  async findByAbbreviation(abbreviation: string, includeDeleted: boolean = false): Promise<DayType | null> {
    const whereClause: any = {
      abbreviation,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.dayType.findFirst({
      where: whereClause
    })

    return this.toPlain(result)
  }

  /**
   * İsmin benzersiz olup olmadığını kontrol et
   */
  async isNameUnique(name: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = {
      name,
      deletedAt: null
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.dayType.count({ where: whereClause })
    return count === 0
  }

  /**
   * Kısaltmanın benzersiz olup olmadığını kontrol et
   */
  async isAbbreviationUnique(abbreviation: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = {
      abbreviation,
      deletedAt: null
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.dayType.count({ where: whereClause })
    return count === 0
  }

  /**
   * Varsayılan gün türlerini seed et
   */
  async seedDefaults(userId?: number): Promise<DayType[]> {
    const createdTypes: DayType[] = []

    for (const defaultType of DEFAULT_DAY_TYPES) {
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
   * Gün türünün kullanımda olup olmadığını kontrol et
   */
  async isInUse(dayTypeId: number): Promise<boolean> {
    const count = await this.prisma.attendanceLog.count({
      where: {
        dayTypeId,
        deletedAt: null
      }
    })
    return count > 0
  }
}

export default DayTypeRepository
