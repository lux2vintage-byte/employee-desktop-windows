import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { LeaveRequestRepository } from '../../../src/main/repositories/LeaveRequestRepository'
import { LeaveRequestService, BusinessRuleError, ValidationError } from '../../../src/main/services/LeaveRequestService'
import { LeaveTypeRepository } from '../../../src/main/repositories/LeaveTypeRepository'
import { LeaveTypeService } from '../../../src/main/services/LeaveTypeService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 20: Leave Day Count Calculation
 * Property 21: Leave Date Ordering
 * Property 22: Leave Overlap Prevention
 * Validates: Requirements 10.3, 10.4, 10.8, 10.9
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
 * Helper to create a future date
 */
function getFutureDate(daysFromNow: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(0, 0, 0, 0)
  return date
}

describe('LeaveRequest Property Tests', () => {
  let prisma: PrismaClient
  let leaveRequestRepository: LeaveRequestRepository
  let leaveRequestService: LeaveRequestService
  let leaveTypeRepository: LeaveTypeRepository
  let leaveTypeService: LeaveTypeService
  let auditLogger: AuditLoggerService
  let testEmployeeId: number
  let testDepartmentId: number
  let testPositionId: number
  let testLeaveTypeId: number

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

    // Create test leave type
    const leaveType = await prisma.leaveType.create({
      data: {
        name: `TestLeaveType_${Date.now()}`,
        isPaid: true,
        deductsFromAnnual: true
      }
    })
    testLeaveTypeId = leaveType.id

    // Initialize repositories and services
    leaveRequestRepository = new LeaveRequestRepository(prisma)
    leaveTypeRepository = new LeaveTypeRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    leaveRequestRepository.setAuditLogger(auditLogger)
    leaveTypeRepository.setAuditLogger(auditLogger)
    leaveRequestService = new LeaveRequestService(leaveRequestRepository)
    leaveTypeService = new LeaveTypeService(leaveTypeRepository)
  })

  /**
   * Property 20: Leave Day Count Calculation
   * For any leave request, day_count = (end_date - start_date + 1) with half-day support.
   * Validates: Requirements 10.3, 10.4
   */
  describe('Property 20: Leave Day Count Calculation', () => {
    it('should correctly calculate day count for any date range', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Days from now for start date (1-30)
          fc.integer({ min: 1, max: 30 }),
          // Duration in days (1-14)
          fc.integer({ min: 1, max: 14 }),
          async (startDaysFromNow, duration) => {
            // Clean up leave requests
            await prisma.leaveRequest.deleteMany({})

            const startDate = getFutureDate(startDaysFromNow)
            const endDate = getFutureDate(startDaysFromNow + duration - 1)

            const leaveRequest = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate,
              endDate
            })

            // Expected day count = duration (end_date - start_date + 1)
            const expectedDayCount = duration

            expect(leaveRequest.dayCount).toBe(expectedDayCount)

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should calculate 0.5 days for half-day leave', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Days from now for the half-day leave (1-30)
          fc.integer({ min: 1, max: 30 }),
          async (daysFromNow) => {
            // Clean up leave requests
            await prisma.leaveRequest.deleteMany({})

            const date = getFutureDate(daysFromNow)

            const leaveRequest = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate: date,
              endDate: date,
              isHalfDay: true
            })

            // Half-day should be 0.5
            expect(leaveRequest.dayCount).toBe(0.5)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should calculate 1 day for single full day leave', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Days from now (1-30)
          fc.integer({ min: 1, max: 30 }),
          async (daysFromNow) => {
            // Clean up leave requests
            await prisma.leaveRequest.deleteMany({})

            const date = getFutureDate(daysFromNow)

            const leaveRequest = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate: date,
              endDate: date,
              isHalfDay: false
            })

            // Single day should be 1
            expect(leaveRequest.dayCount).toBe(1)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should verify calculateDayCount function directly', () => {
      fc.assert(
        fc.property(
          // Duration in days (1-30)
          fc.integer({ min: 1, max: 30 }),
          fc.boolean(), // isHalfDay
          (duration, isHalfDay) => {
            const startDate = new Date('2025-06-01')
            const endDate = new Date('2025-06-01')
            endDate.setDate(endDate.getDate() + duration - 1)

            const dayCount = leaveRequestService.calculateDayCount(startDate, endDate, isHalfDay)

            if (isHalfDay && duration === 1) {
              // Half-day only applies to single day
              return dayCount === 0.5
            } else {
              return dayCount === duration
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 21: Leave Date Ordering
   * For any leave request, end_date >= start_date must hold.
   * Validates: Requirements 10.8
   */
  describe('Property 21: Leave Date Ordering', () => {
    it('should accept leave requests where end_date >= start_date', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Days from now for start date (1-30)
          fc.integer({ min: 1, max: 30 }),
          // Additional days for end date (0-14, so end >= start)
          fc.integer({ min: 0, max: 14 }),
          async (startDaysFromNow, additionalDays) => {
            // Clean up leave requests
            await prisma.leaveRequest.deleteMany({})

            const startDate = getFutureDate(startDaysFromNow)
            const endDate = getFutureDate(startDaysFromNow + additionalDays)

            const leaveRequest = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate,
              endDate
            })

            expect(leaveRequest).toBeDefined()
            
            // Verify date ordering
            const savedStartDate = new Date(leaveRequest.startDate)
            const savedEndDate = new Date(leaveRequest.endDate)
            expect(savedEndDate.getTime()).toBeGreaterThanOrEqual(savedStartDate.getTime())

            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should reject leave requests where end_date < start_date', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Days from now for start date (5-30, to allow room for earlier end date)
          fc.integer({ min: 5, max: 30 }),
          // Days to subtract for end date (1-4, so end < start)
          fc.integer({ min: 1, max: 4 }),
          async (startDaysFromNow, daysToSubtract) => {
            // Clean up leave requests
            await prisma.leaveRequest.deleteMany({})

            const startDate = getFutureDate(startDaysFromNow)
            const endDate = getFutureDate(startDaysFromNow - daysToSubtract)

            let errorThrown = false
            try {
              await leaveRequestService.create({
                employeeId: testEmployeeId,
                leaveTypeId: testLeaveTypeId,
                startDate,
                endDate
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('endDate')
                expect(error.constraint).toContain('önce olamaz')
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

    it('should accept leave requests where start_date equals end_date', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Days from now (1-30)
          fc.integer({ min: 1, max: 30 }),
          async (daysFromNow) => {
            // Clean up leave requests
            await prisma.leaveRequest.deleteMany({})

            const date = getFutureDate(daysFromNow)

            const leaveRequest = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate: date,
              endDate: date
            })

            expect(leaveRequest).toBeDefined()
            expect(leaveRequest.dayCount).toBe(1)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  /**
   * Property 22: Leave Overlap Prevention
   * For any employee, approved leave requests must not overlap in dates.
   * Validates: Requirements 10.9
   */
  describe('Property 22: Leave Overlap Prevention', () => {
    it('should prevent overlapping leave requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          // First leave: days from now (5-15)
          fc.integer({ min: 5, max: 15 }),
          // First leave duration (3-7 days)
          fc.integer({ min: 3, max: 7 }),
          // Overlap offset (-2 to 2, where negative means overlap)
          fc.integer({ min: -2, max: 2 }),
          async (firstStartDays, firstDuration, overlapOffset) => {
            // Clean up leave requests
            await prisma.leaveRequest.deleteMany({})

            // Create and approve first leave request
            const firstStartDate = getFutureDate(firstStartDays)
            const firstEndDate = getFutureDate(firstStartDays + firstDuration - 1)

            const firstLeave = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate: firstStartDate,
              endDate: firstEndDate
            })

            // Approve the first leave
            // Create a manager employee for approval
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

            await leaveRequestService.approve(firstLeave.id, manager.id)

            // Calculate second leave dates
            // If overlapOffset <= 0, second leave starts during first leave (overlap)
            // If overlapOffset > 0, second leave starts after first leave ends (no overlap)
            const secondStartDays = firstStartDays + firstDuration + overlapOffset
            const secondStartDate = getFutureDate(secondStartDays)
            const secondEndDate = getFutureDate(secondStartDays + 2)

            // Check if there should be an overlap
            const firstEndTime = firstEndDate.getTime()
            const secondStartTime = secondStartDate.getTime()
            const shouldOverlap = secondStartTime <= firstEndTime

            if (shouldOverlap) {
              // Should throw error for overlapping dates
              let errorThrown = false
              try {
                await leaveRequestService.create({
                  employeeId: testEmployeeId,
                  leaveTypeId: testLeaveTypeId,
                  startDate: secondStartDate,
                  endDate: secondEndDate
                })
              } catch (error) {
                if (error instanceof BusinessRuleError) {
                  expect(error.rule).toContain('zaten onaylanmış bir izin var')
                  errorThrown = true
                }
              }
              expect(errorThrown).toBe(true)
            } else {
              // Should succeed for non-overlapping dates
              const secondLeave = await leaveRequestService.create({
                employeeId: testEmployeeId,
                leaveTypeId: testLeaveTypeId,
                startDate: secondStartDate,
                endDate: secondEndDate
              })
              expect(secondLeave).toBeDefined()
            }

            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should allow non-overlapping leave requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Number of non-overlapping leaves (2-4)
          fc.integer({ min: 2, max: 4 }),
          // Gap between leaves in days (1-5)
          fc.integer({ min: 1, max: 5 }),
          async (numLeaves, gapDays) => {
            // Clean up leave requests
            await prisma.leaveRequest.deleteMany({})

            // Create manager for approvals
            const managerTcKimlik = generateValidTCKimlik(Date.now() + 2000)
            const manager = await prisma.employee.create({
              data: {
                employeeCode: `MGR${Date.now()}2`,
                firstName: 'Manager2',
                lastName: 'Test',
                identityNumber: managerTcKimlik,
                departmentId: testDepartmentId,
                positionId: testPositionId,
                hireDate: new Date(),
                contractType: 'Süresiz',
                status: 'Active'
              }
            })

            let currentStartDay = 5 // Start 5 days from now

            for (let i = 0; i < numLeaves; i++) {
              const startDate = getFutureDate(currentStartDay)
              const endDate = getFutureDate(currentStartDay + 1) // 2-day leave

              const leave = await leaveRequestService.create({
                employeeId: testEmployeeId,
                leaveTypeId: testLeaveTypeId,
                startDate,
                endDate
              })

              expect(leave).toBeDefined()

              // Approve the leave
              await leaveRequestService.approve(leave.id, manager.id)

              // Move to next period with gap
              currentStartDay += 2 + gapDays
            }

            // Verify all leaves were created
            const allLeaves = await leaveRequestService.findByEmployee(testEmployeeId)
            expect(allLeaves.length).toBe(numLeaves)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should allow overlapping pending requests (only approved ones conflict)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 15 }),
          fc.integer({ min: 3, max: 5 }),
          async (startDays, duration) => {
            // Clean up leave requests
            await prisma.leaveRequest.deleteMany({})

            const startDate = getFutureDate(startDays)
            const endDate = getFutureDate(startDays + duration - 1)

            // Create first leave request (pending)
            const firstLeave = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate,
              endDate
            })

            expect(firstLeave).toBeDefined()
            expect(firstLeave.status).toBe('Pending')

            // Create second overlapping leave request (should succeed since first is pending)
            const secondLeave = await leaveRequestService.create({
              employeeId: testEmployeeId,
              leaveTypeId: testLeaveTypeId,
              startDate,
              endDate
            })

            expect(secondLeave).toBeDefined()
            expect(secondLeave.status).toBe('Pending')

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should verify checkOverlap function directly', async () => {
      // Create and approve a leave request
      const startDate = getFutureDate(10)
      const endDate = getFutureDate(15)

      const leave = await leaveRequestService.create({
        employeeId: testEmployeeId,
        leaveTypeId: testLeaveTypeId,
        startDate,
        endDate
      })

      // Create manager and approve
      const managerTcKimlik = generateValidTCKimlik(Date.now() + 3000)
      const manager = await prisma.employee.create({
        data: {
          employeeCode: `MGR${Date.now()}3`,
          firstName: 'Manager3',
          lastName: 'Test',
          identityNumber: managerTcKimlik,
          departmentId: testDepartmentId,
          positionId: testPositionId,
          hireDate: new Date(),
          contractType: 'Süresiz',
          status: 'Active'
        }
      })

      await leaveRequestService.approve(leave.id, manager.id)

      // Test overlap detection
      await fc.assert(
        fc.asyncProperty(
          // Test date offset from approved leave start (-5 to 10)
          fc.integer({ min: -5, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          async (offset, testDuration) => {
            const testStartDate = getFutureDate(10 + offset)
            const testEndDate = getFutureDate(10 + offset + testDuration - 1)

            const hasOverlap = await leaveRequestService.checkOverlap(
              testEmployeeId,
              testStartDate,
              testEndDate
            )

            // Calculate expected overlap
            // Approved leave: days 10-15
            // Test leave: days (10+offset) to (10+offset+duration-1)
            const approvedStart = 10
            const approvedEnd = 15
            const testStart = 10 + offset
            const testEnd = 10 + offset + testDuration - 1

            const expectedOverlap = !(testEnd < approvedStart || testStart > approvedEnd)

            expect(hasOverlap).toBe(expectedOverlap)

            return true
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})
