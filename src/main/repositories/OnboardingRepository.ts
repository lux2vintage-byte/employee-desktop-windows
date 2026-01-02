import { PrismaClient, Onboarding, OnboardingTask } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

export interface OnboardingWithRelations extends Onboarding {
  employee?: { id: number; firstName: string; lastName: string; employeeCode: string } | null
  tasks?: OnboardingTask[]
}

export class OnboardingRepository extends BaseRepository<Onboarding> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'onboarding', true)
  }

  async findAllWithRelations(options: FindAllOptions = {}): Promise<PaginatedResult<OnboardingWithRelations>> {
    const { page = 1, limit = 25, orderBy = 'createdAt', order = 'desc', includeDeleted = false } = options
    const skip = (page - 1) * limit
    const whereClause = this.getSoftDeleteFilter(includeDeleted)

    const [data, total] = await Promise.all([
      this.prisma.onboarding.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          tasks: { orderBy: { priority: 'asc' } }
        }
      }),
      this.prisma.onboarding.count({ where: whereClause })
    ])

    return { data: this.toPlain(data), total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findByIdWithRelations(id: number): Promise<OnboardingWithRelations | null> {
    const result = await this.prisma.onboarding.findFirst({
      where: { id, ...this.getSoftDeleteFilter(false) },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        tasks: { orderBy: { priority: 'asc' } }
      }
    })
    return this.toPlain(result)
  }

  async findByEmployee(employeeId: number): Promise<Onboarding | null> {
    const result = await this.prisma.onboarding.findFirst({
      where: { employeeId, ...this.getSoftDeleteFilter(false) },
      include: { tasks: { orderBy: { priority: 'asc' } } }
    })
    return this.toPlain(result)
  }

  async findByStatus(status: string): Promise<OnboardingWithRelations[]> {
    const result = await this.prisma.onboarding.findMany({
      where: { status, ...this.getSoftDeleteFilter(false) },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        tasks: { orderBy: { priority: 'asc' } }
      },
      orderBy: { startDate: 'desc' }
    })
    return this.toPlain(result)
  }

  async addTask(onboardingId: number, taskData: any): Promise<OnboardingTask> {
    const result = await this.prisma.onboardingTask.create({ data: { onboardingId, ...taskData } })
    await this.updateCompletionRate(onboardingId)
    return this.toPlain(result)
  }

  async updateTask(taskId: number, taskData: any): Promise<OnboardingTask> {
    const task = await this.prisma.onboardingTask.update({ where: { id: taskId }, data: taskData })
    await this.updateCompletionRate(task.onboardingId)
    return this.toPlain(task)
  }

  async completeTask(taskId: number): Promise<OnboardingTask> {
    const task = await this.prisma.onboardingTask.update({
      where: { id: taskId },
      data: { status: 'Completed', completedDate: new Date() }
    })
    await this.updateCompletionRate(task.onboardingId)
    return this.toPlain(task)
  }

  async deleteTask(taskId: number): Promise<void> {
    const task = await this.prisma.onboardingTask.findUnique({ where: { id: taskId } })
    if (task) {
      await this.prisma.onboardingTask.delete({ where: { id: taskId } })
      await this.updateCompletionRate(task.onboardingId)
    }
  }

  private async updateCompletionRate(onboardingId: number): Promise<void> {
    const tasks = await this.prisma.onboardingTask.findMany({ where: { onboardingId } })
    const completedTasks = tasks.filter(t => t.status === 'Completed').length
    const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
    await this.prisma.onboarding.update({ where: { id: onboardingId }, data: { completionRate } })
  }

  async getStats(): Promise<{ total: number; planned: number; inProgress: number; completed: number; avgCompletionRate: number }> {
    const [total, planned, inProgress, completed, avgResult] = await Promise.all([
      this.prisma.onboarding.count({ where: this.getSoftDeleteFilter(false) }),
      this.prisma.onboarding.count({ where: { status: 'Planned', ...this.getSoftDeleteFilter(false) } }),
      this.prisma.onboarding.count({ where: { status: 'InProgress', ...this.getSoftDeleteFilter(false) } }),
      this.prisma.onboarding.count({ where: { status: 'Completed', ...this.getSoftDeleteFilter(false) } }),
      this.prisma.onboarding.aggregate({ _avg: { completionRate: true }, where: this.getSoftDeleteFilter(false) })
    ])
    return { total, planned, inProgress, completed, avgCompletionRate: avgResult._avg.completionRate || 0 }
  }
}

export default OnboardingRepository
