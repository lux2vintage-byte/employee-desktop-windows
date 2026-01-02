import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

export interface DatabaseConfig {
  path: string
  options: {
    verbose?: boolean
    fileMustExist?: boolean
  }
}

export interface DatabaseOperation {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  data?: Record<string, any>
  where?: string
  params?: any[]
}

export interface DatabaseError {
  code: string
  message: string
  originalError?: Error
  context?: Record<string, any>
}

export class DatabaseConnectionError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'DatabaseConnectionError'
  }
}

export class DatabaseOperationError extends Error {
  constructor(message: string, public operation?: DatabaseOperation, public originalError?: Error) {
    super(message)
    this.name = 'DatabaseOperationError'
  }
}

export class DatabaseValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message)
    this.name = 'DatabaseValidationError'
  }
}

/**
 * SQLite veritabanı yöneticisi
 * Uygulama genelinde veritabanı işlemlerini yönetir
 */
export class DatabaseManager {
  private db: Database.Database | null = null
  private dbPath: string
  private isInitialized = false
  private retryCount = 0
  private maxRetries = 3
  private retryDelay = 1000 // 1 saniye

  constructor() {
    // Veritabanı dosyasının yolu
    const userDataPath = app.getPath('userData')
    this.dbPath = path.join(userDataPath, 'personel.db')
  }

  /**
   * Veritabanını başlat
   */
  async initialize(): Promise<void> {
    try {
      await this.initializeWithRetry()
      this.isInitialized = true
    } catch (error) {
      const dbError = this.handleError(error, 'DATABASE_INIT_FAILED', {
        dbPath: this.dbPath,
        retryCount: this.retryCount
      })
      throw new DatabaseConnectionError(dbError.message, error as Error)
    }
  }

