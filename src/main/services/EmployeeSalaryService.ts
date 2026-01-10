import { EmployeeSalary } from '@prisma/client'
import {
    EmployeeSalaryRepository,
    EmployeeSalaryWithRelations,
    EmployeeSalaryFilterOptions
} from '../repositories/EmployeeSalaryRepository'
import { PaginatedResult } from '../repositories/BaseRepository'

/**
 * Create EmployeeSalary DTO
 */
export interface CreateEmployeeSalaryDto {
    employeeId: number
    year: number
    grossSalary: number
    currency?: string
    notes?: string | null
}

/**
 * Update EmployeeSalary DTO
 */
export interface UpdateEmployeeSalaryDto {
    year?: number
    grossSalary?: number
    currency?: string
    notes?: string | null
}

/**
 * Business Rule Error
 */
export class BusinessRuleError extends Error {
    constructor(
        public rule: string,
        public details: Record<string, unknown> = {}
    ) {
        super(`İş kuralı ihlali: ${rule}`)
        this.name = 'BusinessRuleError'
    }
}

/**
 * Validation Error
 */
export class ValidationError extends Error {
    constructor(
        public field: string,
        public value: unknown,
        public constraint: string
    ) {
        super(`Doğrulama hatası - ${field}: ${constraint}`)
        this.name = 'ValidationError'
    }
}

/**
 * EmployeeSalaryService - Personel ücret kayıtları iş mantığı
 * CRUD operasyonları, personel + yıl benzersizliği kontrolü,
 * validasyonlar
 */
export class EmployeeSalaryService {
    private repository: EmployeeSalaryRepository

    constructor(repository: EmployeeSalaryRepository) {
        this.repository = repository
    }

    /**
     * Tüm ücret kayıtlarını getir
     */
    async findAll(
        options: EmployeeSalaryFilterOptions = {}
    ): Promise<PaginatedResult<EmployeeSalaryWithRelations>> {
        return await this.repository.findAllWithRelations(options)
    }

    /**
     * ID ile ücret kaydını getir
     */
    async findById(id: number): Promise<EmployeeSalaryWithRelations | null> {
        return await this.repository.findByIdWithRelations(id)
    }

    /**
     * Personelin tüm ücret geçmişini getir
     */
    async findByEmployee(employeeId: number): Promise<EmployeeSalary[]> {
        return await this.repository.findByEmployee(employeeId)
    }

    /**
     * Belirli bir yıla ait ücret kayıtlarını getir
     */
    async findByYear(year: number): Promise<EmployeeSalary[]> {
        return await this.repository.findByYear(year)
    }

    /**
     * Personel ve yıla göre ücret kaydını getir
     */
    async findByEmployeeAndYear(employeeId: number, year: number): Promise<EmployeeSalary | null> {
        return await this.repository.findByEmployeeAndYear(employeeId, year)
    }

    /**
     * Yeni ücret kaydı oluştur
     */
    async create(data: CreateEmployeeSalaryDto, userId?: number): Promise<EmployeeSalary> {
        // Validasyon
        await this.validateCreate(data)

        // Oluştur
        const createData = {
            employeeId: data.employeeId,
            year: data.year,
            grossSalary: data.grossSalary,
            currency: data.currency || 'TRY',
            notes: data.notes || null
        }

        return await this.repository.create(createData as any, userId)
    }

    /**
     * Ücret kaydını güncelle
     */
    async update(id: number, data: UpdateEmployeeSalaryDto, userId?: number): Promise<EmployeeSalary> {
        // Kaydın var olduğunu kontrol et
        const existing = await this.repository.findById(id)
        if (!existing) {
            throw new BusinessRuleError('Ücret kaydı bulunamadı', { id })
        }

        // Validasyon
        await this.validateUpdate(id, data, existing)

        // Güncelleme verisi hazırla
        const updateData: any = {}

        if (data.year !== undefined) updateData.year = data.year
        if (data.grossSalary !== undefined) updateData.grossSalary = data.grossSalary
        if (data.currency !== undefined) updateData.currency = data.currency
        if (data.notes !== undefined) updateData.notes = data.notes

        return await this.repository.update(id, updateData, userId)
    }

