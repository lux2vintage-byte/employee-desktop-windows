import { PrismaClient } from '@prisma/client'

/**
 * Report Service
 * Raporlama ve analiz işlemleri
 */
export class ReportService {
  constructor(private prisma: PrismaClient) {}

  // ==================== PERSONEL DAĞILIM RAPORU ====================
  
  /**
   * Departman bazlı personel dağılımı
   */
  async getEmployeeDistributionByDepartment(): Promise<any[]> {
    const result = await this.prisma.employee.groupBy({
      by: ['departmentId'],
      where: { deletedAt: null, status: 'Active' },
      _count: { id: true }
    })

    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    })

    const deptMap = new Map(departments.map(d => [d.id, d.name]))
    
    return result.map(r => ({
      departmentId: r.departmentId,
      departmentName: deptMap.get(r.departmentId) || 'Bilinmiyor',
      count: r._count.id
    }))
  }

  /**
   * Cinsiyet bazlı personel dağılımı
   */
  async getEmployeeDistributionByGender(): Promise<any[]> {
    const details = await this.prisma.employeeDetails.findMany({
      where: { employee: { deletedAt: null, status: 'Active' } },
      select: { gender: true }
    })

    const genderCount: Record<string, number> = {}
    details.forEach(d => {
      const gender = d.gender || 'Belirtilmemiş'
      genderCount[gender] = (genderCount[gender] || 0) + 1
    })

    return Object.entries(genderCount).map(([gender, count]) => ({ gender, count }))
  }

  /**
   * Yaş gruplarına göre personel dağılımı
   */
  async getEmployeeDistributionByAge(): Promise<any[]> {
    const details = await this.prisma.employeeDetails.findMany({
      where: { employee: { deletedAt: null, status: 'Active' } },
      select: { birthDate: true }
    })

    const ageGroups: Record<string, number> = {
      '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '55+': 0, 'Belirtilmemiş': 0
    }

    const now = new Date()
    details.forEach(d => {
      if (!d.birthDate) {
        ageGroups['Belirtilmemiş']++
        return
      }
      const age = Math.floor((now.getTime() - new Date(d.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (age < 26) ageGroups['18-25']++
      else if (age < 36) ageGroups['26-35']++
      else if (age < 46) ageGroups['36-45']++
      else if (age < 56) ageGroups['46-55']++
      else ageGroups['55+']++
    })

    return Object.entries(ageGroups).map(([ageGroup, count]) => ({ ageGroup, count }))
  }

  /**
   * Sözleşme türüne göre personel dağılımı
   */
  async getEmployeeDistributionByContractType(): Promise<any[]> {
    const result = await this.prisma.employee.groupBy({
      by: ['contractType'],
      where: { deletedAt: null, status: 'Active' },
      _count: { id: true }
    })

    return result.map(r => ({
      contractType: r.contractType,
      count: r._count.id
    }))
  }

  /**
   * Eğitim seviyesine göre personel dağılımı
   */
  async getEmployeeDistributionByEducation(): Promise<any[]> {
    const details = await this.prisma.employeeDetails.findMany({
      where: { employee: { deletedAt: null, status: 'Active' } },
      select: { educationLevel: true }
    })

    const eduCount: Record<string, number> = {}
    details.forEach(d => {
      const edu = d.educationLevel || 'Belirtilmemiş'
      eduCount[edu] = (eduCount[edu] || 0) + 1
    })

    return Object.entries(eduCount).map(([educationLevel, count]) => ({ educationLevel, count }))
  }

  /**
   * Kıdem yılına göre personel dağılımı
   */
  async getEmployeeDistributionBySeniority(): Promise<any[]> {
    const employees = await this.prisma.employee.findMany({
      where: { deletedAt: null, status: 'Active' },
      select: { hireDate: true }
    })

    const seniorityGroups: Record<string, number> = {
      '0-1 Yıl': 0, '1-3 Yıl': 0, '3-5 Yıl': 0, '5-10 Yıl': 0, '10+ Yıl': 0
    }

    const now = new Date()
    employees.forEach(e => {
      const years = (now.getTime() - new Date(e.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (years < 1) seniorityGroups['0-1 Yıl']++
      else if (years < 3) seniorityGroups['1-3 Yıl']++
      else if (years < 5) seniorityGroups['3-5 Yıl']++
      else if (years < 10) seniorityGroups['5-10 Yıl']++
      else seniorityGroups['10+ Yıl']++
    })

    return Object.entries(seniorityGroups).map(([seniority, count]) => ({ seniority, count }))
  }

  // ==================== PERSONEL MALİYET RAPORU ====================

  /**
   * Aylık personel maliyet raporu
   */
  async getMonthlyCostReport(year: number, month: number): Promise<any> {
    const payrolls = await this.prisma.payroll.findMany({
      where: { periodYear: year, periodMonth: month, deletedAt: null },
      include: { 
        employee: { 
          select: { firstName: true, lastName: true, employeeCode: true, departmentId: true }
        }
      }
    })

    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    })
    const deptMap = new Map(departments.map(d => [d.id, d.name]))

    const totalBaseSalary = payrolls.reduce((sum, p) => sum + p.baseSalary, 0)
    const totalAdditions = payrolls.reduce((sum, p) => sum + p.totalAdditions, 0)
    const totalDeductions = payrolls.reduce((sum, p) => sum + p.totalDeductions, 0)
    const totalNetSalary = payrolls.reduce((sum, p) => sum + p.netSalary, 0)

    // Departman bazlı maliyet
    const deptCosts: Record<number, { name: string; total: number; count: number }> = {}
    payrolls.forEach(p => {
      const deptId = p.employee.departmentId
      if (!deptCosts[deptId]) {
        deptCosts[deptId] = { name: deptMap.get(deptId) || 'Bilinmiyor', total: 0, count: 0 }
      }
      deptCosts[deptId].total += p.netSalary
      deptCosts[deptId].count++
    })

    return {
      period: { year, month },
      summary: {
        employeeCount: payrolls.length,
        totalBaseSalary,
        totalAdditions,
        totalDeductions,
        totalNetSalary,
        averageSalary: payrolls.length > 0 ? totalNetSalary / payrolls.length : 0
      },
      byDepartment: Object.values(deptCosts).map(d => ({
        ...d,
        average: d.count > 0 ? d.total / d.count : 0
      })),
      details: payrolls.map(p => ({
        employeeCode: p.employee.employeeCode,
        employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
        department: deptMap.get(p.employee.departmentId) || 'Bilinmiyor',
        baseSalary: p.baseSalary,
        additions: p.totalAdditions,
        deductions: p.totalDeductions,
        netSalary: p.netSalary
      }))
    }
  }

  /**
   * Yıllık personel maliyet raporu
   */
  async getYearlyCostReport(year: number): Promise<any> {
    const payrolls = await this.prisma.payroll.findMany({
      where: { periodYear: year, deletedAt: null },
      include: { employee: { select: { departmentId: true } } }
    })

    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    })
    const deptMap = new Map(departments.map(d => [d.id, d.name]))

    // Aylık toplam
    const monthlyTotals: Record<number, number> = {}
    for (let m = 1; m <= 12; m++) monthlyTotals[m] = 0
    payrolls.forEach(p => {
      monthlyTotals[p.periodMonth] += p.netSalary
    })

    // Departman bazlı yıllık toplam
    const deptYearly: Record<number, number> = {}
    payrolls.forEach(p => {
      const deptId = p.employee.departmentId
      deptYearly[deptId] = (deptYearly[deptId] || 0) + p.netSalary
    })

    const totalCost = payrolls.reduce((sum, p) => sum + p.netSalary, 0)

    return {
      year,
      totalCost,
      averageMonthly: totalCost / 12,
      monthlyTotals: Object.entries(monthlyTotals).map(([month, total]) => ({
        month: parseInt(month),
        total
      })),
      byDepartment: Object.entries(deptYearly).map(([deptId, total]) => ({
        departmentId: parseInt(deptId),
        departmentName: deptMap.get(parseInt(deptId)) || 'Bilinmiyor',
        total
      }))
    }
  }

  // ==================== TURNOVER RAPORU ====================

  /**
   * Personel devir hızı raporu
   */
  async getTurnoverReport(year: number): Promise<any> {
    // Yıl başı personel sayısı (önceki yılın son günü aktif olanlar)
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31)

    const startCount = await this.prisma.employee.count({
      where: {
        hireDate: { lt: startOfYear },
        OR: [
          { deletedAt: null },
          { deletedAt: { gte: startOfYear } }
        ]
      }
    })

    // Yıl içinde işe alınanlar
    const hired = await this.prisma.employee.count({
      where: {
        hireDate: { gte: startOfYear, lte: endOfYear }
      }
    })

    // Yıl içinde ayrılanlar
    const resignations = await this.prisma.resignation.findMany({
      where: {
        status: 'Completed',
        lastWorkingDay: { gte: startOfYear, lte: endOfYear }
      },
      include: {
        employee: {
          select: { departmentId: true }
        }
      }
    })

    const terminated = resignations.length

    // Yıl sonu personel sayısı
    const endCount = startCount + hired - terminated

    // Ortalama personel sayısı
    const avgCount = (startCount + endCount) / 2

    // Turnover oranı
    const turnoverRate = avgCount > 0 ? (terminated / avgCount) * 100 : 0

    // Aylık ayrılmalar
    const monthlyTerminations: Record<number, number> = {}
    for (let m = 1; m <= 12; m++) monthlyTerminations[m] = 0
    resignations.forEach(r => {
      if (r.lastWorkingDay) {
        const month = new Date(r.lastWorkingDay).getMonth() + 1
        monthlyTerminations[month]++
      }
    })

    // Ayrılma nedenlerine göre dağılım
    const reasonCounts: Record<string, number> = {}
    const allResignations = await this.prisma.resignation.findMany({
      where: {
        status: 'Completed',
        lastWorkingDay: { gte: startOfYear, lte: endOfYear }
      },
      select: { reasonCategory: true }
    })
    allResignations.forEach(r => {
      reasonCounts[r.reasonCategory] = (reasonCounts[r.reasonCategory] || 0) + 1
    })

    // Departman bazlı ayrılmalar
    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    })
    const deptMap = new Map(departments.map(d => [d.id, d.name]))

    const deptTerminations: Record<number, number> = {}
    resignations.forEach(r => {
      const deptId = r.employee.departmentId
      deptTerminations[deptId] = (deptTerminations[deptId] || 0) + 1
    })

    return {
      year,
      summary: {
        startCount,
        hired,
        terminated,
        endCount,
        turnoverRate: Math.round(turnoverRate * 100) / 100
      },
      monthlyTerminations: Object.entries(monthlyTerminations).map(([month, count]) => ({
        month: parseInt(month),
        count
      })),
      byReason: Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count })),
      byDepartment: Object.entries(deptTerminations).map(([deptId, count]) => ({
        departmentId: parseInt(deptId),
        departmentName: deptMap.get(parseInt(deptId)) || 'Bilinmiyor',
        count
      }))
    }
  }

  // ==================== İZİN KULLANIM RAPORU ====================

  /**
   * İzin kullanım raporu
   */
  async getLeaveUsageReport(year: number): Promise<any> {
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        status: 'Approved',
        startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) }
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true, departmentId: true } },
        leaveType: { select: { name: true } }
      }
    })

    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    })
    const deptMap = new Map(departments.map(d => [d.id, d.name]))

    // İzin türüne göre toplam
    const byType: Record<string, { count: number; days: number }> = {}
    leaveRequests.forEach(lr => {
      const typeName = lr.leaveType.name
      if (!byType[typeName]) byType[typeName] = { count: 0, days: 0 }
      byType[typeName].count++
      byType[typeName].days += lr.dayCount
    })

    // Aylık izin kullanımı
    const monthlyUsage: Record<number, number> = {}
    for (let m = 1; m <= 12; m++) monthlyUsage[m] = 0
    leaveRequests.forEach(lr => {
      const month = new Date(lr.startDate).getMonth() + 1
      monthlyUsage[month] += lr.dayCount
    })

    // Departman bazlı izin kullanımı
    const deptUsage: Record<number, number> = {}
    leaveRequests.forEach(lr => {
      const deptId = lr.employee.departmentId
      deptUsage[deptId] = (deptUsage[deptId] || 0) + lr.dayCount
    })

    // İzin bakiyeleri
    const balances = await this.prisma.leaveBalance.findMany({
      where: { year },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } }
    })

    const totalEntitlement = balances.reduce((sum, b) => sum + b.annualLeaveEntitlement + b.transferredDays, 0)
    const totalUsed = balances.reduce((sum, b) => sum + b.usedDays, 0)
    const totalRemaining = balances.reduce((sum, b) => sum + b.remainingDays, 0)

    return {
      year,
      summary: {
        totalRequests: leaveRequests.length,
        totalDays: leaveRequests.reduce((sum, lr) => sum + lr.dayCount, 0),
        totalEntitlement,
        totalUsed,
        totalRemaining,
        usageRate: totalEntitlement > 0 ? Math.round((totalUsed / totalEntitlement) * 100) : 0
      },
      byType: Object.entries(byType).map(([type, data]) => ({ type, ...data })),
      monthlyUsage: Object.entries(monthlyUsage).map(([month, days]) => ({
        month: parseInt(month),
        days
      })),
      byDepartment: Object.entries(deptUsage).map(([deptId, days]) => ({
        departmentId: parseInt(deptId),
        departmentName: deptMap.get(parseInt(deptId)) || 'Bilinmiyor',
        days
      }))
    }
  }

  // ==================== BORDRO ÖZET RAPORU ====================

  /**
   * Bordro özet raporu
   */
  async getPayrollSummaryReport(year: number, month?: number): Promise<any> {
    const where: any = { periodYear: year, deletedAt: null }
    if (month) where.periodMonth = month

    const payrolls = await this.prisma.payroll.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true, departmentId: true } },
        items: true
      }
    })

    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true }
    })
    const deptMap = new Map(departments.map(d => [d.id, d.name]))

    // Genel özet
    const totalBaseSalary = payrolls.reduce((sum, p) => sum + p.baseSalary, 0)
    const totalAdditions = payrolls.reduce((sum, p) => sum + p.totalAdditions, 0)
    const totalDeductions = payrolls.reduce((sum, p) => sum + p.totalDeductions, 0)
    const totalNetSalary = payrolls.reduce((sum, p) => sum + p.netSalary, 0)

    // Kalem kategorilerine göre dağılım
    const itemCategories: Record<string, { type: string; total: number }> = {}
    payrolls.forEach(p => {
      p.items.forEach(item => {
        const key = `${item.type}-${item.category}`
        if (!itemCategories[key]) {
          itemCategories[key] = { type: item.type, total: 0 }
        }
        itemCategories[key].total += item.amount
      })
    })

    // Departman bazlı özet
    const deptSummary: Record<number, { baseSalary: number; additions: number; deductions: number; netSalary: number; count: number }> = {}
    payrolls.forEach(p => {
      const deptId = p.employee.departmentId
      if (!deptSummary[deptId]) {
        deptSummary[deptId] = { baseSalary: 0, additions: 0, deductions: 0, netSalary: 0, count: 0 }
      }
      deptSummary[deptId].baseSalary += p.baseSalary
      deptSummary[deptId].additions += p.totalAdditions
      deptSummary[deptId].deductions += p.totalDeductions
      deptSummary[deptId].netSalary += p.netSalary
      deptSummary[deptId].count++
    })

    return {
      period: { year, month },
      summary: {
        employeeCount: payrolls.length,
        totalBaseSalary,
        totalAdditions,
        totalDeductions,
        totalNetSalary,
        averageSalary: payrolls.length > 0 ? totalNetSalary / payrolls.length : 0
      },
      byCategory: Object.entries(itemCategories).map(([key, data]) => ({
        category: key.split('-')[1],
        type: data.type,
        total: data.total
      })),
      byDepartment: Object.entries(deptSummary).map(([deptId, data]) => ({
        departmentId: parseInt(deptId),
        departmentName: deptMap.get(parseInt(deptId)) || 'Bilinmiyor',
        ...data
      }))
    }
  }

  // ==================== SGK / İŞKUR RAPORLARI ====================

  /**
   * SGK bildirim raporu (APHB formatı)
   */
  async getSGKReport(year: number, month: number): Promise<any> {
    const payrolls = await this.prisma.payroll.findMany({
      where: { periodYear: year, periodMonth: month, deletedAt: null, isFinalized: true },
      include: {
        employee: {
          include: {
            details: { select: { socialSecurityNumber: true } }
          }
        }
      }
    })

    // SGK parametrelerini al
    const sgkParams = await this.prisma.salaryParameter.findMany({
      where: { year, parameterType: { startsWith: 'SGK' }, isActive: true }
    })

    const employeeRate = sgkParams.find(p => p.parameterKey === 'employee_rate')?.parameterValue || 14
    const employerRate = sgkParams.find(p => p.parameterKey === 'employer_rate')?.parameterValue || 20.5

    const records = payrolls.map(p => {
      const sgkMatrah = p.baseSalary // Basitleştirilmiş
      const employeePremium = sgkMatrah * (employeeRate / 100)
      const employerPremium = sgkMatrah * (employerRate / 100)

      return {
        employeeCode: p.employee.employeeCode,
        employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
        ssn: p.employee.details?.socialSecurityNumber || '',
        workDays: 30, // Varsayılan
        sgkMatrah,
        employeePremium,
        employerPremium,
        totalPremium: employeePremium + employerPremium
      }
    })

    const totalEmployeePremium = records.reduce((sum, r) => sum + r.employeePremium, 0)
    const totalEmployerPremium = records.reduce((sum, r) => sum + r.employerPremium, 0)

    return {
      period: { year, month },
      summary: {
        employeeCount: records.length,
        totalSGKMatrah: records.reduce((sum, r) => sum + r.sgkMatrah, 0),
        totalEmployeePremium,
        totalEmployerPremium,
        grandTotal: totalEmployeePremium + totalEmployerPremium
      },
      records
    }
  }

  /**
   * İşkur bildirim raporu
   */
  async getIskurReport(year: number, month: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    // İşe alınanlar
    const hired = await this.prisma.employee.findMany({
      where: {
        hireDate: { gte: startDate, lte: endDate }
      },
      select: {
        employeeCode: true,
        firstName: true,
        lastName: true,
        hireDate: true,
        contractType: true,
        position: { select: { title: true } },
        department: { select: { name: true } }
      }
    })

    // İşten ayrılanlar
    const terminated = await this.prisma.resignation.findMany({
      where: {
        status: 'Completed',
        lastWorkingDay: { gte: startDate, lte: endDate }
      },
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            position: { select: { title: true } },
            department: { select: { name: true } }
          }
        }
      }
    })

    return {
      period: { year, month },
      summary: {
        hiredCount: hired.length,
        terminatedCount: terminated.length,
        netChange: hired.length - terminated.length
      },
      hired: hired.map(e => ({
        employeeCode: e.employeeCode,
        employeeName: `${e.firstName} ${e.lastName}`,
        hireDate: e.hireDate,
        position: e.position.title,
        department: e.department.name,
        contractType: e.contractType
      })),
      terminated: terminated.map(r => ({
        employeeCode: r.employee.employeeCode,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        terminationDate: r.lastWorkingDay,
        position: r.employee.position.title,
        department: r.employee.department.name,
        reason: r.reasonCategory
      }))
    }
  }
}

export default ReportService
