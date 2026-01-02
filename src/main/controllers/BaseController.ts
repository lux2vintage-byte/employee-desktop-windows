export interface SuccessResponse<T = any> {
  success: true
  data: T
  message: string | null
}

export interface ErrorResponse {
  success: false
  errors: string[]
  statusCode: number
}

export interface PaginatedResponse<T = any> {
  success: true
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * Base Controller - Tüm controller'lar için temel sınıf
 */
export class BaseController {
  constructor() {}

  /**
   * Başarılı response
   */
  success<T>(data: T, message: string | null = null): SuccessResponse<T> {
    return {
      success: true,
      data,
      message
    }
  }

  /**
   * Hata response
   */
  error(errors: string | string[], statusCode: number = 400): ErrorResponse {
    return {
      success: false,
      errors: Array.isArray(errors) ? errors : [errors],
      statusCode
    }
  }

  /**
   * Validasyon hatası response
   */
  validationError(errors: string[]): ErrorResponse {
    return this.error(errors, 422)
  }

  /**
   * Sayfalanmış response
   */
  paginated<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Hata yakalama - detaylı hata mesajları
   */
  handleError(error: any, operation: string): ErrorResponse {
    // Prisma hataları
    if (error.code) {
      const prismaError = this.parsePrismaError(error, operation)
      if (prismaError) return prismaError
    }

    // Validasyon hataları
    if (error.name === 'ValidationError') {
      return this.error([`Doğrulama hatası: ${error.message}`], 422)
    }

    // Genel hatalar
    if (error.message) {
      return this.error([`${operation} hatası: ${error.message}`])
    }
    
    return this.error([`${operation} sırasında beklenmeyen bir hata oluştu`])
  }

  /**
   * Prisma hatalarını parse et
   */
  private parsePrismaError(error: any, operation: string): ErrorResponse | null {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target?.[0] || 'alan'
        return this.error([`Bu ${field} zaten kullanılıyor`], 409)
      
      case 'P2025':
        // Record not found
        return this.error([`${operation}: Kayıt bulunamadı`], 404)
      
      case 'P2003':
        // Foreign key constraint
        return this.error([`${operation}: İlişkili kayıt bulunamadı`], 400)
      
      case 'P2014':
        // Required relation violation
        return this.error([`${operation}: Zorunlu ilişki eksik`], 400)
      
      case 'P2021':
        // Table does not exist
        return this.error([`Veritabanı tablosu bulunamadı. Lütfen migration çalıştırın.`], 500)
      
      case 'P2024':
        // Connection timeout
        return this.error([`Veritabanı bağlantı zaman aşımı`], 503)
      
      default:
        if (error.code?.startsWith('P')) {
          return this.error([`Veritabanı hatası (${error.code}): ${error.message}`], 500)
        }
        return null
    }
  }
}

export default BaseController
