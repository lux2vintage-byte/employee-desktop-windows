import { PrismaClient, EmployeeDocument } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * EmployeeDocument with employee info
 */
export interface EmployeeDocumentWithEmployee extends EmployeeDocument {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
}

/**
 * Document filter options
 */
export interface DocumentFilterOptions extends FindAllOptions {
  employeeId?: number
  documentType?: string
}

/**
 * EmployeeDocumentsRepository - Personel belgeleri veritabanı işlemleri
 * Çoklu belge desteği
 * Requirements: 6.1, 6.5
 */
export class EmployeeDocumentsRepository extends BaseRepository<EmployeeDocument> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'employeeDocument', true)
  }

  /**
   * Personel ID ile belgeleri getir
   * Requirements: 6.5
   */
  async findByEmployeeId(employeeId: number, includeDeleted: boolean = false): Promise<EmployeeDocument[]> {
    const whereClause = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employeeDocument.findMany({
      where: whereClause,
      orderBy: { uploadDate: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Personel ID ile belgeleri personel bilgileriyle birlikte getir
   */
  async findByEmployeeIdWithEmployee(employeeId: number, includeDeleted: boolean = false): Promise<EmployeeDocumentWithEmployee[]> {
    const whereClause = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employeeDocument.findMany({
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
      },
      orderBy: { uploadDate: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Belge tipine göre personel belgelerini getir
   */
  async findByEmployeeIdAndType(
    employeeId: number,
    documentType: string,
    includeDeleted: boolean = false
  ): Promise<EmployeeDocument[]> {
    const whereClause = {
      employeeId,
      documentType,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employeeDocument.findMany({
      where: whereClause,
      orderBy: { uploadDate: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Tüm belgeleri filtrelerle getir
   */
  async findAllWithFilters(options: DocumentFilterOptions = {}): Promise<PaginatedResult<EmployeeDocumentWithEmployee>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'uploadDate',
      order = 'desc',
      includeDeleted = false,
      employeeId,
      documentType
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (employeeId) whereClause.employeeId = employeeId
    if (documentType) whereClause.documentType = documentType

    const [data, total] = await Promise.all([
      this.prisma.employeeDocument.findMany({
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
      this.prisma.employeeDocument.count({ where: whereClause })
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
   * ID ile belgeyi personel bilgileriyle birlikte getir
   */
  async findByIdWithEmployee(id: number, includeDeleted: boolean = false): Promise<EmployeeDocumentWithEmployee | null> {
    const whereClause = {
      id,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employeeDocument.findFirst({
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
   * Belge tipine göre tüm belgeleri getir
   */
  async findByDocumentType(documentType: string, includeDeleted: boolean = false): Promise<EmployeeDocumentWithEmployee[]> {
    const whereClause = {
      documentType,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employeeDocument.findMany({
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
      },
      orderBy: { uploadDate: 'desc' }
    })

    return this.toPlain(result)
  }

  /**
   * Personelin belge sayısını getir
   */
  async countByEmployeeId(employeeId: number, includeDeleted: boolean = false): Promise<number> {
    const whereClause = {
      employeeId,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    return await this.prisma.employeeDocument.count({ where: whereClause })
  }

  /**
   * Personelin belirli tipteki belge sayısını getir
   */
  async countByEmployeeIdAndType(
    employeeId: number,
    documentType: string,
    includeDeleted: boolean = false
  ): Promise<number> {
    const whereClause = {
      employeeId,
      documentType,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    return await this.prisma.employeeDocument.count({ where: whereClause })
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
   * Dosya yolu benzersiz mi kontrol et (aynı personel için)
   */
  async isFilePathUniqueForEmployee(
    employeeId: number,
    filePath: string,
    excludeId?: number,
    includeDeleted: boolean = false
  ): Promise<boolean> {
    const whereClause: any = {
      employeeId,
      filePath,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    const count = await this.prisma.employeeDocument.count({ where: whereClause })
    return count === 0
  }

  /**
   * Tarih aralığına göre belgeleri getir
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    includeDeleted: boolean = false
  ): Promise<EmployeeDocumentWithEmployee[]> {
    const whereClause = {
      uploadDate: {
        gte: startDate,
        lte: endDate
      },
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.employeeDocument.findMany({
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
      },
      orderBy: { uploadDate: 'desc' }
    })

    return this.toPlain(result)
  }
}

export default EmployeeDocumentsRepository
