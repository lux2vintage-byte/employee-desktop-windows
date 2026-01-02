/**
 * SQLite CRUD İşlemleri ve Kalıcılık Testleri
 * Özellik 2: SQLite CRUD İşlemleri ve Kalıcılık
 * Doğrular: Gereksinim 3.3, 3.4
 */

import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import fc from 'fast-check'

// Test veritabanı yolu
const testDbPath = path.join(os.tmpdir(), 'test-personel.db')

// Basit test veritabanı yöneticisi
class TestDatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = testDbPath
  }

  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    await this.createTables()
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        position TEXT,
        department TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Varsayılan config ekle
    const insertConfig = this.db.prepare('INSERT OR IGNORE INTO app_config (key, value) VALUES (?, ?)')
    insertConfig.run('app_version', '1.0.0')
    insertConfig.run('db_version', '1.0.0')
  }

  async executeQuery(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not initialized')
    
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = this.db.prepare(sql)
      return stmt.all(params)
    }
    
    const stmt = this.db.prepare(sql)
    const result = stmt.run(params)
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    }
  }

  async performOperation(operation: any): Promise<any> {
    const { type, table, data, where, params } = operation

    switch (type) {
      case 'SELECT':
        let sql = `SELECT * FROM ${table}`
        if (where) sql += ` WHERE ${where}`
        return await this.executeQuery(sql, params || [])
      
      case 'INSERT':
        const columns = Object.keys(data)
        const placeholders = columns.map(() => '?').join(', ')
        const values = Object.values(data)
        const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
        const result = await this.executeQuery(insertSql, values)
        return {
          id: result.lastInsertRowid,
          changes: result.changes
        }
      
      case 'UPDATE':
        const setCols = Object.keys(data)
        const setClause = setCols.map(col => `${col} = ?`).join(', ')
        const setValues = Object.values(data)
        const updateSql = `UPDATE ${table} SET ${setClause} WHERE ${where}`
        return await this.executeQuery(updateSql, setValues)
      
      case 'DELETE':
        const deleteSql = `DELETE FROM ${table} WHERE ${where}`
        return await this.executeQuery(deleteSql)
      
      default:
        throw new Error(`Desteklenmeyen işlem türü: ${type}`)
    }
  }

  async getStats(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized')
    
    const employeeCount = this.db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
    const configCount = this.db.prepare('SELECT COUNT(*) as count FROM app_config').get() as { count: number }
    
    return {
      employeeCount: employeeCount.count,
      configCount: configCount.count,
      auditLogCount: 0
    }
  }

  async getAllEmployees(): Promise<any[]> {
    const sql = `
      SELECT 
        id,
        first_name as firstName,
        last_name as lastName,
        email,
        position,
        department,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt
      FROM employees 
      ORDER BY created_at DESC
    `
    return await this.executeQuery(sql)
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) return false
      const result = this.db.prepare('SELECT 1 as test').get() as { test: number } | undefined
      return result ? result.test === 1 : false
    } catch {
      return false
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

describe('SQLite CRUD İşlemleri ve Kalıcılık', () => {
  let dbManager: TestDatabaseManager

  beforeEach(async () => {
    // Test veritabanı dosyasını temizle
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }

    dbManager = new TestDatabaseManager()
    await dbManager.initialize()
  })

  afterEach(async () => {
    if (dbManager) {
      await dbManager.close()
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  describe('Veritabanı Başlatma', () => {
    it('should initialize database successfully', async () => {
      // Test: Veritabanının başarıyla başlatılması
      const healthCheck = await dbManager.healthCheck()
      expect(healthCheck).toBe(true)
    })

    it('should create required tables', async () => {
      // Test: Gerekli tabloların oluşturulması
      const stats = await dbManager.getStats()
      
      expect(stats).toHaveProperty('employeeCount')
      expect(stats).toHaveProperty('configCount')
      expect(stats).toHaveProperty('auditLogCount')
      
      // Varsayılan veriler kontrol edilir
      expect(stats.configCount).toBeGreaterThan(0)
      expect(stats.employeeCount).toBeGreaterThan(0)
    })

    it('should have default configuration data', async () => {
      // Test: Varsayılan konfigürasyon verilerinin varlığı
      const result = await dbManager.executeQuery(
        'SELECT * FROM app_config WHERE key = ?',
        ['app_version']
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('1.0.0')
    })
  })

  describe('CRUD İşlemleri - Personel', () => {
    describe('CREATE (Oluşturma)', () => {
      it('should create employee successfully', async () => {
        // Test: Personel oluşturma
        const employeeData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          position: 'Developer',
          department: 'IT',
          isActive: true
        }

        const operation = {
          type: 'INSERT',
          table: 'employees',
          data: {
            first_name: employeeData.firstName,
            last_name: employeeData.lastName,
            email: employeeData.email,
            position: employeeData.position,
            department: employeeData.department,
            is_active: employeeData.isActive ? 1 : 0
          }
        }

        const result = await dbManager.performOperation(operation)
        
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('changes')
        expect(result.changes).toBe(1)
        expect(result.id).toBeGreaterThan(0)
      })

      it('should enforce unique email constraint', async () => {
        // Test: Email benzersizlik kısıtlaması
        const employeeData = {
          first_name: 'Test1',
          last_name: 'User1',
          email: 'duplicate@example.com',
          position: 'Developer',
          department: 'IT',
          is_active: 1
        }

        const operation = {
          type: 'INSERT',
          table: 'employees',
          data: employeeData
        }

        // İlk kayıt başarılı olmalı
        await dbManager.performOperation(operation)

        // İkinci kayıt hata vermeli
        await expect(dbManager.performOperation(operation)).rejects.toThrow()
      })
    })

    describe('READ (Okuma)', () => {
      beforeEach(async () => {
        // Test verisi ekle
        const operation = {
          type: 'INSERT',
          table: 'employees',
          data: {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            position: 'Manager',
            department: 'Sales',
            is_active: 1
          }
        }
        await dbManager.performOperation(operation)
      })

      it('should read all employees', async () => {
        // Test: Tüm personelleri okuma
        const employees = await dbManager.getAllEmployees()
        
        expect(Array.isArray(employees)).toBe(true)
        expect(employees.length).toBeGreaterThan(0)
        
        const employee = employees.find(emp => emp.email === 'john.doe@example.com')
        expect(employee).toBeDefined()
        expect(employee.firstName).toBe('John')
        expect(employee.lastName).toBe('Doe')
      })

      it('should read employees with SELECT operation', async () => {
        // Test: SELECT operasyonu ile personel okuma
        const operation = {
          type: 'SELECT',
          table: 'employees',
          where: 'email = ?',
          params: ['john.doe@example.com']
        }

        const result = await dbManager.performOperation(operation)
        
        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(1)
        expect(result[0].first_name).toBe('John')
        expect(result[0].last_name).toBe('Doe')
      })
    })

    describe('UPDATE (Güncelleme)', () => {
      let employeeId: number

      beforeEach(async () => {
        // Test verisi ekle
        const operation = {
          type: 'INSERT',
          table: 'employees',
          data: {
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane.smith@example.com',
            position: 'Developer',
            department: 'IT',
            is_active: 1
          }
        }
        const result = await dbManager.performOperation(operation)
        employeeId = result.id
      })

      it('should update employee successfully', async () => {
        // Test: Personel güncelleme
        const operation = {
          type: 'UPDATE',
          table: 'employees',
          data: {
            position: 'Senior Developer',
            department: 'Engineering'
          },
          where: `id = ${employeeId}`
        }

        const result = await dbManager.performOperation(operation)
        
        expect(result).toHaveProperty('changes')
        expect(result.changes).toBe(1)

        // Güncellemeyi doğrula
        const selectOperation = {
          type: 'SELECT',
          table: 'employees',
          where: 'id = ?',
          params: [employeeId]
        }

        const updated = await dbManager.performOperation(selectOperation)
        expect(updated[0].position).toBe('Senior Developer')
        expect(updated[0].department).toBe('Engineering')
      })

      it('should not update non-existent employee', async () => {
        // Test: Var olmayan personeli güncelleme
        const operation = {
          type: 'UPDATE',
          table: 'employees',
          data: {
            position: 'Updated Position'
          },
          where: 'id = 99999'
        }

        const result = await dbManager.performOperation(operation)
        expect(result.changes).toBe(0)
      })
    })

    describe('DELETE (Silme)', () => {
      let employeeId: number

      beforeEach(async () => {
        // Test verisi ekle
        const operation = {
          type: 'INSERT',
          table: 'employees',
          data: {
            first_name: 'Bob',
            last_name: 'Wilson',
            email: 'bob.wilson@example.com',
            position: 'Analyst',
            department: 'Finance',
            is_active: 1
          }
        }
        const result = await dbManager.performOperation(operation)
        employeeId = result.id
      })

      it('should delete employee successfully', async () => {
        // Test: Personel silme
        const operation = {
          type: 'DELETE',
          table: 'employees',
          where: `id = ${employeeId}`
        }

        const result = await dbManager.performOperation(operation)
        
        expect(result).toHaveProperty('changes')
        expect(result.changes).toBe(1)

        // Silme işlemini doğrula
        const selectOperation = {
          type: 'SELECT',
          table: 'employees',
          where: 'id = ?',
          params: [employeeId]
        }

        const deleted = await dbManager.performOperation(selectOperation)
        expect(deleted).toHaveLength(0)
      })

      it('should not delete non-existent employee', async () => {
        // Test: Var olmayan personeli silme
        const operation = {
          type: 'DELETE',
          table: 'employees',
          where: 'id = 99999'
        }

        const result = await dbManager.performOperation(operation)
        expect(result.changes).toBe(0)
      })
    })
  })

  describe('Kalıcılık Testleri', () => {
    it('should persist data after database restart', async () => {
      // Test: Veritabanı yeniden başlatıldıktan sonra veri kalıcılığı
      
      // Veri ekle
      const operation = {
        type: 'INSERT',
        table: 'employees',
        data: {
          first_name: 'Persistent',
          last_name: 'User',
          email: 'persistent@example.com',
          position: 'Tester',
          department: 'QA',
          is_active: 1
        }
      }
      
      const insertResult = await dbManager.performOperation(operation)
      const insertedId = insertResult.id

      // Veritabanını kapat ve yeniden aç
      await dbManager.close()
      
      dbManager = new TestDatabaseManager()
      await dbManager.initialize()

      // Veriyi kontrol et
      const selectOperation = {
        type: 'SELECT',
        table: 'employees',
        where: 'id = ?',
        params: [insertedId]
      }

      const result = await dbManager.performOperation(selectOperation)
      
      expect(result).toHaveLength(1)
      expect(result[0].first_name).toBe('Persistent')
      expect(result[0].email).toBe('persistent@example.com')
    })

    it('should maintain data integrity across operations', async () => {
      // Test: İşlemler boyunca veri bütünlüğü
      const initialStats = await dbManager.getStats()
      
      // Birden fazla işlem yap
      const operations = [
        {
          type: 'INSERT' as const,
          table: 'employees',
          data: {
            first_name: 'User1',
            last_name: 'Test1',
            email: 'user1@example.com',
            position: 'Dev1',
            department: 'IT',
            is_active: 1
          }
        },
        {
          type: 'INSERT' as const,
          table: 'employees',
          data: {
            first_name: 'User2',
            last_name: 'Test2',
            email: 'user2@example.com',
            position: 'Dev2',
            department: 'IT',
            is_active: 1
          }
        }
      ]

      for (const operation of operations) {
        await dbManager.performOperation(operation)
      }

      const finalStats = await dbManager.getStats()
      
      // Personel sayısının doğru artmış olması
      expect(finalStats.employeeCount).toBe(initialStats.employeeCount + 2)
      
      // Audit log'un çalışması
      expect(finalStats.auditLogCount).toBeGreaterThan(initialStats.auditLogCount)
    })
  })

  describe('Property-Based Tests (Özellik Tabanlı Testler)', () => {
    it('should handle arbitrary valid employee data', () => {
      // Test: Rastgele geçerli personel verilerini işleme
      return fc.assert(
        fc.asyncProperty(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
            email: fc.emailAddress(),
            position: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
            department: fc.string({ minLength: 1, maxLength: 100 }).filter((s: string) => s.trim().length > 0),
            isActive: fc.boolean()
          }),
          async (employeeData: any) => {
            const operation = {
              type: 'INSERT',
              table: 'employees',
              data: {
                first_name: employeeData.firstName.trim(),
                last_name: employeeData.lastName.trim(),
                email: employeeData.email,
                position: employeeData.position.trim(),
                department: employeeData.department.trim(),
                is_active: employeeData.isActive ? 1 : 0
              }
            }

            const result = await dbManager.performOperation(operation)
            
            // Her geçerli veri için başarılı sonuç beklenir
            expect(result).toHaveProperty('id')
            expect(result).toHaveProperty('changes')
            expect(result.changes).toBe(1)
            expect(result.id).toBeGreaterThan(0)

            // Eklenen veriyi doğrula
            const selectOperation = {
              type: 'SELECT',
              table: 'employees',
              where: 'id = ?',
              params: [result.id]
            }

            const inserted = await dbManager.performOperation(selectOperation)
            expect(inserted).toHaveLength(1)
            expect(inserted[0].first_name).toBe(employeeData.firstName.trim())
            expect(inserted[0].email).toBe(employeeData.email)
          }
        ),
        { numRuns: 10 } // Test performansı için sınırlı sayıda çalıştır
      )
    })

    it('should maintain consistent state after random operations', () => {
      // Test: Rastgele işlemlerden sonra tutarlı durum
      return fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              // INSERT operasyonu
              fc.record({
                type: fc.constant('INSERT' as const),
                data: fc.record({
                  first_name: fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => s.trim().length > 0),
                  last_name: fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => s.trim().length > 0),
                  email: fc.emailAddress(),
                  position: fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => s.trim().length > 0),
                  department: fc.string({ minLength: 1, maxLength: 20 }).filter((s: string) => s.trim().length > 0),
                  is_active: fc.integer({ min: 0, max: 1 })
                })
              }),
              // SELECT operasyonu
              fc.record({
                type: fc.constant('SELECT' as const),
                table: fc.constant('employees')
              })
            ),
            { minLength: 1, maxLength: 5 }
          ),
          async (operations: any) => {
            const initialStats = await dbManager.getStats()
            let insertCount = 0

            for (const operation of operations) {
              try {
                if (operation.type === 'INSERT') {
                  const dbOperation = {
                    type: 'INSERT',
                    table: 'employees',
                    data: operation.data
                  }
                  await dbManager.performOperation(dbOperation)
                  insertCount++
                } else if (operation.type === 'SELECT') {
                  const dbOperation = {
                    type: 'SELECT',
                    table: 'employees'
                  }
                  const result = await dbManager.performOperation(dbOperation)
                  expect(Array.isArray(result)).toBe(true)
                }
              } catch (error) {
                // Email benzersizlik hatası beklenen bir durum
                if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
                  insertCount-- // Başarısız insert'i sayma
                }
              }
            }

            const finalStats = await dbManager.getStats()
            
            // Veritabanı tutarlılığını kontrol et
            expect(finalStats.employeeCount).toBeGreaterThanOrEqual(initialStats.employeeCount)
            expect(await dbManager.healthCheck()).toBe(true)
          }
        ),
        { numRuns: 5 } // Performans için sınırlı sayıda çalıştır
      )
    })
  })
})