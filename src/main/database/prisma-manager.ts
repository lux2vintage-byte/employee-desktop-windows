import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as log from 'electron-log';
import { app } from 'electron';

/**
 * Prisma Database Manager
 * SQLite veritabanı bağlantısını ve işlemlerini yönetir
 */
/**
 * Helper function to get Prisma client instance
 * Controllers use this to get the Prisma client
 */
export function getPrismaClient(): PrismaClient {
  return PrismaDatabaseManager.getInstance().getClient();
}

export class PrismaDatabaseManager {
  private static instance: PrismaDatabaseManager;
  private prisma: PrismaClient | null = null;
  private isInitialized = false;

  private constructor() {}

  /**
   * Singleton instance'ı döndürür
   */
  public static getInstance(): PrismaDatabaseManager {
    if (!PrismaDatabaseManager.instance) {
      PrismaDatabaseManager.instance = new PrismaDatabaseManager();
    }
    return PrismaDatabaseManager.instance;
  }

  /**
   * Veritabanını başlatır
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.info('Prisma veritabanı zaten başlatılmış');
      return;
    }

    try {
      // Veritabanı dosyasının yolunu belirle
      const dbPath = this.getDatabasePath();
      log.info(`Veritabanı yolu: ${dbPath}`);

      // Prisma Client'ı oluştur
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${dbPath}`
          }
        },
        log: ['query', 'info', 'warn', 'error'],
      });

      // Veritabanı bağlantısını test et
      await this.prisma.$connect();
      log.info('Prisma veritabanı bağlantısı başarılı');

      // Veritabanı şemasını senkronize et (geliştirme modunda)
      if (process.env.NODE_ENV === 'development') {
        await this.prisma.$executeRaw`PRAGMA foreign_keys = ON`;
        log.info('Foreign key constraints aktifleştirildi');
      }

      this.isInitialized = true;
      log.info('Prisma Database Manager başarıyla başlatıldı');

    } catch (error) {
      log.error('Prisma veritabanı başlatma hatası:', error);
      throw new Error(`Veritabanı başlatılamadı: ${error}`);
    }
  }

  /**
   * Veritabanı dosyasının yolunu döndürür
   */
  private getDatabasePath(): string {
    return path.join(process.cwd(), 'personel.db');
  }

  /**
   * Prisma Client instance'ını döndürür
   */
  public getClient(): PrismaClient {
    if (!this.prisma || !this.isInitialized) {
      throw new Error('Prisma Database Manager henüz başlatılmamış. initialize() metodunu çağırın.');
    }
    return this.prisma;
  }

  /**
   * Veritabanı bağlantısını kapatır
   */
  public async close(): Promise<void> {
    if (this.prisma) {
      try {
        await this.prisma.$disconnect();
        log.info('Prisma veritabanı bağlantısı kapatıldı');
      } catch (error) {
        log.error('Prisma bağlantı kapatma hatası:', error);
      } finally {
        this.prisma = null;
        this.isInitialized = false;
      }
    }
  }

  /**
   * Veritabanı durumunu kontrol eder
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.prisma) return false;
      
      // Basit bir sorgu ile bağlantıyı test et
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      log.error('Veritabanı sağlık kontrolü başarısız:', error);
      return false;
    }
  }

  /**
   * Veritabanı istatistiklerini döndürür
   */
  public async getStats(): Promise<{
    employeeCount: number;
    configCount: number;
    auditLogCount: number;
  }> {
    if (!this.prisma) {
      throw new Error('Prisma client başlatılmamış');
    }

    try {
      const [employeeCount, configCount, auditLogCount] = await Promise.all([
        this.prisma.employee.count(),
        this.prisma.appConfig.count(),
        this.prisma.auditLog.count(),
      ]);

      return {
        employeeCount,
        configCount,
        auditLogCount,
      };
    } catch (error) {
      log.error('Veritabanı istatistikleri alınamadı:', error);
      throw error;
    }
  }

  /**
   * Veritabanını temizler (sadece geliştirme modunda)
   */
  public async clearDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Veritabanı temizleme sadece geliştirme modunda kullanılabilir');
    }

    if (!this.prisma) {
      throw new Error('Prisma client başlatılmamış');
    }

    try {
      // Tabloları temizle (foreign key constraints nedeniyle sıralı)
      await this.prisma.auditLog.deleteMany();
      await this.prisma.employee.deleteMany();
      await this.prisma.appConfig.deleteMany();
      
      log.info('Veritabanı başarıyla temizlendi');
    } catch (error) {
      log.error('Veritabanı temizleme hatası:', error);
      throw error;
    }
  }
}