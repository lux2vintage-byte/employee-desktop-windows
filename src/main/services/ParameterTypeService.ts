import { ParameterType } from '@prisma/client'
import { ParameterTypeRepository, ParameterTypeFilterOptions } from '../repositories/ParameterTypeRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * ParameterType oluşturma DTO
 */
export interface CreateParameterTypeDto {
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
  isSystem?: boolean
}

/**
 * İsimden kod oluştur (Türkçe karakterleri dönüştür, boşlukları kaldır, PascalCase yap)
 */
function generateCodeFromName(name: string): string {
  // Türkçe karakter dönüşümü
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I',
    'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
  }
  
  let result = name
  for (const [tr, en] of Object.entries(turkishMap)) {
    result = result.replace(new RegExp(tr, 'g'), en)
  }
  
  // Özel karakterleri kaldır, kelimelere ayır ve PascalCase yap
  return result
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

/**
 * ParameterType güncelleme DTO
 */
export interface UpdateParameterTypeDto {
  name?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

/**
 * İş kuralı hatası
 */
export class ParameterTypeBusinessRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterTypeBusinessRuleError'
  }
}

/**
 * Doğrulama hatası
 */
export class ParameterTypeValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterTypeValidationError'
  }
}

/**
 * ParameterTypeService - Parametre türleri iş mantığı
 */
export class ParameterTypeService {
  constructor(private repository: ParameterTypeRepository) {}

  /**
   * Yeni parametre türü oluştur
   */
  async create(data: CreateParameterTypeDto, userId?: number): Promise<ParameterType> {
    // Validasyon
    if (!data.name || data.name.trim().length === 0) {
      throw new ParameterTypeValidationError('Parametre adı zorunludur')
    }

    // İsimden otomatik kod oluştur
    const code = generateCodeFromName(data.name)
    
    // Kod benzersizlik kontrolü - aynı kod varsa sonuna sayı ekle
    let finalCode = code
    let counter = 1
    while (await this.repository.findByCode(finalCode)) {
      finalCode = `${code}${counter}`
      counter++
    }

    return await this.repository.create({
      ...data,
      code: finalCode,
      name: data.name.trim(),
      isActive: data.isActive ?? true,
      isSystem: data.isSystem ?? false,
      sortOrder: data.sortOrder ?? 0
    } as any, userId)
  }

  /**
   * ID ile parametre türü getir
   */
  async findById(id: number): Promise<ParameterType | null> {
    return await this.repository.findById(id)
  }

  /**
   * Kod ile parametre türü getir
   */
  async findByCode(code: string): Promise<ParameterType | null> {
    return await this.repository.findByCode(code)
  }

  /**
   * Tüm parametre türlerini filtrelerle getir
   */
  async findAll(options: ParameterTypeFilterOptions = {}): Promise<PaginatedResult<ParameterType>> {
    return await this.repository.findAllWithFilters(options)
  }

  /**
   * Tüm parametre türlerini sayfalama olmadan getir
   */
  async findAllWithoutPagination(): Promise<ParameterType[]> {
    return await this.repository.findAllWithoutPagination()
  }

  /**
   * Tüm aktif parametre türlerini getir
   */
  async findAllActive(): Promise<ParameterType[]> {
    return await this.repository.findAllActive()
  }

  /**
   * Kategoriye göre parametre türlerini getir
   */
  async findByCategory(category: string): Promise<ParameterType[]> {
    return await this.repository.findByCategory(category)
  }

  /**
   * Parametre türü güncelle
   */
  async update(id: number, data: UpdateParameterTypeDto, userId?: number): Promise<ParameterType> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new ParameterTypeBusinessRuleError('Parametre türü bulunamadı')
    }

    const updateData: any = { ...data }
    
    // İsim değiştiyse kodu da güncelle (sistem parametresi değilse)
    if (data.name && data.name !== existing.name && !existing.isSystem) {
      const newCode = generateCodeFromName(data.name)
      let finalCode = newCode
      let counter = 1
      // Aynı kayıt hariç benzersizlik kontrolü
      let existingByCode = await this.repository.findByCode(finalCode)
      while (existingByCode && existingByCode.id !== id) {
        finalCode = `${newCode}${counter}`
        counter++
        existingByCode = await this.repository.findByCode(finalCode)
      }
      updateData.code = finalCode
    }
    
    if (data.name) updateData.name = data.name.trim()

    return await this.repository.update(id, updateData, userId)
  }

  /**
   * Parametre türü sil
   */
  async delete(id: number, userId?: number): Promise<ParameterType> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new ParameterTypeBusinessRuleError('Parametre türü bulunamadı')
    }

    // Sistem parametresi silinemez
    if (existing.isSystem) {
      throw new ParameterTypeBusinessRuleError('Sistem parametresi silinemez')
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Varsayılan parametre türlerini oluştur
   */
  async seedDefaults(userId?: number): Promise<ParameterType[]> {
    return await this.repository.seedDefaults(userId)
  }

  /**
   * Tüm kategorileri getir
   */
  async getCategories(): Promise<string[]> {
    return await this.repository.getCategories()
  }
}

export default ParameterTypeService
