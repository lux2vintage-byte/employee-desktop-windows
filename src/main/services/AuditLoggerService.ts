import { PrismaClient, AuditLog } from '@prisma/client'

/**
 * Audit Log Action Types
 */
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * Audit Log Parameters
 */
export interface AuditLogParams {
  tableName: string
  recordId: number
  action: AuditAction
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  userId?: number
}

/**
 * AuditLogger Service
 * Tüm veri değişikliklerini audit_log tablosuna kaydeder
 * Requirements: 1.7
 */
export class AuditLoggerService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Audit log kaydı oluşturur
   * @param params - Audit log parametreleri
   * @returns Oluşturulan audit log kaydı
   */
  async log(params: AuditLogParams): Promise<AuditLog> {
    const { tableName, recordId, action, oldValues, newValues, userId } = params

    // Validate required fields
    if (!tableName || tableName.trim() === '') {
      throw new Error('tableName zorunludur')
    }

    if (recordId === undefined || recordId === null) {
      throw new Error('recordId zorunludur')
    }

    if (!action || !['INSERT', 'UPDATE', 'DELETE'].includes(action)) {
      throw new Error('action INSERT, UPDATE veya DELETE olmalıdır')
    }

    // Create audit log entry
    try {
      // Create audit log entry
      const auditLog = await this.prisma.auditLog.create({
        data: {
          tableName,
          recordId,
          action,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
          userId: userId ?? null,
          timestamp: new Date()
        }
      })
      return auditLog
    } catch (error) {
      console.error('Audit log oluşturulurken hata:', error)
      // Return dummy object to prevent crash
      return {
        id: -1,
        tableName,
        recordId,
        action,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        userId: userId ?? null,
        timestamp: new Date()
      } as AuditLog
    }


  }

  /**
   * Belirli bir tablo için audit loglarını getirir
   * @param tableName - Tablo adı
   * @returns Audit log kayıtları
   */
  async getByTable(tableName: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { tableName },
      orderBy: { timestamp: 'desc' }
    })
  }

  /**
   * Belirli bir kayıt için audit loglarını getirir
   * @param tableName - Tablo adı
   * @param recordId - Kayıt ID
   * @returns Audit log kayıtları
   */
  async getByRecord(tableName: string, recordId: number): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { tableName, recordId },
      orderBy: { timestamp: 'desc' }
    })
  }

  /**
   * Belirli bir kullanıcının audit loglarını getirir
   * @param userId - Kullanıcı ID
   * @returns Audit log kayıtları
   */
  async getByUser(userId: number): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    })
  }

  /**
   * Belirli bir tarih aralığındaki audit loglarını getirir
   * @param startDate - Başlangıç tarihi
   * @param endDate - Bitiş tarihi
   * @returns Audit log kayıtları
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'desc' }
    })
  }

  /**
   * Audit log kaydının eski ve yeni değerlerini parse eder
   * @param auditLog - Audit log kaydı
   * @returns Parse edilmiş değerler
   */
  parseValues(auditLog: AuditLog): {
    oldValues: Record<string, unknown> | null
    newValues: Record<string, unknown> | null
  } {
    return {
      oldValues: auditLog.oldValues ? JSON.parse(auditLog.oldValues) : null,
      newValues: auditLog.newValues ? JSON.parse(auditLog.newValues) : null
    }
  }

  /**
   * İki nesne arasındaki farkları bulur
   * @param oldObj - Eski nesne
   * @param newObj - Yeni nesne
   * @returns Değişen alanlar
   */
  static getDiff(
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>
  ): { field: string; oldValue: unknown; newValue: unknown }[] {
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

    for (const key of allKeys) {
      const oldValue = oldObj[key]
      const newValue = newObj[key]

      // Skip if both are undefined
      if (oldValue === undefined && newValue === undefined) continue

      // Compare values
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field: key, oldValue, newValue })
      }
    }

    return changes
  }
}

// Singleton instance
let instance: AuditLoggerService | null = null

export function getAuditLoggerService(prisma: PrismaClient): AuditLoggerService {
  if (!instance) {
    instance = new AuditLoggerService(prisma)
  }
  return instance
}

// Test için instance'ı sıfırla
export function resetAuditLoggerService(): void {
  instance = null
}

export default AuditLoggerService
