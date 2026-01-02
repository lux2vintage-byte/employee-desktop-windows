import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { OvertimeRepository } from '../../../src/main/repositories/OvertimeRepository'
import { OvertimeService, BusinessRuleError, ValidationError } from '../../../src/main/services/OvertimeService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 17: Overtime Multiplier Range
 * Property 18: Overtime Hours Range
 * Property 19: Overtime Pay Calculation
 * Validates: Requirements 8.3, 8.5, 8.6
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

describe('Overtime Property Tests', () => {
  let prisma: PrismaClient
  let repository: OvertimeRepository
  let service: OvertimeService
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
    await prisma.overtime.deleteMany({})
    await prisma.attendanceLog.deleteMany({})
    await prisma.leaveRequest.deleteMany({})
    await prisma.leaveBalance.deleteMany({})
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

    // Create test manager
    const managerTcKimlik = generateValidTCKimlik(Date.now() + 1000)
    const manager = await prisma.employee.create({
      data: {
        employeeCode: `MGR${Date.now()}`,
        firstName: 'Test',
        lastName: 'Manager',
        identityNumber: managerTcKimlik,
        departmentId: testDepartmentId,
        positionId: testPositionId,
        hireDate: new Date(),
        contractType: 'Süresiz',
        status: 'Active'
      }
    })
    testManagerId = manager.id

    repository = new OvertimeRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    repository.setAuditLogger(auditLogger)
    service = new OvertimeService(repository)
  })

  /**
   * Property 17: Overtime Multiplier Range
   * For any overtime record, multiplier value must be between 1.0 and 3.0.
   * Validates: Requirements 8.3
   */
  describe('Property 17: Overtime Multiplier Range', () => {
    it('should accept multiplier values between 1.0 and 3.0', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiplier between 1.0 and 3.0
          fc.float({ min: 1.0, max: 3.0, noNaN: true }),
          // Generate hours between 0.5 and 8
          fc.float({ min: 0.5, max: 8, noNaN: true }),
          async (multiplier, hours) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const overtime = await service.create({
              employeeId: testEmployeeId,
              date: today,
              hours,
              multiplier,
              description: 'Test overtime'
            })

            expect(overtime).toBeDefined()
            expect(overtime.multiplier).toBeGreaterThanOrEqual(1.0)
            expect(overtime.multiplier).toBeLessThanOrEqual(3.0)

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject multiplier values below 1.0', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiplier below 1.0
          fc.float({ min: Math.fround(0), max: Math.fround(0.99), noNaN: true }),
          async (multiplier) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            let errorThrown = false
            try {
              await service.create({
                employeeId: testEmployeeId,
                date: today,
                hours: 2,
                multiplier,
                description: 'Test overtime'
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('multiplier')
                expect(error.constraint).toContain('1.0')
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

    it('should reject multiplier values above 3.0', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiplier above 3.0
          fc.float({ min: Math.fround(3.01), max: Math.fround(10), noNaN: true }),
          async (multiplier) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            let errorThrown = false
            try {
              await service.create({
                employeeId: testEmployeeId,
                date: today,
                hours: 2,
                multiplier,
                description: 'Test overtime'
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('multiplier')
                expect(error.constraint).toContain('3.0')
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

    it('should use default multiplier of 1.5 when not specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: 0.5, max: 8, noNaN: true }),
          async (hours) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const overtime = await service.create({
              employeeId: testEmployeeId,
              date: today,
              hours,
              description: 'Test overtime'
            })

            expect(overtime.multiplier).toBe(1.5)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * Property 18: Overtime Hours Range
   * For any overtime record, hours value must be greater than 0 and less than or equal to 24.
   * Validates: Requirements 8.6
   */
  describe('Property 18: Overtime Hours Range', () => {
    it('should accept hours values between 0 (exclusive) and 24 (inclusive)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate hours between 0.1 and 24
          fc.float({ min: Math.fround(0.1), max: Math.fround(24), noNaN: true }),
          async (hours) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const overtime = await service.create({
              employeeId: testEmployeeId,
              date: today,
              hours,
              description: 'Test overtime'
            })

            expect(overtime).toBeDefined()
            expect(overtime.hours).toBeGreaterThan(0)
            expect(overtime.hours).toBeLessThanOrEqual(24)

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject hours values of 0 or negative', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate hours 0 or negative
          fc.float({ min: -10, max: 0, noNaN: true }),
          async (hours) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            let errorThrown = false
            try {
              await service.create({
                employeeId: testEmployeeId,
                date: today,
                hours,
                description: 'Test overtime'
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('hours')
                expect(error.constraint).toContain('0')
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

    it('should reject hours values above 24', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate hours above 24
          fc.float({ min: Math.fround(24.01), max: Math.fround(100), noNaN: true }),
          async (hours) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            let errorThrown = false
            try {
              await service.create({
                employeeId: testEmployeeId,
                date: today,
                hours,
                description: 'Test overtime'
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('hours')
                expect(error.constraint).toContain('24')
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
  })

  /**
   * Property 19: Overtime Pay Calculation
   * For any approved overtime, payment = hours × multiplier × hourly_rate
   * Validates: Requirements 8.5
   */
  describe('Property 19: Overtime Pay Calculation', () => {
    it('should correctly calculate overtime pay', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate hours (0.5-12)
          fc.float({ min: 0.5, max: 12, noNaN: true }),
          // Generate multiplier (1.0-3.0)
          fc.float({ min: 1.0, max: 3.0, noNaN: true }),
          // Generate hourly rate (10-500)
          fc.float({ min: 10, max: 500, noNaN: true }),
          async (hours, multiplier, hourlyRate) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const overtime = await service.create({
              employeeId: testEmployeeId,
              date: today,
              hours,
              multiplier,
              description: 'Test overtime'
            })

            // Calculate expected pay
            const expectedPay = hours * multiplier * hourlyRate
            const calculatedPay = service.calculateOvertimePay(overtime, hourlyRate)

            // Allow small floating point tolerance
            expect(Math.abs(calculatedPay - expectedPay)).toBeLessThan(0.01)

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return 0 pay when hourly rate is 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: 0.5, max: 12, noNaN: true }),
          fc.float({ min: 1.0, max: 3.0, noNaN: true }),
          async (hours, multiplier) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const overtime = await service.create({
              employeeId: testEmployeeId,
              date: today,
              hours,
              multiplier,
              description: 'Test overtime'
            })

            const calculatedPay = service.calculateOvertimePay(overtime, 0)
            expect(calculatedPay).toBe(0)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should reject negative hourly rate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: Math.fround(0.5), max: Math.fround(12), noNaN: true }),
          fc.float({ min: Math.fround(-100), max: Math.fround(-0.01), noNaN: true }),
          async (hours, negativeHourlyRate) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const overtime = await service.create({
              employeeId: testEmployeeId,
              date: today,
              hours,
              description: 'Test overtime'
            })

            let errorThrown = false
            try {
              service.calculateOvertimePay(overtime, negativeHourlyRate)
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('hourlyRate')
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

    it('should calculate correct monthly overtime pay', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Number of overtime records (1-5)
          fc.integer({ min: 1, max: 5 }),
          // Hourly rate
          fc.float({ min: 50, max: 200, noNaN: true }),
          async (numRecords, hourlyRate) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const now = new Date()
            const month = now.getMonth() + 1
            const year = now.getFullYear()

            let expectedTotalPay = 0

            // Create and approve multiple overtime records
            for (let i = 0; i < numRecords; i++) {
              const date = new Date(year, month - 1, i + 1)
              date.setHours(0, 0, 0, 0)

              const hours = 2 + (i * 0.5) // Varying hours
              const multiplier = 1.5

              const overtime = await service.create({
                employeeId: testEmployeeId,
                date,
                hours,
                multiplier,
                description: `Test overtime ${i}`
              })

              // Approve the overtime
              await service.approve(overtime.id, testManagerId)

              expectedTotalPay += hours * multiplier * hourlyRate
            }

            const calculatedTotalPay = await service.calculateMonthlyOvertimePay(
              testEmployeeId, 
              month, 
              year, 
              hourlyRate
            )

            // Allow small floating point tolerance
            expect(Math.abs(calculatedTotalPay - expectedTotalPay)).toBeLessThan(0.1)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should only include approved overtime in monthly calculation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: 50, max: 200, noNaN: true }),
          async (hourlyRate) => {
            // Clean up overtime records
            await prisma.overtime.deleteMany({})

            const now = new Date()
            const month = now.getMonth() + 1
            const year = now.getFullYear()

            // Create approved overtime
            const date1 = new Date(year, month - 1, 1)
            date1.setHours(0, 0, 0, 0)
            const approved = await service.create({
              employeeId: testEmployeeId,
              date: date1,
              hours: 4,
              multiplier: 1.5,
              description: 'Approved overtime'
            })
            await service.approve(approved.id, testManagerId)

            // Create pending overtime (should not be included)
            const date2 = new Date(year, month - 1, 2)
            date2.setHours(0, 0, 0, 0)
            await service.create({
              employeeId: testEmployeeId,
              date: date2,
              hours: 3,
              multiplier: 2.0,
              description: 'Pending overtime'
            })

            // Create rejected overtime (should not be included)
            const date3 = new Date(year, month - 1, 3)
            date3.setHours(0, 0, 0, 0)
            const rejected = await service.create({
              employeeId: testEmployeeId,
              date: date3,
              hours: 2,
              multiplier: 1.5,
              description: 'Rejected overtime'
            })
            await service.reject(rejected.id, testManagerId)

            // Only approved overtime should be included
            const expectedPay = 4 * 1.5 * hourlyRate
            const calculatedPay = await service.calculateMonthlyOvertimePay(
              testEmployeeId, 
              month, 
              year, 
              hourlyRate
            )

            expect(Math.abs(calculatedPay - expectedPay)).toBeLessThan(0.01)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})
