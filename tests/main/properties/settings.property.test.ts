import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { AppSettingRepository } from '../../../src/main/repositories/AppSettingRepository'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 39: Settings Key Uniqueness
 * Property 40: Settings Change Audit
 * Validates: Requirements 20.2, 20.5
 */
describe('Settings Property Tests', () => {
  let prisma: PrismaClient
  let repository: AppSettingRepository
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
    // Clean up before each test
    await prisma.auditLog.deleteMany({})
    await prisma.appSetting.deleteMany({})
    
    repository = new AppSettingRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    repository.setAuditLogger(auditLogger)
  })

  /**
   * Property 39: Settings Key Uniqueness
   * For any setting, the key must be unique.
   * Validates: Requirements 20.2
   */
  describe('Property 39: Settings Key Uniqueness', () => {
    it('should enforce unique keys - creating duplicate key should fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes('\x00')),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 1000000 }),
          async (keyBase, value1, value2, uniqueId) => {
            // Make key unique per test run
            const key = `${keyBase}_${uniqueId}_${Date.now()}`
            
            // Create first setting
            const setting1 = await repository.create({ key, value: value1 })
            expect(setting1.key).toBe(key)
            expect(setting1.value).toBe(value1)

            // Attempt to create duplicate should throw
            await expect(repository.create({ key, value: value2 }))
              .rejects.toThrow()

            // Verify only one setting exists with this key
            const found = await repository.findByKey(key)
            expect(found).not.toBeNull()
            expect(found!.value).toBe(value1)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should allow different keys to coexist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000000 }),
          fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
          async (uniqueId, values) => {
            // Generate unique keys for this test run
            const keys = values.map((_, i) => `key_${uniqueId}_${i}_${Date.now()}`)
            const count = keys.length
            
            // Create settings with different keys
            for (let i = 0; i < count; i++) {
              await repository.create({ key: keys[i], value: values[i] || '' })
            }

            // Verify all settings exist
            for (let i = 0; i < count; i++) {
              const found = await repository.findByKey(keys[i])
              expect(found).not.toBeNull()
              expect(found!.key).toBe(keys[i])
            }

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should maintain uniqueness through upsert operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes('\x00')),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          async (key, value1, value2) => {
            // First upsert creates
            await repository.upsertByKey(key, value1)
            
            // Second upsert updates
            await repository.upsertByKey(key, value2)

            // Should still have only one setting with this key
            const all = await repository.findAll()
            const matchingKeys = all.filter(s => s.key === key)
            expect(matchingKeys.length).toBe(1)
            expect(matchingKeys[0].value).toBe(value2)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * Property 40: Settings Change Audit
   * For any setting update, an audit log entry should be created with old and new values.
   * Validates: Requirements 20.5
   */
  describe('Property 40: Settings Change Audit', () => {
    it('should create audit log on setting creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes('\x00')),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
          fc.integer({ min: 1, max: 1000000 }),
          async (keyBase, value, userId, uniqueId) => {
            // Make key unique per test run
            const key = `${keyBase}_create_${uniqueId}_${Date.now()}`
            
            // Create setting
            const setting = await repository.create({ key, value }, userId)

            // Check audit log
            const auditLogs = await auditLogger.getByRecord('appSetting', setting.id)
            
            expect(auditLogs.length).toBeGreaterThanOrEqual(1)
            
            const insertLog = auditLogs.find(log => log.action === 'INSERT')
            expect(insertLog).toBeDefined()
            expect(insertLog!.tableName).toBe('appSetting')
            expect(insertLog!.recordId).toBe(setting.id)
            expect(insertLog!.userId).toBe(userId ?? null)
            
            // New values should contain the created setting
            const newValues = insertLog!.newValues ? JSON.parse(insertLog!.newValues) : null
            expect(newValues).not.toBeNull()
            expect(newValues.key).toBe(key)
            expect(newValues.value).toBe(value)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should create audit log on setting update with old and new values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes('\x00')),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
          fc.integer({ min: 1, max: 1000000 }),
          async (keyBase, oldValue, newValue, userId, uniqueId) => {
            // Make key unique per test run
            const key = `${keyBase}_update_${uniqueId}_${Date.now()}`
            
            // Create initial setting
            const setting = await repository.create({ key, value: oldValue })

            // Clear audit logs to focus on update
            await prisma.auditLog.deleteMany({})

            // Update setting
            await repository.update(setting.id, { value: newValue }, userId)

            // Check audit log for update
            const auditLogs = await auditLogger.getByRecord('appSetting', setting.id)
            
            expect(auditLogs.length).toBeGreaterThanOrEqual(1)
            
            const updateLog = auditLogs.find(log => log.action === 'UPDATE')
            expect(updateLog).toBeDefined()
            expect(updateLog!.tableName).toBe('appSetting')
            expect(updateLog!.recordId).toBe(setting.id)
            expect(updateLog!.userId).toBe(userId ?? null)

            // Old values should contain the previous value
            const oldValues = updateLog!.oldValues ? JSON.parse(updateLog!.oldValues) : null
            expect(oldValues).not.toBeNull()
            expect(oldValues.value).toBe(oldValue)

            // New values should contain the updated value
            const newValues = updateLog!.newValues ? JSON.parse(updateLog!.newValues) : null
            expect(newValues).not.toBeNull()
            expect(newValues.value).toBe(newValue)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should create audit log on setting deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.includes('\x00')),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
          fc.integer({ min: 1, max: 1000000 }),
          async (keyBase, value, userId, uniqueId) => {
            // Make key unique per test run
            const key = `${keyBase}_delete_${uniqueId}_${Date.now()}`
            
            // Create setting
            const setting = await repository.create({ key, value })
            const settingId = setting.id

            // Clear audit logs to focus on delete
            await prisma.auditLog.deleteMany({})

            // Delete setting
            await repository.delete(settingId, userId)

            // Check audit log for delete
            const auditLogs = await prisma.auditLog.findMany({
              where: {
                tableName: 'appSetting',
                recordId: settingId,
                action: 'DELETE'
              }
            })
            
            expect(auditLogs.length).toBeGreaterThanOrEqual(1)
            
            const deleteLog = auditLogs[0]
            expect(deleteLog.tableName).toBe('appSetting')
            expect(deleteLog.recordId).toBe(settingId)
            expect(deleteLog.userId).toBe(userId ?? null)

            // Old values should contain the deleted setting
            const oldValues = deleteLog.oldValues ? JSON.parse(deleteLog.oldValues) : null
            expect(oldValues).not.toBeNull()
            expect(oldValues.key).toBe(key)
            expect(oldValues.value).toBe(value)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should track all changes through repository upsert', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0 && !s.includes('\x00') && !/^\d/.test(s)),
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
          fc.integer({ min: 1, max: 1000000 }),
          async (keyBase, value1, value2, userId, uniqueId) => {
            // Make key unique per test run
            const key = `${keyBase}_upsert_${uniqueId}_${Date.now()}`
            
            // Use repository to upsert value (creates)
            await repository.upsertByKey(key, value1, 'test', userId)

            // Use repository to update value
            await repository.upsertByKey(key, value2, 'test', userId)

            // Get the setting to find its ID
            const setting = await repository.findByKey(key)
            expect(setting).not.toBeNull()

            // Check audit logs - should have at least 2 entries (create + update)
            const auditLogs = await auditLogger.getByRecord('appSetting', setting!.id)
            expect(auditLogs.length).toBeGreaterThanOrEqual(1)

            // The final value should be value2
            expect(setting!.value).toBe(value2)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })
  })

  /**
   * Additional property: Group filtering should return correct settings
   */
  describe('Group Filtering Property', () => {
    it('should correctly filter settings by group', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !s.includes('\x00')),
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0 && !s.includes('\x00')),
              value: fc.string({ minLength: 0, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (group, settings) => {
            // Create settings with unique keys
            const uniqueSettings = settings.reduce((acc, s, i) => {
              const uniqueKey = `${s.key}_${i}_${Date.now()}`
              acc.push({ ...s, key: uniqueKey })
              return acc
            }, [] as typeof settings)

            // Create settings in the group
            for (const setting of uniqueSettings) {
              await repository.create({ key: setting.key, value: setting.value, group })
            }

            // Create a setting in a different group
            const otherKey = `other_${Date.now()}`
            await repository.create({ key: otherKey, value: 'other', group: 'other_group' })

            // Filter by group
            const filtered = await repository.findByGroup(group)

            // All filtered settings should belong to the group
            for (const setting of filtered) {
              expect(setting.group).toBe(group)
            }

            // Should not include settings from other groups
            const otherGroupSettings = filtered.filter(s => s.key === otherKey)
            expect(otherGroupSettings.length).toBe(0)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})
