import { Onboarding, OnboardingTask } from '@prisma/client'
import { OnboardingRepository, OnboardingWithRelations } from '../repositories/OnboardingRepository'
import { FindAllOptions, PaginatedResult } from '../repositories/BaseRepository'

export interface CreateOnboardingDto {
  employeeId: number
  startDate: Date
  endDate?: Date
  mentorId?: number
  notes?: string
}

export interface UpdateOnboardingDto {
  startDate?: Date
  endDate?: Date
  mentorId?: number
  status?: string
  welcomeKitGiven?: boolean
  itSetupCompleted?: boolean
  hrDocsCompleted?: boolean
  trainingCompleted?: boolean
  notes?: string
}

export interface CreateTaskDto {
  title: string
  description?: string
  category: string
  assignedTo?: number
  dueDate?: Date
  priority?: number
}

export class BusinessRuleError extends Error {
  constructor(public rule: string, public details: Record<string, unknown> = {}) {
    super(`İş kuralı ihlali: ${rule}`)
    this.name = 'BusinessRuleError'
  }
}

export class OnboardingService {
  constructor(private repository: OnboardingRepository) {}

  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult<OnboardingWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  async findById(id: number): Promise<OnboardingWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  async findByEmployee(employeeId: number): Promise<Onboarding | null> {
    return await this.repository.findByEmployee(employeeId)
  }

  async findByStatus(status: string): Promise<OnboardingWithRelations[]> {
    return await this.repository.findByStatus(status)
  }

  async create(data: CreateOnboardingDto, userId?: number): Promise<Onboarding> {
    const existing = await this.repository.findByEmployee(data.employeeId)
    if (existing) throw new BusinessRuleError('Bu personel için zaten oryantasyon kaydı mevcut', { employeeId: data.employeeId })
    return await this.repository.create(data as any, userId)
  }

  async update(id: number, data: UpdateOnboardingDto, userId?: number): Promise<Onboarding> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('Oryantasyon kaydı bulunamadı', { id })
    return await this.repository.update(id, data as any, userId)
  }

  async start(id: number, userId?: number): Promise<Onboarding> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('Oryantasyon kaydı bulunamadı', { id })
    if (existing.status !== 'Planned') throw new BusinessRuleError('Sadece planlanan oryantasyonlar başlatılabilir', { status: existing.status })
    return await this.repository.update(id, { status: 'InProgress' } as any, userId)
  }

  async complete(id: number, userId?: number): Promise<Onboarding> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('Oryantasyon kaydı bulunamadı', { id })
    if (existing.status !== 'InProgress') throw new BusinessRuleError('Sadece devam eden oryantasyonlar tamamlanabilir', { status: existing.status })
    return await this.repository.update(id, { status: 'Completed', endDate: new Date() } as any, userId)
  }

  async cancel(id: number, userId?: number): Promise<Onboarding> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('Oryantasyon kaydı bulunamadı', { id })
    if (['Completed', 'Cancelled'].includes(existing.status)) throw new BusinessRuleError('Bu oryantasyon iptal edilemez', { status: existing.status })
    return await this.repository.update(id, { status: 'Cancelled' } as any, userId)
  }

  async delete(id: number, userId?: number): Promise<Onboarding> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new BusinessRuleError('Oryantasyon kaydı bulunamadı', { id })
    return await this.repository.softDelete(id, userId)
  }

  async addTask(onboardingId: number, data: CreateTaskDto): Promise<OnboardingTask> {
    const existing = await this.repository.findById(onboardingId)
    if (!existing) throw new BusinessRuleError('Oryantasyon kaydı bulunamadı', { onboardingId })
    return await this.repository.addTask(onboardingId, data)
  }

  async updateTask(taskId: number, data: Partial<CreateTaskDto>): Promise<OnboardingTask> {
    return await this.repository.updateTask(taskId, data)
  }

  async completeTask(taskId: number): Promise<OnboardingTask> {
    return await this.repository.completeTask(taskId)
  }

  async deleteTask(taskId: number): Promise<void> {
    return await this.repository.deleteTask(taskId)
  }

  async getStats() {
    return await this.repository.getStats()
  }

  async createDefaultTasks(onboardingId: number): Promise<OnboardingTask[]> {
    const defaultTasks = [
      { title: 'Hoş Geldin Kiti Teslimi', category: 'HR', priority: 1 },
      { title: 'Kimlik Kartı Hazırlama', category: 'HR', priority: 2 },
      { title: 'Bilgisayar ve E-posta Kurulumu', category: 'IT', priority: 3 },
      { title: 'Sistem Erişim Yetkilerinin Tanımlanması', category: 'IT', priority: 4 },
      { title: 'İş Sözleşmesi İmzalama', category: 'HR', priority: 5 },
      { title: 'SGK Bildirimi', category: 'HR', priority: 6 },
      { title: 'Şirket Tanıtım Eğitimi', category: 'Eğitim', priority: 7 },
      { title: 'İş Güvenliği Eğitimi', category: 'Eğitim', priority: 8 },
      { title: 'Departman Tanıtımı', category: 'Departman', priority: 9 },
      { title: 'Mentor ile Tanışma', category: 'Genel', priority: 10 }
    ]
    const tasks: OnboardingTask[] = []
    for (const task of defaultTasks) {
      const created = await this.repository.addTask(onboardingId, task)
      tasks.push(created)
    }
    return tasks
  }
}

export default OnboardingService
