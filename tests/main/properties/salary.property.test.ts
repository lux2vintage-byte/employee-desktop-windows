import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { SalaryHistoryRepository } from '../../../src/main/repositories/SalaryHistoryRepository'
import { SalaryService, BusinessRuleError, ValidationError, VALID_CURRENCIES, VALID_PERIOD_TYPES } from '../../../src/main/services/SalaryService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 5: Salary History Preservation
 * Property 25: Current Salary Identification
 * Property 26: Positive Amount Validation (salary kısmı)
 * Validates: Requirements 1.8, 12.4, 12.5, 12.6, 12.7, 12.8
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

describe('Salary Property Tests', () => {
  let prisma: PrismaClient
  let salaryRepository: SalaryHistoryRepository
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
        hireDate: new Date(),
        contractType: 'Süresiz',
        status: 'Active'
      }
    })
    testEmployeeId = employee.id

    // Initialize repositories and services
    salaryRepository = new SalaryHistoryRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    salaryService = new SalaryService(salaryRepository)
  })

  /**
   * Property 5: Salary History Preservation
   * For any salary change, the previous salary record should be preserved (end_date set)
   * and a new record should be created. No salary record should be overwritten.
   * Validates: Requirements 1.8, 12.4, 12.8
   */
  describe('Property 5: Salary History Preservation', () => {
    it('should preserve salary history when creating new salary records', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial salary (5000-50000)
          fc.integer({ min: 5000, max: 50000 }),
          // New salary (5000-60000)
          fc.integer({ min: 5000, max: 60000 }),
          async (initialSalary, newSalary) => {
            // Clean up
            await prisma.salaryHistory.deleteMany({})

            // Create initial salary
            const firstSalary = await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: initialSalary
            })

            expect(firstSalary.endDate).toBeNull() // Active salary

            // Wait a bit to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10))

            // Create new salary (should close the previous one)
            const effectiveDate = new Date()
            effectiveDate.setDate(effectiveDate.getDate() + 1) // Tomorrow
            
            const secondSalary = await salaryService.updateSalary(
              testEmployeeId,
              newSalary,
              effectiveDate
            )

            // Verify new salary is active
            expect(secondSalary.endDate).toBeNull()
            expect(secondSalary.amount).toBe(newSalary)

            // Verify old salary is closed (has end_date)
            const history = await salaryService.getHistory(testEmployeeId)
            expect(history.length).toBe(2)

            // Find the old salary record
            const oldSalary = history.find(s => s.id === firstSalary.id)
            expect(oldSalary).toBeDefined()
            expect(oldSalary!.endDate).not.toBeNull()
            expect(oldSalary!.amount).toBe(initialSalary) // Original amount preserved

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should maintain complete salary history without overwriting', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Number of salary changes (2-4)
          fc.integer({ min: 2, max: 4 }),
          async (numChanges) => {
            // Clean up
            await prisma.salaryHistory.deleteMany({})

            const salaryAmounts: number[] = []
            let currentDate = new Date()

            // Create initial salary
            const initialAmount = 10000 + Math.floor(Math.random() * 10000)
            salaryAmounts.push(initialAmount)
            
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: initialAmount,
              startDate: currentDate
            })

            // Create subsequent salary changes
            for (let i = 1; i < numChanges; i++) {
              currentDate = new Date(currentDate.getTime() + 86400000 * 30) // 30 days later
              const newAmount = 10000 + Math.floor(Math.random() * 20000)
              salaryAmounts.push(newAmount)

              await salaryService.updateSalary(testEmployeeId, newAmount, currentDate)
            }

            // Verify all salary records exist
            const history = await salaryService.getHistory(testEmployeeId)
            expect(history.length).toBe(numChanges)

            // Verify only the latest has null end_date
            const activeSalaries = history.filter(s => s.endDate === null)
            expect(activeSalaries.length).toBe(1)

            // Verify all amounts are preserved
            const historyAmounts = history.map(s => s.amount).sort((a, b) => a - b)
            const expectedAmounts = salaryAmounts.sort((a, b) => a - b)
            expect(historyAmounts).toEqual(expectedAmounts)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  /**
   * Property 25: Current Salary Identification
   * For any employee, the salary record with end_date = null should be the current active salary.
   * Validates: Requirements 12.5, 12.7
   */
  describe('Property 25: Current Salary Identification', () => {
    it('should identify current salary as the record with null end_date', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Number of salary records (1-5)
          fc.integer({ min: 1, max: 5 }),
          async (numRecords) => {
            // Clean up
            await prisma.salaryHistory.deleteMany({})

            let latestAmount = 0
            let currentDate = new Date()

            // Create salary records
            for (let i = 0; i < numRecords; i++) {
              const amount = 10000 + i * 5000
              latestAmount = amount

              if (i === 0) {
                await salaryService.create(testEmployeeId, {
                  employeeId: testEmployeeId,
                  amount,
                  startDate: currentDate
                })
              } else {
                currentDate = new Date(currentDate.getTime() + 86400000 * 30)
                await salaryService.updateSalary(testEmployeeId, amount, currentDate)
              }
            }

            // Get current salary
            const currentSalary = await salaryService.getCurrentSalary(testEmployeeId)

            expect(currentSalary).not.toBeNull()
            expect(currentSalary!.endDate).toBeNull()
            expect(currentSalary!.amount).toBe(latestAmount)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should return null for employee with no salary records', async () => {
      // Clean up
      await prisma.salaryHistory.deleteMany({})

      const currentSalary = await salaryService.getCurrentSalary(testEmployeeId)
      expect(currentSalary).toBeNull()
    })

    it('should correctly identify current salary after multiple updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Salary amounts (array of 3-5 amounts)
          fc.array(fc.integer({ min: 5000, max: 100000 }), { minLength: 3, maxLength: 5 }),
          async (amounts) => {
            // Clean up
            await prisma.salaryHistory.deleteMany({})

            let currentDate = new Date()

            // Create all salary records
            for (let i = 0; i < amounts.length; i++) {
              if (i === 0) {
                await salaryService.create(testEmployeeId, {
                  employeeId: testEmployeeId,
                  amount: amounts[i],
                  startDate: currentDate
                })
              } else {
                currentDate = new Date(currentDate.getTime() + 86400000 * 30)
                await salaryService.updateSalary(testEmployeeId, amounts[i], currentDate)
              }
            }

            // Current salary should be the last one
            const currentSalary = await salaryService.getCurrentSalary(testEmployeeId)
            expect(currentSalary).not.toBeNull()
            expect(currentSalary!.amount).toBe(amounts[amounts.length - 1])
            expect(currentSalary!.endDate).toBeNull()

            return true
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  /**
   * Property 26: Positive Amount Validation (salary kısmı)
   * For any salary amount, the value must be positive.
   * Validates: Requirements 12.6
   */
  describe('Property 26: Positive Amount Validation', () => {
    it('should reject zero or negative salary amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Non-positive amounts (-10000 to 0)
          fc.integer({ min: -10000, max: 0 }),
          async (invalidAmount) => {
            // Clean up
            await prisma.salaryHistory.deleteMany({})

            let errorThrown = false
            try {
              await salaryService.create(testEmployeeId, {
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
        { numRuns: 20 }
      )
    })

    it('should accept positive salary amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Positive amounts (1 to 1000000)
          fc.integer({ min: 1, max: 1000000 }),
          async (validAmount) => {
            // Clean up
            await prisma.salaryHistory.deleteMany({})

            const salary = await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: validAmount
            })

            expect(salary.amount).toBe(validAmount)
            expect(salary.amount).toBeGreaterThan(0)

            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should reject negative amounts in updateSalary', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -10000, max: 0 }),
          async (invalidAmount) => {
            // Clean up and create initial salary
            await prisma.salaryHistory.deleteMany({})
            await salaryService.create(testEmployeeId, {
              employeeId: testEmployeeId,
              amount: 10000
            })

            let errorThrown = false
            try {
              await salaryService.updateSalary(testEmployeeId, invalidAmount, new Date())
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.constraint).toContain('pozitif')
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
  })

  /**
   * Additional property tests for salary validation
   */
  describe('Currency and Period Type Validation', () => {
    it('should accept valid currency values', async () => {
      for (const currency of VALID_CURRENCIES) {
        await prisma.salaryHistory.deleteMany({})

        const salary = await salaryService.create(testEmployeeId, {
          employeeId: testEmployeeId,
          amount: 10000,
          currency
        })

        expect(salary.currency).toBe(currency)
      }
    })

    it('should reject invalid currency values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => !VALID_CURRENCIES.includes(s as any)),
          async (invalidCurrency) => {
            await prisma.salaryHistory.deleteMany({})

            let errorThrown = false
            try {
              await salaryService.create(testEmployeeId, {
                employeeId: testEmployeeId,
                amount: 10000,
                currency: invalidCurrency as any
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('currency')
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

    it('should accept valid period type values', async () => {
      for (const periodType of VALID_PERIOD_TYPES) {
        await prisma.salaryHistory.deleteMany({})

        const salary = await salaryService.create(testEmployeeId, {
          employeeId: testEmployeeId,
          amount: 10000,
          periodType
        })

        expect(salary.periodType).toBe(periodType)
      }
    })

    it('should reject invalid period type values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => !VALID_PERIOD_TYPES.includes(s as any)),
          async (invalidPeriodType) => {
            await prisma.salaryHistory.deleteMany({})

            let errorThrown = false
            try {
              await salaryService.create(testEmployeeId, {
                employeeId: testEmployeeId,
                amount: 10000,
                periodType: invalidPeriodType as any
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('periodType')
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
   * Hourly rate calculation tests
   */
  describe('Hourly Rate Calculation', () => {
    it('should correctly calculate hourly rate from monthly salary', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 100000 }),
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 1, max: 12 }),
          (monthlySalary, workingDays, hoursPerDay) => {
            const hourlyRate = salaryService.calculateHourlyRate(monthlySalary, workingDays, hoursPerDay)
            const expected = monthlySalary / (workingDays * hoursPerDay)
            
            return Math.abs(hourlyRate - expected) < 0.01
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return 0 for invalid inputs', () => {
      expect(salaryService.calculateHourlyRate(0, 22, 8)).toBe(0)
      expect(salaryService.calculateHourlyRate(10000, 0, 8)).toBe(0)
      expect(salaryService.calculateHourlyRate(10000, 22, 0)).toBe(0)
      expect(salaryService.calculateHourlyRate(-1000, 22, 8)).toBe(0)
    })
  })

  /**
   * Daily rate calculation tests
   */
  describe('Daily Rate Calculation', () => {
    it('should correctly calculate daily rate from monthly salary', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 100000 }),
          fc.integer({ min: 1, max: 31 }),
          (monthlySalary, daysPerMonth) => {
            const dailyRate = salaryService.calculateDailyRate(monthlySalary, daysPerMonth)
            const expected = monthlySalary / daysPerMonth
            
            return Math.abs(dailyRate - expected) < 0.01
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return 0 for invalid inputs', () => {
      expect(salaryService.calculateDailyRate(0, 30)).toBe(0)
      expect(salaryService.calculateDailyRate(10000, 0)).toBe(0)
      expect(salaryService.calculateDailyRate(-1000, 30)).toBe(0)
    })
  })
})
