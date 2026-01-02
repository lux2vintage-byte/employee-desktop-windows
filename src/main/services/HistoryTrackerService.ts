import { PrismaClient } from '@prisma/client'
import { AuditLoggerService } from './AuditLoggerService'

/**
 * Department Change Record
 */
export interface DepartmentChangeRecord {
  employeeId: number
  oldDepartmentId: number | null
  newDepartmentId: number
  oldPositionId: number | null
  newPositionId: number
  effectiveDate: Date
  reason?: string
}

/**
 * Position Change Record
 */
export interface PositionChangeRecord {
  employeeId: number
  oldPositionId: number | null
  newPositionId: number
  effectiveDate: Date
  reason?: string
}

/**
 * Salary Change Record
 */
export interface SalaryChangeRecord {
  employeeId: number
  oldAmount: number | null
  newAmount: number
  currency: string
  periodType: string
  effectiveDate: Date
  reason?: string
}

/**
 * History Entry
 */
export interface HistoryEntry {
  id: number
  employeeId: number
  changeType: 'DEPARTMENT' | 'POSITION' | 'SALARY'
  oldValue: string | null
  newValue: string
  effectiveDate: Date
  reason?: string
  createdAt: Date
}

/**
 * HistoryTrackerService - Personel değişiklik tarihçesi yönetimi
 * Departman, pozisyon ve maaş değişikliklerini tarihçe olarak kaydeder
 * Requirements: 4.8, 1.8
 */
export class HistoryTrackerService {
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
   * Departman değişikliğini kaydet
   * Requirements: 4.8
   */
  async trackDepartmentChange(
    employeeId: number,
    oldDepartmentId: number | null,
    newDepartmentId: number,
    oldPositionId: number | null,
    newPositionId: number,
    effectiveDate: Date = new Date(),
    reason?: string,
    userId?: number
  ): Promise<void> {
    // Departman isimleri al
    const [oldDept, newDept, oldPos, newPos] = await Promise.all([
      oldDepartmentId ? this.prisma.department.findUnique({ where: { id: oldDepartmentId }, select: { name: true } }) : null,
      this.prisma.department.findUnique({ where: { id: newDepartmentId }, select: { name: true } }),
      oldPositionId ? this.prisma.position.findUnique({ where: { id: oldPositionId }, select: { title: true } }) : null,
      this.prisma.position.findUnique({ where: { id: newPositionId }, select: { title: true } })
    ])

    const oldValue = oldDept && oldPos 
      ? JSON.stringify({ departmentId: oldDepartmentId, departmentName: oldDept.name, positionId: oldPositionId, positionTitle: oldPos.title })
      : null

    const newValue = JSON.stringify({ 
      departmentId: newDepartmentId, 
      departmentName: newDept?.name || 'Unknown',
      positionId: newPositionId,
      positionTitle: newPos?.title || 'Unknown'
    })

    // Audit log kaydı
    if (this.auditLogger) {
      await this.auditLogger.log({
        tableName: 'employee_history',
        recordId: employeeId,
        action: 'UPDATE',
        oldValues: oldValue ? JSON.parse(oldValue) : undefined,
        newValues: JSON.parse(newValue),
        userId
      })
    }

    // Ayrıca özel bir tarihçe tablosu kullanılabilir
    // Şimdilik audit_log tablosunu kullanıyoruz
    await this.prisma.auditLog.create({
      data: {
        tableName: 'employee_department_history',
        recordId: employeeId,
        action: 'DEPARTMENT_CHANGE',
        oldValues: oldValue,
        newValues: newValue,
        userId
      }
    })
  }

  /**
   * Pozisyon değişikliğini kaydet (departman değişmeden)
   * Requirements: 4.8
   */
  async trackPositionChange(
    employeeId: number,
    oldPositionId: number | null,
    newPositionId: number,
    effectiveDate: Date = new Date(),
    reason?: string,
    userId?: number
  ): Promise<void> {
    // Pozisyon isimleri al
    const [oldPos, newPos] = await Promise.all([
      oldPositionId ? this.prisma.position.findUnique({ where: { id: oldPositionId }, select: { title: true } }) : null,
      this.prisma.position.findUnique({ where: { id: newPositionId }, select: { title: true } })
    ])

    const oldValue = oldPos 
      ? JSON.stringify({ positionId: oldPositionId, positionTitle: oldPos.title })
      : null

    const newValue = JSON.stringify({ 
      positionId: newPositionId,
      positionTitle: newPos?.title || 'Unknown',
      effectiveDate: effectiveDate.toISOString(),
      reason
    })

    // Audit log kaydı
    await this.prisma.auditLog.create({
      data: {
        tableName: 'employee_position_history',
        recordId: employeeId,
        action: 'POSITION_CHANGE',
        oldValues: oldValue,
        newValues: newValue,
        userId
      }
    })
  }

