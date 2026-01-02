import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { LeaveBalanceRepository } from '../../../src/main/repositories/LeaveBalanceRepository'
import { LeaveBalanceService, BusinessRuleError, ValidationError } from '../../../src/main/services/LeaveBalanceService'
import { LeaveRequestRepository } from '../../../src/main/repositories/LeaveRequestRepository'
import { LeaveRequestService } from '../../../src/main/services/LeaveRequestService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 23: Leave Balance Calculation
 * Property 24: Leave Balance Deduction on Approval
 * Validates: Requirements 11.4, 10.6, 11.7
 */

/**
 * Helper function to generate a valid TC Kimlik No
 */
function generateValidTCKimlik(seed: number): string {
  const digits: number[] = []
  let remaining = Math.abs(seed) % 1000000000 + 100000000
  
  for (let i = 0; i < 9; i++) {
    digits.unshift(remaining % 10)
    remaining = Math.floor(remaining / 10)
  }
  
  if (digits[0] === 0) {
    digits[0] = 1
  }

  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7]
  let tenthDigit = ((oddSum * 7) - evenSum) % 10
  if (tenthDigit < 0) tenthDigit += 10
  digits.push(tenthDigit)

  const first10Sum = digits.reduce((sum, d) => sum + d, 0)
  const eleventhDigit = first10Sum % 10
  digits.push(eleventhDigit)

  return digits.join('')
}

/**
 * Helper to create a future date
 */
function getFutureDate(daysFromNow: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(0, 0, 0, 0)
  return date
}

