import { PrismaClient, EmployeeDetails } from '@prisma/client'
import { AuditLoggerService, AuditAction } from '../services/AuditLoggerService'

/**
 * EmployeeDetails with employee info
 */
export interface EmployeeDetailsWithEmployee extends EmployeeDetails {
  employee?: {
    id: number
    firstName: string
    lastName: string
    employeeCode: string
  } | null
}

/**
 * EmployeeDetailsRepository - Personel detay bilgileri veritabanı işlemleri
 * One-to-one ilişki yönetimi
 * Requirements: 5.1, 5.2
 */
export class EmployeeDetailsRepository {
  private prisma: PrismaClient
  private auditLogger: AuditLoggerService | null = null

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
  private toPlain(data: any): any {
    if (!data) return null
    return JSON.parse(JSON.stringify(data))
  }

  /**
   * Audit log kaydı oluştur
   */
  private async logAudit(
    action: AuditAction,
    recordId: number,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    userId?: number
  ): Promise<void> {
    if (this.auditLogger) {
      await this.auditLogger.log({
        tableName: 'employeeDetails',
        recordId,
        action,
        oldValues,
        newValues,
        userId
      })
    }
  }

  /**
   * Personel ID ile detay bilgilerini getir
   * Requirements: 5.2
   */
  async findByEmployeeId(employeeId: number): Promise<EmployeeDetails | null> {
    const result = await this.prisma.employeeDetails.findUnique({
      where: { employeeId }
    })
    return this.toPlain(result)
  }

  /**
   * Personel ID ile detay bilgilerini personel bilgileriyle birlikte getir
   */
  async findByEmployeeIdWithEmployee(employeeId: number): Promise<EmployeeDetailsWithEmployee | null> {
    const result = await this.prisma.employeeDetails.findUnique({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })
    return this.toPlain(result)
  }

  /**
   * ID ile detay bilgilerini getir
   */
  async findById(id: number): Promise<EmployeeDetails | null> {
    const result = await this.prisma.employeeDetails.findUnique({
      where: { id }
    })
    return this.toPlain(result)
  }

  /**
   * Detay bilgisi oluştur
   * Requirements: 5.1, 5.2
   */
  async create(
    data: Omit<EmployeeDetails, 'id' | 'createdAt' | 'updatedAt'>,
    userId?: number
  ): Promise<EmployeeDetails> {
    // One-to-one kontrolü - zaten var mı?
    const existing = await this.findByEmployeeId(data.employeeId)
    if (existing) {
      throw new Error(`Bu personel için detay bilgisi zaten mevcut: ${data.employeeId}`)
    }

    const result = await this.prisma.employeeDetails.create({
      data
    })

    // Audit log
    await this.logAudit('INSERT', result.id, undefined, this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Detay bilgisi güncelle
   */
  async update(
    employeeId: number,
    data: Partial<Omit<EmployeeDetails, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>>,
    userId?: number
  ): Promise<EmployeeDetails> {
    // Mevcut kaydı al
    const existing = await this.findByEmployeeId(employeeId)
    if (!existing) {
      throw new Error(`Personel detay bilgisi bulunamadı: ${employeeId}`)
    }

    const result = await this.prisma.employeeDetails.update({
      where: { employeeId },
      data
    })

    // Audit log
    await this.logAudit('UPDATE', result.id, this.toPlain(existing), this.toPlain(result), userId)

    return this.toPlain(result)
  }

  /**
   * Detay bilgisi sil
   */
  async delete(employeeId: number, userId?: number): Promise<EmployeeDetails> {
    // Mevcut kaydı al
    const existing = await this.findByEmployeeId(employeeId)
    if (!existing) {
      throw new Error(`Personel detay bilgisi bulunamadı: ${employeeId}`)
    }

    const result = await this.prisma.employeeDetails.delete({
      where: { employeeId }
    })

    // Audit log
    await this.logAudit('DELETE', result.id, this.toPlain(existing), undefined, userId)

    return this.toPlain(result)
  }

  /**
   * Personel için detay bilgisi var mı kontrol et
   * Requirements: 5.2
   */
  async existsForEmployee(employeeId: number): Promise<boolean> {
    const count = await this.prisma.employeeDetails.count({
      where: { employeeId }
    })
    return count > 0
  }

  /**
   * Personel var mı kontrol et
   */
  async employeeExists(employeeId: number): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: {
        id: employeeId,
        deletedAt: null
      }
    })
    return count > 0
  }

  /**
   * Upsert - varsa güncelle, yoksa oluştur
   */
  async upsert(
    employeeId: number,
    data: Omit<EmployeeDetails, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>,
    userId?: number
  ): Promise<EmployeeDetails> {
    const existing = await this.findByEmployeeId(employeeId)

    if (existing) {
      return await this.update(employeeId, data, userId)
    } else {
      return await this.create({ ...data, employeeId } as any, userId)
    }
  }

  /**
   * Tüm detay bilgilerini getir
   */
  async findAll(): Promise<EmployeeDetailsWithEmployee[]> {
    const result = await this.prisma.employeeDetails.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return this.toPlain(result)
  }

  /**
   * Kan grubuna göre personelleri getir
   */
  async findByBloodGroup(bloodGroup: string): Promise<EmployeeDetailsWithEmployee[]> {
    const result = await this.prisma.employeeDetails.findMany({
      where: { bloodGroup },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })
    return this.toPlain(result)
  }

  /**
   * Askerlik durumuna göre personelleri getir
   */
  async findByMilitaryStatus(militaryStatus: string): Promise<EmployeeDetailsWithEmployee[]> {
    const result = await this.prisma.employeeDetails.findMany({
      where: { militaryStatus },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true
          }
        }
      }
    })
    return this.toPlain(result)
  }
}

export default EmployeeDetailsRepository
