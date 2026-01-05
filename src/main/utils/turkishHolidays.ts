/**
 * Türkiye Resmi Tatil ve Dini Bayram Takvimi Utility
 * 
 * Bu modül, Türkiye'deki resmi tatilleri, dini bayramları, arefe günlerini
 * ve hafta tatillerini dinamik olarak hesaplar.
 */

/**
 * Tatil türü
 */
export type HolidayType = 'resmi_bayram' | 'dini_bayram' | 'arefe' | 'hafta_tatili' | 'normal_gun'

/**
 * Tatil bilgisi
 */
export interface HolidayInfo {
  date: string // YYYY-MM-DD formatında
  name: string
  type: HolidayType
  abbreviation: string
  color: string
}

/**
 * Dini bayram tarihleri (Hicri takvime göre değişir - Diyanet takviminden)
 * Bu tarihler her yıl güncellenmeli veya Diyanet API'si kullanılmalı
 * 
 * Ramazan Bayramı: 3 gün
 * Kurban Bayramı: 4 gün
 */
const ISLAMIC_HOLIDAYS: Record<number, { ramazanStart: string; kurbanStart: string }> = {
  2024: {
    ramazanStart: '2024-04-10', // 10-12 Nisan
    kurbanStart: '2024-06-16'   // 16-19 Haziran
  },
  2025: {
    ramazanStart: '2025-03-30', // 30 Mart - 1 Nisan
    kurbanStart: '2025-06-06'   // 6-9 Haziran
  },
  2026: {
    ramazanStart: '2026-03-20', // 20-22 Mart
    kurbanStart: '2026-05-27'   // 27-30 Mayıs
  },
  2027: {
    ramazanStart: '2027-03-09', // 9-11 Mart
    kurbanStart: '2027-05-16'   // 16-19 Mayıs
  },
  2028: {
    ramazanStart: '2028-02-26', // 26-28 Şubat
    kurbanStart: '2028-05-04'   // 4-7 Mayıs
  },
  2029: {
    ramazanStart: '2029-02-14', // 14-16 Şubat
    kurbanStart: '2029-04-23'   // 23-26 Nisan
  },
  2030: {
    ramazanStart: '2030-02-03', // 3-5 Şubat
    kurbanStart: '2030-04-12'   // 12-15 Nisan
  }
}

/**
 * Resmi tatil günleri (sabit tarihli)
 */
const FIXED_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: 'Yılbaşı' },
  { month: 4, day: 23, name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı' },
  { month: 5, day: 1, name: '1 Mayıs Emek ve Dayanışma Günü' },
  { month: 5, day: 19, name: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
  { month: 7, day: 15, name: '15 Temmuz Demokrasi ve Milli Birlik Günü' },
  { month: 8, day: 30, name: '30 Ağustos Zafer Bayramı' },
  { month: 10, day: 29, name: '29 Ekim Cumhuriyet Bayramı' }
]

/**
 * 29 Ekim yarım gün tatil (28 Ekim öğleden sonra)
 */
const HALF_DAY_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 10, day: 28, name: '28 Ekim (Yarım Gün - Cumhuriyet Bayramı Arifesi)' }
]

/**
 * Tarih formatlama yardımcısı
 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Tarihe gün ekleme
 */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/**
 * Belirli bir yıl için resmi bayramları getir
 */
export function getFixedHolidays(year: number): HolidayInfo[] {
  return FIXED_HOLIDAYS.map(h => ({
    date: formatDate(year, h.month, h.day),
    name: h.name,
    type: 'resmi_bayram' as HolidayType,
    abbreviation: 'RB',
    color: '#cce5ff'
  }))
}

/**
 * Belirli bir yıl için dini bayramları getir
 * Ramazan: 3 gün + 1 arefe
 * Kurban: 4 gün + 1 arefe
 */
export function getIslamicHolidays(year: number): HolidayInfo[] {
  const holidays: HolidayInfo[] = []
  const islamicDates = ISLAMIC_HOLIDAYS[year]
  
  if (!islamicDates) {
    console.warn(`${year} yılı için dini bayram tarihleri tanımlanmamış`)
    return holidays
  }
  
  // Ramazan Bayramı Arifesi (1 gün önce)
  holidays.push({
    date: addDays(islamicDates.ramazanStart, -1),
    name: 'Ramazan Bayramı Arifesi',
    type: 'arefe',
    abbreviation: 'AG',
    color: '#e2e3e5'
  })
  
  // Ramazan Bayramı (3 gün)
  for (let i = 0; i < 3; i++) {
    holidays.push({
      date: addDays(islamicDates.ramazanStart, i),
      name: `Ramazan Bayramı ${i + 1}. Gün`,
      type: 'dini_bayram',
      abbreviation: 'DB',
      color: '#d1ecf1'
    })
  }
  
  // Kurban Bayramı Arifesi (1 gün önce)
  holidays.push({
    date: addDays(islamicDates.kurbanStart, -1),
    name: 'Kurban Bayramı Arifesi',
    type: 'arefe',
    abbreviation: 'AG',
    color: '#e2e3e5'
  })
  
  // Kurban Bayramı (4 gün)
  for (let i = 0; i < 4; i++) {
    holidays.push({
      date: addDays(islamicDates.kurbanStart, i),
      name: `Kurban Bayramı ${i + 1}. Gün`,
      type: 'dini_bayram',
      abbreviation: 'DB',
      color: '#d1ecf1'
    })
  }
  
  return holidays
}

