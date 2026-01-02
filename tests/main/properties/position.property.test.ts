import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { PositionRepository } from '../../../src/main/repositories/PositionRepository'
import { PositionService, ValidationError } from '../../../src/main/services/PositionService'
import { DepartmentRepository } from '../../../src/main/repositories/DepartmentRepository'
import { DepartmentService } from '../../../src/main/services/DepartmentService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 8: Position Salary Range Validity
 * Validates: Requirements 3.3
 * 
 * For any position, base_salary_min <= base_salary_max must always hold.
 */

describe('Position Property Tests', () => {
  let prisma: PrismaClient
  let positionRepository: PositionRepository
  let positionService: PositionService
  let departmentRepository: DepartmentRepository
  let departmentService: DepartmentService
  let auditLogger: AuditLoggerService
  let testDepartmentId: number

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
    await prisma.employee.deleteMany({})
    await prisma.position.deleteMany({})
    await prisma.department.deleteMany({})
    await prisma.auditLog.deleteMany({})

    // Initialize repositories and services
    departmentRepository = new DepartmentRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    departmentRepository.setAuditLogger(auditLogger)
    departmentService = new DepartmentService(departmentRepository)

    positionRepository = new PositionRepository(prisma)
    positionRepository.setAuditLogger(auditLogger)
    positionService = new PositionService(positionRepository)

    // Create a test department for positions
    const dept = await departmentService.create({
      name: `TestDept_${Date.now()}`,
      parentDepartmentId: null
    })
    testDepartmentId = dept.id
  })

  /**
   * Property 8: Position Salary Range Validity
   * For any position, base_salary_min <= base_salary_max must always hold.
   * Validates: Requirements 3.3
   */
  describe('Property 8: Position Salary Range Validity', () => {
    it('should accept valid salary ranges where min <= max', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate min salary (0 to 50000) - use integer to avoid float precision issues
          fc.integer({ min: 0, max: 50000 }),
          // Generate max salary offset (0 to 50000, will be added to min)
          fc.integer({ min: 0, max: 50000 }),
          async (minSalary, maxOffset) => {
            // Clean up positions before each iteration
            await prisma.position.deleteMany({})

            const maxSalary = minSalary + maxOffset

            // Create position with valid salary range
            const position = await positionService.create({
              title: `Position_${Date.now()}_${Math.random()}`,
              departmentId: testDepartmentId,
              baseSalaryMin: minSalary,
              baseSalaryMax: maxSalary
            })

            // Verify the position was created
            expect(position).toBeDefined()
            expect(position.baseSalaryMin).toBe(minSalary)
            expect(position.baseSalaryMax).toBe(maxSalary)

            // Verify min <= max
            expect(position.baseSalaryMin).toBeLessThanOrEqual(position.baseSalaryMax!)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should reject salary ranges where min > max', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate min salary (1000 to 100000)
          fc.integer({ min: 1000, max: 100000 }),
          // Generate offset to make max < min (1 to 1000)
          fc.integer({ min: 1, max: 1000 }),
          async (minSalary, offset) => {
            // Clean up positions before each iteration
            await prisma.position.deleteMany({})

            const maxSalary = minSalary - offset // max < min

            // Attempt to create position with invalid salary range
            let errorThrown = false
            try {
              await positionService.create({
                title: `Position_${Date.now()}_${Math.random()}`,
                departmentId: testDepartmentId,
                baseSalaryMin: minSalary,
                baseSalaryMax: maxSalary
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('baseSalaryMin')
                expect(error.constraint).toContain('büyük olamaz')
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

    it('should accept equal min and max salary', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate salary value - use integer to avoid float precision issues
          fc.integer({ min: 0, max: 100000 }),
          async (salary) => {
            // Clean up positions before each iteration
            await prisma.position.deleteMany({})

            // Create position with min == max
            const position = await positionService.create({
              title: `Position_${Date.now()}_${Math.random()}`,
              departmentId: testDepartmentId,
              baseSalaryMin: salary,
              baseSalaryMax: salary
            })

            // Verify the position was created
            expect(position).toBeDefined()
            expect(position.baseSalaryMin).toBe(salary)
            expect(position.baseSalaryMax).toBe(salary)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should accept null salary values', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate which values to set as null
          fc.boolean(),
          fc.boolean(),
          fc.integer({ min: 0, max: 100000 }),
          async (nullMin, nullMax, salary) => {
            // Clean up positions before each iteration
            await prisma.position.deleteMany({})

            const minSalary = nullMin ? null : salary
            const maxSalary = nullMax ? null : (nullMin ? salary : salary + 1000)

            // Create position with null values
            const position = await positionService.create({
              title: `Position_${Date.now()}_${Math.random()}`,
              departmentId: testDepartmentId,
              baseSalaryMin: minSalary,
              baseSalaryMax: maxSalary
            })

            // Verify the position was created
            expect(position).toBeDefined()

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should reject negative salary values', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate negative salary
          fc.integer({ min: -100000, max: -1 }),
          async (negativeSalary) => {
            // Clean up positions before each iteration
            await prisma.position.deleteMany({})

            // Attempt to create position with negative min salary
            let errorThrown = false
            try {
              await positionService.create({
                title: `Position_${Date.now()}_${Math.random()}`,
                departmentId: testDepartmentId,
                baseSalaryMin: negativeSalary,
                baseSalaryMax: 50000
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.constraint).toContain('negatif olamaz')
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

    it('should maintain salary range validity on update', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial valid range - use integers
          fc.integer({ min: 0, max: 40000 }),
          fc.integer({ min: 1000, max: 50000 }),
          // Update values that would make range invalid (must be > initialMax)
          fc.integer({ min: 1, max: 10000 }),
          async (initialMin, initialOffset, extraOffset) => {
            // Clean up positions before each iteration
            await prisma.position.deleteMany({})

            const initialMax = initialMin + initialOffset
            // Ensure newMin is strictly greater than initialMax
            const newMin = initialMax + extraOffset

            // Create position with valid range
            const position = await positionService.create({
              title: `Position_${Date.now()}_${Math.random()}`,
              departmentId: testDepartmentId,
              baseSalaryMin: initialMin,
              baseSalaryMax: initialMax
            })

            // Attempt to update min to be greater than max
            let errorThrown = false
            try {
              await positionService.update(position.id, {
                baseSalaryMin: newMin // newMin > initialMax
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.constraint).toContain('büyük olamaz')
                errorThrown = true
              }
            }

            expect(errorThrown).toBe(true)

            // Verify original values are preserved
            const unchanged = await positionService.findById(position.id)
            expect(unchanged?.baseSalaryMin).toBe(initialMin)
            expect(unchanged?.baseSalaryMax).toBe(initialMax)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should validate salary is within position range', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate salary range - use integers
          fc.integer({ min: 10000, max: 30000 }),
          fc.integer({ min: 30001, max: 50000 }),
          // Generate test salary
          fc.integer({ min: 0, max: 60000 }),
          async (minSalary, maxSalary, testSalary) => {
            // Clean up positions before each iteration
            await prisma.position.deleteMany({})

            // Create position with salary range
            const position = await positionService.create({
              title: `Position_${Date.now()}_${Math.random()}`,
              departmentId: testDepartmentId,
              baseSalaryMin: minSalary,
              baseSalaryMax: maxSalary
            })

            // Validate salary
            const isValid = await positionService.validateSalaryRange(position.id, testSalary)

            // Check expected result
            const expectedValid = testSalary >= minSalary && testSalary <= maxSalary
            expect(isValid).toBe(expectedValid)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})
