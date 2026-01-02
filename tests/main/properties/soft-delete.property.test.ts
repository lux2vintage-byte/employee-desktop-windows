import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { BaseRepository } from '../../../src/main/repositories/BaseRepository'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 1: Soft Delete Round-Trip
 * Validates: Requirements 1.1, 1.2, 1.3
 * 
 * Herhangi bir kayıt için, soft delete işlemi sonrası kayıt fiziksel olarak silinmemeli,
 * deletedAt alanı set edilmeli ve varsayılan sorgularda görünmemeli,
 * ancak includeDeleted=true ile sorgulandığında erişilebilir olmalıdır.
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

// Helper function to clean up test data respecting foreign key constraints
async function cleanupTestData(prisma: PrismaClient) {
  await prisma.position.deleteMany({})
  await prisma.department.deleteMany({})
  await prisma.auditLog.deleteMany({})
}

describe('Soft Delete Property Tests', () => {
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
    // Clean up test data - order matters due to foreign key constraints
    await cleanupTestData(prisma)
    
    repository = new TestDepartmentRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    repository.setAuditLogger(auditLogger)
  })

  /**
   * Property 1: Soft Delete Round-Trip
   * For any record, soft delete should set deletedAt and hide from default queries
   */
  it('should soft delete record and hide from default queries (Property 1)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (name) => {
          // Clean up before each iteration to ensure isolation
          await cleanupTestData(prisma)
          
          // Create a record
          const created = await repository.create({ 
            name,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          // Verify it's visible in default query
          const beforeDelete = await repository.findById(created.id)
          expect(beforeDelete).not.toBeNull()
          expect(beforeDelete?.deletedAt).toBeNull()

          // Soft delete
          const deleted = await repository.softDelete(created.id)
          expect(deleted.deletedAt).not.toBeNull()

          // Verify it's hidden from default query
          const afterDelete = await repository.findById(created.id)
          expect(afterDelete).toBeNull()

          // Verify it's visible with includeDeleted=true
          const withDeleted = await repository.findById(created.id, true)
          expect(withDeleted).not.toBeNull()
          expect(withDeleted?.deletedAt).not.toBeNull()

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 1: Soft delete should not physically remove the record
   * Requirements: 1.1, 1.2
   */
  it('should not physically remove record on soft delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (name) => {
          // Clean up before each iteration to ensure isolation
          await cleanupTestData(prisma)
          
          // Create a record
          const created = await repository.create({ 
            name,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          // Count before soft delete (including deleted)
          const countBefore = await repository.count({}, true)

          // Soft delete
          await repository.softDelete(created.id)

          // Count after soft delete (including deleted)
          const countAfter = await repository.count({}, true)

          // Record should still exist
          expect(countAfter).toBe(countBefore)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 1: Restore should make record visible again
   */
  it('should restore soft deleted record (Property 1)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (name) => {
          // Clean up before each iteration to ensure isolation
          await cleanupTestData(prisma)
          
          // Create and soft delete
          const created = await repository.create({ 
            name,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })
          await repository.softDelete(created.id)

          // Verify hidden
          const hidden = await repository.findById(created.id)
          expect(hidden).toBeNull()

          // Restore
          const restored = await repository.restore(created.id)
          expect(restored.deletedAt).toBeNull()

          // Verify visible again
          const visible = await repository.findById(created.id)
          expect(visible).not.toBeNull()
          expect(visible?.deletedAt).toBeNull()

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 1: findAll should exclude soft deleted by default
   * Requirements: 1.3
   */
  it('should exclude soft deleted from findAll by default', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 5 }
        ),
        async (names) => {
          // Clean up before each iteration
          await cleanupTestData(prisma)
          
          // Create multiple records
          const created = await Promise.all(
            names.map(name => repository.create({ 
              name,
              managerId: null,
              parentDepartmentId: null,
              costCenterCode: null
            }))
          )

          // Soft delete first record
          await repository.softDelete(created[0].id)

          // findAll without includeDeleted
          const result = await repository.findAll()
          expect(result.data.length).toBe(names.length - 1)
          expect(result.data.find(d => d.id === created[0].id)).toBeUndefined()

          // findAll with includeDeleted
          const resultWithDeleted = await repository.findAll({ includeDeleted: true })
          expect(resultWithDeleted.data.length).toBe(names.length)
          expect(resultWithDeleted.data.find(d => d.id === created[0].id)).toBeDefined()

          return true
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: Soft delete should create audit log
   */
  it('should create audit log on soft delete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (name) => {
          // Clean up before each iteration to ensure isolation
          await cleanupTestData(prisma)
          
          // Create a record
          const created = await repository.create({ 
            name,
            managerId: null,
            parentDepartmentId: null,
            costCenterCode: null
          })

          // Soft delete
          await repository.softDelete(created.id)

          // Check audit log
          const logs = await auditLogger.getByRecord('department', created.id)
          
          // Should have INSERT and DELETE logs
          expect(logs.length).toBeGreaterThanOrEqual(2)
          expect(logs.some(l => l.action === 'INSERT')).toBe(true)
          expect(logs.some(l => l.action === 'DELETE')).toBe(true)

          return true
        }
      ),
      { numRuns: 10 }
    )
  })
})
