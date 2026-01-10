import { PrismaClient, ParameterType } from '@prisma/client'
import { BaseRepository, FindAllOptions, PaginatedResult } from './BaseRepository'

/**
 * Default parameter types for seeding
 * Bordro hesaplama için gerekli tüm parametre türleri
 */
export const DEFAULT_PARAMETER_TYPES = [
  // ==================== ÜCRET PARAMETRELERİ ====================
  { code: 'MinimumWage', name: 'Asgari Ücret (Brüt)', category: 'Ücret Parametreleri', valueType: 'amount', isSystem: true, sortOrder: 1, description: 'Güncel brüt asgari ücret tutarı' },
  { code: 'MinimumWageNet', name: 'Asgari Ücret (Net)', category: 'Ücret Parametreleri', valueType: 'amount', isSystem: true, sortOrder: 2, description: 'Güncel net asgari ücret tutarı' },
  { code: 'SGKCeiling', name: 'SGK Tavan Ücreti', category: 'Ücret Parametreleri', valueType: 'amount', isSystem: true, sortOrder: 3, description: 'SGK prim tavanı (7,5 x asgari ücret)' },
  { code: 'SGKFloor', name: 'SGK Taban Ücreti', category: 'Ücret Parametreleri', valueType: 'amount', isSystem: true, sortOrder: 4, description: 'SGK prim tabanı (asgari ücret)' },

  // ==================== AYLIK SÜRE PARAMETRELERİ ====================
  { code: 'MonthlyWorkDays', name: 'Aylık Çalışma Günü', category: 'Aylık Süre Parametreleri', valueType: 'integer', isSystem: true, sortOrder: 10, description: 'Standart aylık çalışma gün sayısı (genellikle 30)' },
  { code: 'MonthlyWorkHours', name: 'Aylık Çalışma Saati', category: 'Aylık Süre Parametreleri', valueType: 'integer', isSystem: true, sortOrder: 11, description: 'Standart aylık çalışma saat sayısı (genellikle 225)' },
  { code: 'DailyWorkHours', name: 'Günlük Çalışma Saati', category: 'Aylık Süre Parametreleri', valueType: 'integer', isSystem: true, sortOrder: 12, description: 'Standart günlük çalışma saat sayısı (genellikle 7.5)' },
  { code: 'WeeklyWorkHours', name: 'Haftalık Çalışma Saati', category: 'Aylık Süre Parametreleri', valueType: 'integer', isSystem: true, sortOrder: 13, description: 'Standart haftalık çalışma saat sayısı (genellikle 45)' },

  // ==================== FAZLA MESAİ PARAMETRELERİ ====================
  { code: 'OvertimeWeekday', name: 'Hafta İçi Fazla Mesai Çarpanı', category: 'Fazla Mesai Parametreleri', valueType: 'multiplier', isSystem: true, sortOrder: 20, description: 'Hafta içi fazla mesai ücreti çarpanı (1.5)' },
  { code: 'OvertimeWeekend', name: 'Hafta Sonu Fazla Mesai Çarpanı', category: 'Fazla Mesai Parametreleri', valueType: 'multiplier', isSystem: true, sortOrder: 21, description: 'Hafta sonu fazla mesai ücreti çarpanı (2.0)' },
  { code: 'OvertimeHoliday', name: 'Resmi Tatil Fazla Mesai Çarpanı', category: 'Fazla Mesai Parametreleri', valueType: 'multiplier', isSystem: true, sortOrder: 22, description: 'Resmi tatil fazla mesai ücreti çarpanı (2.5)' },
  { code: 'OvertimeNight', name: 'Gece Fazla Mesai Çarpanı', category: 'Fazla Mesai Parametreleri', valueType: 'multiplier', isSystem: true, sortOrder: 23, description: 'Gece vardiyası fazla mesai ücreti çarpanı (1.5)' },
  { code: 'OvertimeNightWeekend', name: 'Gece Hafta Sonu Mesai Çarpanı', category: 'Fazla Mesai Parametreleri', valueType: 'multiplier', isSystem: true, sortOrder: 24, description: 'Gece hafta sonu fazla mesai ücreti çarpanı (2.5)' },

  // ==================== SGK PARAMETRELERİ ====================
  { code: 'SGKEmployeeRate', name: 'SGK İşçi Payı Oranı', category: 'SGK Parametreleri', valueType: 'percentage', isSystem: true, sortOrder: 30, description: 'SGK işçi prim kesintisi oranı (%14)' },
  { code: 'SGKEmployerRate', name: 'SGK İşveren Payı Oranı', category: 'SGK Parametreleri', valueType: 'percentage', isSystem: true, sortOrder: 31, description: 'SGK işveren prim oranı (%20.5)' },
  { code: 'UnemploymentEmployeeRate', name: 'İşsizlik Sigortası İşçi Oranı', category: 'SGK Parametreleri', valueType: 'percentage', isSystem: true, sortOrder: 32, description: 'İşsizlik sigortası işçi kesintisi oranı (%1)' },
  { code: 'UnemploymentEmployerRate', name: 'İşsizlik Sigortası İşveren Oranı', category: 'SGK Parametreleri', valueType: 'percentage', isSystem: true, sortOrder: 33, description: 'İşsizlik sigortası işveren kesintisi oranı (%2)' },
  { code: 'SGKExemptionRate', name: 'SGK 5 Puanlık Teşvik Oranı', category: 'SGK Parametreleri', valueType: 'percentage', isSystem: true, sortOrder: 34, description: 'SGK 5 puanlık işveren prim teşviki oranı' },

  // ==================== GELİR VERGİSİ PARAMETRELERİ ====================
  { code: 'IncomeTaxBracket', name: 'Gelir Vergisi Dilimleri', category: 'Gelir Vergisi Parametreleri', valueType: 'bracket', hasBrackets: true, bracketCount: 5, isSystem: true, sortOrder: 40, description: '5 kademeli gelir vergisi dilimleri (alt limit, üst limit, oran)' },
  { code: 'MinWageExemption', name: 'Asgari Ücret İstisnası', category: 'Gelir Vergisi Parametreleri', valueType: 'amount', isSystem: true, sortOrder: 41, description: 'Asgari ücrete kadar olan kısım gelir vergisinden istisnadır' },

  // ==================== DAMGA VERGİSİ ====================
  { code: 'StampTaxRate', name: 'Damga Vergisi Oranı', category: 'Damga Vergisi', valueType: 'percentage', isSystem: true, sortOrder: 50, description: 'Brüt ücret üzerinden damga vergisi oranı (%0.759)' },
  { code: 'StampTaxExemption', name: 'Damga Vergisi Asgari Ücret İstisnası', category: 'Damga Vergisi', valueType: 'amount', isSystem: true, sortOrder: 51, description: 'Asgari ücret kadar istisna tutarı' },

  // ==================== ÖZEL KESİNTİLER ====================
  { code: 'BESEmployeeRate', name: 'BES İşçi Katkı Oranı', category: 'Özel Kesintiler', valueType: 'percentage', isSystem: false, sortOrder: 60, description: 'Bireysel Emeklilik Sistemi işçi katkı oranı (%3)' },
  { code: 'BESEmployerRate', name: 'BES İşveren Katkı Oranı', category: 'Özel Kesintiler', valueType: 'percentage', isSystem: false, sortOrder: 61, description: 'Bireysel Emeklilik Sistemi işveren katkı oranı' },
  { code: 'UnionDuesRate', name: 'Sendika Aidatı Oranı', category: 'Özel Kesintiler', valueType: 'percentage', isSystem: false, sortOrder: 62, description: 'Sendika aidat oranı (net ücret üzerinden)' },
  { code: 'AdvanceDeduction', name: 'Avans Kesintisi', category: 'Özel Kesintiler', valueType: 'amount', isSystem: false, sortOrder: 63, description: 'Personel avans kesintisi' },
  { code: 'EnforcementDeduction', name: 'İcra Kesintisi', category: 'Özel Kesintiler', valueType: 'amount', isSystem: false, sortOrder: 64, description: 'İcra kesintisi (aylık)' },
  { code: 'AlimonyDeduction', name: 'Nafaka Kesintisi', category: 'Özel Kesintiler', valueType: 'amount', isSystem: false, sortOrder: 65, description: 'Nafaka kesintisi (aylık)' },
  { code: 'DamageDeduction', name: 'Hasar Kesintisi', category: 'Özel Kesintiler', valueType: 'amount', isSystem: false, sortOrder: 66, description: 'Hasar/tazminat kesintisi' },
  { code: 'DailyAllowance', name: 'Yevmiye Kesintisi', category: 'Özel Kesintiler', valueType: 'amount', isSystem: false, sortOrder: 67, description: 'Yevmiye/harcırah kesintisi' },

  // ==================== EK KAZANÇLAR ====================
  { code: 'FoodAllowance', name: 'Yemek Yardımı', category: 'Ek Kazançlar', valueType: 'amount', isSystem: false, sortOrder: 70, description: 'Günlük yemek yardımı tutarı' },
  { code: 'TransportAllowance', name: 'Yol Yardımı', category: 'Ek Kazançlar', valueType: 'amount', isSystem: false, sortOrder: 71, description: 'Günlük yol yardımı tutarı' },
  { code: 'ChildAllowance', name: 'Çocuk Yardımı', category: 'Ek Kazançlar', valueType: 'amount', isSystem: false, sortOrder: 72, description: 'Çocuk başına aylık yardım tutarı' },
  { code: 'FamilyAllowance', name: 'Aile Yardımı', category: 'Ek Kazançlar', valueType: 'amount', isSystem: false, sortOrder: 73, description: 'Eş için aylık yardım tutarı' },
  { code: 'SeniorityBonus', name: 'Kıdem Zammı', category: 'Ek Kazançlar', valueType: 'percentage', isSystem: false, sortOrder: 74, description: 'Yıllık kıdem zammı oranı' }
] as const

