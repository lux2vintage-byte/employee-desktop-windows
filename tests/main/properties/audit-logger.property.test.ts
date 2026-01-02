import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { AuditLoggerService, AuditAction, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 3: Audit Log Completeness
 * Validates: Requirements 1.7
 * 
 * Herhangi bir veri değişikliği (INSERT, UPDATE, DELETE) için,
 * audit_log tablosunda tablo adı, kayıt ID, aksiyon tipi, eski değerler,
 * yeni değerler ve kullanıcı ID içeren bir kayıt oluşturulmalıdır.
 */
describe('AuditLogger Property Tests', () => {
  let prisma: PrismaClient
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
    // Clean up audit logs before each test
    await prisma.auditLog.deleteMany({})
    auditLogger = new AuditLoggerService(prisma)
  })

  /**
   * Property 3: Audit Log Completeness
   * For any data change, audit log should contain all required fields
   */
  it('should create complete audit log for any INSERT action (Property 3)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 1000000 }),
        fc.record({
          field1: fc.string(),
          field2: fc.integer()
        }),
        fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
        async (tableName, recordId, newValues, userId) => {
          const auditLog = await auditLogger.log({
            tableName,
            recordId,
            action: 'INSERT',
            newValues,
            userId
          })

          // Verify all required fields are present
          expect(auditLog.tableName).toBe(tableName)
          expect(auditLog.recordId).toBe(recordId)
          expect(auditLog.action).toBe('INSERT')
          expect(auditLog.newValues).toBe(JSON.stringify(newValues))
          expect(auditLog.oldValues).toBeNull()
          expect(auditLog.userId).toBe(userId ?? null)
          expect(auditLog.timestamp).toBeInstanceOf(Date)

          return true
        }
      ),
      { numRuns: 20 } // Reduced for database operations
    )
  })

  it('should create complete audit log for any UPDATE action (Property 3)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 1000000 }),
        fc.record({
          field1: fc.string(),
          field2: fc.integer()
        }),
        fc.record({
          field1: fc.string(),
          field2: fc.integer()
        }),
        fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
        async (tableName, recordId, oldValues, newValues, userId) => {
          const auditLog = await auditLogger.log({
            tableName,
            recordId,
            action: 'UPDATE',
            oldValues,
            newValues,
            userId
          })

          // Verify all required fields are present
          expect(auditLog.tableName).toBe(tableName)
          expect(auditLog.recordId).toBe(recordId)
          expect(auditLog.action).toBe('UPDATE')
          expect(auditLog.oldValues).toBe(JSON.stringify(oldValues))
          expect(auditLog.newValues).toBe(JSON.stringify(newValues))
          expect(auditLog.userId).toBe(userId ?? null)
          expect(auditLog.timestamp).toBeInstanceOf(Date)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should create complete audit log for any DELETE action (Property 3)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 1000000 }),
        fc.record({
          field1: fc.string(),
          field2: fc.integer()
        }),
        fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
        async (tableName, recordId, oldValues, userId) => {
          const auditLog = await auditLogger.log({
            tableName,
            recordId,
            action: 'DELETE',
            oldValues,
            userId
          })

          // Verify all required fields are present
          expect(auditLog.tableName).toBe(tableName)
          expect(auditLog.recordId).toBe(recordId)
          expect(auditLog.action).toBe('DELETE')
          expect(auditLog.oldValues).toBe(JSON.stringify(oldValues))
          expect(auditLog.newValues).toBeNull()
          expect(auditLog.userId).toBe(userId ?? null)
          expect(auditLog.timestamp).toBeInstanceOf(Date)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Audit logs should be retrievable by record
   */
  it('should retrieve audit logs by record', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 1000000 }),
        async (tableName, recordId) => {
          // Create an audit log
          await auditLogger.log({
            tableName,
            recordId,
            action: 'INSERT',
            newValues: { test: 'value' }
          })

          // Retrieve by record
          const logs = await auditLogger.getByRecord(tableName, recordId)

          // Should find at least one log
          expect(logs.length).toBeGreaterThanOrEqual(1)
          expect(logs.some(log => log.tableName === tableName && log.recordId === recordId)).toBe(true)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: getDiff should correctly identify changes between objects
   */
  it('should correctly identify differences between objects', () => {
    fc.assert(
      fc.property(
        fc.record({
          field1: fc.string(),
          field2: fc.integer(),
          field3: fc.boolean()
        }),
        fc.record({
          field1: fc.string(),
          field2: fc.integer(),
          field3: fc.boolean()
        }),
        (oldObj, newObj) => {
          const diff = AuditLoggerService.getDiff(oldObj, newObj)

          // For each difference found, verify it's actually different
          for (const change of diff) {
            const oldValue = oldObj[change.field as keyof typeof oldObj]
            const newValue = newObj[change.field as keyof typeof newObj]
            expect(JSON.stringify(oldValue)).not.toBe(JSON.stringify(newValue))
          }

          // If objects are identical, diff should be empty
          if (JSON.stringify(oldObj) === JSON.stringify(newObj)) {
            expect(diff.length).toBe(0)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: parseValues should correctly parse JSON values
   */
  it('should correctly parse stored JSON values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          stringField: fc.string(),
          numberField: fc.integer(),
          boolField: fc.boolean()
        }),
        fc.record({
          stringField: fc.string(),
          numberField: fc.integer(),
          boolField: fc.boolean()
        }),
        async (oldValues, newValues) => {
          const auditLog = await auditLogger.log({
            tableName: 'test_table',
            recordId: 1,
            action: 'UPDATE',
            oldValues,
            newValues
          })

          const parsed = auditLogger.parseValues(auditLog)

          expect(parsed.oldValues).toEqual(oldValues)
          expect(parsed.newValues).toEqual(newValues)

          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})
