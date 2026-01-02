import * as fc from 'fast-check'
import { PrismaClient } from '@prisma/client'
import { DepartmentRepository } from '../../../src/main/repositories/DepartmentRepository'
import { DepartmentService, BusinessRuleError } from '../../../src/main/services/DepartmentService'
import { AuditLoggerService, resetAuditLoggerService } from '../../../src/main/services/AuditLoggerService'

/**
 * Feature: personel-veritabani-modulleri
 * Property 6: Department Hierarchy Integrity
 * Property 7: Department Name Uniqueness Within Parent
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6
 */

describe('Department Property Tests', () => {
  let prisma: PrismaClient
  let repository: DepartmentRepository
  let service: DepartmentService
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
    // Clean up test data - order matters due to foreign keys
    await prisma.employee.deleteMany({})
    await prisma.position.deleteMany({})
    await prisma.department.deleteMany({})
    await prisma.auditLog.deleteMany({})

    repository = new DepartmentRepository(prisma)
    auditLogger = new AuditLoggerService(prisma)
    repository.setAuditLogger(auditLogger)
    service = new DepartmentService(repository)
  })

  /**
   * Property 6: Department Hierarchy Integrity
   * For any department hierarchy, getHierarchy() should return complete tree structure
   * with all child departments. A department with children cannot be soft-deleted.
   * Validates: Requirements 2.3, 2.4, 2.6
   */
  describe('Property 6: Department Hierarchy Integrity', () => {
    it('should return complete tree structure with all nested children', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a tree depth (1-3 levels)
          fc.integer({ min: 1, max: 3 }),
          // Generate number of children per level (1-3)
          fc.integer({ min: 1, max: 3 }),
          async (depth, childrenPerLevel) => {
            // Clean up before each iteration
            await prisma.department.deleteMany({})

            // Create root department
            const root = await service.create({
              name: `Root_${Date.now()}`,
              parentDepartmentId: null
            })

            // Track all created departments
            const allDepartments = [root]
            let currentLevel = [root]

            // Create hierarchy
            for (let level = 1; level < depth; level++) {
              const nextLevel = []
              for (const parent of currentLevel) {
                for (let i = 0; i < childrenPerLevel; i++) {
                  const child = await service.create({
                    name: `Dept_L${level}_${i}_${Date.now()}_${Math.random()}`,
                    parentDepartmentId: parent.id
                  })
                  allDepartments.push(child)
                  nextLevel.push(child)
                }
              }
              currentLevel = nextLevel
            }

            // Get hierarchy
            const hierarchy = await service.getHierarchy()

            // Count all nodes in hierarchy
            const countNodes = (nodes: any[]): number => {
              return nodes.reduce((sum, node) => {
                return sum + 1 + countNodes(node.children || [])
              }, 0)
            }

            const hierarchyCount = countNodes(hierarchy)

            // All departments should be in hierarchy
            expect(hierarchyCount).toBe(allDepartments.length)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should prevent deletion of department with children', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          async (parentName, childName) => {
            // Clean up before each iteration
            await prisma.department.deleteMany({})

            // Create parent department
            const parent = await service.create({
              name: `${parentName}_${Date.now()}`,
              parentDepartmentId: null
            })

            // Create child department
            await service.create({
              name: `${childName}_${Date.now()}`,
              parentDepartmentId: parent.id
            })

            // Attempt to delete parent should fail
            let errorThrown = false
            try {
              await service.delete(parent.id)
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('Alt departmanları olan departman silinemez')
                errorThrown = true
              }
            }

            expect(errorThrown).toBe(true)

            // Parent should still exist
            const parentAfter = await service.findById(parent.id)
            expect(parentAfter).not.toBeNull()

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should allow deletion of leaf department (no children)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          async (name) => {
            // Clean up before each iteration
            await prisma.department.deleteMany({})

            // Create leaf department
            const leaf = await service.create({
              name: `${name}_${Date.now()}`,
              parentDepartmentId: null
            })

            // Should be able to delete
            await service.delete(leaf.id)

            // Should be soft deleted (not visible in default query)
            const afterDelete = await service.findById(leaf.id)
            expect(afterDelete).toBeNull()

            // Should be visible with includeDeleted
            const withDeleted = await repository.findById(leaf.id, true)
            expect(withDeleted).not.toBeNull()
            expect(withDeleted?.deletedAt).not.toBeNull()

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should return children correctly via getChildren', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (numChildren) => {
            // Clean up before each iteration
            await prisma.department.deleteMany({})

            // Create parent
            const parent = await service.create({
              name: `Parent_${Date.now()}`,
              parentDepartmentId: null
            })

            // Create children
            const childIds: number[] = []
            for (let i = 0; i < numChildren; i++) {
              const child = await service.create({
                name: `Child_${i}_${Date.now()}`,
                parentDepartmentId: parent.id
              })
              childIds.push(child.id)
            }

            // Get children
            const children = await service.getChildren(parent.id)

            // Should have correct number of children
            expect(children.length).toBe(numChildren)

            // All children should have correct parent
            for (const child of children) {
              expect(child.parentDepartmentId).toBe(parent.id)
              expect(childIds).toContain(child.id)
            }

            return true
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * Property 7: Department Name Uniqueness Within Parent
   * For any parent department, two child departments with the same name cannot be created.
   * Validates: Requirements 2.2
   */
  describe('Property 7: Department Name Uniqueness Within Parent', () => {
    it('should prevent duplicate names within same parent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          async (name) => {
            // Clean up before each iteration
            await prisma.department.deleteMany({})

            const uniqueName = `${name}_${Date.now()}`

            // Create first department with this name (no parent)
            await service.create({
              name: uniqueName,
              parentDepartmentId: null
            })

            // Attempt to create second department with same name and same parent (null)
            let errorThrown = false
            try {
              await service.create({
                name: uniqueName,
                parentDepartmentId: null
              })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('Bu isimde bir departman zaten mevcut')
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

    it('should allow same name in different parents', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          async (name) => {
            // Clean up before each iteration
            await prisma.department.deleteMany({})

            const uniqueName = `${name}_${Date.now()}`

            // Create two parent departments
            const parent1 = await service.create({
              name: `Parent1_${Date.now()}`,
              parentDepartmentId: null
            })

            const parent2 = await service.create({
              name: `Parent2_${Date.now()}`,
              parentDepartmentId: null
            })

            // Create child with same name under parent1
            const child1 = await service.create({
              name: uniqueName,
              parentDepartmentId: parent1.id
            })

            // Should be able to create child with same name under parent2
            const child2 = await service.create({
              name: uniqueName,
              parentDepartmentId: parent2.id
            })

            // Both should exist
            expect(child1).toBeDefined()
            expect(child2).toBeDefined()
            expect(child1.name).toBe(uniqueName)
            expect(child2.name).toBe(uniqueName)
            expect(child1.parentDepartmentId).toBe(parent1.id)
            expect(child2.parentDepartmentId).toBe(parent2.id)

            return true
          }
        ),
        { numRuns: 15 }
      )
    })

    it('should prevent renaming to existing name within same parent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          async (name1, name2) => {
            // Clean up before each iteration
            await prisma.department.deleteMany({})

            const uniqueName1 = `${name1}_${Date.now()}_1`
            const uniqueName2 = `${name2}_${Date.now()}_2`

            // Create parent
            const parent = await service.create({
              name: `Parent_${Date.now()}`,
              parentDepartmentId: null
            })

            // Create two children with different names
            await service.create({
              name: uniqueName1,
              parentDepartmentId: parent.id
            })

            const child2 = await service.create({
              name: uniqueName2,
              parentDepartmentId: parent.id
            })

            // Attempt to rename child2 to child1's name
            let errorThrown = false
            try {
              await service.update(child2.id, { name: uniqueName1 })
            } catch (error) {
              if (error instanceof BusinessRuleError) {
                expect(error.rule).toContain('Bu isimde bir departman zaten mevcut')
                errorThrown = true
              }
            }

            expect(errorThrown).toBe(true)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should allow renaming to same name when moving to different parent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          async (name) => {
            // Clean up before each iteration
            await prisma.department.deleteMany({})

            const uniqueName = `${name}_${Date.now()}`

            // Create two parents
            const parent1 = await service.create({
              name: `Parent1_${Date.now()}`,
              parentDepartmentId: null
            })

            const parent2 = await service.create({
              name: `Parent2_${Date.now()}`,
              parentDepartmentId: null
            })

            // Create child under parent1
            const child = await service.create({
              name: uniqueName,
              parentDepartmentId: parent1.id
            })

            // Move child to parent2 (should succeed since name is unique in parent2)
            const updated = await service.update(child.id, {
              parentDepartmentId: parent2.id
            })

            expect(updated.parentDepartmentId).toBe(parent2.id)

            return true
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})