/**
 * ParameterType filter options
 */
export interface ParameterTypeFilterOptions extends FindAllOptions {
  isActive?: boolean
  isSystem?: boolean
  category?: string
  search?: string
}

/**
 * ParameterTypeRepository - Parametre türleri veritabanı işlemleri
 * BaseRepository'den türetilmiş
 */
export class ParameterTypeRepository extends BaseRepository<ParameterType> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'parameterType', true)
  }

  /**
   * Tüm parametre türlerini filtrelerle getir
   */
  async findAllWithFilters(options: ParameterTypeFilterOptions = {}): Promise<PaginatedResult<ParameterType>> {
    const {
      page = 1,
      limit = 25,
      orderBy = 'sortOrder',
      order = 'asc',
      includeDeleted = false,
      isActive,
      isSystem,
      category,
      search
    } = options
    const skip = (page - 1) * limit

    const whereClause: any = {
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    // Filtreler
    if (isActive !== undefined) whereClause.isActive = isActive
    if (isSystem !== undefined) whereClause.isSystem = isSystem
    if (category) whereClause.category = category
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } }
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.parameterType.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderBy]: order }
      }),
      this.prisma.parameterType.count({ where: whereClause })
    ])

    return {
      data: this.toPlain(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Tüm parametre türlerini sayfalama olmadan getir
   */
  async findAllWithoutPagination(): Promise<ParameterType[]> {
    const result = await this.prisma.parameterType.findMany({
      where: {
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Tüm aktif parametre türlerini getir (sayfalama olmadan)
   */
  async findAllActive(): Promise<ParameterType[]> {
    const result = await this.prisma.parameterType.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Koda göre parametre türü bul
   */
  async findByCode(code: string, includeDeleted: boolean = false): Promise<ParameterType | null> {
    const whereClause: any = {
      code,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.parameterType.findFirst({
      where: whereClause
    })

    return result ? this.toPlain(result) : null
  }

  /**
   * İsme göre parametre türü bul
   */
  async findByName(name: string, includeDeleted: boolean = false): Promise<ParameterType | null> {
    const whereClause: any = {
      name,
      ...this.getSoftDeleteFilter(includeDeleted)
    }

    const result = await this.prisma.parameterType.findFirst({
      where: whereClause
    })

    return result ? this.toPlain(result) : null
  }

  /**
   * Kategoriye göre parametre türlerini getir
   */
  async findByCategory(category: string): Promise<ParameterType[]> {
    const result = await this.prisma.parameterType.findMany({
      where: {
        category,
        isActive: true,
        deletedAt: null
      },
      orderBy: { sortOrder: 'asc' }
    })

    return this.toPlain(result)
  }

  /**
   * Varsayılan parametre türlerini oluştur
   */
  async seedDefaults(userId?: number): Promise<ParameterType[]> {
    const created: ParameterType[] = []

    for (const typeData of DEFAULT_PARAMETER_TYPES) {
      const existing = await this.findByCode(typeData.code)
      if (!existing) {
        const newType = await this.create({
          ...typeData,
          isActive: true
        } as any, userId)
        created.push(newType)
      }
    }

    return created
  }

  /**
   * Tüm kategorileri getir
   */
  async getCategories(): Promise<string[]> {
    const result = await this.prisma.parameterType.findMany({
      where: {
        deletedAt: null,
        category: { not: null }
      },
      select: { category: true },
      distinct: ['category']
    })

    return result.map(r => r.category).filter(Boolean) as string[]
  }
}
