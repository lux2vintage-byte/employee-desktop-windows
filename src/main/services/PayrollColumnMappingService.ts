import { PayrollColumnMapping } from '@prisma/client'
import { PayrollColumnMappingRepository, PayrollColumnMappingFilterOptions } from '../repositories/PayrollColumnMappingRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

export interface CreatePayrollColumnMappingDto {
  columnCode?: string  // Opsiyonel - boş bırakılırsa sütun adından otomatik oluşturulur
  columnName: string
  columnType: 'income' | 'deduction' | 'info'  // info: Sıra no, sicil no, isim gibi bilgi alanları
  category?: string
  parameterTypes?: string[] // Opsiyonel - Bordro Hesaplama Kuralları için gerekli
  formula?: string // Opsiyonel - Bordro Hesaplama Kuralları için gerekli
  formulaType?: 'simple' | 'bracket' | 'custom'
  sortOrder?: number
  isActive?: boolean
  description?: string
  // Bordro Tasarımı için ek alanlar
  dataType?: string
  columnWidth?: string
}

export interface UpdatePayrollColumnMappingDto {
  columnName?: string
  category?: string
  parameterTypes?: string[]
  formula?: string
  formulaType?: 'simple' | 'bracket' | 'custom'
  sortOrder?: number
  isActive?: boolean
  description?: string
}

/**
 * PayrollColumnMappingService - Bordro sütun eşleştirme iş mantığı
 * Bordro hesaplamasında hangi sütunda hangi parametrelerin kullanılacağını yönetir
 */
export class PayrollColumnMappingService {
  constructor(private repository: PayrollColumnMappingRepository) { }

  /**
   * Sütun adından benzersiz sütun kodu oluştur
   * Türkçe karakterleri dönüştürür ve benzersizlik kontrolü yapar
   */
  async generateColumnCode(columnName: string): Promise<string> {
    // Türkçe karakter dönüşüm haritası
    const turkishChars: Record<string, string> = {
      'ç': 'c', 'Ç': 'c',
      'ğ': 'g', 'Ğ': 'g',
      'ı': 'i', 'I': 'i',
      'İ': 'i', 'i': 'i',
      'ö': 'o', 'Ö': 'o',
      'ş': 's', 'Ş': 's',
      'ü': 'u', 'Ü': 'u'
    }

    // Sütun adını dönüştür
    let code = columnName
      .toLowerCase()
      .split('')
      .map(char => turkishChars[char] || char)
      .join('')
      .replace(/[^a-z0-9\s]/g, '') // Sadece harf, rakam ve boşluk
      .trim()
      .replace(/\s+/g, '_') // Boşlukları alt çizgiye çevir
      .replace(/_+/g, '_') // Birden fazla alt çizgiyi tek alt çizgiye çevir

    // Boş kod kontrolü
    if (!code) {
      code = 'column'
    }

    // Maksimum uzunluk kontrolü (50 karakter)
    if (code.length > 50) {
      code = code.substring(0, 50)
    }

    // Benzersizlik kontrolü
    const baseCode = code
    let counter = 1

    while (await this.repository.findByColumnCode(code)) {
      code = `${baseCode}_${counter}`
      counter++

      // Sonsuz döngü koruması
      if (counter > 100) {
        code = `${baseCode}_${Date.now()}`
        break
      }
    }

    return code
  }

  /**
   * Tüm eşleştirmeleri getir
   */
  async findAll(options: PayrollColumnMappingFilterOptions = {}): Promise<PaginatedResult<PayrollColumnMapping>> {
    return await this.repository.findAllWithFilters(options)
  }

  /**
   * ID ile eşleştirme getir
   */
  async findById(id: number): Promise<PayrollColumnMapping | null> {
    return await this.repository.findById(id)
  }

  /**
   * Sütun kodu ile eşleştirme getir
   */
  async findByColumnCode(columnCode: string): Promise<PayrollColumnMapping | null> {
    return await this.repository.findByColumnCode(columnCode)
  }