  /**
   * Retry mekanizması ile veritabanı başlatma
   */
  private async initializeWithRetry(): Promise<void> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.retryCount = attempt
        await this.performInitialization()
        return // Başarılı olursa çık
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error // Son deneme de başarısız olursa hatayı fırlat
        }
        
        // Retry attempt
        await this.sleep(this.retryDelay)
        
        // Her denemede delay'i artır (exponential backoff)
        this.retryDelay *= 2
      }
    }
  }

  /**
   * Gerçek başlatma işlemi
   */
  private async performInitialization(): Promise<void> {
    // Veritabanı dizininin var olduğundan emin ol
    const dbDir = path.dirname(this.dbPath)
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true })
      } catch (error) {
        throw new Error(`Veritabanı dizini oluşturulamadı: ${dbDir}`)
      }
    }

    // Disk alanı kontrolü
    await this.checkDiskSpace()

    // Veritabanı dosyası izinlerini kontrol et
    await this.checkFilePermissions()

    // Veritabanı bağlantısını oluştur
    try {
      this.db = new Database(this.dbPath, {
        verbose: undefined // Verbose modu kapalı
      })
    } catch (error) {
      throw new Error(`Veritabanı bağlantısı oluşturulamadı: ${(error as Error).message}`)
    }

    // Veritabanı ayarlarını yapılandır
    try {
      // WAL modunu etkinleştir (daha iyi performans için)
      this.db.pragma('journal_mode = WAL')
      
      // Foreign key desteğini etkinleştir
      this.db.pragma('foreign_keys = ON')
      
      // Timeout ayarları
      this.db.pragma('busy_timeout = 30000') // 30 saniye
      
      // Güvenlik ayarları
      this.db.pragma('secure_delete = ON')
    } catch (error) {
      throw new Error(`Veritabanı ayarları yapılandırılamadı: ${(error as Error).message}`)
    }

    // Tabloları oluştur
    try {
      await this.createTables()
    } catch (error) {
      throw new Error(`Veritabanı tabloları oluşturulamadı: ${(error as Error).message}`)
    }

    // Veritabanı bütünlük kontrolü
    await this.performIntegrityCheck()
  }

  /**
   * Disk alanı kontrolü
   */
  private async checkDiskSpace(): Promise<void> {
    // Sessiz kontrol
  }

  /**
   * Dosya izinleri kontrolü
   */
  private async checkFilePermissions(): Promise<void> {
    const dbDir = path.dirname(this.dbPath)
    
    try {
      // Dizin yazma izni kontrolü
      fs.accessSync(dbDir, fs.constants.W_OK)
      
      // Eğer veritabanı dosyası varsa, okuma/yazma izni kontrolü
      if (fs.existsSync(this.dbPath)) {
        fs.accessSync(this.dbPath, fs.constants.R_OK | fs.constants.W_OK)
      }
    } catch (error) {
      throw new Error(`Veritabanı dosya izinleri yetersiz: ${(error as Error).message}`)
    }
  }

  /**
   * Veritabanı bütünlük kontrolü
   */
  private async performIntegrityCheck(): Promise<void> {
    if (!this.db) return
    
    try {
      const result = this.db.pragma('integrity_check') as any[]
      if (result.length > 0 && result[0].integrity_check !== 'ok') {
        throw new Error(`Veritabanı bütünlük kontrolü başarısız: ${JSON.stringify(result)}`)
      }
    } catch (error) {
      // Bütünlük kontrolü başarısız - sessizce devam et
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Veritabanı bağlantısını al
   */
  getConnection(): Database.Database {
    if (!this.db) {
      throw new DatabaseConnectionError('Veritabanı henüz başlatılmadı')
    }
    return this.db
  }

  /**
   * Hata yönetimi ve loglama
   */
  private handleError(error: unknown, code: string, context?: Record<string, any>): DatabaseError {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const dbError: DatabaseError = {
      code,
      message: errorMessage,
      originalError: error instanceof Error ? error : undefined,
      context
    }

    // Hata sessizce işlenir

    return dbError
  }

  /**
   * Güvenli veritabanı işlemi wrapper'ı
   */
  private async safeExecute<T>(operation: () => T, operationName: string, context?: Record<string, any>): Promise<T> {
    try {
      // Bağlantı kontrolü
      if (!this.db || !this.isInitialized) {
        throw new DatabaseConnectionError('Veritabanı bağlantısı mevcut değil')
      }

      return operation()
    } catch (error) {
      const dbError = this.handleError(error, `${operationName}_FAILED`, context)
      
      // Belirli hata türlerine göre özel işlem
      if (error instanceof Error) {
        if (error.message.includes('SQLITE_BUSY')) {
          throw new DatabaseOperationError('Veritabanı meşgul, lütfen tekrar deneyin', undefined, error)
        } else if (error.message.includes('SQLITE_CORRUPT')) {
          throw new DatabaseConnectionError('Veritabanı dosyası bozuk', error)
        } else if (error.message.includes('UNIQUE constraint failed')) {
          throw new DatabaseValidationError('Benzersizlik kısıtlaması ihlali', undefined, context?.data)
        } else if (error.message.includes('NOT NULL constraint failed')) {
          throw new DatabaseValidationError('Zorunlu alan boş bırakılamaz', undefined, context?.data)
        }
      }

      throw new DatabaseOperationError(dbError.message, context?.operation, error as Error)
    }
  }

  /**
   * SQL sorgusu çalıştır
   */
  async executeQuery(sql: string, params: any[] = []): Promise<any> {
    return this.safeExecute(() => {
      const db = this.getConnection()
      
      // SQL injection koruması - basit kontrol
      this.validateSqlQuery(sql)
      
      // SELECT sorguları için
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = db.prepare(sql)
        return stmt.all(params)
      }
      
      // INSERT, UPDATE, DELETE sorguları için
      const stmt = db.prepare(sql)
      const result = stmt.run(params)
      
      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      }
    }, 'EXECUTE_QUERY', { sql, params })
  }

  /**
   * SQL sorgusu doğrulama
   */
  private validateSqlQuery(sql: string): void {
    if (!sql || typeof sql !== 'string') {
      throw new DatabaseValidationError('SQL sorgusu geçersiz')
    }

    // Tehlikeli SQL komutlarını kontrol et
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DROP\s+DATABASE/i,
      /DELETE\s+FROM\s+\w+\s*;?\s*$/i, // WHERE olmadan DELETE
      /TRUNCATE/i,
      /ALTER\s+TABLE.*DROP/i
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        throw new DatabaseValidationError(`Tehlikeli SQL komutu tespit edildi: ${sql}`)
      }
    }

    // SQL uzunluk kontrolü
    if (sql.length > 10000) {
      throw new DatabaseValidationError('SQL sorgusu çok uzun')
    }
  }

  /**
   * Veritabanı işlemi gerçekleştir
   */
  async performOperation(operation: DatabaseOperation): Promise<any> {
    return this.safeExecute(async () => {
      // İşlem doğrulama
      this.validateOperation(operation)

      const { type, table, data, where, params } = operation

      switch (type) {
        case 'SELECT':
          return await this.select(table, where, params)
        
        case 'INSERT':
          return await this.insert(table, data!)
        
        case 'UPDATE':
          return await this.update(table, data!, where!)
        
        case 'DELETE':
          return await this.delete(table, where!)
        
        default:
          throw new DatabaseValidationError(`Desteklenmeyen işlem türü: ${type}`)
      }
    }, 'PERFORM_OPERATION', { operation })
  }

  /**
   * Veritabanı işlemi doğrulama
   */
  private validateOperation(operation: DatabaseOperation): void {
    if (!operation || typeof operation !== 'object') {
      throw new DatabaseValidationError('İşlem objesi geçersiz')
    }

    const { type, table, data, where } = operation

    // Tip kontrolü
    if (!type || !['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(type)) {
      throw new DatabaseValidationError(`Geçersiz işlem türü: ${type}`)
    }

    // Tablo adı kontrolü
    if (!table || typeof table !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      throw new DatabaseValidationError(`Geçersiz tablo adı: ${table}`)
    }

    // İzin verilen tablolar kontrolü
    const allowedTables = ['employees', 'app_config', 'audit_log']
    if (!allowedTables.includes(table)) {
      throw new DatabaseValidationError(`İzin verilmeyen tablo: ${table}`)
    }

    // İşlem türüne göre özel doğrulamalar
    switch (type) {
      case 'INSERT':
        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
          throw new DatabaseValidationError('INSERT işlemi için veri gerekli')
        }
        this.validateEmployeeData(data, table)
        break

      case 'UPDATE':
        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
          throw new DatabaseValidationError('UPDATE işlemi için veri gerekli')
        }
        if (!where || typeof where !== 'string') {
          throw new DatabaseValidationError('UPDATE işlemi için WHERE koşulu gerekli')
        }
        this.validateEmployeeData(data, table)
        break

      case 'DELETE':
        if (!where || typeof where !== 'string') {
          throw new DatabaseValidationError('DELETE işlemi için WHERE koşulu gerekli')
        }
        // Tüm kayıtları silmeyi engelle
        if (where.toLowerCase().includes('1=1') || where.toLowerCase().includes('true')) {
          throw new DatabaseValidationError('Toplu silme işlemi güvenlik nedeniyle engellendi')
        }
        break
    }
  }

  /**
   * Personel verisi doğrulama
   */
  private validateEmployeeData(data: Record<string, any>, table: string): void {
    if (table !== 'employees') return

    // Email doğrulama
    if (data.email && typeof data.email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new DatabaseValidationError('Geçersiz email formatı', 'email', data.email)
      }
      if (data.email.length > 255) {
        throw new DatabaseValidationError('Email çok uzun', 'email', data.email)
      }
    }

    // İsim doğrulama
    if (data.first_name && typeof data.first_name === 'string') {
      if (data.first_name.length > 100) {
        throw new DatabaseValidationError('Ad çok uzun', 'first_name', data.first_name)
      }
      if (data.first_name.trim().length === 0) {
        throw new DatabaseValidationError('Ad boş olamaz', 'first_name', data.first_name)
      }
    }

    if (data.last_name && typeof data.last_name === 'string') {
      if (data.last_name.length > 100) {
        throw new DatabaseValidationError('Soyad çok uzun', 'last_name', data.last_name)
      }
      if (data.last_name.trim().length === 0) {
        throw new DatabaseValidationError('Soyad boş olamaz', 'last_name', data.last_name)
      }
    }

    // Boolean değer kontrolü
    if (data.is_active !== undefined && typeof data.is_active !== 'number' && typeof data.is_active !== 'boolean') {
      throw new DatabaseValidationError('is_active değeri boolean olmalı', 'is_active', data.is_active)
    }
  }

  /**
   * SELECT işlemi
   */
  private async select(table: string, where?: string, params: any[] = []): Promise<any[]> {
    return this.safeExecute(() => {
      let sql = `SELECT * FROM ${table}`
      
      if (where) {
        sql += ` WHERE ${where}`
      }
      
      // Güvenlik: LIMIT ekle (çok büyük sonuç setlerini engelle)
      if (!sql.toLowerCase().includes('limit')) {
        sql += ' LIMIT 1000'
      }
      
      return this.executeQuery(sql, params)
    }, 'SELECT_OPERATION', { table, where, params })
  }

  /**
   * INSERT işlemi
   */
  private async insert(table: string, data: Record<string, any>): Promise<any> {
    return this.safeExecute(async () => {
      const columns = Object.keys(data)
      const placeholders = columns.map(() => '?').join(', ')
      const values = Object.values(data)
      
      // Timestamp alanlarını otomatik ekle
      if (table === 'employees') {
        if (!data.created_at) {
          data.created_at = new Date().toISOString()
        }
        if (!data.updated_at) {
          data.updated_at = new Date().toISOString()
        }
      }
      
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
      const result = await this.executeQuery(sql, values)
      
      return {
        id: result.lastInsertRowid,
        changes: result.changes
      }
    }, 'INSERT_OPERATION', { table, data })
  }

  /**
   * UPDATE işlemi
   */
  private async update(table: string, data: Record<string, any>, where: string): Promise<any> {
    return this.safeExecute(async () => {
      // Timestamp güncelle
      if (table === 'employees') {
        data.updated_at = new Date().toISOString()
      }
      
      const columns = Object.keys(data)
      const setClause = columns.map(col => `${col} = ?`).join(', ')
      const values = Object.values(data)
      
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`
      const result = await this.executeQuery(sql, values)
      
      return {
        changes: result.changes
      }
    }, 'UPDATE_OPERATION', { table, data, where })
  }

  /**
   * DELETE işlemi
   */
  private async delete(table: string, where: string): Promise<any> {
    return this.safeExecute(async () => {
      const sql = `DELETE FROM ${table} WHERE ${where}`
      const result = await this.executeQuery(sql)
      
      return {
        changes: result.changes
      }
    }, 'DELETE_OPERATION', { table, where })
  }

  /**
   * Tabloları oluştur
   */
  private async createTables(): Promise<void> {
    const db = this.getConnection()

    // Uygulama konfigürasyon tablosu
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Personel tablosu
    db.exec(`
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

    // Audit log tablosu
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        old_values TEXT,
        new_values TEXT,
        user_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Trigger'lar oluştur (audit için)
    this.createAuditTriggers()

    // Varsayılan verileri ekle
    await this.insertDefaultData()
  }

  /**
   * Audit trigger'larını oluştur
   */
  private createAuditTriggers(): void {
    const db = this.getConnection()

    // Employees tablosu için audit trigger'ları
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS employees_audit_insert
      AFTER INSERT ON employees
      BEGIN
        INSERT INTO audit_log (table_name, record_id, action, new_values)
        VALUES ('employees', NEW.id, 'INSERT', json_object(
          'id', NEW.id,
          'first_name', NEW.first_name,
          'last_name', NEW.last_name,
          'email', NEW.email,
          'position', NEW.position,
          'department', NEW.department,
          'is_active', NEW.is_active
        ));
      END
    `)

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS employees_audit_update
      AFTER UPDATE ON employees
      BEGIN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
        VALUES ('employees', NEW.id, 'UPDATE', 
          json_object(
            'id', OLD.id,
            'first_name', OLD.first_name,
            'last_name', OLD.last_name,
            'email', OLD.email,
            'position', OLD.position,
            'department', OLD.department,
            'is_active', OLD.is_active
          ),
          json_object(
            'id', NEW.id,
            'first_name', NEW.first_name,
            'last_name', NEW.last_name,
            'email', NEW.email,
            'position', NEW.position,
            'department', NEW.department,
            'is_active', NEW.is_active
          )
        );
      END
    `)

    db.exec(`
      CREATE TRIGGER IF NOT EXISTS employees_audit_delete
      AFTER DELETE ON employees
      BEGIN
        INSERT INTO audit_log (table_name, record_id, action, old_values)
        VALUES ('employees', OLD.id, 'DELETE', json_object(
          'id', OLD.id,
          'first_name', OLD.first_name,
          'last_name', OLD.last_name,
          'email', OLD.email,
          'position', OLD.position,
          'department', OLD.department,
          'is_active', OLD.is_active
        ));
      END
    `)
  }

  /**
   * Varsayılan verileri ekle
   */
  private async insertDefaultData(): Promise<void> {
    const db = this.getConnection()

    // Uygulama konfigürasyonu
    const configExists = db.prepare('SELECT COUNT(*) as count FROM app_config').get() as { count: number }
    
    if (configExists.count === 0) {
      const insertConfig = db.prepare('INSERT INTO app_config (key, value) VALUES (?, ?)')
      
      insertConfig.run('app_version', '1.0.0')
      insertConfig.run('db_version', '1.0.0')
      insertConfig.run('initialized_at', new Date().toISOString())
    }

    // Örnek personel verisi (sadece ilk kurulumda)
    const employeeExists = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
    
    if (employeeExists.count === 0) {
      const insertEmployee = db.prepare(`
        INSERT INTO employees (first_name, last_name, email, position, department, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      
      insertEmployee.run('Ahmet', 'Yılmaz', 'ahmet.yilmaz@example.com', 'Yazılım Geliştirici', 'IT', 1)
      insertEmployee.run('Ayşe', 'Kaya', 'ayse.kaya@example.com', 'UI/UX Tasarımcı', 'Tasarım', 1)
      insertEmployee.run('Mehmet', 'Demir', 'mehmet.demir@example.com', 'Proje Yöneticisi', 'Yönetim', 0)
    }
  }

  /**
   * İstatistikleri al
   */
  async getStats(): Promise<{ employeeCount: number; configCount: number; auditLogCount: number }> {
    const db = this.getConnection()
    
    const employeeCount = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number }
    const configCount = db.prepare('SELECT COUNT(*) as count FROM app_config').get() as { count: number }
    const auditLogCount = db.prepare('SELECT COUNT(*) as count FROM audit_log').get() as { count: number }
    
    return {
      employeeCount: employeeCount.count,
      configCount: configCount.count,
      auditLogCount: auditLogCount.count
    }
  }

  /**
   * Tüm personelleri al
   */
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

  /**
   * Sağlık kontrolü
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db || !this.isInitialized) {
        return false
      }
      
      // Basit bir sorgu çalıştırarak bağlantıyı test et
      const result = this.db.prepare('SELECT 1 as test').get()
      const isHealthy = !!(result && (result as any).test === 1)
      
      if (isHealthy) {
        // Ek sağlık kontrolleri
        const integrityResult = this.db.pragma('integrity_check') as any[]
        if (integrityResult.length > 0 && integrityResult[0].integrity_check !== 'ok') {
          return false
        }
      }
      
      return isHealthy
    } catch (error) {
      this.handleError(error, 'HEALTH_CHECK_FAILED')
      return false
    }
  }

  /**
   * Veritabanı bağlantısını güvenli şekilde kapat
   */
  async close(): Promise<void> {
    try {
      if (this.db) {
        // Bekleyen işlemlerin tamamlanmasını bekle
        await this.waitForPendingOperations()
        
        // Bağlantıyı kapat
        this.db.close()
        this.db = null
        this.isInitialized = false
      }
    } catch (error) {
      this.handleError(error, 'DATABASE_CLOSE_FAILED')
      
      // Zorla kapat
      if (this.db) {
        try {
          this.db.close()
        } catch (forceCloseError) {
          // Sessizce devam et
        }
        this.db = null
        this.isInitialized = false
      }
    }
  }

  /**
   * Bekleyen işlemlerin tamamlanmasını bekle
   */
  private async waitForPendingOperations(): Promise<void> {
    // Basit bir bekleme mekanizması
    // Gerçek uygulamada daha sofistike bir yaklaşım gerekebilir
    await this.sleep(100)
  }

  /**
   * Veritabanı yedekleme
   */
  async createBackup(backupPath?: string): Promise<string> {
    return this.safeExecute(() => {
      if (!this.db) {
        throw new DatabaseConnectionError('Veritabanı bağlantısı mevcut değil')
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const defaultBackupPath = backupPath || path.join(
        path.dirname(this.dbPath),
        `personel-backup-${timestamp}.db`
      )

      // SQLite backup API kullan - better-sqlite3 backup metodu
      try {
        this.db.exec(`VACUUM INTO '${defaultBackupPath}'`)
      } catch (error) {
        // Fallback: Dosyayı kopyala
        const sourceDb = this.db
        const backupDb = new Database(defaultBackupPath)
        
        sourceDb.exec(`VACUUM`)
        backupDb.exec(`VACUUM`)
        
        backupDb.close()
      }

      return defaultBackupPath
    }, 'CREATE_BACKUP', { backupPath })
  }

  /**
   * Veritabanı istatistikleri
   */
  async getDatabaseInfo(): Promise<Record<string, any>> {
    return this.safeExecute(() => {
      if (!this.db) {
        throw new DatabaseConnectionError('Veritabanı bağlantısı mevcut değil')
      }

      const info = {
        path: this.dbPath,
        isInitialized: this.isInitialized,
        fileSize: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0,
        pageCount: this.db.pragma('page_count'),
        pageSize: this.db.pragma('page_size'),
        journalMode: this.db.pragma('journal_mode'),
        foreignKeys: this.db.pragma('foreign_keys'),
        version: this.db.pragma('user_version'),
        lastModified: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).mtime : null
      }

      return info
    }, 'GET_DATABASE_INFO')
  }
}