/**
 * Modüller Arası Entegrasyon Testleri
 * 
 * Bu testler farklı modüller arasındaki entegrasyonu test eder:
 * - Bordro oluşturma akışı (mesai, avans dahil)
 * - İzin onay akışı (bakiye güncelleme)
 * - İşten ayrılma akışı (durum güncelleme, izin hesaplama)
 * 
 * Requirements: 10.6, 11.7, 13.7, 13.8, 15.6, 18.6, 19.4, 19.7
 */

import { PayrollService, CreatePayrollItemDto } from '../../../src/main/services/PayrollService'
import { LeaveRequestService } from '../../../src/main/services/LeaveRequestService'
import { LeaveBalanceService } from '../../../src/main/services/LeaveBalanceService'
import { AdvanceService } from '../../../src/main/services/AdvanceService'
import { OffboardingService } from '../../../src/main/services/OffboardingService'
import { DisciplinaryService } from '../../../src/main/services/DisciplinaryService'

// Mock repositories
const createMockPayrollRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIdWithRelations: jest.fn(),
  findAllWithRelations: jest.fn(),
  findByEmployee: jest.fn(),
  findByPeriod: jest.fn(),
  findByEmployeeAndPeriod: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  finalize: jest.fn(),
  updateTotals: jest.fn(),
  employeeExists: jest.fn().mockResolvedValue(true),
  isUniquePeriod: jest.fn().mockResolvedValue(true),
  getEmployeesWithoutPayroll: jest.fn().mockResolvedValue([]),
  getPeriodStatistics: jest.fn()
})

const createMockPayrollItemRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIdWithRelations: jest.fn(),
  findByPayroll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  hardDelete: jest.fn(),
  calculateTotalAdditions: jest.fn().mockResolvedValue(0),
  calculateTotalDeductions: jest.fn().mockResolvedValue(0)
})

const createMockSalaryRepository = () => ({
  findCurrentSalary: jest.fn().mockResolvedValue({ amount: 10000 })
})

const createMockLeaveRequestRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIdWithRelations: jest.fn(),
  findAllWithRelations: jest.fn(),
  findByEmployee: jest.fn(),
  findPending: jest.fn(),
  findByDateRange: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  employeeExists: jest.fn().mockResolvedValue(true),
  leaveTypeExists: jest.fn().mockResolvedValue(true),
  hasOverlap: jest.fn().mockResolvedValue(false)
})

const createMockLeaveBalanceRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIdWithRelations: jest.fn(),
  findAllWithRelations: jest.fn(),
  findByEmployee: jest.fn(),
  findByYear: jest.fn(),
  findByEmployeeAndYear: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  employeeExists: jest.fn().mockResolvedValue(true),
  isUniqueEmployeeYear: jest.fn().mockResolvedValue(true),
  getEmployeeHireDate: jest.fn().mockResolvedValue(new Date('2020-01-01')),
  getEmployeesWithoutBalance: jest.fn().mockResolvedValue([])
})

const createMockAdvanceRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByIdWithRelations: jest.fn(),
  findAllWithRelations: jest.fn(),
  findByEmployee: jest.fn(),
  findPending: jest.fn(),
  findByDeductionPeriod: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  markAsPaid: jest.fn(),
  markAsDeducted: jest.fn(),
  employeeExists: jest.fn().mockResolvedValue(true),
  hasPendingAdvance: jest.fn().mockResolvedValue(false),
  getEmployeeCurrentSalary: jest.fn().mockResolvedValue(10000)
})