  /**
   * Aktif eşleştirmeleri getir
   */
  async findActive(): Promise<PayrollColumnMapping[]> {
    return await this.repository.findActive()
  }

  /**
   * Tipe göre eşleştirmeleri getir
   */
  async findByType(columnType: 'income' | 'deduction' | 'info'): Promise<PayrollColumnMapping[]> {
    return await this.repository.findByType(columnType)
  }

  /**
   * Yeni eşleştirme oluştur
   */
  async create(data: CreatePayrollColumnMappingDto, userId?: number): Promise<PayrollColumnMapping> {
    // Eğer columnCode gönderilmemişse veya boşsa, otomatik oluştur
    let columnCode = data.columnCode
    if (!columnCode || columnCode.trim() === '') {
      columnCode = await this.generateColumnCode(data.columnName)
    }

    // Parametre tiplerini JSON'a çevir - boşsa boş dizi olarak kaydet
    const createData = {
      ...data,
      columnCode,
      parameterTypes: JSON.stringify(data.parameterTypes || []),
      formula: data.formula || '',
      formulaType: data.formulaType || 'simple',
      sortOrder: data.sortOrder || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isSystem: false
    }

    return await this.repository.create(createData as any, userId)
  }

  /**
   * Eşleştirmeyi güncelle
   */
  async update(id: number, data: UpdatePayrollColumnMappingDto, userId?: number): Promise<PayrollColumnMapping> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error('Eşleştirme bulunamadı')
    }

    // Sistem eşleştirmelerinde bazı alanlar değiştirilemez
    if (existing.isSystem && data.formula !== undefined) {
      // Sistem eşleştirmelerinde formül değiştirilebilir ama dikkatli olunmalı
      console.warn(`Sistem eşleştirmesi "${existing.columnCode}" için formül değiştiriliyor`)
    }

    const updateData: any = { ...data }
    if (data.parameterTypes) {
      updateData.parameterTypes = JSON.stringify(data.parameterTypes)
    }

    return await this.repository.update(id, updateData, userId)
  }

  /**
   * Eşleştirmeyi sil
   */
  async delete(id: number, userId?: number): Promise<PayrollColumnMapping> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error('Eşleştirme bulunamadı')
    }

    if (existing.isSystem) {
      throw new Error('Sistem eşleştirmeleri silinemez')
    }

    return await this.repository.softDelete(id, userId)
  }

  /**
   * Varsayılan eşleştirmeleri oluştur
   */
  async seedDefaults(userId?: number): Promise<PayrollColumnMapping[]> {
    return await this.repository.seedDefaultMappings(userId)
  }

  /**
   * Eşleştirmenin parametre tiplerini parse et
   */
  parseParameterTypes(mapping: PayrollColumnMapping): string[] {
    try {
      return JSON.parse(mapping.parameterTypes)
    } catch {
      return []
    }
  }

  /**
   * Formül geçerliliğini kontrol et
   */
  validateFormula(formula: string): { valid: boolean; error?: string } {
    if (!formula || formula.trim() === '') {
      return { valid: false, error: 'Formül boş olamaz' }
    }

    // Temel değişken kontrolü
    const validVariables = [
      'base', 'gross', 'net', 'rate', 'amount', 'multiplier',
      'dailyWage', 'hourlyWage', 'hours', 'days',
      'taxBase', 'cumulativeBase', 'brackets',
      'advanceAmount', 'damageAmount', 'penaltyDays',
      'netSalary', 'sgkEmployee', 'unemploymentEmployee'
    ]

    // Basit kontrol - daha gelişmiş validasyon eklenebilir
    const hasValidStart = validVariables.some(v => formula.includes(v)) ||
      formula.startsWith('calculate')

    if (!hasValidStart) {
      return {
        valid: false,
        error: 'Formül geçerli bir değişken veya fonksiyon içermelidir'
      }
    }

    return { valid: true }
  }
}

export default PayrollColumnMappingService