  /**
   * Maaş değişikliğini kaydet
   * Requirements: 1.8
   * 
   * Not: Bu metod SalaryHistory tablosunu kullanır.
   * Yeni maaş kaydı oluşturulduğunda önceki kaydın end_date'i güncellenir.
   */
  async trackSalaryChange(
    employeeId: number,
    newAmount: number,
    currency: string = 'TRY',
    periodType: string = 'Aylık',
    effectiveDate: Date = new Date(),
    userId?: number
  ): Promise<void> {
    // Mevcut aktif maaş kaydını bul
    const currentSalary = await this.prisma.salaryHistory.findFirst({
      where: {
        employeeId,
        endDate: null
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    // Mevcut kaydın end_date'ini güncelle
    if (currentSalary) {
      const endDate = new Date(effectiveDate)
      endDate.setDate(endDate.getDate() - 1) // Bir gün öncesi

      await this.prisma.salaryHistory.update({
        where: { id: currentSalary.id },
        data: { endDate }
      })
    }

    // Yeni maaş kaydı oluştur
    const newSalaryRecord = await this.prisma.salaryHistory.create({
      data: {
        employeeId,
        amount: newAmount,
        currency,
        periodType,
        startDate: effectiveDate,
        endDate: null
      }
    })

    // Audit log kaydı
    if (this.auditLogger) {
      await this.auditLogger.log({
        tableName: 'salary_history',
        recordId: newSalaryRecord.id,
        action: 'INSERT',
        oldValues: currentSalary ? {
          amount: currentSalary.amount,
          currency: currentSalary.currency,
          periodType: currentSalary.periodType
        } : undefined,
        newValues: {
          amount: newAmount,
          currency,
          periodType,
          startDate: effectiveDate.toISOString()
        },
        userId
      })
    }
  }

  /**
   * Personelin departman değişiklik tarihçesini getir
   */
  async getDepartmentHistory(employeeId: number): Promise<any[]> {
    const history = await this.prisma.auditLog.findMany({
      where: {
        recordId: employeeId,
        tableName: 'employee_department_history'
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    return history.map(entry => ({
      id: entry.id,
      employeeId: entry.recordId,
      changeType: 'DEPARTMENT',
      oldValue: entry.oldValues ? JSON.parse(entry.oldValues) : null,
      newValue: entry.newValues ? JSON.parse(entry.newValues) : null,
      timestamp: entry.timestamp,
      userId: entry.userId
    }))
  }

  /**
   * Personelin pozisyon değişiklik tarihçesini getir
   */
  async getPositionHistory(employeeId: number): Promise<any[]> {
    const history = await this.prisma.auditLog.findMany({
      where: {
        recordId: employeeId,
        tableName: 'employee_position_history'
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    return history.map(entry => ({
      id: entry.id,
      employeeId: entry.recordId,
      changeType: 'POSITION',
      oldValue: entry.oldValues ? JSON.parse(entry.oldValues) : null,
      newValue: entry.newValues ? JSON.parse(entry.newValues) : null,
      timestamp: entry.timestamp,
      userId: entry.userId
    }))
  }

  /**
   * Personelin maaş tarihçesini getir
   */
  async getSalaryHistory(employeeId: number): Promise<any[]> {
    const history = await this.prisma.salaryHistory.findMany({
      where: {
        employeeId
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    return history.map(entry => ({
      id: entry.id,
      employeeId: entry.employeeId,
      amount: entry.amount,
      currency: entry.currency,
      periodType: entry.periodType,
      startDate: entry.startDate,
      endDate: entry.endDate,
      isCurrent: entry.endDate === null
    }))
  }

  /**
   * Personelin güncel maaşını getir
   */
  async getCurrentSalary(employeeId: number): Promise<any | null> {
    const currentSalary = await this.prisma.salaryHistory.findFirst({
      where: {
        employeeId,
        endDate: null
      }
    })

    if (!currentSalary) return null

    return {
      id: currentSalary.id,
      employeeId: currentSalary.employeeId,
      amount: currentSalary.amount,
      currency: currentSalary.currency,
      periodType: currentSalary.periodType,
      startDate: currentSalary.startDate
    }
  }

  /**
   * Personelin tüm değişiklik tarihçesini getir
   */
  async getFullHistory(employeeId: number): Promise<{
    departmentChanges: any[]
    positionChanges: any[]
    salaryHistory: any[]
  }> {
    const [departmentChanges, positionChanges, salaryHistory] = await Promise.all([
      this.getDepartmentHistory(employeeId),
      this.getPositionHistory(employeeId),
      this.getSalaryHistory(employeeId)
    ])

    return {
      departmentChanges,
      positionChanges,
      salaryHistory
    }
  }
}

export default HistoryTrackerService
