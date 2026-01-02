import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { PerformanceRepository, VALID_PERFORMANCE_STATUSES } from '../../../src/main/repositories/PerformanceRepository'
import { PerformanceService, BusinessRuleError, ValidationError } from '../../../src/main/services/PerformanceService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 32: Performance Score Range
 * Property 33: Self-Review Prevention
 * Property 34: Submitted Review Immutability
 * Validates: Requirements 16.3, 16.4, 16.5
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

describe('Performance Property Tests', () => {
  let prisma: PrismaClient
  let performanceRepository: PerformanceRepository
  let performanceService: PerformanceService
  let auditLogger: AuditLoggerService
  let testEmployeeId: number
  let testReviewerId: number
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

    // Create test reviewer (different from employee)
    const reviewerTcKimlik = generateValidTCKimlik(Date.now() + 1000)
    const reviewer = await prisma.employee.create({
      data: {
        employeeCode: `REV${Date.now()}`,
        firstName: 'Reviewer',
        lastName: 'Test',
        identityNumber: reviewerTcKimlik,
        departmentId: testDepartmentId,
        positionId: testPositionId,
        hireDate: new Date(),
        contractType: 'Süresiz',
        status: 'Active'
      }
    })
    testReviewerId = reviewer.id

    // Initialize repositories and services
    performanceRepository = new PerformanceRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    performanceRepository.setAuditLogger(auditLogger)
    
    performanceService = new PerformanceService(performanceRepository)
  })

  /**
   * Property 32: Performance Score Range
   * For any performance review, the score must be between 0 and 100 (inclusive).
   * Validates: Requirements 16.3
   */
  describe('Property 32: Performance Score Range', () => {
    it('should accept scores within valid range (0-100)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Valid score (0-100)
          fc.integer({ min: 0, max: 100 }),
          // Review period
          fc.string({ minLength: 5, maxLength: 20 }),
          async (score, period) => {
            // Clean up
            await prisma.performanceReview.deleteMany({})

            const reviewPeriod = `2024 ${period.replace(/[^a-zA-Z0-9 ]/g, '')}`

            // Create review with valid score
            const review = await performanceService.create({
              employeeId: testEmployeeId,
              reviewerId: testReviewerId,
              reviewPeriod,
              score,
              feedback: 'Test feedback'
            })

            expect(review).toBeDefined()
            expect(review.score).toBe(score)
            expect(review.score).toBeGreaterThanOrEqual(0)
            expect(review.score).toBeLessThanOrEqual(100)

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject scores below 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Invalid score (negative)
          fc.integer({ min: -1000, max: -1 }),
          async (invalidScore) => {
            // Clean up
            await prisma.performanceReview.deleteMany({})

            let errorThrown = false
            try {
              await performanceService.create({
                employeeId: testEmployeeId,
                reviewerId: testReviewerId,
                reviewPeriod: '2024 Q1',
                score: invalidScore,
                feedback: 'Test feedback'
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('score')
                expect(error.constraint).toContain('0')
                expect(error.constraint).toContain('100')
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

    it('should reject scores above 100', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Invalid score (above 100)
          fc.integer({ min: 101, max: 1000 }),
          async (invalidScore) => {
            // Clean up
            await prisma.performanceReview.deleteMany({})

            let errorThrown = false
            try {
              await performanceService.create({
                employeeId: testEmployeeId,
                reviewerId: testReviewerId,
                reviewPeriod: '2024 Q2',
                score: invalidScore,
                feedback: 'Test feedback'
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('score')
                expect(error.constraint).toContain('0')
                expect(error.constraint).toContain('100')
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

    it('should validate score range using isScoreInRange helper', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -100, max: 200 }),
          async (score) => {
            const isValid = performanceService.isScoreInRange(score)
            const expectedValid = score >= 0 && score <= 100

            expect(isValid).toBe(expectedValid)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 33: Self-Review Prevention
   * For any performance review, the reviewer must be different from the employee being reviewed.
   * Validates: Requirements 16.4
   */
  describe('Property 33: Self-Review Prevention', () => {
    it('should prevent self-review (employeeId === reviewerId)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 0, max: 100 }),
          async (period, score) => {
            // Clean up
            await prisma.performanceReview.deleteMany({})

            const reviewPeriod = `2024 ${period.replace(/[^a-zA-Z0-9 ]/g, '')}`

            let errorThrown = false
            try {
              // Try to create self-review
              await performanceService.create({
                employeeId: testEmployeeId,
                reviewerId: testEmployeeId, // Same as employee
                reviewPeriod,
                score,
                feedback: 'Self review attempt'
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('kendi kendini değerlendiremez')
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

    it('should allow review when reviewer is different from employee', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.integer({ min: 0, max: 100 }),
          async (period, score) => {
            // Clean up
            await prisma.performanceReview.deleteMany({})

            const reviewPeriod = `2024 ${period.replace(/[^a-zA-Z0-9 ]/g, '')}`

            // Create review with different reviewer
            const review = await performanceService.create({
              employeeId: testEmployeeId,
              reviewerId: testReviewerId, // Different from employee
              reviewPeriod,
              score,
              feedback: 'Valid review'
            })

            expect(review).toBeDefined()
            expect(review.employeeId).toBe(testEmployeeId)
            expect(review.reviewerId).toBe(testReviewerId)
            expect(review.employeeId).not.toBe(review.reviewerId)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should correctly identify self-review using isSelfReview helper', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          async (employeeId, reviewerId) => {
            const isSelf = performanceService.isSelfReview(employeeId, reviewerId)
            const expectedSelf = employeeId === reviewerId

            expect(isSelf).toBe(expectedSelf)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 34: Submitted Review Immutability
   * For any performance review that has been submitted, no modifications should be allowed
   * (except status change to Acknowledged).
   * Validates: Requirements 16.5
   */
  describe('Property 34: Submitted Review Immutability', () => {
    it('should prevent updates to submitted reviews', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 5, maxLength: 50 }),
          async (initialScore, newScore, newFeedback) => {
            // Clean up
            await prisma.performanceReview.deleteMany({})

            // Create and submit review
            const review = await performanceService.create({
              employeeId: testEmployeeId,
              reviewerId: testReviewerId,
              reviewPeriod: '2024 Q3',
              score: initialScore,
              feedback: 'Initial feedback'
            })

            // Submit the review
            await performanceService.submit(review.id)

            // Try to update submitted review
            let errorThrown = false
            try {
              await performanceService.update(review.id, {
                score: newScore,
                feedback: newFeedback
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('güncellenemez')
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

    it('should prevent updates to acknowledged reviews', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          async (initialScore, newScore) => {
            // Clean up
            await prisma.performanceReview.deleteMany({})

            // Create, submit, and acknowledge review
            const review = await performanceService.create({
              employeeId: testEmployeeId,
              reviewerId: testReviewerId,
              reviewPeriod: '2024 Q4',
              score: initialScore,
              feedback: 'Initial feedback'
            })

            await performanceService.submit(review.id)
            await performanceService.acknowledge(review.id)

            // Try to update acknowledged review
            let errorThrown = false
            try {
              await performanceService.update(review.id, {
                score: newScore
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('güncellenemez')
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

    it('should allow updates to draft reviews', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 5, maxLength: 50 }),
          async (initialScore, newScore, newFeedback) => {
            // Clean up
            await prisma.performanceReview.deleteMany({})

            // Create draft review
            const review = await performanceService.create({
              employeeId: testEmployeeId,
              reviewerId: testReviewerId,
              reviewPeriod: '2024 Yıl Sonu',
              score: initialScore,
              feedback: 'Initial feedback'
            })

            expect(review.status).toBe('Draft')

            // Update draft review should work
            const cleanFeedback = newFeedback.replace(/[^a-zA-Z0-9 ]/g, '')
            const updated = await performanceService.update(review.id, {
              score: newScore,
              feedback: cleanFeedback
            })

            expect(updated.score).toBe(newScore)
            expect(updated.feedback).toBe(cleanFeedback)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should allow status transition from Submitted to Acknowledged', async () => {
      // Clean up
      await prisma.performanceReview.deleteMany({})

      // Create and submit review
      const review = await performanceService.create({
        employeeId: testEmployeeId,
        reviewerId: testReviewerId,
        reviewPeriod: '2025 Q1',
        score: 85,
        feedback: 'Good performance'
      })

      const submitted = await performanceService.submit(review.id)
      expect(submitted.status).toBe('Submitted')

      // Acknowledge should work
      const acknowledged = await performanceService.acknowledge(review.id)
      expect(acknowledged.status).toBe('Acknowledged')
    })

    it('should correctly identify editable status using isReviewEditable helper', async () => {
      for (const status of VALID_PERFORMANCE_STATUSES) {
        const isEditable = performanceService.isReviewEditable(status)
        const expectedEditable = status === 'Draft'

        expect(isEditable).toBe(expectedEditable)
      }
    })

    it('should prevent deletion of submitted reviews', async () => {
      // Clean up
      await prisma.performanceReview.deleteMany({})

      // Create and submit review
      const review = await performanceService.create({
        employeeId: testEmployeeId,
        reviewerId: testReviewerId,
        reviewPeriod: '2025 Q2',
        score: 75,
        feedback: 'Test feedback'
      })

      await performanceService.submit(review.id)

      // Try to delete submitted review
      let errorThrown = false
      try {
        await performanceService.delete(review.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('silinemez')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should allow deletion of draft reviews', async () => {
      // Clean up
      await prisma.performanceReview.deleteMany({})

      // Create draft review
      const review = await performanceService.create({
        employeeId: testEmployeeId,
        reviewerId: testReviewerId,
        reviewPeriod: '2025 Q3',
        score: 80,
        feedback: 'Test feedback'
      })

      expect(review.status).toBe('Draft')

      // Delete should work
      const deleted = await performanceService.delete(review.id)
      expect(deleted.deletedAt).not.toBeNull()
    })
  })

  /**
   * Additional property tests for performance review workflow
   */
  describe('Performance Review Workflow', () => {
    it('should require score before submission', async () => {
      // Clean up
      await prisma.performanceReview.deleteMany({})

      // Create review without score
      const review = await performanceService.create({
        employeeId: testEmployeeId,
        reviewerId: testReviewerId,
        reviewPeriod: '2025 Q4',
        feedback: 'Test feedback'
        // No score
      })

      // Try to submit without score
      let errorThrown = false
      try {
        await performanceService.submit(review.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('puan zorunludur')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should follow correct status workflow: Draft -> Submitted -> Acknowledged', async () => {
      // Clean up
      await prisma.performanceReview.deleteMany({})

      // Create review
      const review = await performanceService.create({
        employeeId: testEmployeeId,
        reviewerId: testReviewerId,
        reviewPeriod: '2025 Yıl Sonu',
        score: 90,
        feedback: 'Excellent performance'
      })
      expect(review.status).toBe('Draft')

      // Submit
      const submitted = await performanceService.submit(review.id)
      expect(submitted.status).toBe('Submitted')

      // Acknowledge
      const acknowledged = await performanceService.acknowledge(review.id)
      expect(acknowledged.status).toBe('Acknowledged')
    })

    it('should prevent invalid status transitions', async () => {
      // Clean up
      await prisma.performanceReview.deleteMany({})

      // Create review
      const review = await performanceService.create({
        employeeId: testEmployeeId,
        reviewerId: testReviewerId,
        reviewPeriod: '2026 Q1',
        score: 70,
        feedback: 'Test feedback'
      })

      // Try to acknowledge draft (should fail)
      let errorThrown = false
      try {
        await performanceService.acknowledge(review.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('gönderilmiş')
          errorThrown = true
        }
      }
      expect(errorThrown).toBe(true)

      // Submit first
      await performanceService.submit(review.id)

      // Try to submit again (should fail)
      errorThrown = false
      try {
        await performanceService.submit(review.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('taslak')
          errorThrown = true
        }
      }
      expect(errorThrown).toBe(true)
    })
  })
})
