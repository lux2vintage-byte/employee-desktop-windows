import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { EmployeeDetailsRepository } from '../../../src/main/repositories/EmployeeDetailsRepository'
import { EmployeeDetailsService, BusinessRuleError } from '../../../src/main/services/EmployeeDetailsService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 13: One-to-One Relationship Enforcement
 * Validates: Requirements 5.2
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
 * Helper function to generate a valid Turkish IBAN
 */
function generateValidIBAN(seed: number): string {
  // Generate 24 random digits for the IBAN body
  const digits = Math.abs(seed).toString().padStart(24, '0').slice(0, 24)
  
  // Calculate check digits using mod 97 algorithm
  // Rearrange: move TR00 to end, convert letters to numbers
  const rearranged = digits + '2729' + '00' // TR = 29 27, 00 = check digits placeholder
  
  // Calculate mod 97
  let remainder = 0
  for (const char of rearranged) {
    remainder = (remainder * 10 + parseInt(char, 10)) % 97
  }
  
  const checkDigits = (98 - remainder).toString().padStart(2, '0')
  
  return `TR${checkDigits}${digits}`
}

describe('EmployeeDetails Property Tests', () => {
  let prisma: PrismaClient
  let repository: EmployeeDetailsRepository
  let service: EmployeeDetailsService
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

    repository = new EmployeeDetailsRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    repository.setAuditLogger(auditLogger)
    service = new EmployeeDetailsService(repository)
  })

  /**
   * Helper to create a test employee
   */
  async function createTestEmployee(seed: number): Promise<number> {
    const tcKimlik = generateValidTCKimlik(seed)
    const employee = await prisma.employee.create({
      data: {
        employeeCode: `EMP${Date.now()}${seed}`,
        firstName: `Test${seed}`,
        lastName: `Employee${seed}`,
        identityNumber: tcKimlik,
        departmentId: testDepartmentId,
        positionId: testPositionId,
        hireDate: new Date(),
        contractType: 'Süresiz',
        status: 'Active'
      }
    })
    return employee.id
  }

  /**
   * Property 13: One-to-One Relationship Enforcement
   * For any employee, only one EmployeeDetails record can exist.
   * Attempting to create a second details record for the same employee should fail.
   * Validates: Requirements 5.2
   */
  describe('Property 13: One-to-One Relationship Enforcement', () => {
    it('should allow creating details for an employee without existing details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          async (seed) => {
            // Clean up before each iteration
            await prisma.employeeDetails.deleteMany({})
            await prisma.employee.deleteMany({})

            // Create employee
            const employeeId = await createTestEmployee(seed)

            // Should be able to create details
            const details = await service.create({
              employeeId,
              bloodGroup: 'A+',
              gender: 'Erkek'
            })

            expect(details).toBeDefined()
            expect(details.employeeId).toBe(employeeId)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should prevent creating duplicate details for the same employee', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          async (seed) => {
            // Clean up before each iteration
            await prisma.employeeDetails.deleteMany({})
            await prisma.employee.deleteMany({})

            // Create employee
            const employeeId = await createTestEmployee(seed)

            // Create first details record
            await service.create({
              employeeId,
              bloodGroup: 'A+',
              gender: 'Erkek'
            })

            // Attempt to create second details record should fail
            let errorThrown = false
            try {
              await service.create({
                employeeId,
                bloodGroup: 'B+',
                gender: 'Kadın'
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('detay bilgisi zaten mevcut')
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

    it('should allow different employees to have their own details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (numEmployees) => {
            // Clean up before each iteration
            await prisma.employeeDetails.deleteMany({})
            await prisma.employee.deleteMany({})

            const employeeIds: number[] = []
            const detailsIds: number[] = []

            // Create multiple employees with details
            for (let i = 0; i < numEmployees; i++) {
              const employeeId = await createTestEmployee(Date.now() + i * 1000)
              employeeIds.push(employeeId)

              const details = await service.create({
                employeeId,
                bloodGroup: 'A+',
                gender: 'Erkek'
              })
              detailsIds.push(details.id)
            }

            // Each employee should have exactly one details record
            for (const employeeId of employeeIds) {
              const details = await service.findByEmployeeId(employeeId)
              expect(details).not.toBeNull()
              expect(details?.employeeId).toBe(employeeId)
            }

            // All details IDs should be unique
            const uniqueDetailsIds = new Set(detailsIds)
            expect(uniqueDetailsIds.size).toBe(detailsIds.length)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should allow updating existing details without violating one-to-one', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          fc.constantFrom('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'),
          async (seed, newBloodGroup) => {
            // Clean up before each iteration
            await prisma.employeeDetails.deleteMany({})
            await prisma.employee.deleteMany({})

            // Create employee with details
            const employeeId = await createTestEmployee(seed)
            const originalDetails = await service.create({
              employeeId,
              bloodGroup: 'A+',
              gender: 'Erkek'
            })

            // Update should succeed
            const updatedDetails = await service.update(employeeId, {
              bloodGroup: newBloodGroup as any
            })

            expect(updatedDetails.id).toBe(originalDetails.id)
            expect(updatedDetails.bloodGroup).toBe(newBloodGroup)

            // Should still be only one details record
            const count = await prisma.employeeDetails.count({
              where: { employeeId }
            })
            expect(count).toBe(1)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should allow deleting and recreating details for the same employee', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          async (seed) => {
            // Clean up before each iteration
            await prisma.employeeDetails.deleteMany({})
            await prisma.employee.deleteMany({})

            // Create employee with details
            const employeeId = await createTestEmployee(seed)
            await service.create({
              employeeId,
              bloodGroup: 'A+',
              gender: 'Erkek'
            })

            // Delete details
            await service.delete(employeeId)

            // Should be able to create new details
            const newDetails = await service.create({
              employeeId,
              bloodGroup: 'B-',
              gender: 'Kadın'
            })

            expect(newDetails).toBeDefined()
            expect(newDetails.employeeId).toBe(employeeId)
            expect(newDetails.bloodGroup).toBe('B-')

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should enforce one-to-one at database level via unique constraint', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          async (seed) => {
            // Clean up before each iteration
            await prisma.employeeDetails.deleteMany({})
            await prisma.employee.deleteMany({})

            // Create employee
            const employeeId = await createTestEmployee(seed)

            // Create details directly via Prisma
            await prisma.employeeDetails.create({
              data: {
                employeeId,
                bloodGroup: 'A+'
              }
            })

            // Attempt to create another directly should fail due to unique constraint
            let errorThrown = false
            try {
              await prisma.employeeDetails.create({
                data: {
                  employeeId,
                  bloodGroup: 'B+'
                }
              })
            } catch (error: any) {
              // Prisma unique constraint violation
              if (error.code === 'P2002') {
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
})
