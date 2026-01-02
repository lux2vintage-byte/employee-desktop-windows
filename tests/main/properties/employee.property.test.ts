import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { EmployeeRepository } from '../../../src/main/repositories/EmployeeRepository'
import { EmployeeService, BusinessRuleError } from '../../../src/main/services/EmployeeService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 9: Employee Code Uniqueness
 * Validates: Requirements 4.2, 4.3
 */

/**
 * Helper function to generate a valid TC Kimlik No
 */
function generateValidTCKimlik(seed: number): string {
  // Generate first 9 digits based on seed
  const digits: number[] = []
  let remaining = Math.abs(seed) % 1000000000 + 100000000 // Ensure 9 digits
  
  for (let i = 0; i < 9; i++) {
    digits.unshift(remaining % 10)
    remaining = Math.floor(remaining / 10)
  }
  
  // Ensure first digit is not 0
  if (digits[0] === 0) {
    digits[0] = 1
  }

  // Calculate 10th digit
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7]
  let tenthDigit = ((oddSum * 7) - evenSum) % 10
  if (tenthDigit < 0) tenthDigit += 10
  digits.push(tenthDigit)

  // Calculate 11th digit
  const first10Sum = digits.reduce((sum, d) => sum + d, 0)
  const eleventhDigit = first10Sum % 10
  digits.push(eleventhDigit)

  return digits.join('')
}

