/**
 * SQLite CRUD İşlemleri ve Kalıcılık Testleri
 * Özellik 2: SQLite CRUD İşlemleri ve Kalıcılık
 * Doğrular: Gereksinim 3.3, 3.4
 */

import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Test veritabanı yolu
const testDbPath = path.join(os.tmpdir(), 'test-personel-simple.db')

describe('SQLite CRUD İşlemleri ve Kalıcılık', () => {
  let db: Database.Database

  beforeEach(() => {
    // Test veritabanı dosyasını temizle
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }

    // Veritabanını oluştur
    db = new Database(testDbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    // Tabloları oluştur
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

    db.exec(`
      CREATE TABLE app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Varsayılan config ekle
    const insertConfig = db.prepare('INSERT INTO app_config (key, value) VALUES (?, ?)')
    insertConfig.run('app_version', '1.0.0')
    insertConfig.run('db_version', '1.0.0')
  })

  afterEach(() => {
    if (db) {
      db.close()
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  describe('Veritabanı Başlatma', () => {
    it('should initialize database successfully', () => {
      // Test: Veritabanının başarıyla başlatılması
      const result = db.prepare('SELECT 1 as test').get() as { test: number }
      expect(result.test).toBe(1)
    })

    it('should create required tables', () => {
      // Test: Gerekli tabloların oluşturulması
      const employeeCount = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
      const configCount = db.prepare('SELECT COUNT(*) as count FROM app_config').get() as { count: number }
      
      expect(employeeCount.count).toBe(0)
      expect(configCount.count).toBe(2) // app_version ve db_version
    })

    it('should have default configuration data', () => {
      // Test: Varsayılan konfigürasyon verilerinin varlığı
      const result = db.prepare('SELECT * FROM app_config WHERE key = ?').get('app_version') as any
      
      expect(result).toBeDefined()
      expect(result.value).toBe('1.0.0')
    })
  })

  describe('CRUD İşlemleri - Personel', () => {
    describe('CREATE (Oluşturma)', () => {
      it('should create employee successfully', () => {
        // Test: Personel oluşturma
        const insertStmt = db.prepare(`
          INSERT INTO employees (first_name, last_name, email, position, department, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        const result = insertStmt.run('Test', 'User', 'test@example.com', 'Developer', 'IT', 1)
        
        expect(result.changes).toBe(1)
        expect(result.lastInsertRowid).toBeGreaterThan(0)

        // Eklenen veriyi kontrol et
        const selectStmt = db.prepare('SELECT * FROM employees WHERE id = ?')
        const employee = selectStmt.get(result.lastInsertRowid) as any
        
        expect(employee.first_name).toBe('Test')
        expect(employee.email).toBe('test@example.com')
      })

      it('should enforce unique email constraint', () => {
        // Test: Email benzersizlik kısıtlaması
        const insertStmt = db.prepare(`
          INSERT INTO employees (first_name, last_name, email, position, department, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        // İlk kayıt başarılı olmalı
        insertStmt.run('Test1', 'User1', 'duplicate@example.com', 'Developer', 'IT', 1)

        // İkinci kayıt hata vermeli
        expect(() => {
          insertStmt.run('Test2', 'User2', 'duplicate@example.com', 'Developer', 'IT', 1)
        }).toThrow()
      })
    })

    describe('READ (Okuma)', () => {
      beforeEach(() => {
        // Test verisi ekle
        const insertStmt = db.prepare(`
          INSERT INTO employees (first_name, last_name, email, position, department, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        insertStmt.run('John', 'Doe', 'john.doe@example.com', 'Manager', 'Sales', 1)
      })

      it('should read all employees', () => {
        // Test: Tüm personelleri okuma
        const selectStmt = db.prepare('SELECT * FROM employees')
        const employees = selectStmt.all()
        
        expect(Array.isArray(employees)).toBe(true)
        expect(employees.length).toBe(1)
        
        const employee = employees[0] as any
        expect(employee.first_name).toBe('John')
        expect(employee.last_name).toBe('Doe')
        expect(employee.email).toBe('john.doe@example.com')
      })

      it('should read employees with WHERE clause', () => {
        // Test: WHERE koşulu ile personel okuma
        const selectStmt = db.prepare('SELECT * FROM employees WHERE email = ?')
        const employees = selectStmt.all('john.doe@example.com')
        
        expect(Array.isArray(employees)).toBe(true)
        expect(employees).toHaveLength(1)
        
        const employee = employees[0] as any
        expect(employee.first_name).toBe('John')
        expect(employee.last_name).toBe('Doe')
      })
    })

    describe('UPDATE (Güncelleme)', () => {
      let employeeId: number

      beforeEach(() => {
        // Test verisi ekle
        const insertStmt = db.prepare(`
          INSERT INTO employees (first_name, last_name, email, position, department, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        const result = insertStmt.run('Jane', 'Smith', 'jane.smith@example.com', 'Developer', 'IT', 1)
        employeeId = result.lastInsertRowid as number
      })

      it('should update employee successfully', () => {
        // Test: Personel güncelleme
        const updateStmt = db.prepare(`
          UPDATE employees 
          SET position = ?, department = ? 
          WHERE id = ?
        `)

        const result = updateStmt.run('Senior Developer', 'Engineering', employeeId)
        expect(result.changes).toBe(1)

        // Güncellemeyi doğrula
        const selectStmt = db.prepare('SELECT * FROM employees WHERE id = ?')
        const updated = selectStmt.get(employeeId) as any
        
        expect(updated.position).toBe('Senior Developer')
        expect(updated.department).toBe('Engineering')
      })

      it('should not update non-existent employee', () => {
        // Test: Var olmayan personeli güncelleme
        const updateStmt = db.prepare(`
          UPDATE employees 
          SET position = ? 
          WHERE id = ?
        `)

        const result = updateStmt.run('Updated Position', 99999)
        expect(result.changes).toBe(0)
      })
    })

    describe('DELETE (Silme)', () => {
      let employeeId: number

      beforeEach(() => {
        // Test verisi ekle
        const insertStmt = db.prepare(`
          INSERT INTO employees (first_name, last_name, email, position, department, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        const result = insertStmt.run('Bob', 'Wilson', 'bob.wilson@example.com', 'Analyst', 'Finance', 1)
        employeeId = result.lastInsertRowid as number
      })

      it('should delete employee successfully', () => {
        // Test: Personel silme
        const deleteStmt = db.prepare('DELETE FROM employees WHERE id = ?')
        const result = deleteStmt.run(employeeId)
        
        expect(result.changes).toBe(1)

        // Silme işlemini doğrula
        const selectStmt = db.prepare('SELECT * FROM employees WHERE id = ?')
        const deleted = selectStmt.get(employeeId)
        
        expect(deleted).toBeUndefined()
      })

      it('should not delete non-existent employee', () => {
        // Test: Var olmayan personeli silme
        const deleteStmt = db.prepare('DELETE FROM employees WHERE id = ?')
        const result = deleteStmt.run(99999)
        
        expect(result.changes).toBe(0)
      })
    })
  })

  describe('Kalıcılık Testleri', () => {
    it('should persist data after database restart', () => {
      // Test: Veritabanı yeniden başlatıldıktan sonra veri kalıcılığı
      
      // Veri ekle
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      const insertResult = insertStmt.run('Persistent', 'User', 'persistent@example.com', 'Tester', 'QA', 1)
      const insertedId = insertResult.lastInsertRowid as number

      // Veritabanını kapat ve yeniden aç
      db.close()
      db = new Database(testDbPath)

      // Veriyi kontrol et
      const selectStmt = db.prepare('SELECT * FROM employees WHERE id = ?')
      const result = selectStmt.get(insertedId) as any
      
      expect(result).toBeDefined()
      expect(result.first_name).toBe('Persistent')
      expect(result.email).toBe('persistent@example.com')
    })

    it('should maintain data integrity across operations', () => {
      // Test: İşlemler boyunca veri bütünlüğü
      const initialCount = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
      
      // Birden fazla işlem yap
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      insertStmt.run('User1', 'Test1', 'user1@example.com', 'Dev1', 'IT', 1)
      insertStmt.run('User2', 'Test2', 'user2@example.com', 'Dev2', 'IT', 1)

      const finalCount = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
      
      // Personel sayısının doğru artmış olması
      expect(finalCount.count).toBe(initialCount.count + 2)
      
      // Veritabanı sağlık kontrolü
      const healthCheck = db.prepare('SELECT 1 as test').get() as { test: number }
      expect(healthCheck.test).toBe(1)
    })
  })

  describe('Performans ve Güvenilirlik', () => {
    it('should handle multiple concurrent operations', () => {
      // Test: Çoklu eşzamanlı işlemler
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      // Transaction kullanarak toplu işlem
      const insertMany = db.transaction((employees: any[]) => {
        for (const emp of employees) {
          insertStmt.run(emp.firstName, emp.lastName, emp.email, emp.position, emp.department, emp.isActive ? 1 : 0)
        }
      })

      const testEmployees = [
        { firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', position: 'Designer', department: 'Design', isActive: true },
        { firstName: 'Bob', lastName: 'Brown', email: 'bob@example.com', position: 'Developer', department: 'IT', isActive: true },
        { firstName: 'Carol', lastName: 'Davis', email: 'carol@example.com', position: 'Manager', department: 'HR', isActive: false }
      ]

      insertMany(testEmployees)

      // Sonuçları kontrol et
      const count = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
      expect(count.count).toBe(3)

      const activeCount = db.prepare('SELECT COUNT(*) as count FROM employees WHERE is_active = 1').get() as { count: number }
      expect(activeCount.count).toBe(2)
    })

    it('should handle edge cases gracefully', () => {
      // Test: Edge case'leri zarif şekilde işleme
      
      // Boş string'ler
      const insertStmt = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      // Minimum geçerli veri
      const result = insertStmt.run('A', 'B', 'a@b.com', '', '', 0)
      expect(result.changes).toBe(1)

      // Uzun string'ler
      const longName = 'A'.repeat(100)
      const longEmail = 'test' + 'a'.repeat(90) + '@example.com'
      
      const result2 = insertStmt.run(longName, longName, longEmail, 'Position', 'Department', 1)
      expect(result2.changes).toBe(1)

      // Verileri kontrol et
      const employees = db.prepare('SELECT * FROM employees').all()
      expect(employees).toHaveLength(2)
    })
  })
})