import { PrismaClient } from '@prisma/client'
import { BaseController } from './BaseController'
import {
    EmployeeSalaryService,
    CreateEmployeeSalaryDto,
    UpdateEmployeeSalaryDto,
    BusinessRuleError,
    ValidationError
} from '../services/EmployeeSalaryService'
import { EmployeeSalaryRepository, EmployeeSalaryFilterOptions } from '../repositories/EmployeeSalaryRepository'
import { getPrismaClient } from '../database/prisma-manager'

/**
 * EmployeeSalary Controller
 * Personel ücret kayıtları CRUD operasyonları
 */
export class EmployeeSalaryController extends BaseController {
    private service: EmployeeSalaryService
    private repository: EmployeeSalaryRepository
    private prisma: PrismaClient

    constructor() {
        super()
        this.prisma = getPrismaClient()
        this.repository = new EmployeeSalaryRepository(this.prisma)
        this.service = new EmployeeSalaryService(this.repository)
    }

    /**
     * Tüm ücret kayıtlarını getir
     */
    async getAll(options: EmployeeSalaryFilterOptions = {}): Promise<any> {
        try {
            const result = await this.service.findAll(options)
            return this.paginated(result.data, result.total, result.page, result.limit)
        } catch (error) {
            return this.handleError(error, 'Ücret kayıtları listesi getirme')
        }
    }

    /**
     * ID ile ücret kaydını getir
     */
    async getById(id: number): Promise<any> {
        try {
            const salary = await this.service.findById(id)
            if (!salary) {
                return this.error(['Ücret kaydı bulunamadı'], 404)
            }
            return this.success(salary)
        } catch (error) {
            return this.handleError(error, 'Ücret kaydı getirme')
        }
    }

    /**
     * Personelin tüm ücret geçmişini getir
     */
    async getByEmployee(employeeId: number): Promise<any> {
        try {
            const salaries = await this.service.findByEmployee(employeeId)
            return this.success(salaries)
        } catch (error) {
            return this.handleError(error, 'Personel ücret geçmişi getirme')
        }
    }

    /**
     * Belirli yıla ait ücret kayıtlarını getir
     */
    async getByYear(year: number): Promise<any> {
        try {
            const salaries = await this.service.findByYear(year)
            return this.success(salaries)
        } catch (error) {
            return this.handleError(error, 'Yıla göre ücret kayıtları getirme')
        }
    }

    /**
     * Personel ve yıla göre ücret kaydını getir
     */
    async getByEmployeeAndYear(employeeId: number, year: number): Promise<any> {
        try {
            const salary = await this.service.findByEmployeeAndYear(employeeId, year)
            if (!salary) {
                return this.error(['Ücret kaydı bulunamadı'], 404)
            }
            return this.success(salary)
        } catch (error) {
            return this.handleError(error, 'Personel ve yıla göre ücret kaydı getirme')
        }
    }

    /**
     * Yeni ücret kaydı oluştur
     */
    async create(data: CreateEmployeeSalaryDto, userId?: number): Promise<any> {
        try {
            const salary = await this.service.create(data, userId)
            return this.success(salary, 'Ücret kaydı başarıyla oluşturuldu')
        } catch (error) {
            if (error instanceof BusinessRuleError || error instanceof ValidationError) {
                return this.error([error.message])
            }
            return this.handleError(error, 'Ücret kaydı oluşturma')
        }
    }

    /**
     * Ücret kaydını güncelle
     */
    async update(id: number, data: UpdateEmployeeSalaryDto, userId?: number): Promise<any> {
        try {
            const salary = await this.service.update(id, data, userId)
            return this.success(salary, 'Ücret kaydı başarıyla güncellendi')
        } catch (error) {
            if (error instanceof BusinessRuleError || error instanceof ValidationError) {
                return this.error([error.message])
            }
            return this.handleError(error, 'Ücret kaydı güncelleme')
        }
    }

    /**
     * Ücret kaydını sil
     */
    async delete(id: number, userId?: number): Promise<any> {
        try {
            await this.service.delete(id, userId)
            return this.success(null, 'Ücret kaydı başarıyla silindi')
        } catch (error) {
            if (error instanceof BusinessRuleError) {
                return this.error([error.message])
            }
            return this.handleError(error, 'Ücret kaydı silme')
        }
    }

    /**
     * Ücret kaydını geri yükle
     */
    async restore(id: number, userId?: number): Promise<any> {
        try {
            const salary = await this.service.restore(id, userId)
            return this.success(salary, 'Ücret kaydı başarıyla geri yüklendi')
        } catch (error) {
            return this.handleError(error, 'Ücret kaydı geri yükleme')
        }
    }

    /**
     * Tüm yılların listesini getir
     */
    async getDistinctYears(): Promise<any> {
        try {
            const years = await this.service.getDistinctYears()
            return this.success(years)
        } catch (error) {
            return this.handleError(error, 'Yıl listesi getirme')
        }
    }
}

export default EmployeeSalaryController
