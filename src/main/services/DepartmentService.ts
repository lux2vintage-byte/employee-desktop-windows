import { Department } from '@prisma/client'
import { DepartmentRepository, DepartmentWithRelations, DepartmentTreeNode } from '../repositories/DepartmentRepository'
import { FindAllOptions, PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create Department DTO
 */
export interface CreateDepartmentDto {
  name: string
  managerId?: number | null
  parentDepartmentId?: number | null
  costCenterCode?: string | null
}

/**
 * Update Department DTO
 */
export interface UpdateDepartmentDto {
  name?: string
  managerId?: number | null
  parentDepartmentId?: number | null
  costCenterCode?: string | null
}

/**
 * Business Rule Error
 */
export class BusinessRuleError extends Error {
  constructor(
    public rule: string,
    public details: Record<string, unknown> = {}
  ) {
    super(`İş kuralı ihlali: ${rule}`)
    this.name = 'BusinessRuleError'
  }
}

/**
 * Validation Error
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public value: unknown,
    public constraint: string
  ) {
    super(`Doğrulama hatası - ${field}: ${constraint}`)
    this.name = 'ValidationError'
  }
}

/**
 * DepartmentService - Departman iş mantığı
 * CRUD operasyonları, isim benzersizliği kontrolü, alt departman kontrolü, hiyerarşi ağacı
 * Requirements: 2.2, 2.4, 2.5, 2.7
 */
export class DepartmentService {
  private repository: DepartmentRepository

  constructor(repository: DepartmentRepository) {
    this.repository = repository
  }

  /**
   * Tüm departmanları getir
   */
  async findAll(options: FindAllOptions = {}): Promise<PaginatedResult<DepartmentWithRelations>> {
    return await this.repository.findAllWithRelations(options)
  }

  /**
   * ID ile departman getir
   */
  async findById(id: number): Promise<DepartmentWithRelations | null> {
    return await this.repository.findByIdWithRelations(id)
  }

  /**
   * Departman oluştur
   * Requirements: 2.2, 2.7
   */
  async create(data: CreateDepartmentDto, userId?: number): Promise<Department> {
    // Validasyon
    await this.validateCreate(data)

    // Oluştur
    return await this.repository.create(data as any, userId)
  }

  /**
   * Departman güncelle
   * Requirements: 2.2, 2.7
   */
  async update(id: number, data: UpdateDepartmentDto, userId?: number): Promise<Department> {
    // Departmanın var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Departman bulunamadı', { id })
    }

    // Validasyon
    await this.validateUpdate(id, data)

    // Güncelle
    return await this.repository.update(id, data as any, userId)
  }

  /**
   * Departman sil (soft delete)
   * Requirements: 2.4
   */
  async delete(id: number, userId?: number): Promise<Department> {
    // Departmanın var olduğunu kontrol et
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Departman bulunamadı', { id })
    }

    // Alt departman kontrolü
    const hasChildren = await this.repository.hasChildren(id)
    if (hasChildren) {
      throw new BusinessRuleError('Alt departmanları olan departman silinemez', { id })
    }

    // Çalışan kontrolü
    const hasEmployees = await this.repository.hasEmployees(id)
    if (hasEmployees) {
      throw new BusinessRuleError('Çalışanları olan departman silinemez', { id })
    }

    // Pozisyon kontrolü
    const hasPositions = await this.repository.hasPositions(id)
    if (hasPositions) {
      throw new BusinessRuleError('Pozisyonları olan departman silinemez', { id })
    }

    // Soft delete
    return await this.repository.softDelete(id, userId)
  }

  /**
   * Departmanı geri yükle
   */
  async restore(id: number, userId?: number): Promise<Department> {
    return await this.repository.restore(id, userId)
  }

  /**
   * Departman hiyerarşisini getir
   * Requirements: 2.6
   */
  async getHierarchy(): Promise<DepartmentTreeNode[]> {
    return await this.repository.getHierarchy()
  }

  /**
   * Alt departmanları getir
   * Requirements: 2.6
   */
  async getChildren(parentId: number): Promise<Department[]> {
    return await this.repository.findChildren(parentId)
  }

  /**
   * Kök departmanları getir
   */
  async getRootDepartments(): Promise<Department[]> {
    return await this.repository.findRootDepartments()
  }

  /**
   * Tüm alt departmanları recursive olarak getir
   */
  async getAllDescendants(departmentId: number): Promise<Department[]> {
    return await this.repository.getAllDescendants(departmentId)
  }

  /**
   * Yönetici ata
   * Requirements: 2.5
   */
  async assignManager(departmentId: number, managerId: number | null, userId?: number): Promise<Department> {
    // Departmanın var olduğunu kontrol et
    const existing = await this.repository.findById(departmentId)
    if (!existing) {
      throw new BusinessRuleError('Departman bulunamadı', { departmentId })
    }

    // Yönetici ID'si verilmişse, çalışanın var olduğunu kontrol et
    if (managerId !== null) {
      const managerExists = await this.checkEmployeeExists(managerId)
      if (!managerExists) {
        throw new BusinessRuleError('Yönetici olarak atanacak çalışan bulunamadı', { managerId })
      }
    }

    return await this.repository.assignManager(departmentId, managerId, userId)
  }

  /**
   * İsme göre departman ara
   */
  async findByName(name: string): Promise<Department[]> {
    return await this.repository.findByName(name)
  }

  /**
   * Cost center code ile departman bul
   */
  async findByCostCenterCode(costCenterCode: string): Promise<Department | null> {
    return await this.repository.findByCostCenterCode(costCenterCode)
  }

  /**
   * Alt departman var mı kontrol et
   */
  async hasChildren(departmentId: number): Promise<boolean> {
    return await this.repository.hasChildren(departmentId)
  }

  /**
   * Create validasyonu
   */
  private async validateCreate(data: CreateDepartmentDto): Promise<void> {
    // İsim zorunlu
    if (!data.name || data.name.trim() === '') {
      throw new ValidationError('name', data.name, 'Departman adı zorunludur')
    }

    // İsim benzersizliği kontrolü (aynı parent içinde)
    // Requirements: 2.2
    const isUnique = await this.repository.isNameUniqueWithinParent(
      data.name,
      data.parentDepartmentId ?? null
    )
    if (!isUnique) {
      throw new BusinessRuleError('Bu isimde bir departman zaten mevcut', {
        name: data.name,
        parentDepartmentId: data.parentDepartmentId
      })
    }

    // Parent departman kontrolü
    if (data.parentDepartmentId) {
      const parentExists = await this.repository.exists(data.parentDepartmentId)
      if (!parentExists) {
        throw new BusinessRuleError('Üst departman bulunamadı', {
          parentDepartmentId: data.parentDepartmentId
        })
      }
    }

    // Cost center code benzersizliği kontrolü
    // Requirements: 2.7
    if (data.costCenterCode) {
      const isCostCenterUnique = await this.repository.isCostCenterCodeUnique(data.costCenterCode)
      if (!isCostCenterUnique) {
        throw new BusinessRuleError('Bu maliyet merkezi kodu zaten kullanılıyor', {
          costCenterCode: data.costCenterCode
        })
      }
    }

    // Yönetici kontrolü
    if (data.managerId) {
      const managerExists = await this.checkEmployeeExists(data.managerId)
      if (!managerExists) {
        throw new BusinessRuleError('Yönetici olarak atanacak çalışan bulunamadı', {
          managerId: data.managerId
        })
      }
    }
  }

  /**
   * Update validasyonu
   */
  private async validateUpdate(id: number, data: UpdateDepartmentDto): Promise<void> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new BusinessRuleError('Departman bulunamadı', { id })
    }

    // İsim değişiyorsa benzersizlik kontrolü
    // Requirements: 2.2
    if (data.name !== undefined) {
      if (!data.name || data.name.trim() === '') {
        throw new ValidationError('name', data.name, 'Departman adı boş olamaz')
      }

      const parentId = data.parentDepartmentId !== undefined
        ? data.parentDepartmentId
        : existing.parentDepartmentId

      const isUnique = await this.repository.isNameUniqueWithinParent(
        data.name,
        parentId,
        id
      )
      if (!isUnique) {
        throw new BusinessRuleError('Bu isimde bir departman zaten mevcut', {
          name: data.name,
          parentDepartmentId: parentId
        })
      }
    }

    // Parent değişiyorsa kontroller
    if (data.parentDepartmentId !== undefined && data.parentDepartmentId !== existing.parentDepartmentId) {
      // Kendisini parent olarak atayamaz
      if (data.parentDepartmentId === id) {
        throw new BusinessRuleError('Departman kendisinin üst departmanı olamaz', { id })
      }

      // Parent departman kontrolü
      if (data.parentDepartmentId !== null) {
        const parentExists = await this.repository.exists(data.parentDepartmentId)
        if (!parentExists) {
          throw new BusinessRuleError('Üst departman bulunamadı', {
            parentDepartmentId: data.parentDepartmentId
          })
        }

        // Döngüsel referans kontrolü - alt departmanını parent olarak atayamaz
        const descendants = await this.repository.getAllDescendants(id)
        const isDescendant = descendants.some(d => d.id === data.parentDepartmentId)
        if (isDescendant) {
          throw new BusinessRuleError('Alt departman üst departman olarak atanamaz', {
            id,
            parentDepartmentId: data.parentDepartmentId
          })
        }
      }

      // İsim benzersizliği yeni parent altında kontrol edilmeli
      const nameToCheck = data.name ?? existing.name
      const isUnique = await this.repository.isNameUniqueWithinParent(
        nameToCheck,
        data.parentDepartmentId,
        id
      )
      if (!isUnique) {
        throw new BusinessRuleError('Hedef departmanda bu isimde bir departman zaten mevcut', {
          name: nameToCheck,
          parentDepartmentId: data.parentDepartmentId
        })
      }
    }

    // Cost center code değişiyorsa benzersizlik kontrolü
    // Requirements: 2.7
    if (data.costCenterCode !== undefined && data.costCenterCode !== existing.costCenterCode) {
      if (data.costCenterCode !== null) {
        const isCostCenterUnique = await this.repository.isCostCenterCodeUnique(
          data.costCenterCode,
          id
        )
        if (!isCostCenterUnique) {
          throw new BusinessRuleError('Bu maliyet merkezi kodu zaten kullanılıyor', {
            costCenterCode: data.costCenterCode
          })
        }
      }
    }

    // Yönetici değişiyorsa kontrol
    if (data.managerId !== undefined && data.managerId !== existing.managerId) {
      if (data.managerId !== null) {
        const managerExists = await this.checkEmployeeExists(data.managerId)
        if (!managerExists) {
          throw new BusinessRuleError('Yönetici olarak atanacak çalışan bulunamadı', {
            managerId: data.managerId
          })
        }
      }
    }
  }

  /**
   * Çalışan var mı kontrol et (Employee tablosunda)
   */
  private async checkEmployeeExists(employeeId: number): Promise<boolean> {
    const count = await (this.repository as any).prisma.employee.count({
      where: {
        id: employeeId,
        deletedAt: null
      }
    })
    return count > 0
  }
}

export default DepartmentService