describe('Modüller Arası Entegrasyon Testleri', () => {
  describe('Bordro Oluşturma Akışı', () => {
    /**
     * Test: Bordro oluşturma ve mesai ekleme
     * Requirements: 13.7 - Onaylı mesaileri bordro kalemi olarak ekle
     */
    it('bordro oluşturulduğunda mesai kalemleri eklenebilmeli', async () => {
      const payrollRepo = createMockPayrollRepository()
      const payrollItemRepo = createMockPayrollItemRepository()
      const salaryRepo = createMockSalaryRepository()

      const payrollService = new PayrollService(
        payrollRepo as any,
        payrollItemRepo as any,
        salaryRepo as any
      )

      // Bordro oluştur
      const mockPayroll = {
        id: 1,
        employeeId: 1,
        periodMonth: 1,
        periodYear: 2026,
        baseSalary: 10000,
        totalAdditions: 0,
        totalDeductions: 0,
        netSalary: 10000,
        isFinalized: false
      }

      payrollRepo.create.mockResolvedValue(mockPayroll)
      payrollRepo.findByIdWithRelations.mockResolvedValue(mockPayroll)
      payrollRepo.findById.mockResolvedValue(mockPayroll)

      const payroll = await payrollService.generate(1, 1, 2026)
      expect(payroll).toBeDefined()
      expect(payroll.baseSalary).toBe(10000)

      // Mesai ekle
      const overtimes = [
        { hours: 8, multiplier: 1.5, hourlyRate: 50 }
      ]

      payrollItemRepo.create.mockResolvedValue({
        id: 1,
        payrollId: 1,
        type: 'Income',
        category: 'Overtime',
        amount: 600, // 8 * 1.5 * 50
        description: 'Fazla mesai: 8 saat x 1.5'
      })

      await payrollService.includeApprovedOvertimes(1, overtimes)

      expect(payrollItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payrollId: 1,
          type: 'Income',
          category: 'Overtime',
          amount: 600
        }),
        undefined
      )
    })

    /**
     * Test: Bordro oluşturma ve avans kesintisi ekleme
     * Requirements: 13.8 - Onaylı avansları bordro kesintisi olarak ekle
     */
    it('bordro oluşturulduğunda avans kesintileri eklenebilmeli', async () => {
      const payrollRepo = createMockPayrollRepository()
      const payrollItemRepo = createMockPayrollItemRepository()
      const salaryRepo = createMockSalaryRepository()

      const payrollService = new PayrollService(
        payrollRepo as any,
        payrollItemRepo as any,
        salaryRepo as any
      )

      const mockPayroll = {
        id: 1,
        employeeId: 1,
        periodMonth: 1,
        periodYear: 2026,
        baseSalary: 10000,
        totalAdditions: 0,
        totalDeductions: 0,
        netSalary: 10000,
        isFinalized: false
      }

      payrollRepo.findById.mockResolvedValue(mockPayroll)
      payrollRepo.findByIdWithRelations.mockResolvedValue(mockPayroll)

      // Avans kesintisi ekle
      const advances = [
        { id: 1, amount: 2000 }
      ]

      payrollItemRepo.create.mockResolvedValue({
        id: 1,
        payrollId: 1,
        type: 'Deduction',
        category: 'Advance',
        amount: 2000,
        description: 'Avans kesintisi #1'
      })

      await payrollService.includeApprovedAdvances(1, advances)

      expect(payrollItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payrollId: 1,
          type: 'Deduction',
          category: 'Advance',
          amount: 2000
        }),
        undefined
      )
    })

    /**
     * Test: Net maaş hesaplama
     * Requirements: 13.3 - net_salary = base_salary + total_additions - total_deductions
     */
    it('net maaş doğru hesaplanmalı', () => {
      const payrollRepo = createMockPayrollRepository()
      const payrollItemRepo = createMockPayrollItemRepository()

      const payrollService = new PayrollService(
        payrollRepo as any,
        payrollItemRepo as any
      )

      const baseSalary = 10000
      const totalAdditions = 1500 // Mesai
      const totalDeductions = 2000 // Avans + Vergi

      const netSalary = payrollService.calculateNetSalary(baseSalary, totalAdditions, totalDeductions)

      expect(netSalary).toBe(9500) // 10000 + 1500 - 2000
    })
  })

  describe('İzin Onay Akışı', () => {
    /**
     * Test: İzin onaylandığında bakiye güncellenmeli
     * Requirements: 10.6, 11.7 - İzin onaylandığında bakiye düşülmeli
     */
    it('izin onaylandığında bakiye güncellenmeli', async () => {
      const leaveRequestRepo = createMockLeaveRequestRepository()
      const leaveBalanceRepo = createMockLeaveBalanceRepository()

      const leaveRequestService = new LeaveRequestService(leaveRequestRepo as any)
      const leaveBalanceService = new LeaveBalanceService(leaveBalanceRepo as any)

      // Callback'i ayarla - izin onaylandığında bakiye düşülecek
      let balanceDeducted = false
      let deductedDays = 0

      leaveRequestService.setLeaveBalanceUpdateCallback(async (employeeId, year, days) => {
        balanceDeducted = true
        deductedDays = days
        await leaveBalanceService.deductDays(employeeId, year, days)
      })

      // Mock izin talebi
      const mockLeaveRequest = {
        id: 1,
        employeeId: 1,
        leaveTypeId: 1,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-05'),
        dayCount: 5,
        status: 'Pending',
        leaveType: { deductsFromAnnual: true }
      }

      leaveRequestRepo.findByIdWithRelations.mockResolvedValue(mockLeaveRequest)
      leaveRequestRepo.findById.mockResolvedValue(mockLeaveRequest)
      leaveRequestRepo.employeeExists.mockResolvedValue(true)
      leaveRequestRepo.update.mockResolvedValue({ ...mockLeaveRequest, status: 'Approved' })

      // Mock bakiye
      const mockBalance = {
        id: 1,
        employeeId: 1,
        year: 2026,
        annualLeaveEntitlement: 14,
        transferredDays: 0,
        usedDays: 0,
        remainingDays: 14
      }

      leaveBalanceRepo.findByEmployeeAndYear.mockResolvedValue(mockBalance)
      leaveBalanceRepo.update.mockResolvedValue({
        ...mockBalance,
        usedDays: 5,
        remainingDays: 9
      })

      // İzni onayla
      await leaveRequestService.approve(1, 2)

      // Bakiye güncellendi mi kontrol et
      expect(balanceDeducted).toBe(true)
      expect(deductedDays).toBe(5)
    })

    /**
     * Test: Gün sayısı hesaplama
     * Requirements: 10.3, 10.4 - Gün sayısı ve yarım gün desteği
     */
    it('gün sayısı doğru hesaplanmalı', () => {
      const leaveRequestRepo = createMockLeaveRequestRepository()
      const leaveRequestService = new LeaveRequestService(leaveRequestRepo as any)

      // Normal gün hesaplama
      const startDate = new Date('2026-02-01')
      const endDate = new Date('2026-02-05')
      const dayCount = leaveRequestService.calculateDayCount(startDate, endDate)
      expect(dayCount).toBe(5)

      // Yarım gün hesaplama
      const halfDayStart = new Date('2026-02-01')
      const halfDayEnd = new Date('2026-02-01')
      const halfDayCount = leaveRequestService.calculateDayCount(halfDayStart, halfDayEnd, true)
      expect(halfDayCount).toBe(0.5)
    })

    /**
     * Test: Kalan gün hesaplama
     * Requirements: 11.4 - remaining_days = annual_leave_entitlement + transferred_days - used_days
     */
    it('kalan gün doğru hesaplanmalı', () => {
      const leaveBalanceRepo = createMockLeaveBalanceRepository()
      const leaveBalanceService = new LeaveBalanceService(leaveBalanceRepo as any)

      const annualLeaveEntitlement = 14
      const transferredDays = 3
      const usedDays = 5

      const remainingDays = leaveBalanceService.calculateRemainingDays(
        annualLeaveEntitlement,
        transferredDays,
        usedDays
      )

      expect(remainingDays).toBe(12) // 14 + 3 - 5
    })
  })

  describe('Avans Akışı', () => {
    /**
     * Test: Avans onaylandığında kesinti dönemi belirlenmeli
     * Requirements: 15.3 - Onaylanan avanslarda kesinti dönemi zorunlu
     */
    it('avans onaylandığında kesinti dönemi belirlenmeli', async () => {
      const advanceRepo = createMockAdvanceRepository()
      const advanceService = new AdvanceService(advanceRepo as any)

      const mockAdvance = {
        id: 1,
        employeeId: 1,
        amount: 2000,
        status: 'Pending'
      }

      advanceRepo.findById.mockResolvedValue(mockAdvance)
      advanceRepo.approve.mockResolvedValue({
        ...mockAdvance,
        status: 'Approved',
        deductionPeriod: '2026-02'
      })

      const approved = await advanceService.approve(1, 2, '2026-02')

      expect(advanceRepo.approve).toHaveBeenCalledWith(1, 2, '2026-02', undefined)
    })

    /**
     * Test: Bekleyen avans kontrolü
     * Requirements: 15.7 - Aynı personelin birden fazla bekleyen avansı olamaz
     */
    it('bekleyen avans varsa yeni talep oluşturulamamalı', async () => {
      const advanceRepo = createMockAdvanceRepository()
      const advanceService = new AdvanceService(advanceRepo as any)

      advanceRepo.hasPendingAdvance.mockResolvedValue(true)

      await expect(
        advanceService.request(1, { employeeId: 1, amount: 1000 })
      ).rejects.toThrow('bekleyen bir avans talebi var')
    })

    /**
     * Test: Avans tutarı limiti
     * Requirements: 15.5 - Avans tutarı maaşın belirli yüzdesini aşamaz
     */
    it('avans tutarı maaş limitini aşamamalı', async () => {
      const advanceRepo = createMockAdvanceRepository()
      const advanceService = new AdvanceService(advanceRepo as any)

      // Maaş 10000, limit %50 = 5000
      advanceRepo.getEmployeeCurrentSalary.mockResolvedValue(10000)

      const isValid = await advanceService.validateAmount(1, 4000)
      expect(isValid).toBe(true)

      const isInvalid = await advanceService.validateAmount(1, 6000)
      expect(isInvalid).toBe(false)
    })
  })

  describe('Disiplin ve Bordro Entegrasyonu', () => {
    /**
     * Test: Maaş kesintisi cezası bordro entegrasyonu
     * Requirements: 18.6 - Maaş kesintisi durumunda bordro entegrasyonu
     */
    it('maaş kesintisi cezası bordro kesintisi oluşturmalı', async () => {
      const disciplinaryRepo = {
        findAll: jest.fn(),
        findById: jest.fn(),
        findByIdWithRelations: jest.fn(),
        findAllWithRelations: jest.fn(),
        findByEmployee: jest.fn(),
        findByViolationType: jest.fn(),
        findByActionTaken: jest.fn(),
        findByDateRange: jest.fn(),
        findSalaryDeductions: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        softDelete: jest.fn(),
        employeeExists: jest.fn().mockResolvedValue(true),
        getCountByEmployee: jest.fn(),
        getCountByEmployeeAndViolationType: jest.fn()
      }

      const disciplinaryService = new DisciplinaryService(disciplinaryRepo as any)

      // Bordro kesinti callback'i ayarla
      let payrollDeductionCreated = false
      let deductionAmount = 0

      disciplinaryService.setPayrollDeductionCallback(async (employeeId, amount, description) => {
        payrollDeductionCreated = true
        deductionAmount = amount
      })

      disciplinaryRepo.create.mockResolvedValue({
        id: 1,
        employeeId: 1,
        violationType: 'Devamsızlık',
        actionTaken: 'Maaş Kesintisi',
        incidentDate: new Date()
      })

      await disciplinaryService.create({
        employeeId: 1,
        incidentDate: new Date(),
        violationType: 'Devamsızlık',
        actionTaken: 'Maaş Kesintisi'
      })

      expect(payrollDeductionCreated).toBe(true)
      expect(deductionAmount).toBeGreaterThan(0)
    })
  })
})
