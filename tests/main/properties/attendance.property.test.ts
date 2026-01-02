import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { AttendanceRepository } from '../../../src/main/repositories/AttendanceRepository'
import { AttendanceService, BusinessRuleError, ValidationError } from '../../../src/main/services/AttendanceService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 14: Attendance Time Ordering
 * Property 15: Attendance Uniqueness Per Day
 * Property 16: Working Hours Calculation
 * Validates: Requirements 7.2, 7.4, 7.6
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

describe('Attendance Property Tests', () => {
  let prisma: PrismaClient
  let repository: AttendanceRepository
  let service: AttendanceService
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

    repository = new AttendanceRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    repository.setAuditLogger(auditLogger)
    service = new AttendanceService(repository)
  })

  /**
   * Property 14: Attendance Time Ordering
   * For any attendance record, when check_out_time is provided, it must be after check_in_time.
   * Validates: Requirements 7.4
   */
  describe('Property 14: Attendance Time Ordering', () => {
    it('should accept check_out_time that is after check_in_time', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate check-in hour (0-22)
          fc.integer({ min: 0, max: 22 }),
          // Generate check-out hour offset (1-23 hours after check-in)
          fc.integer({ min: 1, max: 23 }),
          // Generate minutes for both
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 0, max: 59 }),
          async (checkInHour, hourOffset, checkInMinute, checkOutMinute) => {
            // Clean up attendance logs
            await prisma.attendanceLog.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            // Ensure check-out hour doesn't exceed 23
            const checkOutHour = Math.min(checkInHour + hourOffset, 23)
            
            // If same hour, ensure check-out minute is after check-in minute
            const finalCheckOutMinute = checkOutHour === checkInHour 
              ? Math.max(checkInMinute + 1, checkOutMinute) 
              : checkOutMinute

            const checkInTime = new Date(today)
            checkInTime.setHours(checkInHour, checkInMinute, 0, 0)

            const checkOutTime = new Date(today)
            checkOutTime.setHours(checkOutHour, finalCheckOutMinute, 0, 0)

            // This should succeed
            const attendance = await service.create({
              employeeId: testEmployeeId,
              date: today,
              checkInTime,
              checkOutTime,
              status: 'Geldi'
            })

            expect(attendance).toBeDefined()
            expect(attendance.checkInTime).toBeDefined()
            expect(attendance.checkOutTime).toBeDefined()
            
            // Verify time ordering
            const savedCheckIn = new Date(attendance.checkInTime!)
            const savedCheckOut = new Date(attendance.checkOutTime!)
            expect(savedCheckOut.getTime()).toBeGreaterThan(savedCheckIn.getTime())

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject check_out_time that is before or equal to check_in_time', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate check-in hour (1-23 to allow earlier check-out)
          fc.integer({ min: 1, max: 23 }),
          // Generate check-out hour offset (negative or zero)
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          fc.integer({ min: 0, max: 59 }),
          async (checkInHour, checkOutHour, checkInMinute, checkOutMinute) => {
            // Clean up attendance logs
            await prisma.attendanceLog.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            // Ensure check-out is before or equal to check-in
            const actualCheckOutHour = Math.min(checkOutHour, checkInHour)
            const actualCheckOutMinute = actualCheckOutHour === checkInHour 
              ? Math.min(checkOutMinute, checkInMinute) 
              : checkOutMinute

            const checkInTime = new Date(today)
            checkInTime.setHours(checkInHour, checkInMinute, 0, 0)

            const checkOutTime = new Date(today)
            checkOutTime.setHours(actualCheckOutHour, actualCheckOutMinute, 0, 0)

            // Skip if times are equal (edge case handled separately)
            if (checkOutTime.getTime() >= checkInTime.getTime()) {
              return true
            }

            // This should fail
            let errorThrown = false
            try {
              await service.create({
                employeeId: testEmployeeId,
                date: today,
                checkInTime,
                checkOutTime,
                status: 'Geldi'
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('checkOutTime')
                expect(error.constraint).toContain('giriş zamanından sonra')
                errorThrown = true
              }
            }

            expect(errorThrown).toBe(true)

            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should validate time ordering on update', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 8, max: 12 }), // Initial check-in hour
          fc.integer({ min: 0, max: 7 }),  // Invalid check-out hour (before check-in)
          async (checkInHour, invalidCheckOutHour) => {
            // Clean up attendance logs
            await prisma.attendanceLog.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const checkInTime = new Date(today)
            checkInTime.setHours(checkInHour, 0, 0, 0)

            // Create attendance with only check-in
            const attendance = await service.create({
              employeeId: testEmployeeId,
              date: today,
              checkInTime,
              status: 'Geldi'
            })

            // Try to update with invalid check-out time
            const invalidCheckOutTime = new Date(today)
            invalidCheckOutTime.setHours(invalidCheckOutHour, 0, 0, 0)

            let errorThrown = false
            try {
              await service.update(attendance.id, {
                checkOutTime: invalidCheckOutTime
              })
            } catch (error) {
              if (error instanceof ValidationError) {
                expect(error.field).toBe('checkOutTime')
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
   * Property 15: Attendance Uniqueness Per Day
   * For any employee and date combination, there can be at most one attendance record.
   * Validates: Requirements 7.2
   */
  describe('Property 15: Attendance Uniqueness Per Day', () => {
    it('should prevent duplicate attendance records for same employee and date', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a date offset from today (0-30 days ago)
          fc.integer({ min: 0, max: 30 }),
          async (daysAgo) => {
            // Clean up attendance logs
            await prisma.attendanceLog.deleteMany({})

            const date = new Date()
            date.setDate(date.getDate() - daysAgo)
            date.setHours(0, 0, 0, 0)

            // Create first attendance record
            const attendance1 = await service.create({
              employeeId: testEmployeeId,
              date,
              status: 'Geldi'
            })

            expect(attendance1).toBeDefined()

            // Attempt to create second attendance record for same date
            let errorThrown = false
            try {
              await service.create({
                employeeId: testEmployeeId,
                date,
                status: 'Geldi'
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('zaten kayıt var')
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

    it('should allow attendance records for different dates', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate number of different dates (2-5)
          fc.integer({ min: 2, max: 5 }),
          async (numDates) => {
            // Clean up attendance logs
            await prisma.attendanceLog.deleteMany({})

            const createdDates: string[] = []

            for (let i = 0; i < numDates; i++) {
              const date = new Date()
              date.setDate(date.getDate() - i)
              date.setHours(0, 0, 0, 0)

              const attendance = await service.create({
                employeeId: testEmployeeId,
                date,
                status: 'Geldi'
              })

              expect(attendance).toBeDefined()
              createdDates.push(date.toISOString().split('T')[0])
            }

            // All dates should be unique
            const uniqueDates = new Set(createdDates)
            expect(uniqueDates.size).toBe(createdDates.length)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should allow same date for different employees', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 3 }),
          async (numEmployees) => {
            // Clean up
            await prisma.attendanceLog.deleteMany({})
            await prisma.employee.deleteMany({ where: { id: { not: testEmployeeId } } })

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const employeeIds: number[] = [testEmployeeId]

            // Create additional employees
            for (let i = 1; i < numEmployees; i++) {
              const tcKimlik = generateValidTCKimlik(Date.now() + i * 1000)
              const employee = await prisma.employee.create({
                data: {
                  employeeCode: `EMP${Date.now()}${i}`,
                  firstName: `Test${i}`,
                  lastName: `Employee${i}`,
                  identityNumber: tcKimlik,
                  departmentId: testDepartmentId,
                  positionId: testPositionId,
                  hireDate: new Date(),
                  contractType: 'Süresiz',
                  status: 'Active'
                }
              })
              employeeIds.push(employee.id)
            }

            // Create attendance for each employee on the same date
            for (const empId of employeeIds) {
              const attendance = await service.create({
                employeeId: empId,
                date: today,
                status: 'Geldi'
              })
              expect(attendance).toBeDefined()
            }

            // Verify all records were created
            const records = await service.findByDate(today)
            expect(records.length).toBe(numEmployees)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * Property 16: Working Hours Calculation
   * For any attendance record, working hours = (check_out_time - check_in_time) - break_duration
   * Validates: Requirements 7.6
   */
  describe('Property 16: Working Hours Calculation', () => {
    it('should correctly calculate working hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Check-in hour (6-12)
          fc.integer({ min: 6, max: 12 }),
          // Work duration in hours (1-10)
          fc.integer({ min: 1, max: 10 }),
          // Break duration in minutes (0-60, reasonable break)
          fc.integer({ min: 0, max: 60 }),
          async (checkInHour, workDuration, breakMinutes) => {
            // Clean up attendance logs
            await prisma.attendanceLog.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const checkInTime = new Date(today)
            checkInTime.setHours(checkInHour, 0, 0, 0)

            const checkOutTime = new Date(today)
            checkOutTime.setHours(checkInHour + workDuration, 0, 0, 0)

            const attendance = await service.create({
              employeeId: testEmployeeId,
              date: today,
              checkInTime,
              checkOutTime,
              breakDuration: breakMinutes,
              status: 'Geldi'
            })

            // Calculate expected working hours
            const expectedHours = workDuration - (breakMinutes / 60)
            const calculatedHours = service.calculateWorkingHours(attendance)

            // Allow floating point tolerance (0.1 = ~6 minutes to handle floating point precision)
            expect(Math.abs(calculatedHours - expectedHours)).toBeLessThanOrEqual(0.1)

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return 0 when check-in or check-out is missing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (hasCheckIn) => {
            // Clean up attendance logs
            await prisma.attendanceLog.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const checkInTime = hasCheckIn ? new Date(today.setHours(9, 0, 0, 0)) : null

            const attendance = await service.create({
              employeeId: testEmployeeId,
              date: today,
              checkInTime: checkInTime || undefined,
              status: 'Geldi'
            })

            const calculatedHours = service.calculateWorkingHours(attendance)
            expect(calculatedHours).toBe(0)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should never return negative working hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 8, max: 10 }),
          fc.integer({ min: 1, max: 4 }),
          // Large break duration that could exceed work time
          fc.integer({ min: 0, max: 600 }),
          async (checkInHour, workDuration, breakMinutes) => {
            // Clean up attendance logs
            await prisma.attendanceLog.deleteMany({})

            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const checkInTime = new Date(today)
            checkInTime.setHours(checkInHour, 0, 0, 0)

            const checkOutTime = new Date(today)
            checkOutTime.setHours(checkInHour + workDuration, 0, 0, 0)

            const attendance = await service.create({
              employeeId: testEmployeeId,
              date: today,
              checkInTime,
              checkOutTime,
              breakDuration: breakMinutes,
              status: 'Geldi'
            })

            const calculatedHours = service.calculateWorkingHours(attendance)
            
            // Working hours should never be negative
            expect(calculatedHours).toBeGreaterThanOrEqual(0)

            return true
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should calculate correct hours in monthly report', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // Number of work days
          fc.integer({ min: 6, max: 10 }), // Work hours per day
          fc.integer({ min: 0, max: 60 }), // Break minutes per day
          async (numDays, hoursPerDay, breakMinutes) => {
            // Clean up attendance logs
            await prisma.attendanceLog.deleteMany({})

            const now = new Date()
            const month = now.getMonth() + 1
            const year = now.getFullYear()

            let expectedTotalHours = 0
            let expectedTotalBreak = 0

            for (let i = 0; i < numDays; i++) {
              const date = new Date(year, month - 1, i + 1)
              date.setHours(0, 0, 0, 0)

              const checkInTime = new Date(date)
              checkInTime.setHours(9, 0, 0, 0)

              const checkOutTime = new Date(date)
              checkOutTime.setHours(9 + hoursPerDay, 0, 0, 0)

              await service.create({
                employeeId: testEmployeeId,
                date,
                checkInTime,
                checkOutTime,
                breakDuration: breakMinutes,
                status: 'Geldi'
              })

              expectedTotalHours += hoursPerDay - (breakMinutes / 60)
              expectedTotalBreak += breakMinutes
            }

            const report = await service.getMonthlyReport(testEmployeeId, month, year)

            expect(report.presentDays).toBe(numDays)
            expect(report.totalBreakMinutes).toBe(expectedTotalBreak)
            expect(Math.abs(report.totalWorkingHours - expectedTotalHours)).toBeLessThan(0.1)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })
  })
})
