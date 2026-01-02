/**
 * Veritabanı Hata Yönetimi Testleri
 * Özellik 3: Veritabanı Hata Yönetimi
 * Doğrular: Gereksinim 3.5
 */

import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const testDbPath = path.join(os.tmpdir(), 'test-error-handling.db')

describe('Feature: personel-yonetimi-altyapi, Property 3: Veritabanı Hata Yönetimi', () => {
  let db: Database.Database

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }

    db = new Database(testDbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    db.exec(`
      CREATE TABLE employees (
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
  })

  afterEach(() => {
    if (db) {
      db.close()
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  describe('Kısıtlama Hataları', () => {
    it('should handle unique constraint violations', () => {
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      insertStmt.run('Test1', 'User1', 'duplicate@example.com', 'Developer', 'IT', 1)

      expect(() => {
        insertStmt.run('Test2', 'User2', 'duplicate@example.com', 'Developer', 'IT', 1)
      }).toThrow(/UNIQUE constraint failed/)
    })

    it('should handle not null constraint violations', () => {
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      expect(() => {
        insertStmt.run(null, 'User', 'test@example.com', 'Developer', 'IT', 1)
      }).toThrow(/NOT NULL constraint failed/)
    })
  })

  describe('SQL Hataları', () => {
    it('should handle syntax errors gracefully', () => {
      expect(() => {
        db.prepare('INVALID SQL SYNTAX HERE')
      }).toThrow(/syntax error/)
    })

    it('should handle invalid table names', () => {
      expect(() => {
        db.prepare('SELECT * FROM non_existent_table').get()
      }).toThrow(/no such table/)
    })

    it('should handle invalid column names', () => {
      expect(() => {
        db.prepare('SELECT non_existent_column FROM employees').get()
      }).toThrow(/no such column/)
    })
  })

  describe('Veri Doğrulama', () => {
    it('should validate email format in application layer', () => {
      const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email) && email.length <= 255
      }

      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test@example'
      ]

      for (const email of invalidEmails) {
        expect(validateEmail(email)).toBe(false)
      }

      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test123@test-domain.com'
      ]

      for (const email of validEmails) {
        expect(validateEmail(email)).toBe(true)
      }
    })

    it('should validate name fields in application layer', () => {
      const validateName = (name: string): boolean => {
        return typeof name === 'string' && 
               name.trim().length > 0 && 
               name.length <= 100
      }

      const invalidNames = [
        '',
        '   ',
        'A'.repeat(101)
      ]

      for (const name of invalidNames) {
        expect(validateName(name)).toBe(false)
      }

      const validNames = [
        'John',
        'Mary Jane',
        'José María',
        'A'.repeat(100)
      ]

      for (const name of validNames) {
        expect(validateName(name)).toBe(true)
      }
    })
  })

  describe('Bağlantı ve Kaynak Yönetimi', () => {
    it('should handle database file corruption detection', () => {
      const integrityCheck = db.pragma('integrity_check') as any[]
      
      expect(Array.isArray(integrityCheck)).toBe(true)
      expect(integrityCheck.length).toBeGreaterThan(0)
      expect(integrityCheck[0].integrity_check).toBe('ok')
    })

    it('should handle database busy scenarios', () => {
      db.pragma('busy_timeout = 1000')
      
      const transaction = db.transaction(() => {
        const insertStmt = db.prepare(`
          INSERT INTO employees (first_name, last_name, email, position, department, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        
        for (let i = 0; i < 10; i++) {
          insertStmt.run(`User${i}`, 'Test', `user${i}@example.com`, 'Developer', 'IT', 1)
        }
      })

      expect(() => transaction()).not.toThrow()
      
      const count = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
      expect(count.count).toBe(10)
    })

    it('should handle graceful database closure', () => {
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      insertStmt.run('Test', 'User', 'test@example.com', 'Developer', 'IT', 1)

      expect(() => db.close()).not.toThrow()

      expect(() => {
        db.prepare('SELECT * FROM employees').get()
      }).toThrow(/database connection is not open|database connection is closed/)
    })
  })

  describe('Güvenlik Testleri', () => {
    it('should prevent basic SQL injection through parameterized queries', () => {
      const maliciousEmail = "'; DROP TABLE employees; --"
      
      const selectStmt = db.prepare('SELECT * FROM employees WHERE email = ?')
      
      const result = selectStmt.all(maliciousEmail)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)

      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'").get()
      expect(tableCheck).toBeDefined()
    })

    it('should handle large data inputs gracefully', () => {
      const largeText = 'A'.repeat(10000)
      
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      expect(() => {
        insertStmt.run(largeText, 'User', 'large@example.com', largeText, largeText, 1)
      }).not.toThrow()

      const selectStmt = db.prepare('SELECT * FROM employees WHERE email = ?')
      const result = selectStmt.get('large@example.com') as any
      
      expect(result).toBeDefined()
      expect(result.first_name).toBe(largeText)
    })
  })

  describe('Performans ve Sınırlar', () => {
    it('should handle concurrent operations efficiently', () => {
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      const insertMany = db.transaction((employees: any[]) => {
        for (const emp of employees) {
          insertStmt.run(emp.firstName, emp.lastName, emp.email, emp.position, emp.department, emp.isActive ? 1 : 0)
        }
      })

      const testEmployees = Array.from({ length: 100 }, (_, i) => ({
        firstName: `User${i}`,
        lastName: 'Test',
        email: `user${i}@example.com`,
        position: 'Developer',
        department: 'IT',
        isActive: true
      }))

      const startTime = Date.now()
      insertMany(testEmployees)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000)

      const count = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
      expect(count.count).toBe(100)
    })

    it('should handle database size limits gracefully', () => {
      const pageCount = db.pragma('page_count') as any
      const pageSize = db.pragma('page_size') as any
      const dbSize = (typeof pageCount === 'number' ? pageCount : pageCount[0].page_count) * 
                     (typeof pageSize === 'number' ? pageSize : pageSize[0].page_size)

      expect(typeof pageCount).toBeDefined()
      expect(typeof pageSize).toBeDefined()
      expect(dbSize).toBeGreaterThan(0)
      expect(dbSize).toBeLessThan(100 * 1024 * 1024)
    })
  })

  describe('Hata Kurtarma', () => {
    it('should provide meaningful error messages', () => {
      try {
        db.prepare('SELECT * FROM non_existent_table').get()
        fail('Hata fırlatılmalıydı')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('no such table')
      }
    })

    it('should maintain database consistency after errors', () => {
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      insertStmt.run('Valid', 'User', 'valid@example.com', 'Developer', 'IT', 1)

      try {
        insertStmt.run('Invalid', 'User', 'valid@example.com', 'Developer', 'IT', 1)
      } catch (error) {
        // Hata bekleniyor
      }

      const count = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
      expect(count.count).toBe(1)

      const integrityCheck = db.pragma('integrity_check') as any[]
      expect(integrityCheck[0].integrity_check).toBe('ok')
    })
  })
})