/**
 * Belirli bir ay için hafta tatillerini getir (Pazar günleri)
 */
export function getWeekendHolidays(year: number, month: number): HolidayInfo[] {
  const holidays: HolidayInfo[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    if (date.getDay() === 0) { // Pazar
      holidays.push({
        date: formatDate(year, month, day),
        name: 'Hafta Tatili (Pazar)',
        type: 'hafta_tatili',
        abbreviation: 'HT',
        color: '#fff3cd'
      })
    }
  }
  
  return holidays
}

/**
 * Belirli bir yıl için tüm tatilleri getir
 */
export function getAllHolidaysForYear(year: number): HolidayInfo[] {
  const holidays: HolidayInfo[] = []
  
  // Resmi bayramlar
  holidays.push(...getFixedHolidays(year))
  
  // Dini bayramlar
  holidays.push(...getIslamicHolidays(year))
  
  // Hafta tatilleri (tüm yıl için)
  for (let month = 1; month <= 12; month++) {
    holidays.push(...getWeekendHolidays(year, month))
  }
  
  return holidays
}

/**
 * Belirli bir ay için tüm tatilleri getir
 */
export function getHolidaysForMonth(year: number, month: number): HolidayInfo[] {
  const holidays: HolidayInfo[] = []
  const monthStart = formatDate(year, month, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthEnd = formatDate(year, month, daysInMonth)
  
  // Resmi bayramlar (sadece bu ay içindekiler)
  const fixedHolidays = getFixedHolidays(year).filter(h => {
    return h.date >= monthStart && h.date <= monthEnd
  })
  holidays.push(...fixedHolidays)
  
  // Dini bayramlar (sadece bu ay içindekiler)
  const islamicHolidays = getIslamicHolidays(year).filter(h => {
    return h.date >= monthStart && h.date <= monthEnd
  })
  holidays.push(...islamicHolidays)
  
  // Hafta tatilleri
  holidays.push(...getWeekendHolidays(year, month))
  
  return holidays
}

/**
 * Belirli bir tarihin tatil türünü getir
 */
export function getHolidayTypeForDate(year: number, month: number, day: number): HolidayInfo | null {
  const dateStr = formatDate(year, month, day)
  
  // Önce resmi bayramları kontrol et
  const fixedHoliday = getFixedHolidays(year).find(h => h.date === dateStr)
  if (fixedHoliday) return fixedHoliday
  
  // Dini bayramları kontrol et
  const islamicHoliday = getIslamicHolidays(year).find(h => h.date === dateStr)
  if (islamicHoliday) return islamicHoliday
  
  // Hafta tatili mi? (Pazar)
  const date = new Date(year, month - 1, day)
  if (date.getDay() === 0) {
    return {
      date: dateStr,
      name: 'Hafta Tatili (Pazar)',
      type: 'hafta_tatili',
      abbreviation: 'HT',
      color: '#fff3cd'
    }
  }
  
  // Normal gün
  return null
}

/**
 * Bir ay için gün türü haritası oluştur
 * key: gün numarası, value: HolidayInfo | null
 */
export function getDayTypeMapForMonth(year: number, month: number): Record<number, HolidayInfo | null> {
  const dayMap: Record<number, HolidayInfo | null> = {}
  const daysInMonth = new Date(year, month, 0).getDate()
  
  for (let day = 1; day <= daysInMonth; day++) {
    dayMap[day] = getHolidayTypeForDate(year, month, day)
  }
  
  return dayMap
}

/**
 * Gün türü adından kısaltma ve renk al
 */
export function getDayTypeInfo(typeName: string): { abbreviation: string; color: string } {
  const typeMap: Record<string, { abbreviation: string; color: string }> = {
    'Normal Gün': { abbreviation: 'NG', color: '#d4edda' },
    'Hafta Tatili': { abbreviation: 'HT', color: '#fff3cd' },
    'Resmi Bayram': { abbreviation: 'RB', color: '#cce5ff' },
    'Dini Bayram': { abbreviation: 'DB', color: '#d1ecf1' },
    'Arefe Günü': { abbreviation: 'AG', color: '#e2e3e5' }
  }
  
  return typeMap[typeName] || { abbreviation: 'NG', color: '#d4edda' }
}

/**
 * İş günü sayısını hesapla (tatiller hariç)
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  let workingDays = 0
  
  for (let day = 1; day <= daysInMonth; day++) {
    const holidayInfo = getHolidayTypeForDate(year, month, day)
    if (!holidayInfo) {
      workingDays++
    }
  }
  
  return workingDays
}

/**
 * Belirli bir tarih aralığındaki tatilleri getir
 */
export function getHolidaysInRange(startDate: Date, endDate: Date): HolidayInfo[] {
  const holidays: HolidayInfo[] = []
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getAllHolidaysForYear(year)
    
    holidays.push(...yearHolidays.filter(h => {
      const hDate = new Date(h.date)
      return hDate >= startDate && hDate <= endDate
    }))
  }
  
  return holidays
}
