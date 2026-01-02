import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { TrainingRepository } from '../../../src/main/repositories/TrainingRepository'
import { EmployeeTrainingRepository, VALID_TRAINING_STATUSES } from '../../../src/main/repositories/EmployeeTrainingRepository'
import { TrainingService, BusinessRuleError, ValidationError } from '../../../src/main/services/TrainingService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 35: Training Duration Positivity
 * Property 36: Completed Training Date Requirement
 * Validates: Requirements 17.4, 17.6
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

describe('Training Property Tests', () => {
  let prisma: PrismaClient
  let trainingRepository: TrainingRepository
  let employeeTrainingRepository: EmployeeTrainingRepository
  let trainingService: TrainingService
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
    await prisma.training.deleteMany({})
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
    trainingRepository = new TrainingRepository(prisma)
    employeeTrainingRepository = new EmployeeTrainingRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    trainingRepository.setAuditLogger(auditLogger)
    
    trainingService = new TrainingService(trainingRepository, employeeTrainingRepository)
  })

  /**
   * Property 35: Training Duration Positivity
   * For any training, the duration_hours must be a positive integer.
   * Validates: Requirements 17.6
   */
  describe('Property 35: Training Duration Positivity', () => {
    it('should accept positive integer duration hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Positive duration (1-1000 hours)
          fc.integer({ min: 1, max: 1000 }),
          // Training title
          fc.string({ minLength: 3, maxLength: 50 }),
          async (durationHours, title) => {
            // Clean up
            await prisma.employeeTraining.deleteMany({})
            await prisma.training.deleteMany({})

            const cleanTitle = `Training_${title.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`

            // Create training with positive duration
            const training = await trainingService.createTraining({
              title: cleanTitle,
              durationHours,
              provider: 'Test Provider',
              category: 'Technical'
            })

            expect(training).toBeDefined()
            expect(training.durationHours).toBe(durationHours)
            expect(training.durationHours).toBeGreaterThan(0)
            expect(Number.isInteger(training.durationHours)).toBe(true)

            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should reject zero duration hours', async () => {
      // Clean up
      await prisma.employeeTraining.deleteMany({})
      await prisma.training.deleteMany({})

      let errorThrown = false
      try {
        await trainingService.createTraining({
          title: 'Zero Duration Training',
          durationHours: 0,
          provider: 'Test Provider'
        })
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.field).toBe('durationHours')
          expect(error.constraint).toContain('pozitif')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should reject negative duration hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Negative duration
          fc.integer({ min: -1000, max: -1 }),
          async (negativeDuration) => {
            // Clean up
            await prisma.employeeTraining.deleteMany({})
            await prisma.training.deleteMany({})

            let errorThrown = false
            try {
              await trainingService.createTraining({
                title: `Negative Duration Training ${Date.now()}`,
                durationHours: negativeDuration,
                provider: 'Test Provider'
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('durationHours')
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

    it('should reject non-integer duration hours', async () => {
      // Test with specific non-integer values
      const nonIntegerValues = [0.5, 1.5, 2.7, 10.3, 99.9]
      
      for (const nonIntegerDuration of nonIntegerValues) {
        // Clean up
        await prisma.employeeTraining.deleteMany({})
        await prisma.training.deleteMany({})

        let errorThrown = false
        try {
          await trainingService.createTraining({
            title: `Non-Integer Duration Training ${Date.now()}`,
            durationHours: nonIntegerDuration,
            provider: 'Test Provider'
          })
        } catch (error) {
          if (error instanceof ValidationError) {
            expect(error.field).toBe('durationHours')
            expect(error.constraint).toContain('tam sayı')
            errorThrown = true
          }
        }

        expect(errorThrown).toBe(true)
      }
    })

    it('should correctly validate duration using isDurationPositive helper', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -100, max: 200 }),
          async (duration) => {
            const isValid = trainingService.isDurationPositive(duration)
            const expectedValid = Number.isInteger(duration) && duration > 0

            expect(isValid).toBe(expectedValid)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject duration update to non-positive value', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -100, max: 0 }),
          async (invalidDuration) => {
            // Clean up
            await prisma.employeeTraining.deleteMany({})
            await prisma.training.deleteMany({})

            // Create valid training first
            const training = await trainingService.createTraining({
              title: `Update Test Training ${Date.now()}`,
              durationHours: 10,
              provider: 'Test Provider'
            })

            // Try to update with invalid duration
            let errorThrown = false
            try {
              await trainingService.updateTraining(training.id, {
                durationHours: invalidDuration
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('durationHours')
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
   * Property 36: Completed Training Date Requirement
   * For any employee training with status "Completed", the completion_date must be set.
   * Validates: Requirements 17.4
   */
  describe('Property 36: Completed Training Date Requirement', () => {
    it('should automatically set completion date when completing training', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          fc.string({ minLength: 3, maxLength: 30 }),
          async (durationHours, title) => {
            // Clean up
            await prisma.employeeTraining.deleteMany({})
            await prisma.training.deleteMany({})

            const cleanTitle = `Training_${title.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`

            // Create training
            const training = await trainingService.createTraining({
              title: cleanTitle,
              durationHours,
              provider: 'Test Provider'
            })

            // Assign employee
            const employeeTraining = await trainingService.assignEmployee(
              training.id,
              testEmployeeId
            )
            expect(employeeTraining.status).toBe('Planned')
            expect(employeeTraining.completionDate).toBeNull()

            // Complete training
            const completed = await trainingService.completeTraining(employeeTraining.id)

            expect(completed.status).toBe('Completed')
            expect(completed.completionDate).not.toBeNull()
            // Prisma returns date as string, so we check it's a valid date string
            expect(new Date(completed.completionDate!)).toBeInstanceOf(Date)
            expect(isNaN(new Date(completed.completionDate!).getTime())).toBe(false)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should validate completion date requirement using helper', async () => {
      // Test with Completed status and no date
      const invalidCase = trainingService.hasCompletionDateWhenCompleted('Completed', null)
      expect(invalidCase).toBe(false)

      // Test with Completed status and date
      const validCase = trainingService.hasCompletionDateWhenCompleted('Completed', new Date())
      expect(validCase).toBe(true)

      // Test with non-Completed status and no date (should be valid)
      const plannedNoDate = trainingService.hasCompletionDateWhenCompleted('Planned', null)
      expect(plannedNoDate).toBe(true)

      const failedNoDate = trainingService.hasCompletionDateWhenCompleted('Failed', null)
      expect(failedNoDate).toBe(true)
    })

    it('should preserve completion date after completion', async () => {
      // Clean up
      await prisma.employeeTraining.deleteMany({})
      await prisma.training.deleteMany({})

      // Create training
      const training = await trainingService.createTraining({
        title: `Completion Date Test ${Date.now()}`,
        durationHours: 8,
        provider: 'Test Provider'
      })

      // Assign employee
      const employeeTraining = await trainingService.assignEmployee(
        training.id,
        testEmployeeId
      )

      // Complete training
      const beforeCompletion = new Date()
      const completed = await trainingService.completeTraining(employeeTraining.id)
      const afterCompletion = new Date()

      // Verify completion date is set and within expected range
      expect(completed.completionDate).not.toBeNull()
      const completionDate = new Date(completed.completionDate!)
      expect(completionDate.getTime()).toBeGreaterThanOrEqual(beforeCompletion.getTime())
      expect(completionDate.getTime()).toBeLessThanOrEqual(afterCompletion.getTime())
    })

    it('should allow certificate URL when completing training', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl(),
          async (certificateUrl) => {
            // Clean up
            await prisma.employeeTraining.deleteMany({})
            await prisma.training.deleteMany({})

            // Create training
            const training = await trainingService.createTraining({
              title: `Certificate Test ${Date.now()}`,
              durationHours: 16,
              provider: 'Test Provider'
            })

            // Assign employee
            const employeeTraining = await trainingService.assignEmployee(
              training.id,
              testEmployeeId
            )

            // Complete training with certificate
            const completed = await trainingService.completeTraining(
              employeeTraining.id,
              certificateUrl
            )

            expect(completed.status).toBe('Completed')
            expect(completed.completionDate).not.toBeNull()
            expect(completed.certificateUrl).toBe(certificateUrl)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should not set completion date for failed trainings', async () => {
      // Clean up
      await prisma.employeeTraining.deleteMany({})
      await prisma.training.deleteMany({})

      // Create training
      const training = await trainingService.createTraining({
        title: `Failed Training Test ${Date.now()}`,
        durationHours: 8,
        provider: 'Test Provider'
      })

      // Assign employee
      const employeeTraining = await trainingService.assignEmployee(
        training.id,
        testEmployeeId
      )

      // Fail training
      const failed = await trainingService.failTraining(employeeTraining.id)

      expect(failed.status).toBe('Failed')
      expect(failed.completionDate).toBeNull()
    })

    it('should not set completion date for planned trainings', async () => {
      // Clean up
      await prisma.employeeTraining.deleteMany({})
      await prisma.training.deleteMany({})

      // Create training
      const training = await trainingService.createTraining({
        title: `Planned Training Test ${Date.now()}`,
        durationHours: 8,
        provider: 'Test Provider'
      })

      // Assign employee
      const employeeTraining = await trainingService.assignEmployee(
        training.id,
        testEmployeeId
      )

      expect(employeeTraining.status).toBe('Planned')
      expect(employeeTraining.completionDate).toBeNull()
    })
  })

  /**
   * Additional property tests for training workflow
   */
  describe('Training Workflow', () => {
    it('should prevent duplicate employee assignment to same training', async () => {
      // Clean up
      await prisma.employeeTraining.deleteMany({})
      await prisma.training.deleteMany({})

      // Create training
      const training = await trainingService.createTraining({
        title: `Duplicate Assignment Test ${Date.now()}`,
        durationHours: 8,
        provider: 'Test Provider'
      })

      // First assignment should succeed
      await trainingService.assignEmployee(training.id, testEmployeeId)

      // Second assignment should fail
      let errorThrown = false
      try {
        await trainingService.assignEmployee(training.id, testEmployeeId)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('zaten atanmış')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should prevent completing already completed training', async () => {
      // Clean up
      await prisma.employeeTraining.deleteMany({})
      await prisma.training.deleteMany({})

      // Create training
      const training = await trainingService.createTraining({
        title: `Double Complete Test ${Date.now()}`,
        durationHours: 8,
        provider: 'Test Provider'
      })

      // Assign and complete
      const employeeTraining = await trainingService.assignEmployee(
        training.id,
        testEmployeeId
      )
      await trainingService.completeTraining(employeeTraining.id)

      // Try to complete again
      let errorThrown = false
      try {
        await trainingService.completeTraining(employeeTraining.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('zaten tamamlanmış')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should prevent failing completed training', async () => {
      // Clean up
      await prisma.employeeTraining.deleteMany({})
      await prisma.training.deleteMany({})

      // Create training
      const training = await trainingService.createTraining({
        title: `Fail Completed Test ${Date.now()}`,
        durationHours: 8,
        provider: 'Test Provider'
      })

      // Assign and complete
      const employeeTraining = await trainingService.assignEmployee(
        training.id,
        testEmployeeId
      )
      await trainingService.completeTraining(employeeTraining.id)

      // Try to fail completed training
      let errorThrown = false
      try {
        await trainingService.failTraining(employeeTraining.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('Tamamlanmış')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should prevent deleting training with assigned employees', async () => {
      // Clean up
      await prisma.employeeTraining.deleteMany({})
      await prisma.training.deleteMany({})

      // Create training
      const training = await trainingService.createTraining({
        title: `Delete With Employees Test ${Date.now()}`,
        durationHours: 8,
        provider: 'Test Provider'
      })

      // Assign employee
      await trainingService.assignEmployee(training.id, testEmployeeId)

      // Try to delete training
      let errorThrown = false
      try {
        await trainingService.deleteTraining(training.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('atanmış personeller var')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should allow deleting training without assigned employees', async () => {
      // Clean up
      await prisma.employeeTraining.deleteMany({})
      await prisma.training.deleteMany({})

      // Create training
      const training = await trainingService.createTraining({
        title: `Delete Without Employees Test ${Date.now()}`,
        durationHours: 8,
        provider: 'Test Provider'
      })

      // Delete should succeed
      const deleted = await trainingService.deleteTraining(training.id)
      expect(deleted.deletedAt).not.toBeNull()
    })

    it('should correctly validate training status', () => {
      for (const status of VALID_TRAINING_STATUSES) {
        expect(trainingService.isValidStatus(status)).toBe(true)
      }

      expect(trainingService.isValidStatus('Invalid')).toBe(false)
      expect(trainingService.isValidStatus('')).toBe(false)
    })
  })
})
