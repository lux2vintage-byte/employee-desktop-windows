import { PrismaClient, HiringRequest } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

export interface HiringRequestWithRelations extends HiringRequest {
  department?: { id: number; name: string } | null
  position?: { id: number; title: string } | null
}

export class HiringRequestRepository extends BaseRepository<HiringRequest> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'hiringRequest', true)
  }

  async findAllWithRelations(options: FindAllOptions = {}): Promise<PaginatedResult<HiringRequestWithRelations>> {
    const { page = 1, limit = 25, orderBy = 'createdAt', order = 'desc', includeDeleted = false } = options
    const skip = (page - 1) * limit
    const whereClause = this.getSoftDeleteFilter(includeDeleted)

    const [data, total] = await Promise.all([
      this.prisma.hiringRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          department: { select: { id: true, name: true } },
          position: { select: { id: true, title: true } }
        }
      }),
      this.prisma.hiringRequest.count({ where: whereClause })
    ])

    return { data: this.toPlain(data), total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findByIdWithRelations(id: number): Promise<HiringRequestWithRelations | null> {
    const result = await this.prisma.hiringRequest.findFirst({
      where: { id, ...this.getSoftDeleteFilter(false) },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } }
      }
    })
    return this.toPlain(result)
  }

  async findByStatus(status: string): Promise<HiringRequest[]> {
    const result = await this.prisma.hiringRequest.findMany({
      where: { status, ...this.getSoftDeleteFilter(false) },
      orderBy: { requestDate: 'desc' }
    })
    return this.toPlain(result)
  }

  async findByDepartment(departmentId: number): Promise<HiringRequest[]> {
    const result = await this.prisma.hiringRequest.findMany({
      where: { departmentId, ...this.getSoftDeleteFilter(false) },
      orderBy: { requestDate: 'desc' }
    })
    return this.toPlain(result)
  }

  async generateRequestCode(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await this.prisma.hiringRequest.count({
      where: { requestCode: { startsWith: `HR-${year}` } }
    })
    return `HR-${year}-${String(count + 1).padStart(4, '0')}`
  }

  async getStats(): Promise<{ total: number; pending: number; approved: number; inProgress: number; completed: number }> {
    const [total, pending, approved, inProgress, completed] = await Promise.all([
      this.prisma.hiringRequest.count({ where: this.getSoftDeleteFilter(false) }),
      this.prisma.hiringRequest.count({ where: { status: 'Pending', ...this.getSoftDeleteFilter(false) } }),
      this.prisma.hiringRequest.count({ where: { status: 'Approved', ...this.getSoftDeleteFilter(false) } }),
      this.prisma.hiringRequest.count({ where: { status: 'InProgress', ...this.getSoftDeleteFilter(false) } }),
      this.prisma.hiringRequest.count({ where: { status: 'Completed', ...this.getSoftDeleteFilter(false) } })
    ])
    return { total, pending, approved, inProgress, completed }
  }
}

export default HiringRequestRepository
