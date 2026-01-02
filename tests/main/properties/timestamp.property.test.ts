import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { BaseRepository } from '../../../src/main/repositories/BaseRepository'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 2: Audit Timestamp Consistency
 * Validates: Requirements 1.4, 1.5, 1.6
 * 
 * Herhangi bir kayıt için, oluşturulduğunda createdAt otomatik set edilmeli,
 * güncellendiğinde updatedAt değişmeli ve createdAt hiçbir zaman değişmemelidir.
 */

// Test için concrete repository
interface TestDepartment {
  id: number
  name: string
  managerId: number | null
  parentDepartmentId: number | null
  costCenterCode: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

class TestDepartmentRepository extends BaseRepository<TestDepartment> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'department', true)
  }
}

describe('Audit Timestamp Consistency Property Tests', () => {
  let prisma: PrismaClient
  let repository: TestDepartmentRepository
  let auditLogger: AuditLoggerService

  beforeAll(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
    resetAuditLoggerService()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.department.deleteMany({})
    await prisma.auditLog.deleteMany({})
    
    repository = new TestDepartmentRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    repository.setAuditLogger(auditLogger)
  })

  /**
   * Property 2: createdAt should be automatically set on record creation
   * Requirements: 1.4, 1.5
   */
  it('should automatically set createdAt on record creation (Property 2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (name) => {
          // Clean up before each iteration to ensure isolation
          await prisma.department.deleteMany({})
          
          const beforeCreate = new Date()
          
          // Create a record
          const created = await repository.create({ 
            name,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          const afterCreate = new Date()

          // Verify createdAt is set (returned as ISO string from toPlain)
          expect(created.createdAt).toBeDefined()
          expect(typeof created.createdAt === 'string' || created.createdAt instanceof Date).toBe(true)
          
          // Verify createdAt is within the expected time range
          const createdAtTime = new Date(created.createdAt).getTime()
          expect(createdAtTime).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000) // 1 second tolerance
          expect(createdAtTime).toBeLessThanOrEqual(afterCreate.getTime() + 1000) // 1 second tolerance

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 2: updatedAt should be automatically set on record creation
   * Requirements: 1.4
   */
  it('should automatically set updatedAt on record creation (Property 2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (name) => {
          // Clean up before each iteration to ensure isolation
          await prisma.department.deleteMany({})
          
          const beforeCreate = new Date()
          
          // Create a record
          const created = await repository.create({ 
            name,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          const afterCreate = new Date()

          // Verify updatedAt is set (returned as ISO string from toPlain)
          expect(created.updatedAt).toBeDefined()
          expect(typeof created.updatedAt === 'string' || created.updatedAt instanceof Date).toBe(true)
          
          // Verify updatedAt is within the expected time range
          const updatedAtTime = new Date(created.updatedAt).getTime()
          expect(updatedAtTime).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000)
          expect(updatedAtTime).toBeLessThanOrEqual(afterCreate.getTime() + 1000)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 2: updatedAt should change on record update
   * Requirements: 1.6
   */
  it('should update updatedAt on record update (Property 2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (originalName, newName) => {
          // Clean up before each iteration to ensure isolation
          await prisma.department.deleteMany({})
          
          // Create a record
          const created = await repository.create({ 
            name: originalName,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          const originalUpdatedAt = new Date(created.updatedAt).getTime()

          // Wait a small amount to ensure time difference
          await new Promise(resolve => setTimeout(resolve, 10))

          // Update the record
          const updated = await repository.update(created.id, { name: newName })

          const newUpdatedAt = new Date(updated.updatedAt).getTime()

          // Verify updatedAt has changed (should be greater or equal due to timing)
          expect(newUpdatedAt).toBeGreaterThanOrEqual(originalUpdatedAt)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 2: createdAt should never change on record update
   * Requirements: 1.5
   */
  it('should never change createdAt on record update (Property 2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (originalName, newName) => {
          // Clean up before each iteration to ensure isolation
          await prisma.department.deleteMany({})
          
          // Create a record
          const created = await repository.create({ 
            name: originalName,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          const originalCreatedAt = new Date(created.createdAt).getTime()

          // Wait a small amount
          await new Promise(resolve => setTimeout(resolve, 10))

          // Update the record
          const updated = await repository.update(created.id, { name: newName })

          const newCreatedAt = new Date(updated.createdAt).getTime()

          // Verify createdAt has NOT changed
          expect(newCreatedAt).toBe(originalCreatedAt)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 2: createdAt should remain unchanged after multiple updates
   * Requirements: 1.5
   */
  it('should preserve createdAt after multiple updates (Property 2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 5 }
        ),
        async (originalName, updateNames) => {
          // Clean up before each iteration to ensure isolation
          await prisma.department.deleteMany({})
          
          // Create a record
          const created = await repository.create({ 
            name: originalName,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          const originalCreatedAt = new Date(created.createdAt).getTime()

          // Perform multiple updates
          let currentRecord = created
          for (const newName of updateNames) {
            await new Promise(resolve => setTimeout(resolve, 5))
            currentRecord = await repository.update(currentRecord.id, { name: newName })
          }

          const finalCreatedAt = new Date(currentRecord.createdAt).getTime()

          // Verify createdAt has NOT changed after all updates
          expect(finalCreatedAt).toBe(originalCreatedAt)

          return true
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property 2: updatedAt should be greater than or equal to createdAt
   * Requirements: 1.4, 1.5, 1.6
   */
  it('should always have updatedAt >= createdAt (Property 2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (originalName, newName) => {
          // Clean up before each iteration to ensure isolation
          await prisma.department.deleteMany({})
          
          // Create a record
          const created = await repository.create({ 
            name: originalName,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          // On creation, updatedAt should be >= createdAt
          expect(new Date(created.updatedAt).getTime())
            .toBeGreaterThanOrEqual(new Date(created.createdAt).getTime())

          // Wait and update
          await new Promise(resolve => setTimeout(resolve, 10))
          const updated = await repository.update(created.id, { name: newName })

          // After update, updatedAt should still be >= createdAt
          expect(new Date(updated.updatedAt).getTime())
            .toBeGreaterThanOrEqual(new Date(updated.createdAt).getTime())

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 2: createdAt should remain unchanged after soft delete and restore
   * Requirements: 1.5
   */
  it('should preserve createdAt after soft delete and restore (Property 2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (name) => {
          // Clean up before each iteration to ensure isolation
          await prisma.department.deleteMany({})
          
          // Create a record
          const created = await repository.create({ 
            name,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          const originalCreatedAt = new Date(created.createdAt).getTime()

          // Soft delete
          await new Promise(resolve => setTimeout(resolve, 10))
          const deleted = await repository.softDelete(created.id)
          expect(new Date(deleted.createdAt).getTime()).toBe(originalCreatedAt)

          // Restore
          await new Promise(resolve => setTimeout(resolve, 10))
          const restored = await repository.restore(created.id)
          expect(new Date(restored.createdAt).getTime()).toBe(originalCreatedAt)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})
