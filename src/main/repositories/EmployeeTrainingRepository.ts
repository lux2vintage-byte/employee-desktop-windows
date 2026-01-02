import { PrismaClient, EmployeeTraining } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Valid employee training statuses
 * Requirements: 17.3
 */
export const VALID_TRAINING_STATUSES = ['Planned', 'Completed', 'Failed'] as const
export type TrainingStatus = typeof VALID_TRAINING_STATUSES[number]

/**
 * Employee training with relations type
 */
export interface EmployeeTrainingWithRelations extends EmployeeTraining {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
  training?: {
    id: number
    title: string
    provider: string | null
    durationHours: number
    category: string | null
  } | null
}

/**
 * Employee training filter options
 */
export interface EmployeeTrainingFilterOptions extends FindAllOptions {
  employeeId?: number
  trainingId?: number
  status?: TrainingStatus
}

/**
 * EmployeeTrainingRepository - Personel eğitim kayıtları veritabanı işlemleri
 * Personel eğitim kayıtları sorguları
 * Requirements: 17.2
 */
export class EmployeeTrainingRepository extends BaseRepository<EmployeeTraining> {
  constructor(prisma: PrismaClient) {
    // EmployeeTraining doesn't have soft delete
    super(prisma, 'employeeTraining', false)
  }

  /**
   * Tüm personel eğitim kayıtlarını ilişkileriyle birlikte getir
   */
  async findAllWithRelations(options: EmployeeTrainingFilterOptions = {}): Promise<PaginatedResult<EmployeeTrainingWithRelations>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'createdAt',
      order = 'desc',
      employeeId,
      trainingId,
      status
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {}

    // Filtreler
    if (employeeId) whereClause.employeeId = employeeId
    if (trainingId) whereClause.trainingId = trainingId
    if (status) whereClause.status = status

    const [data, total] = await Promise.all([
      this.prisma.employeeTraining.findMany({
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
          },
          training: {
            select: {
              id: true,
              title: true,
              provider: true,
              durationHours: true,
              category: true
            }
          }
        }
      }),
      this.prisma.employeeTraining.count({ where: whereClause })
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
   * ID ile personel eğitim kaydını ilişkileriyle birlikte getir
   */
  async findByIdWithRelations(id: number): Promise<EmployeeTrainingWithRelations | null> {
    const result = await this.prisma.employeeTraining.findFirst({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        training: {
          select: {
            id: true,
            title: true,
            provider: true,
            durationHours: true,
            category: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel bazlı eğitim kayıtlarını getir
   */
  async findByEmployee(employeeId: number): Promise<EmployeeTrainingWithRelations[]> {
    const result = await this.prisma.employeeTraining.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        training: {
          select: {
            id: true,
            title: true,
            provider: true,
            durationHours: true,
            category: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Eğitim bazlı personel kayıtlarını getir
   */
  async findByTraining(trainingId: number): Promise<EmployeeTrainingWithRelations[]> {
    const result = await this.prisma.employeeTraining.findMany({
      where: { trainingId },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        training: {
          select: {
            id: true,
            title: true,
            provider: true,
            durationHours: true,
            category: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Durum bazlı eğitim kayıtlarını getir
   */
  async findByStatus(status: TrainingStatus): Promise<EmployeeTrainingWithRelations[]> {
    const result = await this.prisma.employeeTraining.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        },
        training: {
          select: {
            id: true,
            title: true,
            provider: true,
            durationHours: true,
            category: true
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Personel-eğitim kombinasyonu var mı kontrol et
   */
  async assignmentExists(employeeId: number, trainingId: number): Promise<boolean> {
    const count = await this.prisma.employeeTraining.count({
      where: {
        employeeId,
        trainingId
      }
    })
    return count > 0
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
   * Eğitim var mı kontrol et
   */
  async trainingExists(trainingId: number): Promise<boolean> {
    const count = await this.prisma.training.count({
      where: {
        id: trainingId,
        deletedAt: null
      }
    })
    return count > 0
  }

  /**
   * Durumu güncelle
   */
  async updateStatus(id: number, status: TrainingStatus, completionDate?: Date, certificateUrl?: string, userId?: number): Promise<EmployeeTraining> {
    const updateData: any = { status }
    
    if (completionDate) {
      updateData.completionDate = completionDate
    }
    
    if (certificateUrl !== undefined) {
      updateData.certificateUrl = certificateUrl
    }

    return await this.update(id, updateData, userId)
  }

  /**
   * Tamamlanmış eğitim sayısını getir (personel bazlı)
   */
  async getCompletedCount(employeeId: number): Promise<number> {
    return await this.prisma.employeeTraining.count({
      where: {
        employeeId,
        status: 'Completed'
      }
    })
  }

  /**
   * Planlanan eğitim sayısını getir (personel bazlı)
   */
  async getPlannedCount(employeeId: number): Promise<number> {
    return await this.prisma.employeeTraining.count({
      where: {
        employeeId,
        status: 'Planned'
      }
    })
  }
}

export default EmployeeTrainingRepository