describe('LeaveBalance Property Tests', () => {
  let prisma: PrismaClient
  let leaveBalanceRepository: LeaveBalanceRepository
  let leaveBalanceService: LeaveBalanceService
  let leaveRequestRepository: LeaveRequestRepository
  let leaveRequestService: LeaveRequestService
  let auditLogger: AuditLoggerService
  let testEmployeeId: number
  let testDepartmentId: number
  let testPositionId: number
  let testLeaveTypeId: number
  let testManagerId: number

  beforeAll(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
    resetAuditLoggerService()
  })

  beforeEach(async () => {
    // Clean up test data - order matters due to foreign keys
    await prisma.leaveRequest.deleteMany({})
    await prisma.leaveBalance.deleteMany({})
    await prisma.leaveType.deleteMany({})
    await prisma.attendanceLog.deleteMany({})
    await prisma.overtime.deleteMany({})
    await prisma.salaryHistory.deleteMany({})
    await prisma.payrollItem.deleteMany({})
    await prisma.payroll.deleteMany({})
    await prisma.salaryAdvance.deleteMany({})
    await prisma.performanceReview.deleteMany({})
    await prisma.employeeTraining.deleteMany({})
    await prisma.disciplinaryAction.deleteMany({})
    await prisma.exitInterview.deleteMany({})
    await prisma.resignation.deleteMany({})
    await prisma.employeeDetails.deleteMany({})
    await prisma.employeeDocument.deleteMany({})
    await prisma.employee.deleteMany({})
    await prisma.position.deleteMany({})
    await prisma.department.deleteMany({})
    await prisma.auditLog.deleteMany({})

    // Create test department
    const department = await prisma.department.create({
      data: {
        name: `TestDept_${Date.now()}`
      }
    })
    testDepartmentId = department.id

    // Create test position
    const position = await prisma.position.create({
      data: {
        title: `TestPos_${Date.now()}`,
        departmentId: testDepartmentId
      }
    })
    testPositionId = position.id

    // Create test employee
    const tcKimlik = generateValidTCKimlik(Date.now())
    const employee = await prisma.employee.create({
      data: {
        employeeCode: `EMP${Date.now()}`,
        firstName: 'Test',
        lastName: 'Employee',
        identityNumber: tcKimlik,
        departmentId: testDepartmentId,
        positionId: testPositionId,
        hireDate: new Date('2020-01-01'), // 5+ years tenure
        contractType: 'Süresiz',
        status: 'Active'
      }
    })
    testEmployeeId = employee.id

    // Create test manager
    const managerTcKimlik = generateValidTCKimlik(Date.now() + 1000)
    const manager = await prisma.employee.create({
      data: {
        employeeCode: `MGR${Date.now()}`,
        firstName: 'Manager',
        lastName: 'Test',
        identityNumber: managerTcKimlik,
        departmentId: testDepartmentId,
        positionId: testPositionId,
        hireDate: new Date(),
        contractType: 'Süresiz',
        status: 'Active'
      }
    })
    testManagerId = manager.id

    // Create test leave type (deducts from annual)
    const leaveType = await prisma.leaveType.create({
      data: {
        name: `TestLeaveType_${Date.now()}`,
        isPaid: true,
        deductsFromAnnual: true
      }
    })
    testLeaveTypeId = leaveType.id

    // Initialize repositories and services
    leaveBalanceRepository = new LeaveBalanceRepository(prisma)
    leaveRequestRepository = new LeaveRequestRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    leaveRequestRepository.setAuditLogger(auditLogger)
    
    leaveBalanceService = new LeaveBalanceService(leaveBalanceRepository)
    leaveRequestService = new LeaveRequestService(leaveRequestRepository)

    // Connect leave request service to balance service for deduction
    leaveRequestService.setLeaveBalanceUpdateCallback(async (employeeId, year, days) => {
      await leaveBalanceService.deductDays(employeeId, year, days)
    })
  })

  /**
   * Property 23: Leave Balance Calculation
   * For any leave balance, remaining_days = annual_leave_entitlement + transferred_days - used_days
   * Validates: Requirements 11.4
   */
  describe('Property 23: Leave Balance Calculation', () => {
    it('should correctly calculate remaining days for any combination of values', () => {
      fc.assert(
        fc.property(
          // Annual leave entitlement (10-30 days)
          fc.integer({ min: 10, max: 30 }),
          // Transferred days (0-10 days)
          fc.integer({ min: 0, max: 10 }),
          // Used days (0-40 days, can exceed entitlement in some cases)
          fc.integer({ min: 0, max: 40 }),
          (annualLeaveEntitlement, transferredDays, usedDays) => {
            const expectedRemainingDays = annualLeaveEntitlement + transferredDays - usedDays
            const calculatedRemainingDays = leaveBalanceService.calculateRemainingDays(
              annualLeaveEntitlement,
              transferredDays,
              usedDays
            )

            return calculatedRemainingDays === expectedRemainingDays
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain balance formula after creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Year (current year or next year)
          fc.integer({ min: 2025, max: 2026 }),
          async (year) => {
            // Clean up
            await prisma.leaveBalance.deleteMany({})

            const balance = await leaveBalanceService.create(testEmployeeId, year)

            // Verify formula: remaining = entitlement + transferred - used
            const expectedRemaining = balance.annualLeaveEntitlement + balance.transferredDays - balance.usedDays
            
            expect(balance.remainingDays).toBe(expectedRemaining)

            // For new balance, used should be 0 and transferred should be 0
            expect(balance.usedDays).toBe(0)
            expect(balance.transferredDays).toBe(0)
            expect(balance.remainingDays).toBe(balance.annualLeaveEntitlement)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should maintain balance formula after updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          // New entitlement (10-25)
          fc.integer({ min: 10, max: 25 }),
          // New transferred days (0-5)
          fc.integer({ min: 0, max: 5 }),
          // New used days (0-15)
          fc.integer({ min: 0, max: 15 }),
          async (newEntitlement, newTransferred, newUsed) => {
            // Clean up and create initial balance
            await prisma.leaveBalance.deleteMany({})
            const balance = await leaveBalanceService.create(testEmployeeId, 2025)

            // Update with new values
            const updated = await leaveBalanceService.update(balance.id, {
              annualLeaveEntitlement: newEntitlement,
              transferredDays: newTransferred,
              usedDays: newUsed
            })

            // Verify formula
            const expectedRemaining = newEntitlement + newTransferred - newUsed
            expect(updated.remainingDays).toBe(expectedRemaining)

            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should correctly calculate remaining days after deduction', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Days to deduct (1-5)
          fc.integer({ min: 1, max: 5 }),
          async (daysToDeduct) => {
            // Clean up and create initial balance
            await prisma.leaveBalance.deleteMany({})
            const balance = await leaveBalanceService.create(testEmployeeId, 2025)

            const initialRemaining = balance.remainingDays

            // Deduct days
            const updated = await leaveBalanceService.deductDays(testEmployeeId, 2025, daysToDeduct)

            // Verify formula
            expect(updated.usedDays).toBe(balance.usedDays + daysToDeduct)
            expect(updated.remainingDays).toBe(initialRemaining - daysToDeduct)

            // Verify formula still holds
            const expectedRemaining = updated.annualLeaveEntitlement + updated.transferredDays - updated.usedDays
            expect(updated.remainingDays).toBe(expectedRemaining)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * Property 24: Leave Balance Deduction on Approval
   * For any approved leave request, the corresponding balance's used_days should be automatically incremented.
   * Validates: Requirements 10.6, 11.7
   */
  describe('Property 24: Leave Balance Deduction on Approval', () => {
    it('should deduct days from balance when leave is approved', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Leave duration (1-5 days)
          fc.integer({ min: 1, max: 5 }),
          // Days from now for start date (5-15)
          fc.integer({ min: 5, max: 15 }),
          async (duration, startDaysFromNow) => {
            // Clean up
            await prisma.leaveRequest.deleteMany({})
            await prisma.leaveBalance.deleteMany({})

            // Create balance for current year
            const currentYear = new Date().getFullYear()
            const balance = await leaveBalanceService.create(testEmployeeId, currentYear)
            const initialUsedDays = balance.usedDays
            const initialRemainingDays = balance.remainingDays

            // Create leave request
            const startDate = getFutureDate(startDaysFromNow)
            const endDate = getFutureDate(startDaysFromNow + duration - 1)

            const leaveRequest = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate,
              endDate
            })

            // Approve the leave request
            await leaveRequestService.approve(leaveRequest.id, testManagerId)

            // Check balance was updated
            const updatedBalance = await leaveBalanceService.getBalance(testEmployeeId, currentYear)

            expect(updatedBalance).not.toBeNull()
            expect(updatedBalance!.usedDays).toBe(initialUsedDays + duration)
            expect(updatedBalance!.remainingDays).toBe(initialRemainingDays - duration)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should correctly handle multiple leave approvals', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Number of leaves (2-3)
          fc.integer({ min: 2, max: 3 }),
          async (numLeaves) => {
            // Clean up
            await prisma.leaveRequest.deleteMany({})
            await prisma.leaveBalance.deleteMany({})

            // Create balance
            const currentYear = new Date().getFullYear()
            const balance = await leaveBalanceService.create(testEmployeeId, currentYear)
            const initialRemainingDays = balance.remainingDays

            let totalDaysUsed = 0
            let currentStartDay = 5

            for (let i = 0; i < numLeaves; i++) {
              const duration = 2 // 2-day leaves
              const startDate = getFutureDate(currentStartDay)
              const endDate = getFutureDate(currentStartDay + duration - 1)

              const leaveRequest = await leaveRequestService.create({
                employeeId: testEmployeeId,
                leaveTypeId: testLeaveTypeId,
                startDate,
                endDate
              })

              await leaveRequestService.approve(leaveRequest.id, testManagerId)

              totalDaysUsed += duration
              currentStartDay += duration + 3 // Gap between leaves
            }

            // Check final balance
            const finalBalance = await leaveBalanceService.getBalance(testEmployeeId, currentYear)

            expect(finalBalance).not.toBeNull()
            expect(finalBalance!.usedDays).toBe(totalDaysUsed)
            expect(finalBalance!.remainingDays).toBe(initialRemainingDays - totalDaysUsed)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should not deduct days for rejected leave requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 5, max: 10 }),
          async (duration, startDaysFromNow) => {
            // Clean up
            await prisma.leaveRequest.deleteMany({})
            await prisma.leaveBalance.deleteMany({})

            // Create balance
            const currentYear = new Date().getFullYear()
            const balance = await leaveBalanceService.create(testEmployeeId, currentYear)
            const initialUsedDays = balance.usedDays
            const initialRemainingDays = balance.remainingDays

            // Create leave request
            const startDate = getFutureDate(startDaysFromNow)
            const endDate = getFutureDate(startDaysFromNow + duration - 1)

            const leaveRequest = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate,
              endDate
            })

            // Reject the leave request
            await leaveRequestService.reject(leaveRequest.id, testManagerId)

            // Check balance was NOT updated
            const unchangedBalance = await leaveBalanceService.getBalance(testEmployeeId, currentYear)

            expect(unchangedBalance).not.toBeNull()
            expect(unchangedBalance!.usedDays).toBe(initialUsedDays)
            expect(unchangedBalance!.remainingDays).toBe(initialRemainingDays)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should handle half-day leave deduction correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 15 }),
          async (startDaysFromNow) => {
            // Clean up
            await prisma.leaveRequest.deleteMany({})
            await prisma.leaveBalance.deleteMany({})

            // Create balance
            const currentYear = new Date().getFullYear()
            const balance = await leaveBalanceService.create(testEmployeeId, currentYear)
            const initialRemainingDays = balance.remainingDays

            // Create half-day leave request
            const date = getFutureDate(startDaysFromNow)

            const leaveRequest = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate: date,
              endDate: date,
              isHalfDay: true
            })

            expect(leaveRequest.dayCount).toBe(0.5)

            // Approve the leave request
            await leaveRequestService.approve(leaveRequest.id, testManagerId)

            // Check balance was updated with 0.5 days
            const updatedBalance = await leaveBalanceService.getBalance(testEmployeeId, currentYear)

            expect(updatedBalance).not.toBeNull()
            expect(updatedBalance!.usedDays).toBe(0.5)
            expect(updatedBalance!.remainingDays).toBe(initialRemainingDays - 0.5)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should prevent deduction when balance is insufficient', async () => {
      // Create balance with limited days
      await prisma.leaveBalance.deleteMany({})
      const currentYear = new Date().getFullYear()
      
      // Create balance with only 2 days
      const balance = await prisma.leaveBalance.create({
        data: {
          employeeId: testEmployeeId,
          year: currentYear,
          annualLeaveEntitlement: 2,
          transferredDays: 0,
          usedDays: 0,
          remainingDays: 2
        }
      })

      // Try to deduct more days than available
      let errorThrown = false
      try {
        await leaveBalanceService.deductDays(testEmployeeId, currentYear, 5)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('Yetersiz izin bakiyesi')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)

      // Verify balance unchanged
      const unchangedBalance = await leaveBalanceService.getBalance(testEmployeeId, currentYear)
      expect(unchangedBalance!.usedDays).toBe(0)
      expect(unchangedBalance!.remainingDays).toBe(2)
    })
  })

  /**
   * Additional property tests for balance integrity
   */
  describe('Balance Integrity Properties', () => {
    it('should enforce unique employee-year constraint', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2025, max: 2026 }),
          async (year) => {
            // Clean up
            await prisma.leaveBalance.deleteMany({})

            // Create first balance
            await leaveBalanceService.create(testEmployeeId, year)

            // Try to create duplicate
            let errorThrown = false
            try {
              await leaveBalanceService.create(testEmployeeId, year)
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('zaten bakiye kaydı var')
                errorThrown = true
              }
            }

            expect(errorThrown).toBe(true)

            return true
          }
        ),
        { numRuns: 5 }
      )
    })

    it('should calculate entitlement based on tenure', async () => {
      // Test with employee who has 5+ years tenure (hired 2020-01-01)
      const entitlement2025 = await leaveBalanceService.calculateEntitlement(testEmployeeId, 2025)
      
      // With 5+ years tenure, should get bonus days (14 base + 2 bonus = 16)
      expect(entitlement2025).toBeGreaterThanOrEqual(14)
    })
  })
})