describe('Employee Property Tests', () => {
  let prisma: PrismaClient
  let repository: EmployeeRepository
  let service: EmployeeService
  let auditLogger: AuditLoggerService
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
    await prisma.employeeDetails.deleteMany({})
    await prisma.employeeDocument.deleteMany({})
    await prisma.attendanceLog.deleteMany({})
    await prisma.overtime.deleteMany({})
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
    await prisma.employee.deleteMany({})
    await prisma.position.deleteMany({})
    await prisma.department.deleteMany({})
    await prisma.auditLog.deleteMany({})

    // Create test department and position
    const department = await prisma.department.create({
      data: {
        name: `TestDept_${Date.now()}`
      }
    })
    testDepartmentId = department.id

    const position = await prisma.position.create({
      data: {
        title: `TestPos_${Date.now()}`,
        departmentId: testDepartmentId
      }
    })
    testPositionId = position.id

    repository = new EmployeeRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    repository.setAuditLogger(auditLogger)
    service = new EmployeeService(repository)
  })

  /**
   * Valid TC Kimlik No generator
   * Generates valid 11-digit TC Kimlik numbers that pass checksum validation
   */
  const validTCKimlikArbitrary = fc.integer({ min: 100000000, max: 999999999 }).map(num => {
    return generateValidTCKimlik(num)
  })

  /**
   * Property 9: Employee Code Uniqueness
   * For any employee code, the system should prevent creating another employee with the same code.
   * Auto-generated codes should always be unique.
   * Validates: Requirements 4.2, 4.3
   */
  describe('Property 9: Employee Code Uniqueness', () => {
    it('should generate unique employee codes automatically', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (numEmployees) => {
            // Clean up employees before each iteration
            await prisma.employee.deleteMany({})

            const createdCodes: string[] = []

            // Create multiple employees without specifying employee code
            for (let i = 0; i < numEmployees; i++) {
              // Generate unique TC Kimlik for each employee
              const tcKimlik = generateValidTCKimlik(Date.now() + i * 1000)

              const employee = await service.create({
                firstName: `Test${i}`,
                lastName: `Employee${i}`,
                identityNumber: tcKimlik,
                departmentId: testDepartmentId,
                positionId: testPositionId,
                hireDate: new Date(),
                contractType: 'Süresiz'
              })

              // Each generated code should be unique
              expect(createdCodes).not.toContain(employee.employeeCode)
              createdCodes.push(employee.employeeCode)
            }

            // All codes should be unique
            const uniqueCodes = new Set(createdCodes)
            expect(uniqueCodes.size).toBe(createdCodes.length)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should prevent duplicate employee codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 15 }).filter(s => /^[A-Z0-9]+$/i.test(s)),
          validTCKimlikArbitrary,
          async (customCode, tcKimlik) => {
            // Clean up employees before each iteration
            await prisma.employee.deleteMany({})

            const uniqueCode = `EMP${customCode}${Date.now()}`
            const tcKimlik2 = generateValidTCKimlik(Date.now() + 1000)

            // Create first employee with custom code
            await service.create({
              employeeCode: uniqueCode,
              firstName: 'First',
              lastName: 'Employee',
              identityNumber: tcKimlik,
              departmentId: testDepartmentId,
              positionId: testPositionId,
              hireDate: new Date(),
              contractType: 'Süresiz'
            })

            // Attempt to create second employee with same code should fail
            let errorThrown = false
            try {
              await service.create({
                employeeCode: uniqueCode,
                firstName: 'Second',
                lastName: 'Employee',
                identityNumber: tcKimlik2,
                departmentId: testDepartmentId,
                positionId: testPositionId,
                hireDate: new Date(),
                contractType: 'Süresiz'
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('sicil numarası zaten kullanılıyor')
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

    it('should prevent duplicate employee codes even for soft-deleted employees', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 15 }).filter(s => /^[A-Z0-9]+$/i.test(s)),
          validTCKimlikArbitrary,
          async (customCode, tcKimlik) => {
            // Clean up employees before each iteration
            await prisma.employee.deleteMany({})

            const uniqueCode = `EMP${customCode}${Date.now()}`
            const tcKimlik2 = generateValidTCKimlik(Date.now() + 1000)

            // Create and soft-delete first employee
            const employee1 = await service.create({
              employeeCode: uniqueCode,
              firstName: 'First',
              lastName: 'Employee',
              identityNumber: tcKimlik,
              departmentId: testDepartmentId,
              positionId: testPositionId,
              hireDate: new Date(),
              contractType: 'Süresiz'
            })

            await service.delete(employee1.id)

            // Attempt to create second employee with same code should still fail
            // (soft-deleted records still count for uniqueness)
            let errorThrown = false
            try {
              await service.create({
                employeeCode: uniqueCode,
                firstName: 'Second',
                lastName: 'Employee',
                identityNumber: tcKimlik2,
                departmentId: testDepartmentId,
                positionId: testPositionId,
                hireDate: new Date(),
                contractType: 'Süresiz'
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('sicil numarası zaten kullanılıyor')
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

    it('should generate codes with correct format (EMP + year + sequence)', async () => {
      await fc.assert(
        fc.asyncProperty(
          validTCKimlikArbitrary,
          async (tcKimlik) => {
            // Clean up employees before each iteration
            await prisma.employee.deleteMany({})

            const employee = await service.create({
              firstName: 'Test',
              lastName: 'Employee',
              identityNumber: tcKimlik,
              departmentId: testDepartmentId,
              positionId: testPositionId,
              hireDate: new Date(),
              contractType: 'Süresiz'
            })

            const currentYear = new Date().getFullYear()
            const expectedPrefix = `EMP${currentYear}`

            // Code should start with EMP + current year
            expect(employee.employeeCode.startsWith(expectedPrefix)).toBe(true)

            // Code should have 4 digit sequence after prefix
            const sequence = employee.employeeCode.replace(expectedPrefix, '')
            expect(sequence.length).toBe(4)
            expect(/^\d{4}$/.test(sequence)).toBe(true)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should increment sequence number for each new employee', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (numEmployees) => {
            // Clean up employees before each iteration
            await prisma.employee.deleteMany({})

            const sequences: number[] = []

            for (let i = 0; i < numEmployees; i++) {
              const tcKimlik = generateValidTCKimlik(Date.now() + i * 1000)

              const employee = await service.create({
                firstName: `Test${i}`,
                lastName: `Employee${i}`,
                identityNumber: tcKimlik,
                departmentId: testDepartmentId,
                positionId: testPositionId,
                hireDate: new Date(),
                contractType: 'Süresiz'
              })

              const currentYear = new Date().getFullYear()
              const expectedPrefix = `EMP${currentYear}`
              const sequence = parseInt(employee.employeeCode.replace(expectedPrefix, ''), 10)
              sequences.push(sequence)
            }

            // Sequences should be incrementing
            for (let i = 1; i < sequences.length; i++) {
              expect(sequences[i]).toBeGreaterThan(sequences[i - 1])
            }

            return true
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})
