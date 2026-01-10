import { BaseController, SuccessResponse, ErrorResponse, PaginatedResponse } from './BaseController'
import { PayrollColumnMappingService, CreatePayrollColumnMappingDto, UpdatePayrollColumnMappingDto } from '../services/PayrollColumnMappingService'
import { PayrollColumnMapping } from '@prisma/client'

/**
 * PayrollColumnMappingController - Bordro sütun eşleştirme controller'ı
 * IPC üzerinden bordro-parametre eşleştirmelerini yönetir
 */
export class PayrollColumnMappingController extends BaseController {
  constructor(private service: PayrollColumnMappingService) {
    super()
  }

  /**
   * Tüm eşleştirmeleri getir
   */
  async getAll(options: {
    page?: number
    limit?: number
    columnType?: 'income' | 'deduction' | 'info'
    category?: string
    isActive?: boolean
  } = {}): Promise<PaginatedResponse<PayrollColumnMapping> | ErrorResponse> {
    try {
      const result = await this.service.findAll(options)
      return {
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      }
    } catch (error) {
      return this.handleError(error, 'Eşleştirmeler getirilirken')
    }
  }

  /**
   * ID ile eşleştirme getir
   */
  async getById(id: number): Promise<SuccessResponse<PayrollColumnMapping> | ErrorResponse> {
    try {
      const mapping = await this.service.findById(id)
      if (!mapping) {
        return this.error('Eşleştirme bulunamadı', 404)
      }
      return this.success(mapping)
    } catch (error) {
      return this.handleError(error, 'Eşleştirme getirilirken')
    }
  }

  /**
   * Sütun kodu ile eşleştirme getir
   */
  async getByColumnCode(columnCode: string): Promise<SuccessResponse<PayrollColumnMapping> | ErrorResponse> {
    try {
      const mapping = await this.service.findByColumnCode(columnCode)
      if (!mapping) {
        return this.error('Eşleştirme bulunamadı', 404)
      }
      return this.success(mapping)
    } catch (error) {
      return this.handleError(error, 'Eşleştirme getirilirken')
    }
  }

  /**
   * Aktif eşleştirmeleri getir
   */
  async getActive(): Promise<SuccessResponse<PayrollColumnMapping[]> | ErrorResponse> {
    try {
      const mappings = await this.service.findActive()
      return this.success(mappings)
    } catch (error) {
      return this.handleError(error, 'Aktif eşleştirmeler getirilirken')
    }
  }

  /**
   * Tipe göre eşleştirmeleri getir
   */
  async getByType(columnType: 'income' | 'deduction' | 'info'): Promise<SuccessResponse<PayrollColumnMapping[]> | ErrorResponse> {
    try {
      const mappings = await this.service.findByType(columnType)
      return this.success(mappings)
    } catch (error) {
      return this.handleError(error, 'Eşleştirmeler getirilirken')
    }
  }

  /**
   * Yeni eşleştirme oluştur
   */
  async create(data: CreatePayrollColumnMappingDto, userId?: number): Promise<SuccessResponse<PayrollColumnMapping> | ErrorResponse> {
    try {
      // Validasyon
      const errors = this.validateCreate(data)
      if (errors.length > 0) {
        return this.validationError(errors)
      }

      // Formül validasyonu - sadece formül gönderildiyse kontrol et
      if (data.formula && data.formula.trim() !== '') {
        const formulaValidation = this.service.validateFormula(data.formula)
        if (!formulaValidation.valid) {
          return this.validationError([formulaValidation.error!])
        }
      }

      const mapping = await this.service.create(data, userId)
      return this.success(mapping, 'Eşleştirme başarıyla oluşturuldu')
    } catch (error) {
      return this.handleError(error, 'Eşleştirme oluşturulurken')
    }
  }

  /**
   * Eşleştirme güncelle
   */
  async update(id: number, data: UpdatePayrollColumnMappingDto, userId?: number): Promise<SuccessResponse<PayrollColumnMapping> | ErrorResponse> {
    try {
      // Formül validasyonu
      if (data.formula) {
        const formulaValidation = this.service.validateFormula(data.formula)
        if (!formulaValidation.valid) {
          return this.validationError([formulaValidation.error!])
        }
      }

      const mapping = await this.service.update(id, data, userId)
      return this.success(mapping, 'Eşleştirme başarıyla güncellendi')
    } catch (error) {
      return this.handleError(error, 'Eşleştirme güncellenirken')
    }
  }

  /**
   * Eşleştirme sil
   */
  async delete(id: number, userId?: number): Promise<SuccessResponse<PayrollColumnMapping> | ErrorResponse> {
    try {
      const mapping = await this.service.delete(id, userId)
      return this.success(mapping, 'Eşleştirme başarıyla silindi')
    } catch (error) {
      return this.handleError(error, 'Eşleştirme silinirken')
    }
  }

  /**
   * Varsayılan eşleştirmeleri oluştur
   */
  async seedDefaults(userId?: number): Promise<SuccessResponse<PayrollColumnMapping[]> | ErrorResponse> {
    try {
      const mappings = await this.service.seedDefaults(userId)
      return this.success(mappings, `${mappings.length} varsayılan eşleştirme oluşturuldu`)
    } catch (error) {
      return this.handleError(error, 'Varsayılan eşleştirmeler oluşturulurken')
    }
  }

  /**
   * Formül geçerliliğini kontrol et
   */
  async validateFormula(formula: string): Promise<SuccessResponse<{ valid: boolean; error?: string }> | ErrorResponse> {
    try {
      const result = this.service.validateFormula(formula)
      return this.success(result)
    } catch (error) {
      return this.handleError(error, 'Formül doğrulanırken')
    }
  }

  /**
   * Oluşturma validasyonu
   */
  private validateCreate(data: CreatePayrollColumnMappingDto): string[] {
    const errors: string[] = []

    // columnCode opsiyonel - eğer gönderildiyse format kontrolü yap
    if (data.columnCode && data.columnCode.trim() !== '') {
      if (!/^[a-z_][a-z0-9_]*$/.test(data.columnCode)) {
        errors.push('Sütun kodu sadece küçük harf, rakam ve alt çizgi içerebilir ve harf veya alt çizgi ile başlamalıdır')
      }
    }

    if (!data.columnName || data.columnName.trim() === '') {
      errors.push('Sütun adı zorunludur')
    }

    if (!['income', 'deduction', 'info'].includes(data.columnType)) {
      errors.push('Sütun tipi "income", "deduction" veya "info" olmalıdır')
    }

    // Formül opsiyonel - Bordro Tasarımı için gerekmez, Bordro Hesaplama Kuralları için gerekir
    // Eğer formül gönderildiyse ve boş değilse validasyon yap
    if (data.formula && data.formula.trim() !== '') {
      const formulaValidation = this.service.validateFormula(data.formula)
      if (!formulaValidation.valid) {
        errors.push(formulaValidation.error!)
      }
    }

    // parameterTypes opsiyonel - gönderildiyse dizi olmalı
    if (data.parameterTypes !== undefined && !Array.isArray(data.parameterTypes)) {
      errors.push('Parametre tipleri dizi olmalıdır')
    }

    return errors
  }
}

export default PayrollColumnMappingController
