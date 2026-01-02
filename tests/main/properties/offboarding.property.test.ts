import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { 
  ResignationRepository, 
  VALID_REASON_CATEGORIES, 
  VALID_RESIGNATION_STATUSES 
} from '../../../src/main/repositories/ResignationRepository'
import { ExitInterviewRepository } from '../../../src/main/repositories/ExitInterviewRepository'
import { 
  OffboardingService, 
  BusinessRuleError, 
  ValidationError 
} from '../../../src/main/services/OffboardingService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 37: Resignation Status Transition
 * Property 38: Exit Interview One-to-One
 * Validates: Requirements 19.4, 19.6
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

describe('Offboarding Property Tests', () => {
  let prisma: PrismaClient
  let resignationRepository: ResignationRepository
  let exitInterviewRepository: ExitInterviewRepository
  let offboardingService: OffboardingService
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
    resignationRepository = new ResignationRepository(prisma)
    exitInterviewRepository = new ExitInterviewRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    resignationRepository.setAuditLogger(auditLogger)
    exitInterviewRepository.setAuditLogger(auditLogger)
    
    offboardingService = new OffboardingService(
      resignationRepository,
      exitInterviewRepository,
      prisma
    )
  })

  /**
   * Property 37: Resignation Status Transition
   * For any approved resignation, the employee's status must be updated to Terminated
   * when the resignation is completed on the last working day.
   * Validates: Requirements 19.4
   */
  describe('Property 37: Resignation Status Transition', () => {
    it('should update employee status to Terminated when resignation is completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Reason category
          fc.constantFrom(...VALID_REASON_CATEGORIES),
          // Days until last working day (1-30)
          fc.integer({ min: 1, max: 30 }),
          async (reasonCategory, daysUntilLast) => {
            // Clean up
            await prisma.exitInterview.deleteMany({})
            await prisma.resignation.deleteMany({})
            
            // Reset employee status to Active
            await prisma.employee.update({
              where: { id: testEmployeeId },
              data: { status: 'Active' }
            })

            const lastWorkingDay = new Date()
            lastWorkingDay.setDate(lastWorkingDay.getDate() + daysUntilLast)

            // Create resignation
            const resignation = await offboardingService.createResignation({
              employeeId: testEmployeeId,
              reasonCategory,
              reasonDetail: 'Test resignation',
              lastWorkingDay
            })

            expect(resignation.status).toBe('Pending')

            // Approve resignation
            const approved = await offboardingService.approveResignation(resignation.id)
            expect(approved.status).toBe('Approved')

            // Verify employee is still Active before completion
            const employeeBefore = await prisma.employee.findUnique({
              where: { id: testEmployeeId }
            })
            expect(employeeBefore?.status).toBe('Active')

            // Complete resignation
            const completed = await offboardingService.completeResignation(resignation.id)
            expect(completed.status).toBe('Completed')

            // Verify employee status is now Terminated
            const employeeAfter = await prisma.employee.findUnique({
              where: { id: testEmployeeId }
            })
            expect(employeeAfter?.status).toBe('Terminated')

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should follow correct status workflow: Pending -> Approved -> Completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...VALID_REASON_CATEGORIES),
          async (reasonCategory) => {
            // Clean up
            await prisma.exitInterview.deleteMany({})
            await prisma.resignation.deleteMany({})
            
            // Reset employee status
            await prisma.employee.update({
              where: { id: testEmployeeId },
              data: { status: 'Active' }
            })

            const lastWorkingDay = new Date()
            lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

            // Create resignation - should be Pending
            const resignation = await offboardingService.createResignation({
              employeeId: testEmployeeId,
              reasonCategory,
              lastWorkingDay
            })
            expect(resignation.status).toBe('Pending')

            // Approve - should be Approved
            const approved = await offboardingService.approveResignation(resignation.id)
            expect(approved.status).toBe('Approved')

            // Complete - should be Completed
            const completed = await offboardingService.completeResignation(resignation.id)
            expect(completed.status).toBe('Completed')

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should prevent completing non-approved resignations', async () => {
      // Clean up
      await prisma.exitInterview.deleteMany({})
      await prisma.resignation.deleteMany({})

      const lastWorkingDay = new Date()
      lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

      // Create resignation (Pending)
      const resignation = await offboardingService.createResignation({
        employeeId: testEmployeeId,
        reasonCategory: 'İstifa',
        lastWorkingDay
      })

      // Try to complete without approval
      let errorThrown = false
      try {
        await offboardingService.completeResignation(resignation.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('onaylanmış')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should prevent approving non-pending resignations', async () => {
      // Clean up
      await prisma.exitInterview.deleteMany({})
      await prisma.resignation.deleteMany({})
      
      // Reset employee status
      await prisma.employee.update({
        where: { id: testEmployeeId },
        data: { status: 'Active' }
      })

      const lastWorkingDay = new Date()
      lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

      // Create and approve resignation
      const resignation = await offboardingService.createResignation({
        employeeId: testEmployeeId,
        reasonCategory: 'İstifa',
        lastWorkingDay
      })
      await offboardingService.approveResignation(resignation.id)

      // Try to approve again
      let errorThrown = false
      try {
        await offboardingService.approveResignation(resignation.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('bekleyen')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should validate status transition using isValidStatusTransition helper', async () => {
      // Valid transitions
      expect(offboardingService.isValidStatusTransition('Pending', 'Approved')).toBe(true)
      expect(offboardingService.isValidStatusTransition('Approved', 'Completed')).toBe(true)

      // Invalid transitions
      expect(offboardingService.isValidStatusTransition('Pending', 'Completed')).toBe(false)
      expect(offboardingService.isValidStatusTransition('Approved', 'Pending')).toBe(false)
      expect(offboardingService.isValidStatusTransition('Completed', 'Pending')).toBe(false)
      expect(offboardingService.isValidStatusTransition('Completed', 'Approved')).toBe(false)
    })

    it('should validate reason categories', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...VALID_REASON_CATEGORIES),
          async (reasonCategory) => {
            const isValid = offboardingService.isValidReasonCategory(reasonCategory)
            expect(isValid).toBe(true)
            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should reject invalid reason categories', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !VALID_REASON_CATEGORIES.includes(s as any)
          ),
          async (invalidCategory) => {
            const isValid = offboardingService.isValidReasonCategory(invalidCategory)
            expect(isValid).toBe(false)
            return true
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * Property 38: Exit Interview One-to-One
   * For any resignation, there can be at most one exit interview record.
   * Validates: Requirements 19.6
   */
  describe('Property 38: Exit Interview One-to-One', () => {
    it('should allow creating one exit interview per resignation', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Comments
          fc.string({ minLength: 0, maxLength: 200 }),
          // Would rehire
          fc.boolean(),
          async (comments, wouldRehire) => {
            // Clean up
            await prisma.exitInterview.deleteMany({})
            await prisma.resignation.deleteMany({})

            const lastWorkingDay = new Date()
            lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

            // Create resignation
            const resignation = await offboardingService.createResignation({
              employeeId: testEmployeeId,
              reasonCategory: 'İstifa',
              lastWorkingDay
            })

            // Create exit interview
            const cleanComments = comments.replace(/[^\w\s]/gi, '')
            const exitInterview = await offboardingService.createExitInterview(
              resignation.id,
              { comments: cleanComments, wouldRehire }
            )

            expect(exitInterview).toBeDefined()
            expect(exitInterview.resignationId).toBe(resignation.id)
            expect(exitInterview.wouldRehire).toBe(wouldRehire)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should prevent creating second exit interview for same resignation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.boolean(),
          async (comments, wouldRehire) => {
            // Clean up
            await prisma.exitInterview.deleteMany({})
            await prisma.resignation.deleteMany({})

            const lastWorkingDay = new Date()
            lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

            // Create resignation
            const resignation = await offboardingService.createResignation({
              employeeId: testEmployeeId,
              reasonCategory: 'İstifa',
              lastWorkingDay
            })

            // Create first exit interview
            const cleanComments = comments.replace(/[^\w\s]/gi, '')
            await offboardingService.createExitInterview(
              resignation.id,
              { comments: cleanComments, wouldRehire }
            )

            // Try to create second exit interview
            let errorThrown = false
            try {
              await offboardingService.createExitInterview(
                resignation.id,
                { comments: 'Second interview', wouldRehire: !wouldRehire }
              )
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('zaten çıkış mülakatı var')
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

    it('should enforce one-to-one relationship at database level', async () => {
      // Clean up
      await prisma.exitInterview.deleteMany({})
      await prisma.resignation.deleteMany({})

      const lastWorkingDay = new Date()
      lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

      // Create resignation
      const resignation = await offboardingService.createResignation({
        employeeId: testEmployeeId,
        reasonCategory: 'Emeklilik',
        lastWorkingDay
      })

      // Create exit interview directly via repository
      await exitInterviewRepository.create({
        resignationId: resignation.id,
        comments: 'First interview',
        wouldRehire: true
      })

      // Verify one-to-one check
      const exists = await exitInterviewRepository.existsForResignation(resignation.id)
      expect(exists).toBe(true)

      // Try to create another via Prisma directly (should fail due to unique constraint)
      let errorThrown = false
      try {
        await prisma.exitInterview.create({
          data: {
            resignationId: resignation.id,
            comments: 'Second interview',
            wouldRehire: false
          }
        })
      } catch (error) {
        // Prisma unique constraint error
        errorThrown = true
      }

      expect(errorThrown).toBe(true)
    })

    it('should allow exit interview for different resignations', async () => {
      // Clean up
      await prisma.exitInterview.deleteMany({})
      await prisma.resignation.deleteMany({})

      // Create second employee
      const tcKimlik2 = generateValidTCKimlik(Date.now() + 5000)
      const employee2 = await prisma.employee.create({
        data: {
          employeeCode: `EMP2_${Date.now()}`,
          firstName: 'Test2',
          lastName: 'Employee2',
          identityNumber: tcKimlik2,
          departmentId: testDepartmentId,
          positionId: testPositionId,
          hireDate: new Date(),
          contractType: 'Süresiz',
          status: 'Active'
        }
      })

      const lastWorkingDay = new Date()
      lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

      // Create resignation for first employee
      const resignation1 = await offboardingService.createResignation({
        employeeId: testEmployeeId,
        reasonCategory: 'İstifa',
        lastWorkingDay
      })

      // Create resignation for second employee
      const resignation2 = await offboardingService.createResignation({
        employeeId: employee2.id,
        reasonCategory: 'Emeklilik',
        lastWorkingDay
      })

      // Create exit interviews for both
      const exitInterview1 = await offboardingService.createExitInterview(
        resignation1.id,
        { comments: 'Interview 1', wouldRehire: true }
      )

      const exitInterview2 = await offboardingService.createExitInterview(
        resignation2.id,
        { comments: 'Interview 2', wouldRehire: false }
      )

      expect(exitInterview1.resignationId).toBe(resignation1.id)
      expect(exitInterview2.resignationId).toBe(resignation2.id)
      expect(exitInterview1.id).not.toBe(exitInterview2.id)
    })

    it('should retrieve exit interview by resignation ID', async () => {
      // Clean up
      await prisma.exitInterview.deleteMany({})
      await prisma.resignation.deleteMany({})

      const lastWorkingDay = new Date()
      lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

      // Create resignation
      const resignation = await offboardingService.createResignation({
        employeeId: testEmployeeId,
        reasonCategory: 'Çıkarılma',
        lastWorkingDay
      })

      // Create exit interview
      const created = await offboardingService.createExitInterview(
        resignation.id,
        { comments: 'Test comments', wouldRehire: false }
      )

      // Retrieve by resignation ID
      const retrieved = await offboardingService.findExitInterviewByResignation(resignation.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.resignationId).toBe(resignation.id)
    })
  })

  /**
   * Additional property tests for offboarding workflow
   */
  describe('Offboarding Workflow', () => {
    it('should prevent multiple active resignations for same employee', async () => {
      // Clean up
      await prisma.exitInterview.deleteMany({})
      await prisma.resignation.deleteMany({})

      const lastWorkingDay = new Date()
      lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

      // Create first resignation
      await offboardingService.createResignation({
        employeeId: testEmployeeId,
        reasonCategory: 'İstifa',
        lastWorkingDay
      })

      // Try to create second resignation
      let errorThrown = false
      try {
        await offboardingService.createResignation({
          employeeId: testEmployeeId,
          reasonCategory: 'Emeklilik',
          lastWorkingDay
        })
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('aktif bir ayrılma talebi var')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should require last working day for approval', async () => {
      // Clean up
      await prisma.exitInterview.deleteMany({})
      await prisma.resignation.deleteMany({})

      // Create resignation without last working day
      const resignation = await offboardingService.createResignation({
        employeeId: testEmployeeId,
        reasonCategory: 'İstifa'
        // No lastWorkingDay
      })

      // Try to approve without providing last working day
      let errorThrown = false
      try {
        await offboardingService.approveResignation(resignation.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('Son çalışma günü')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)

      // Approve with last working day should work
      const lastWorkingDay = new Date()
      lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)
      
      const approved = await offboardingService.approveResignation(
        resignation.id,
        lastWorkingDay
      )
      expect(approved.status).toBe('Approved')
    })

    it('should prevent deleting completed resignations', async () => {
      // Clean up
      await prisma.exitInterview.deleteMany({})
      await prisma.resignation.deleteMany({})
      
      // Reset employee status
      await prisma.employee.update({
        where: { id: testEmployeeId },
        data: { status: 'Active' }
      })

      const lastWorkingDay = new Date()
      lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

      // Create, approve, and complete resignation
      const resignation = await offboardingService.createResignation({
        employeeId: testEmployeeId,
        reasonCategory: 'İstifa',
        lastWorkingDay
      })
      await offboardingService.approveResignation(resignation.id)
      await offboardingService.completeResignation(resignation.id)

      // Try to delete completed resignation
      let errorThrown = false
      try {
        await offboardingService.deleteResignation(resignation.id)
      } catch (error) {
        if (error instanceof BusinessRuleError) {
          expect(error.rule).toContain('Tamamlanmış talepler silinemez')
          errorThrown = true
        }
      }

      expect(errorThrown).toBe(true)
    })

    it('should calculate final settlement correctly', async () => {
      // Clean up
      await prisma.exitInterview.deleteMany({})
      await prisma.resignation.deleteMany({})
      await prisma.leaveBalance.deleteMany({})
      await prisma.salaryHistory.deleteMany({})
      await prisma.salaryAdvance.deleteMany({})

      const lastWorkingDay = new Date()
      lastWorkingDay.setDate(lastWorkingDay.getDate() + 14)

      // Create resignation
      const resignation = await offboardingService.createResignation({
        employeeId: testEmployeeId,
        reasonCategory: 'İstifa',
        lastWorkingDay
      })

      // Create leave balance
      const currentYear = new Date().getFullYear()
      await prisma.leaveBalance.create({
        data: {
          employeeId: testEmployeeId,
          year: currentYear,
          annualLeaveEntitlement: 14,
          transferredDays: 2,
          usedDays: 6,
          remainingDays: 10 // 14 + 2 - 6 = 10
        }
      })

      // Create salary history
      await prisma.salaryHistory.create({
        data: {
          employeeId: testEmployeeId,
          amount: 30000, // 30,000 TL monthly
          currency: 'TRY',
          periodType: 'Aylık',
          startDate: new Date('2024-01-01')
          // No endDate = current salary
        }
      })

      // Create pending advance
      await prisma.salaryAdvance.create({
        data: {
          employeeId: testEmployeeId,
          amount: 5000,
          status: 'Approved'
        }
      })

      // Calculate settlement
      const settlement = await offboardingService.calculateFinalSettlement(resignation.id)

      expect(settlement.remainingLeaveDays).toBe(10)
      expect(settlement.leavePayoutAmount).toBe(10 * (30000 / 30)) // 10 days * daily rate
      expect(settlement.pendingAdvances).toBe(5000)
      expect(settlement.netSettlement).toBe(settlement.leavePayoutAmount - settlement.pendingAdvances)
    })
  })
})
