import { PrismaClient, ExitInterview } from '@prisma/client'
import { AuditLoggerService, AuditAction } from '../services/AuditLoggerService'

/**
 * ExitInterview with relations type
 */
export interface ExitInterviewWithRelations extends ExitInterview {
  resignation?: {
    id: number
    employeeId: number
    reasonCategory: string
    status: string
    lastWorkingDay: Date | null
    employee?: {
      id: number
      firstName: string
      lastName: string
      employeeCode: string
    } | null
  } | null
}

/**
 * ExitInterviewRepository - Çıkış mülakatı veritabanı işlemleri
 * One-to-one ilişki yönetimi
 * Requirements: 19.5, 19.6
 */
export class ExitInterviewRepository {
  protected prisma: PrismaClient
  protected auditLogger: AuditLoggerService | null = null

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Audit logger'ı ayarla
   */
  setAuditLogger(auditLogger: AuditLoggerService): void {
    this.auditLogger = auditLogger
  }

  /**
   * Prisma objesini plain object'e çevir
   */
  protected toPlain(data: any): any {
    if (!data) return null
    return JSON.parse(JSON.stringify(data))
  }

  /**
   * Audit log kaydı oluştur
   */
  protected async logAudit(
    action: AuditAction,
    recordId: number,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    userId?: number
  ): Promise<void> {
    if (this.auditLogger) {
      await this.auditLogger.log({
        tableName: 'exitInterview',
        recordId,
        action,
        oldValues,
        newValues,
        userId
      })
    }
  }

  /**
   * Tüm çıkış mülakatlarını getir
   */
  async findAll(): Promise<ExitInterviewWithRelations[]> {
    const result = await this.prisma.exitInterview.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        resignation: {
          select: {
            id: true,
            employeeId: true,
            reasonCategory: true,
            status: true,
            lastWorkingDay: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true
              }
            }
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * ID ile çıkış mülakatı getir
   */
  async findById(id: number): Promise<ExitInterviewWithRelations | null> {
    const result = await this.prisma.exitInterview.findUnique({
      where: { id },
      include: {
        resignation: {
          select: {
            id: true,
            employeeId: true,
            reasonCategory: true,
            status: true,
            lastWorkingDay: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true
              }
            }
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Resignation ID ile çıkış mülakatı getir
   * Requirements: 19.6 - One-to-one ilişki
   */
  async findByResignationId(resignationId: number): Promise<ExitInterviewWithRelations | null> {
    const result = await this.prisma.exitInterview.findUnique({
      where: { resignationId },
      include: {
        resignation: {
          select: {
            id: true,
            employeeId: true,
            reasonCategory: true,
            status: true,
            lastWorkingDay: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true
              }
            }
          }
        }
      }
    })

    return this.toPlain(result)
  }

  /**
   * Çıkış mülakatı oluştur
   * Requirements: 19.5, 19.6
   */
  async create(data: { resignationId: number; comments?: string; wouldRehire?: boolean }, userId?: number): Promise<ExitInterview> {
    const result = await this.prisma.exitInterview.create({
      data: {
        resignationId: data.resignationId,
        comments: data.comments,
        wouldRehire: data.wouldRehire
      }
    })

    // Audit log
    await this.logAudit('INSERT', result.id, undefined, this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Çıkış mülakatı güncelle
   */
  async update(id: number, data: { comments?: string; wouldRehire?: boolean }, userId?: number): Promise<ExitInterview> {
    // Eski değerleri al
    const oldRecord = await this.findById(id)
    if (!oldRecord) {
      throw new Error(`Çıkış mülakatı bulunamadı: ${id}`)
    }

    const result = await this.prisma.exitInterview.update({
      where: { id },
      data
    })

    // Audit log
    await this.logAudit('UPDATE', id, this.toPlain(oldRecord), this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Çıkış mülakatı sil
   */
  async delete(id: number, userId?: number): Promise<ExitInterview> {
    // Eski değerleri al
    const oldRecord = await this.findById(id)
    if (!oldRecord) {
      throw new Error(`Çıkış mülakatı bulunamadı: ${id}`)
    }

    const result = await this.prisma.exitInterview.delete({
      where: { id }
    })

    // Audit log
    await this.logAudit('DELETE', id, this.toPlain(oldRecord), undefined, userId)

    return this.toPlain(result)
  }

  /**
   * Resignation için çıkış mülakatı var mı kontrol et
   * Requirements: 19.6 - One-to-one ilişki kontrolü
   */
  async existsForResignation(resignationId: number): Promise<boolean> {
    const count = await this.prisma.exitInterview.count({
      where: { resignationId }
    })
    return count > 0
  }

  /**
   * Resignation var mı kontrol et
   */
  async resignationExists(resignationId: number): Promise<boolean> {
    const count = await this.prisma.resignation.count({
      where: {
        id: resignationId,
        deletedAt: null
      }
    })
    return count > 0
  }
}

export default ExitInterviewRepository
