import { ipcMain } from 'electron'
import { DatabaseManager, DatabaseOperation } from '../database/DatabaseManager'
import { PrismaClient } from '@prisma/client'
import { setPrisma } from '../database/config'
import { AdminSeeder } from '../database/AdminSeeder'
import { PrismaDatabaseManager } from '../database/prisma-manager'

let dbManager: DatabaseManager | null = null
let prisma: PrismaClient | null = null

/**
 * Veritabanı yöneticisini başlat
 */
export async function initializeDatabaseManager(): Promise<void> {
  if (!dbManager) {
    dbManager = new DatabaseManager()
    await dbManager.initialize()
  }

  // Prisma'yı başlat
  if (!prisma) {
    prisma = new PrismaClient()
    await prisma.$connect()
    
    // DatabaseConfig'e Prisma'yı ayarla
    setPrisma(prisma)
    
    // Admin seeder'ı çalıştır
    const adminSeeder = new AdminSeeder(prisma)
    await adminSeeder.seed()
    
    console.log('Prisma veritabanı bağlantısı kuruldu')
  }

  // PrismaDatabaseManager'ı da başlat (LeaveType, LeaveRequest vb. controller'lar için)
  await PrismaDatabaseManager.getInstance().initialize()
}

/**
 * Prisma instance'ını döndür
 */
export function getPrismaClient(): PrismaClient | null {
  return prisma
}

/**
 * Veritabanı IPC Handler'ları
 */
export function setupDatabaseHandlers() {
  // Genel veritabanı işlemleri
  ipcMain.handle('database-operation', async (event, operation: DatabaseOperation) => {
    try {
      if (!dbManager) {
        throw new Error('Veritabanı yöneticisi başlatılmamış')
      }
      return await dbManager.performOperation(operation)
    } catch (error) {
      throw error
    }
  })

  // Sağlık kontrolü
  ipcMain.handle('health-check', async () => {
    try {
      if (!dbManager) {
        return false
      }
      return await dbManager.healthCheck()
    } catch (error) {
      return false
    }
  })

  // İstatistikler
  ipcMain.handle('get-stats', async () => {
    try {
      if (!dbManager) {
        throw new Error('Veritabanı yöneticisi başlatılmamış')
      }
      return await dbManager.getStats()
    } catch (error) {
      throw error
    }
  })

  // Tüm personelleri al
  ipcMain.handle('get-all-employees', async () => {
    try {
      if (!dbManager) {
        throw new Error('Veritabanı yöneticisi başlatılmamış')
      }
      return await dbManager.getAllEmployees()
    } catch (error) {
      throw error
    }
  })

  // Personel oluştur
  ipcMain.handle('create-employee', async (event, employeeData) => {
    try {
      if (!dbManager) {
        throw new Error('Veritabanı yöneticisi başlatılmamış')
      }
      
      const operation: DatabaseOperation = {
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
      
      return await dbManager.performOperation(operation)
    } catch (error) {
      throw error
    }
  })

  // Personel güncelle
  ipcMain.handle('update-employee', async (event, id: number, employeeData) => {
    try {
      if (!dbManager) {
        throw new Error('Veritabanı yöneticisi başlatılmamış')
      }
      
      const operation: DatabaseOperation = {
        type: 'UPDATE',
        table: 'employees',
        data: {
          first_name: employeeData.firstName,
          last_name: employeeData.lastName,
          email: employeeData.email,
          position: employeeData.position,
          department: employeeData.department,
          is_active: employeeData.isActive ? 1 : 0,
          updated_at: new Date().toISOString()
        },
        where: `id = ${id}`
      }
      
      return await dbManager.performOperation(operation)
    } catch (error) {
      throw error
    }
  })

  // Personel sil
  ipcMain.handle('delete-employee', async (event, id: number) => {
    try {
      if (!dbManager) {
        throw new Error('Veritabanı yöneticisi başlatılmamış')
      }
      
      const operation: DatabaseOperation = {
        type: 'DELETE',
        table: 'employees',
        where: `id = ${id}`
      }
      
      return await dbManager.performOperation(operation)
    } catch (error) {
      throw error
    }
  })
}

/**
 * Veritabanı yöneticisini kapat
 */
export async function closeDatabaseManager(): Promise<void> {
  if (dbManager) {
    await dbManager.close()
    dbManager = null
  }
  
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }

  // PrismaDatabaseManager'ı da kapat
  await PrismaDatabaseManager.getInstance().close()
}
