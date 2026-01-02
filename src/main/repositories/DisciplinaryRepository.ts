import { PrismaClient, DisciplinaryAction } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Valid violation types
 * Requirements: 18.2
 */
export const VALID_VIOLATION_TYPES = [
  'İşe Geç Kalma',
  'İş Güvenliği İhlali',
  'Devamsızlık',
  'Görev İhmali',
  'Diğer'
] as const
export type ViolationType = typeof VALID_VIOLATION_TYPES[number]

/**
 * Valid action taken types
 * Requirements: 18.3
 */
export const VALID_ACTION_TAKEN_TYPES = [
  'Sözlü Uyarı',
  'Yazılı Uyarı',
  'Tutanak',
  'Maaş Kesintisi',
  'İşten Çıkarma'
] as const
export type ActionTakenType = typeof VALID_ACTION_TAKEN_TYPES[number]

/**
 * Disciplinary action with relations type
 */
export interface DisciplinaryActionWithRelations extends DisciplinaryAction {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
}

/**
 * Disciplinary filter options
 */
export interface DisciplinaryFilterOptions extends FindAllOptions {
  employeeId?: number
  violationType?: ViolationType
  actionTaken?: ActionTakenType
  startDate?: Date
  endDate?: Date
}

/**
 * DisciplinaryRepository - Disiplin kayıtları veritabanı işlemleri
 * İhlal tipi bazlı sorgular
 * Requirements: 18.1
 */
export class DisciplinaryRepository extends BaseRepository<DisciplinaryAction> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'disciplinaryAction', true)
  }

  /**
   * Tüm disiplin kayıtlarını ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: DisciplinaryFilterOptions = {}): Promise<PaginatedResult<DisciplinaryActionWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'incidentDate',
      order = 'desc',
      includeDeleted = false,
      employeeId,
      violationType,
      actionTaken,
      startDate,
      endDate
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (violationType) whereClause.violationType = violationType
    if (actionTaken) whereClause.actionTaken = actionTaken
    
    // Tarih aralığı filtresi
    if (startDate || endDate) {
      whereClause.incidentDate = {}
      if (startDate) whereClause.incidentDate.gte = startDate
      if (endDate) whereClause.incidentDate.lte = endDate
    }

    const [data, total] = await Promise.all([
      this.prisma.disciplinaryAction.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true
            }
          }
        }
      }),
      this.prisma.disciplinaryAction.count({ where: whereClause })
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
   * ID ile disiplin kaydını ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number, includeDeleted: boolean = false): Promise<DisciplinaryActionWithRelations | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.disciplinaryAction.findFirst({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel bazlı disiplin kayıtlarını getir
   */
  async findByEmployee(employeeId: number, includeDeleted: boolean = false): Promise<DisciplinaryActionWithRelations[]> {
    const whereClause = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.disciplinaryAction.findMany({
      where: whereClause,
      orderBy: { incidentDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * İhlal tipi bazlı disiplin kayıtlarını getir
   * Requirements: 18.1
   */
  async findByViolationType(violationType: ViolationType, includeDeleted: boolean = false): Promise<DisciplinaryActionWithRelations[]> {
    const whereClause = {
      violationType,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.disciplinaryAction.findMany({
      where: whereClause,
      orderBy: { incidentDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Alınan aksiyon bazlı disiplin kayıtlarını getir
   */
  async findByActionTaken(actionTaken: ActionTakenType, includeDeleted: boolean = false): Promise<DisciplinaryActionWithRelations[]> {
    const whereClause = {
      actionTaken,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.disciplinaryAction.findMany({
      where: whereClause,
      orderBy: { incidentDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Tarih aralığında disiplin kayıtlarını getir
   */
  async findByDateRange(startDate: Date, endDate: Date, includeDeleted: boolean = false): Promise<DisciplinaryActionWithRelations[]> {
    const whereClause = {
      incidentDate: {
        gte: startDate,
        lte: endDate
      },
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.disciplinaryAction.findMany({
      where: whereClause,
      orderBy: { incidentDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Maaş kesintisi olan disiplin kayıtlarını getir
   * Requirements: 18.6
   */
  async findSalaryDeductions(includeDeleted: boolean = false): Promise<DisciplinaryActionWithRelations[]> {
    const whereClause = {
      actionTaken: 'Maaş Kesintisi',
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.disciplinaryAction.findMany({
      where: whereClause,
      orderBy: { incidentDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel var mı kontrol et
   */
  async employeeExists(employeeId: number): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: {
        id: employeeId,
        deletedAt: null
      }
    })
    return count > 0
  }

  /**
   * Personelin disiplin kaydı sayısını getir
   */
  async getCountByEmployee(employeeId: number, includeDeleted: boolean = false): Promise<number> {
    const whereClause: any = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    return await this.prisma.disciplinaryAction.count({ where: whereClause })
  }

  /**
   * Personelin belirli ihlal tipindeki kayıt sayısını getir
   */
  async getCountByEmployeeAndViolationType(
    employeeId: number, 
    violationType: ViolationType, 
    includeDeleted: boolean = false
  ): Promise<number> {
    const whereClause: any = {
      employeeId,
      violationType,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    return await this.prisma.disciplinaryAction.count({ where: whereClause })
  }
}

export default DisciplinaryRepository
