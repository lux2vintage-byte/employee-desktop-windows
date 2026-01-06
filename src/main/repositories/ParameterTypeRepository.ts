import { PrismaClient, ParameterType } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Default parameter types for seeding
 */
export const DEFAULT_PARAMETER_TYPES = [
  { code: 'MinimumWage', name: 'Asgari Ücret', category: 'Ücret', isSystem: true, sortOrder: 1 },
  { code: 'SGKEmployeeRate', name: 'SGK İşçi Payı', category: 'SGK', isSystem: true, sortOrder: 2 },
  { code: 'SGKEmployerRate', name: 'SGK İşveren Payı', category: 'SGK', isSystem: true, sortOrder: 3 },
  { code: 'IncomeTaxBracket', name: 'Gelir Vergisi Dilimi', category: 'Vergi', isSystem: true, sortOrder: 4 },
  { code: 'StampTax', name: 'Damga Vergisi', category: 'Vergi', isSystem: true, sortOrder: 5 },
  { code: 'UnemploymentEmployee', name: 'İşsizlik Sigortası İşçi', category: 'SGK', isSystem: true, sortOrder: 6 },
  { code: 'UnemploymentEmployer', name: 'İşsizlik Sigortası İşveren', category: 'SGK', isSystem: true, sortOrder: 7 }
] as const

/**
 * ParameterType filter options
 */
export interface ParameterTypeFilterOptions extends FindAllOptions {
  isActive?: boolean
  isSystem?: boolean
  category?: string
  search?: string
}

/**
 * ParameterTypeRepository - Parametre türleri veritabanı işlemleri
 * BaseRepository'den türetilmiş
 */
export class ParameterTypeRepository extends BaseRepository<ParameterType> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'parameterType', true)
  }

  /**
   * Tüm parametre türlerini filtrelerle getir
   */
  async findAllWithFilters(options: ParameterTypeFilterOptions = {}): Promise<PaginatedResult<ParameterType>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'sortOrder',
      order = 'asc',
      includeDeleted = false,
      isActive,
      isSystem,
      category,
      search
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (isActive !== undefined) whereClause.isActive = isActive
    if (isSystem !== undefined) whereClause.isSystem = isSystem
    if (category) whereClause.category = category
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } }
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.parameterType.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order }
      }),
      this.prisma.parameterType.count({ where: whereClause })
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
   * Tüm parametre türlerini sayfalama olmadan getir
   */
  async findAllWithoutPagination(): Promise<ParameterType[]> {
    const result = await this.prisma.parameterType.findMany({
      where: {
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Tüm aktif parametre türlerini getir (sayfalama olmadan)
   */
  async findAllActive(): Promise<ParameterType[]> {
    const result = await this.prisma.parameterType.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Koda göre parametre türü bul
   */
  async findByCode(code: string, includeDeleted: boolean = false): Promise<ParameterType | null> {
    const whereClause: any = {
      code,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.parameterType.findFirst({
      where: whereClause
    })

    return result ? this.toPlain(result) : null
  }

  /**
   * İsme göre parametre türü bul
   */
  async findByName(name: string, includeDeleted: boolean = false): Promise<ParameterType | null> {
    const whereClause: any = {
      name,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.parameterType.findFirst({
      where: whereClause
    })

    return result ? this.toPlain(result) : null
  }

  /**
   * Kategoriye göre parametre türlerini getir
   */
  async findByCategory(category: string): Promise<ParameterType[]> {
    const result = await this.prisma.parameterType.findMany({
      where: {
        category,
        isActive: true,
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Varsayılan parametre türlerini oluştur
   */
  async seedDefaults(userId?: number): Promise<ParameterType[]> {
    const created: ParameterType[] = []

    for (const typeData of DEFAULT_PARAMETER_TYPES) {
      const existing = await this.findByCode(typeData.code)
      if (!existing) {
        const newType = await this.create({
          ...typeData,
          isActive: true
        } as any, userId)
        created.push(newType)
      }
    }

    return created
  }

  /**
   * Tüm kategorileri getir
   */
  async getCategories(): Promise<string[]> {
    const result = await this.prisma.parameterType.findMany({
      where: {
        deletedAt: null,
        category: { not: null }
      },
      select: { category: true },
      distinct: ['category']
    })

    return result.map(r => r.category).filter(Boolean) as string[]
  }
}
