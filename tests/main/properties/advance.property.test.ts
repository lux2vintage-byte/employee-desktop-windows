import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { AdvanceRepository, VALID_ADVANCE_STATUSES } from '../../../src/main/repositories/AdvanceRepository'
import { SalaryHistoryRepository } from '../../../src/main/repositories/SalaryHistoryRepository'
import { AdvanceService, BusinessRuleError, ValidationError } from '../../../src/main/services/AdvanceService'
import { SalaryService } from '../../../src/main/services/SalaryService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 31: Pending Advance Limit
 * Validates: Requirements 15.7
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

describe('Advance Property Tests', () => {
  let prisma: PrismaClient
  let advanceRepository: AdvanceRepository
  let salaryRepository: SalaryHistoryRepository
  let advanceService: AdvanceService
  let salaryService: SalaryService
  let auditLogger: AuditLoggerService
  let testEmployeeId: number
  let testManagerId: number
  let testDepartmentId: number
  let testPositionId: number

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
    await prisma.payrollItem.deleteMany({})
    await prisma.payroll.deleteMany({})
    await prisma.salaryAdvance.deleteMany({})
    await prisma.salaryHistory.deleteMany({})
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
        hireDate: new Date(),
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

    // Initialize repositories and services
    advanceRepository = new AdvanceRepository(prisma)
    salaryRepository = new SalaryHistoryRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    advanceRepository.setAuditLogger(auditLogger)
    
    salaryService = new SalaryService(salaryRepository)
    advanceService = new AdvanceService(advanceRepository)
  })

  /**
   * Property 31: Pending Advance Limit
   * For any employee, there can be at most one pending (Pending) advance request at a time.
   * Validates: Requirements 15.7
   */
  describe('Property 31: Pending Advance Limit', () => {
    it('should prevent multiple pending advances for the same employee', async () => {
      await fc.assert(
        fc.asyncProperty(
          // First advance amount (1000-5000)
          fc.integer({ min: 1000, max: 5000 }),
          // Second advance amount (1000-5000)
          fc.integer({ min: 1000, max: 5000 }),
          async (firstAmount, secondAmount) => {
            // Clean up
            await prisma.salaryAdvance.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary (20000 TL - so max advance is 10000)
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            // Create first advance request
            await advanceService.request(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: firstAmount
            })

            // Try to create second advance request
            let errorThrown = false
            try {
              await advanceService.request(testEmployeeId, {
                employeeId: testEmployeeId,
                amount: secondAmount
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('zaten bekleyen bir avans talebi var')
                errorThrown = true
              }
            }

            expect(errorThrown).toBe(true)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should allow new advance after previous one is approved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 5000 }),
          fc.integer({ min: 1000, max: 5000 }),
          async (firstAmount, secondAmount) => {
            // Clean up
            await prisma.salaryAdvance.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            // Create first advance request
            const firstAdvance = await advanceService.request(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: firstAmount
            })

            // Approve first advance
            await advanceService.approve(firstAdvance.id, testManagerId, '2025-02')

            // Now should be able to create second advance
            const secondAdvance = await advanceService.request(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: secondAmount
            })

            expect(secondAdvance).toBeDefined()
            expect(secondAdvance.status).toBe('Pending')

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should allow new advance after previous one is rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 5000 }),
          fc.integer({ min: 1000, max: 5000 }),
          async (firstAmount, secondAmount) => {
            // Clean up
            await prisma.salaryAdvance.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            // Create first advance request
            const firstAdvance = await advanceService.request(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: firstAmount
            })

            // Reject first advance
            await advanceService.reject(firstAdvance.id, testManagerId)

            // Now should be able to create second advance
            const secondAdvance = await advanceService.request(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: secondAmount
            })

            expect(secondAdvance).toBeDefined()
            expect(secondAdvance.status).toBe('Pending')

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should correctly track pending status through workflow', async () => {
      // Clean up
      await prisma.salaryAdvance.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      // Create salary
      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      // Initially no pending advance
      let hasPending = await advanceService.hasPendingAdvance(testEmployeeId)
      expect(hasPending).toBe(false)

      // Create advance request
      const advance = await advanceService.request(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 3000
      })

      // Now has pending advance
      hasPending = await advanceService.hasPendingAdvance(testEmployeeId)
      expect(hasPending).toBe(true)

      // Approve advance
      await advanceService.approve(advance.id, testManagerId, '2025-03')

      // No longer pending (now Approved)
      hasPending = await advanceService.hasPendingAdvance(testEmployeeId)
      expect(hasPending).toBe(false)
    })
  })

  /**
   * Additional property tests for advance validation
   */
  describe('Advance Amount Validation', () => {
    it('should reject advance amount exceeding salary percentage limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Salary (10000-50000)
          fc.integer({ min: 10000, max: 50000 }),
          async (salary) => {
            // Clean up
            await prisma.salaryAdvance.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: salary
            })

            // Try to request more than 50% of salary
            const excessiveAmount = Math.floor(salary * 0.6) // 60% of salary

            let errorThrown = false
            try {
              await advanceService.request(testEmployeeId, {
                employeeId: testEmployeeId,
                amount: excessiveAmount
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('aşamaz')
                errorThrown = true
              }
            }

            expect(errorThrown).toBe(true)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should accept advance amount within salary percentage limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Salary (10000-50000)
          fc.integer({ min: 10000, max: 50000 }),
          // Percentage of salary (10-50)
          fc.integer({ min: 10, max: 50 }),
          async (salary, percentage) => {
            // Clean up
            await prisma.salaryAdvance.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: salary
            })

            // Request within limit
            const validAmount = Math.floor(salary * percentage / 100)

            const advance = await advanceService.request(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: validAmount
            })

            expect(advance).toBeDefined()
            expect(advance.amount).toBe(validAmount)
            expect(advance.status).toBe('Pending')

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should reject zero or negative advance amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -10000, max: 0 }),
          async (invalidAmount) => {
            // Clean up
            await prisma.salaryAdvance.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            let errorThrown = false
            try {
              await advanceService.request(testEmployeeId, {
                employeeId: testEmployeeId,
                amount: invalidAmount
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('amount')
                expect(error.constraint).toContain('pozitif')
                errorThrown = true
              }
            }

            expect(errorThrown).toBe(true)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * Advance status transition tests
   */
  describe('Advance Status Transitions', () => {
    it('should follow correct status workflow: Pending -> Approved -> Paid -> Deducted', async () => {
      // Clean up
      await prisma.salaryAdvance.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      // Create salary
      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      // Create advance
      const advance = await advanceService.request(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 5000
      })
      expect(advance.status).toBe('Pending')

      // Approve
      const approved = await advanceService.approve(advance.id, testManagerId, '2025-04')
      expect(approved.status).toBe('Approved')
      expect(approved.deductionPeriod).toBe('2025-04')

      // Mark as paid
      const paid = await advanceService.markAsPaid(advance.id, new Date())
      expect(paid.status).toBe('Paid')
      expect(paid.paymentDate).not.toBeNull()

      // Mark as deducted
      const deducted = await advanceService.markAsDeducted(advance.id)
      expect(deducted.status).toBe('Deducted')
    })

    it('should prevent invalid status transitions', async () => {
      // Clean up
      await prisma.salaryAdvance.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      // Create salary
      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      // Create advance
      const advance = await advanceService.request(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 5000
      })

      // Try to mark as paid without approval
      let errorThrown = false
      try {
        await advanceService.markAsPaid(advance.id, new Date())
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('onaylanmış')
          errorThrown = true
        }
      }
      expect(errorThrown).toBe(true)

      // Try to mark as deducted without being paid
      errorThrown = false
      try {
        await advanceService.markAsDeducted(advance.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('ödenmiş')
          errorThrown = true
        }
      }
      expect(errorThrown).toBe(true)
    })

    it('should validate deduction period format', async () => {
      // Clean up
      await prisma.salaryAdvance.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      // Create salary
      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      // Create advance
      const advance = await advanceService.request(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 5000
      })

      // Try to approve with invalid deduction period format
      let errorThrown = false
      try {
        await advanceService.approve(advance.id, testManagerId, 'invalid-format')
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.field).toBe('deductionPeriod')
          expect(error.constraint).toContain('YYYY-MM')
          errorThrown = true
        }
      }
      expect(errorThrown).toBe(true)

      // Valid format should work
      const approved = await advanceService.approve(advance.id, testManagerId, '2025-05')
      expect(approved.status).toBe('Approved')
    })
  })

  /**
   * Max advance amount calculation tests
   */
  describe('Max Advance Amount Calculation', () => {
    it('should correctly calculate max advance amount based on salary', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10000, max: 100000 }),
          async (salary) => {
            // Clean up
            await prisma.salaryAdvance.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: salary
            })

            // Get max advance amount
            const maxAmount = await advanceService.getMaxAdvanceAmount(testEmployeeId)
            const expectedMax = salary * 0.5 // 50% of salary

            expect(maxAmount).toBe(expectedMax)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should return 0 for employee without salary', async () => {
      // Clean up
      await prisma.salaryAdvance.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      // Don't create salary

      const maxAmount = await advanceService.getMaxAdvanceAmount(testEmployeeId)
      expect(maxAmount).toBe(0)
    })
  })
})
