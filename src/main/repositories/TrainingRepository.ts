import { PrismaClient, Training } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Training with relations type
 */
export interface TrainingWithRelations extends Training {
  _count?: {
    employeeTrainings: number
  }
}

/**
 * Training filter options
 */
export interface TrainingFilterOptions extends FindAllOptions {
  category?: string
  provider?: string
  searchTerm?: string
}

/**
 * TrainingRepository - Eğitim kataloğu veritabanı işlemleri
 * Eğitim kataloğu sorguları
 * Requirements: 17.1
 */
export class TrainingRepository extends BaseRepository<Training> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'training', true)
  }

  /**
   * Tüm eğitimleri ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: TrainingFilterOptions = {}): Promise<PaginatedResult<TrainingWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'createdAt',
      order = 'desc',
      includeDeleted = false,
      category,
      provider,
      searchTerm
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (category) whereClause.category = category
    if (provider) whereClause.provider = provider
    
    // Arama terimi
    if (searchTerm) {
      whereClause.OR = [
        { title: { contains: searchTerm } },
        { provider: { contains: searchTerm } },
        { category: { contains: searchTerm } }
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.training.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          _count: {
            select: {
              employeeTrainings: true
            }
          }
        }
      }),
      this.prisma.training.count({ where: whereClause })
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
   * ID ile eğitimi ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<TrainingWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.training.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            employeeTrainings: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Kategori bazlı eğitimleri getir
   */
  async findByCategory(category: string, includeDeleted: boolean = false): Promise<Training[]> {
    const whereClause = {
      category,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.training.findMany({
      where: whereClause,
      orderBy: { title: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Sağlayıcı bazlı eğitimleri getir
   */
  async findByProvider(provider: string, includeDeleted: boolean = false): Promise<Training[]> {
    const whereClause = {
      provider,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.training.findMany({
      where: whereClause,
      orderBy: { title: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Başlık ile eğitim ara
   */
  async searchByTitle(searchTerm: string, includeDeleted: boolean = false): Promise<Training[]> {
    const whereClause = {
      title: { contains: searchTerm },
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.training.findMany({
      where: whereClause,
      orderBy: { title: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Eğitime atanmış personel var mı kontrol et
   */
  async hasAssignedEmployees(trainingId: number): Promise<boolean> {
    const count = await this.prisma.employeeTraining.count({
      where: {
        trainingId
      }
    })
    return count > 0
  }

  /**
   * Tüm kategorileri getir
   */
  async getAllCategories(): Promise<string[]> {
    const result = await this.prisma.training.findMany({
      where: {
        deletedAt: null,
        category: { not: null }
      },
      select: {
        category: true
      },
      distinct: ['category']
    })

    return result
      .map(r => r.category)
      .filter((c): c is string => c !== null)
  }

  /**
   * Tüm sağlayıcıları getir
   */
  async getAllProviders(): Promise<string[]> {
    const result = await this.prisma.training.findMany({
      where: {
        deletedAt: null,
        provider: { not: null }
      },
      select: {
        provider: true
      },
      distinct: ['provider']
    })

    return result
      .map(r => r.provider)
      .filter((p): p is string => p !== null)
  }
}

export default TrainingRepository
