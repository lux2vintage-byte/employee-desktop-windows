import { PrismaDatabaseManager } from './prisma-manager';
import { PrismaClient, Employee, AppConfig, AuditLog } from '@prisma/client';
import * as log from 'electron-log';

/**
 * Database Service
 * Veritabanı işlemleri için üst seviye API sağlar
 */
export class DatabaseService {
  private dbManager: PrismaDatabaseManager;
  private prisma: PrismaClient;

  constructor() {
    this.dbManager = PrismaDatabaseManager.getInstance();
    this.prisma = this.dbManager.getClient();
  }

  // Employee CRUD Operations
  
  /**
   * Tüm personelleri getirir
   */
  async getAllEmployees(): Promise<Employee[]> {
    try {
      return await this.prisma.employee.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      log.error('Personel listesi getirme hatası:', error);
      throw error;
    }
  }

  /**
   * ID'ye göre personel getirir
   */
  async getEmployeeById(id: number): Promise<Employee | null> {
    try {
      return await this.prisma.employee.findUnique({
        where: { id }
      });
    } catch (error) {
      log.error(`Personel getirme hatası (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * Yeni personel oluşturur
   */
  async createEmployee(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    try {
      const employee = await this.prisma.employee.create({
        data
      });

      // Audit log kaydı
      await this.createAuditLog('employees', employee.id, 'INSERT', null, JSON.stringify(employee));
      
      log.info(`Yeni personel oluşturuldu: ${employee.firstName} ${employee.lastName}`);
      return employee;
    } catch (error) {
      log.error('Personel oluşturma hatası:', error);
      throw error;
    }
  }

  /**
   * Personel bilgilerini günceller
   */
  async updateEmployee(id: number, data: Partial<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Employee> {
    try {
      // Eski değerleri al
      const oldEmployee = await this.prisma.employee.findUnique({ where: { id } });
      
      const employee = await this.prisma.employee.update({
        where: { id },
        data
      });

      // Audit log kaydı
      await this.createAuditLog(
        'employees', 
        employee.id, 
        'UPDATE', 
        JSON.stringify(oldEmployee), 
        JSON.stringify(employee)
      );
      
      log.info(`Personel güncellendi: ${employee.firstName} ${employee.lastName}`);
      return employee;
    } catch (error) {
      log.error(`Personel güncelleme hatası (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * Personeli siler
   */
  async deleteEmployee(id: number): Promise<Employee> {
    try {
      // Eski değerleri al
      const oldEmployee = await this.prisma.employee.findUnique({ where: { id } });
      
      const employee = await this.prisma.employee.delete({
        where: { id }
      });

      // Audit log kaydı
      await this.createAuditLog('employees', id, 'DELETE', JSON.stringify(oldEmployee), null);
      
      log.info(`Personel silindi: ${employee.firstName} ${employee.lastName}`);
      return employee;
    } catch (error) {
      log.error(`Personel silme hatası (ID: ${id}):`, error);
      throw error;
    }
  }

  /**
   * Personel arama
   */
  async searchEmployees(query: string): Promise<Employee[]> {
    try {
      return await this.prisma.employee.findMany({
        where: {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { emailWork: { contains: query } },
            { emailPersonal: { contains: query } },
            { employeeCode: { contains: query } },
            { position: { title: { contains: query } } },
            { department: { name: { contains: query } } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      log.error(`Personel arama hatası (query: ${query}):`, error);
      throw error;
    }
  }

  // App Config Operations

  /**
   * Konfigürasyon değeri getirir
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      const config = await this.prisma.appConfig.findUnique({
        where: { key }
      });
      return config?.value || null;
    } catch (error) {
      log.error(`Konfigürasyon getirme hatası (key: ${key}):`, error);
      throw error;
    }
  }

  /**
   * Konfigürasyon değeri ayarlar
   */
  async setConfig(key: string, value: string): Promise<AppConfig> {
    try {
      const config = await this.prisma.appConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
      
      log.info(`Konfigürasyon ayarlandı: ${key} = ${value}`);
      return config;
    } catch (error) {
      log.error(`Konfigürasyon ayarlama hatası (key: ${key}):`, error);
      throw error;
    }
  }

  /**
   * Tüm konfigürasyonları getirir
   */
  async getAllConfigs(): Promise<AppConfig[]> {
    try {
      return await this.prisma.appConfig.findMany({
        orderBy: { key: 'asc' }
      });
    } catch (error) {
      log.error('Tüm konfigürasyonları getirme hatası:', error);
      throw error;
    }
  }

  // Audit Log Operations

  /**
   * Audit log kaydı oluşturur
   */
  private async createAuditLog(
    tableName: string,
    recordId: number,
    action: string,
    oldValues: string | null,
    newValues: string | null,
    userId?: number
  ): Promise<AuditLog> {
    try {
      return await this.prisma.auditLog.create({
        data: {
          tableName,
          recordId,
          action,
          oldValues,
          newValues,
          userId
        }
      });
    } catch (error) {
      log.error('Audit log oluşturma hatası:', error);
      throw error;
    }
  }

  /**
   * Audit log kayıtlarını getirir
   */
  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      return await this.prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      log.error('Audit log getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Belirli bir kayıt için audit log'ları getirir
   */
  async getAuditLogsForRecord(tableName: string, recordId: number): Promise<AuditLog[]> {
    try {
      return await this.prisma.auditLog.findMany({
        where: {
          tableName,
          recordId
        },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      log.error(`Kayıt audit log getirme hatası (${tableName}:${recordId}):`, error);
      throw error;
    }
  }

  // Utility Methods

  /**
   * Veritabanı istatistiklerini getirir
   */
  async getStats() {
    return await this.dbManager.getStats();
  }

  /**
   * Veritabanı sağlık kontrolü
   */
  async healthCheck(): Promise<boolean> {
    return await this.dbManager.healthCheck();
  }
}