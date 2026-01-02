import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { PayrollRepository } from '../../../src/main/repositories/PayrollRepository'
import { PayrollItemRepository, VALID_INCOME_CATEGORIES, VALID_DEDUCTION_CATEGORIES } from '../../../src/main/repositories/PayrollItemRepository'
import { SalaryHistoryRepository } from '../../../src/main/repositories/SalaryHistoryRepository'
import { PayrollService, BusinessRuleError, ValidationError } from '../../../src/main/services/PayrollService'
import { SalaryService } from '../../../src/main/services/SalaryService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 27: Net Salary Calculation
 * Property 28: Finalized Payroll Immutability
 * Property 29: Payroll Period Uniqueness
 * Property 30: Payroll Totals Auto-Update
 * Validates: Requirements 13.2, 13.3, 13.4, 14.5, 14.7
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

describe('Payroll Property Tests', () => {
  let prisma: PrismaClient
  let payrollRepository: PayrollRepository
  let payrollItemRepository: PayrollItemRepository
  let salaryRepository: SalaryHistoryRepository
  let payrollService: PayrollService
  let salaryService: SalaryService
  let auditLogger: AuditLoggerService
  let testEmployeeId: number
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

    // Initialize repositories and services
    payrollRepository = new PayrollRepository(prisma)
    payrollItemRepository = new PayrollItemRepository(prisma)
    salaryRepository = new SalaryHistoryRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    payrollRepository.setAuditLogger(auditLogger)
    
    salaryService = new SalaryService(salaryRepository)
    payrollService = new PayrollService(payrollRepository, payrollItemRepository, salaryRepository)
  })

  /**
   * Property 27: Net Salary Calculation
   * For any payroll, net_salary = base_salary + total_additions - total_deductions
   * Validates: Requirements 13.3
   */
  describe('Property 27: Net Salary Calculation', () => {
    it('should correctly calculate net salary for any combination of values', () => {
      fc.assert(
        fc.property(
          // Base salary (5000-100000)
          fc.float({ min: 5000, max: 100000, noNaN: true }),
          // Total additions (0-50000)
          fc.float({ min: 0, max: 50000, noNaN: true }),
          // Total deductions (0-30000)
          fc.float({ min: 0, max: 30000, noNaN: true }),
          (baseSalary, totalAdditions, totalDeductions) => {
            const expectedNetSalary = baseSalary + totalAdditions - totalDeductions
            const calculatedNetSalary = payrollService.calculateNetSalary(
              baseSalary,
              totalAdditions,
              totalDeductions
            )

            return Math.abs(calculatedNetSalary - expectedNetSalary) < 0.01
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain net salary formula after adding items', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Base salary (10000-50000)
          fc.integer({ min: 10000, max: 50000 }),
          // Income amount (100-5000)
          fc.integer({ min: 100, max: 5000 }),
          // Deduction amount (100-3000)
          fc.integer({ min: 100, max: 3000 }),
          async (baseSalary, incomeAmount, deductionAmount) => {
            // Clean up
            await prisma.payrollItem.deleteMany({})
            await prisma.payroll.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary for employee
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: baseSalary
            })

            // Create payroll
            const payroll = await payrollService.generate(testEmployeeId, 1, 2025)
            expect(payroll.baseSalary).toBe(baseSalary)
            expect(payroll.netSalary).toBe(baseSalary) // Initially net = base

            // Add income item
            await payrollService.addItem(payroll.id, {
              type: 'Income',
              category: 'Bonus',
              amount: incomeAmount
            })

            // Add deduction item
            await payrollService.addItem(payroll.id, {
              type: 'Deduction',
              category: 'Tax',
              amount: deductionAmount
            })

            // Verify net salary formula
            const updatedPayroll = await payrollService.findById(payroll.id)
            expect(updatedPayroll).not.toBeNull()
            
            const expectedNet = baseSalary + incomeAmount - deductionAmount
            expect(updatedPayroll!.netSalary).toBe(expectedNet)
            expect(updatedPayroll!.totalAdditions).toBe(incomeAmount)
            expect(updatedPayroll!.totalDeductions).toBe(deductionAmount)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * Property 28: Finalized Payroll Immutability
   * For any finalized payroll (is_finalized=true), no field can be changed and no items can be added.
   * Validates: Requirements 13.4, 14.7
   */
  describe('Property 28: Finalized Payroll Immutability', () => {
    it('should prevent adding items to finalized payroll', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Item amount (100-5000)
          fc.integer({ min: 100, max: 5000 }),
          async (itemAmount) => {
            // Clean up
            await prisma.payrollItem.deleteMany({})
            await prisma.payroll.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            // Create and finalize payroll
            const payroll = await payrollService.generate(testEmployeeId, 2, 2025)
            await payrollService.finalize(payroll.id)

            // Try to add item to finalized payroll
            let errorThrown = false
            try {
              await payrollService.addItem(payroll.id, {
                type: 'Income',
                category: 'Bonus',
                amount: itemAmount
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('Kesinleşmiş bordro')
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

    it('should prevent removing items from finalized payroll', async () => {
      // Clean up
      await prisma.payrollItem.deleteMany({})
      await prisma.payroll.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      // Create salary
      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      // Create payroll with item
      const payroll = await payrollService.generate(testEmployeeId, 3, 2025)
      const item = await payrollService.addItem(payroll.id, {
        type: 'Income',
        category: 'Bonus',
        amount: 1000
      })

      // Finalize payroll
      await payrollService.finalize(payroll.id)

      // Try to remove item from finalized payroll
      let errorThrown = false
      try {
        await payrollService.removeItem(item.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('Kesinleşmiş')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should prevent double finalization', async () => {
      // Clean up
      await prisma.payrollItem.deleteMany({})
      await prisma.payroll.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      // Create salary
      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      // Create and finalize payroll
      const payroll = await payrollService.generate(testEmployeeId, 4, 2025)
      await payrollService.finalize(payroll.id)

      // Try to finalize again
      let errorThrown = false
      try {
        await payrollService.finalize(payroll.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('zaten kesinleştirilmiş')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })
  })

  /**
   * Property 29: Payroll Period Uniqueness
   * For any employee, there can be at most one payroll record for the same month and year combination.
   * Validates: Requirements 13.2
   */
  describe('Property 29: Payroll Period Uniqueness', () => {
    it('should prevent duplicate payroll for same employee and period', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Month (1-12)
          fc.integer({ min: 1, max: 12 }),
          // Year (2025-2026)
          fc.integer({ min: 2025, max: 2026 }),
          async (month, year) => {
            // Clean up
            await prisma.payrollItem.deleteMany({})
            await prisma.payroll.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            // Create first payroll
            await payrollService.generate(testEmployeeId, month, year)

            // Try to create duplicate
            let errorThrown = false
            try {
              await payrollService.generate(testEmployeeId, month, year)
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('zaten bordro kaydı var')
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

    it('should allow different periods for same employee', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Number of different months (2-4)
          fc.integer({ min: 2, max: 4 }),
          async (numMonths) => {
            // Clean up
            await prisma.payrollItem.deleteMany({})
            await prisma.payroll.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            // Create payrolls for different months
            for (let month = 1; month <= numMonths; month++) {
              await payrollService.generate(testEmployeeId, month, 2025)
            }

            // Verify all were created
            const payrolls = await payrollService.getByEmployee(testEmployeeId, 2025)
            expect(payrolls.length).toBe(numMonths)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * Property 30: Payroll Totals Auto-Update
   * When payroll items are added or removed, the parent payroll's total_additions and total_deductions should be automatically updated.
   * Validates: Requirements 14.5
   */
  describe('Property 30: Payroll Totals Auto-Update', () => {
    it('should auto-update totals when adding income items', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Array of income amounts (2-4 items)
          fc.array(fc.integer({ min: 100, max: 5000 }), { minLength: 2, maxLength: 4 }),
          async (incomeAmounts) => {
            // Clean up
            await prisma.payrollItem.deleteMany({})
            await prisma.payroll.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            // Create payroll
            const payroll = await payrollService.generate(testEmployeeId, 5, 2025)

            // Add income items
            let expectedTotal = 0
            for (const amount of incomeAmounts) {
              await payrollService.addItem(payroll.id, {
                type: 'Income',
                category: 'Bonus',
                amount
              })
              expectedTotal += amount
            }

            // Verify totals
            const updatedPayroll = await payrollService.findById(payroll.id)
            expect(updatedPayroll!.totalAdditions).toBe(expectedTotal)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should auto-update totals when adding deduction items', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Array of deduction amounts (2-4 items)
          fc.array(fc.integer({ min: 100, max: 3000 }), { minLength: 2, maxLength: 4 }),
          async (deductionAmounts) => {
            // Clean up
            await prisma.payrollItem.deleteMany({})
            await prisma.payroll.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            // Create payroll
            const payroll = await payrollService.generate(testEmployeeId, 6, 2025)

            // Add deduction items
            let expectedTotal = 0
            for (const amount of deductionAmounts) {
              await payrollService.addItem(payroll.id, {
                type: 'Deduction',
                category: 'Tax',
                amount
              })
              expectedTotal += amount
            }

            // Verify totals
            const updatedPayroll = await payrollService.findById(payroll.id)
            expect(updatedPayroll!.totalDeductions).toBe(expectedTotal)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should auto-update totals when removing items', async () => {
      // Clean up
      await prisma.payrollItem.deleteMany({})
      await prisma.payroll.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      // Create salary
      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      // Create payroll
      const payroll = await payrollService.generate(testEmployeeId, 7, 2025)

      // Add items
      const item1 = await payrollService.addItem(payroll.id, {
        type: 'Income',
        category: 'Bonus',
        amount: 1000
      })
      const item2 = await payrollService.addItem(payroll.id, {
        type: 'Income',
        category: 'Overtime',
        amount: 2000
      })

      // Verify initial totals
      let updatedPayroll = await payrollService.findById(payroll.id)
      expect(updatedPayroll!.totalAdditions).toBe(3000)

      // Remove one item
      await payrollService.removeItem(item1.id)

      // Verify updated totals
      updatedPayroll = await payrollService.findById(payroll.id)
      expect(updatedPayroll!.totalAdditions).toBe(2000)

      // Remove second item
      await payrollService.removeItem(item2.id)

      // Verify final totals
      updatedPayroll = await payrollService.findById(payroll.id)
      expect(updatedPayroll!.totalAdditions).toBe(0)
    })

    it('should correctly update net salary when totals change', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 5000 }),
          fc.integer({ min: 100, max: 3000 }),
          async (incomeAmount, deductionAmount) => {
            // Clean up
            await prisma.payrollItem.deleteMany({})
            await prisma.payroll.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            const baseSalary = 20000

            // Create salary
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: baseSalary
            })

            // Create payroll
            const payroll = await payrollService.generate(testEmployeeId, 8, 2025)

            // Add income
            await payrollService.addItem(payroll.id, {
              type: 'Income',
              category: 'Bonus',
              amount: incomeAmount
            })

            // Add deduction
            await payrollService.addItem(payroll.id, {
              type: 'Deduction',
              category: 'Tax',
              amount: deductionAmount
            })

            // Verify net salary
            const updatedPayroll = await payrollService.findById(payroll.id)
            const expectedNet = baseSalary + incomeAmount - deductionAmount
            expect(updatedPayroll!.netSalary).toBe(expectedNet)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * Additional validation tests
   */
  describe('Payroll Validation', () => {
    it('should validate period month range (1-12)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -10, max: 0 }).chain(invalidMonth => 
            fc.constant(invalidMonth)
          ),
          async (invalidMonth) => {
            await prisma.payrollItem.deleteMany({})
            await prisma.payroll.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            let errorThrown = false
            try {
              await payrollService.generate(testEmployeeId, invalidMonth, 2025)
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('periodMonth')
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

    it('should validate item amount is positive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -10000, max: 0 }),
          async (invalidAmount) => {
            await prisma.payrollItem.deleteMany({})
            await prisma.payroll.deleteMany({})
            await prisma.salaryHistory.deleteMany({})

            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 20000
            })

            const payroll = await payrollService.generate(testEmployeeId, 9, 2025)

            let errorThrown = false
            try {
              await payrollService.addItem(payroll.id, {
                type: 'Income',
                category: 'Bonus',
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

    it('should validate item type', async () => {
      await prisma.payrollItem.deleteMany({})
      await prisma.payroll.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      const payroll = await payrollService.generate(testEmployeeId, 10, 2025)

      let errorThrown = false
      try {
        await payrollService.addItem(payroll.id, {
          type: 'InvalidType' as any,
          category: 'Bonus',
          amount: 1000
        })
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.field).toBe('type')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should validate income category', async () => {
      await prisma.payrollItem.deleteMany({})
      await prisma.payroll.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      const payroll = await payrollService.generate(testEmployeeId, 11, 2025)

      let errorThrown = false
      try {
        await payrollService.addItem(payroll.id, {
          type: 'Income',
          category: 'InvalidCategory',
          amount: 1000
        })
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.field).toBe('category')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should validate deduction category', async () => {
      await prisma.payrollItem.deleteMany({})
      await prisma.payroll.deleteMany({})
      await prisma.salaryHistory.deleteMany({})

      await salaryService.create(testEmployeeId, {
        employeeId: testEmployeeId,
        amount: 20000
      })

      const payroll = await payrollService.generate(testEmployeeId, 12, 2025)

      let errorThrown = false
      try {
        await payrollService.addItem(payroll.id, {
          type: 'Deduction',
          category: 'InvalidCategory',
          amount: 1000
        })
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.field).toBe('category')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })
  })
})