    /**
     * Ücret kaydını sil (soft delete)
     */
    async delete(id: number, userId?: number): Promise<EmployeeSalary> {
        // Kaydın var olduğunu kontrol et
        const existing = await this.repository.findById(id)
        if (!existing) {
            throw new BusinessRuleError('Ücret kaydı bulunamadı', { id })
        }

        return await this.repository.softDelete(id, userId)
    }

    /**
     * Ücret kaydını geri yükle
     */
    async restore(id: number, userId?: number): Promise<EmployeeSalary> {
        return await this.repository.restore(id, userId)
    }

    /**
     * Tüm yılların listesini getir
     */
    async getDistinctYears(): Promise<number[]> {
        return await this.repository.getDistinctYears()
    }

    /**
     * Create validasyonu
     */
    private async validateCreate(data: CreateEmployeeSalaryDto): Promise<void> {
        // Personel ID zorunlu
        if (!data.employeeId) {
            throw new ValidationError('employeeId', data.employeeId, 'Personel seçimi zorunludur')
        }

        // Personelin var olup olmadığını kontrol et
        const employeeExists = await this.repository.employeeExists(data.employeeId)
        if (!employeeExists) {
            throw new BusinessRuleError('Personel bulunamadı', { employeeId: data.employeeId })
        }

        // Yıl zorunlu ve geçerli olmalı
        if (!data.year) {
            throw new ValidationError('year', data.year, 'Yıl zorunludur')
        }

        const currentYear = new Date().getFullYear()
        if (data.year < 2000 || data.year > currentYear + 10) {
            throw new ValidationError(
                'year',
                data.year,
                `Yıl 2000 ile ${currentYear + 10} arasında olmalıdır`
            )
        }

        // Brüt maaş zorunlu ve pozitif olmalı
        if (data.grossSalary === undefined || data.grossSalary === null) {
            throw new ValidationError('grossSalary', data.grossSalary, 'Brüt maaş zorunludur')
        }

        if (data.grossSalary <= 0) {
            throw new ValidationError('grossSalary', data.grossSalary, 'Brüt maaş pozitif bir değer olmalıdır')
        }

        // Personel + Yıl benzersizliği kontrolü
        const isUnique = await this.repository.isUniqueEmployeeYear(data.employeeId, data.year)
        if (!isUnique) {
            throw new BusinessRuleError(
                'Bu personel için seçilen yılda zaten bir ücret kaydı mevcut',
                { employeeId: data.employeeId, year: data.year }
            )
        }
    }

    /**
     * Update validasyonu
     */
    private async validateUpdate(
        id: number,
        data: UpdateEmployeeSalaryDto,
        existing: EmployeeSalary
    ): Promise<void> {
        // Yıl değişiyorsa validasyon
        if (data.year !== undefined && data.year !== existing.year) {
            const currentYear = new Date().getFullYear()
            if (data.year < 2000 || data.year > currentYear + 10) {
                throw new ValidationError(
                    'year',
                    data.year,
                    `Yıl 2000 ile ${currentYear + 10} arasında olmalıdır`
                )
            }

            // Yıl değişiyorsa benzersizlik kontrolü
            const isUnique = await this.repository.isUniqueEmployeeYear(existing.employeeId, data.year, id)
            if (!isUnique) {
                throw new BusinessRuleError(
                    'Bu personel için seçilen yılda zaten bir ücret kaydı mevcut',
                    { employeeId: existing.employeeId, year: data.year }
                )
            }
        }

        // Brüt maaş değişiyorsa pozitif olmalı
        if (data.grossSalary !== undefined && data.grossSalary <= 0) {
            throw new ValidationError('grossSalary', data.grossSalary, 'Brüt maaş pozitif bir değer olmalıdır')
        }
    }
}

export default EmployeeSalaryService
