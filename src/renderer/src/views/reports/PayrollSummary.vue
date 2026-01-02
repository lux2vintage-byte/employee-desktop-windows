<template>
  <div class="payroll-summary-page">
    <PageHeader 
      title="Bordro Özet Raporu" 
      description="Aylık ve yıllık bordro özet analizleri"
    />

    <div class="stats-grid">
      <StatCard icon="👥" :value="data.summary?.employeeCount || 0" label="Personel Sayısı" color="primary" />
      <StatCard icon="💰" :value="formatCurrency(data.summary?.totalNetSalary)" label="Toplam Net" color="success" />
      <StatCard icon="➕" :value="formatCurrency(data.summary?.totalAdditions)" label="Toplam Ek Ödeme" color="info" />
      <StatCard icon="➖" :value="formatCurrency(data.summary?.totalDeductions)" label="Toplam Kesinti" color="warning" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <div class="filter-group">
          <select v-model="selectedYear" @change="loadData" class="filter-select">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <select v-model="selectedMonth" @change="loadData" class="filter-select">
            <option :value="null">Tüm Yıl</option>
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <div class="report-content" v-if="!loading">
      <!-- Genel Özet -->
      <div class="chart-card full-width">
        <h3>📊 Bordro Özeti</h3>
        <div class="overview-grid">
          <div class="overview-item">
            <span class="overview-label">Brüt Maaş Toplamı</span>
            <span class="overview-value">{{ formatCurrency(data.summary?.totalBaseSalary) }}</span>
          </div>
          <div class="overview-item addition">
            <span class="overview-label">Ek Ödemeler</span>
            <span class="overview-value">+{{ formatCurrency(data.summary?.totalAdditions) }}</span>
          </div>
          <div class="overview-item deduction">
            <span class="overview-label">Kesintiler</span>
            <span class="overview-value">-{{ formatCurrency(data.summary?.totalDeductions) }}</span>
          </div>
          <div class="overview-item total">
            <span class="overview-label">Net Maaş Toplamı</span>
            <span class="overview-value">{{ formatCurrency(data.summary?.totalNetSalary) }}</span>
          </div>
          <div class="overview-item average">
            <span class="overview-label">Ortalama Net Maaş</span>
            <span class="overview-value">{{ formatCurrency(data.summary?.averageSalary) }}</span>
          </div>
        </div>
      </div>

      <!-- Kalem Kategorileri -->
      <div class="chart-card">
        <h3>📑 Ek Ödemeler</h3>
        <div class="category-list">
          <div v-for="item in incomeCategories" :key="item.category" class="category-item">
            <div class="category-info">
              <span class="category-icon">{{ getCategoryIcon(item.category) }}</span>
              <span class="category-name">{{ getCategoryName(item.category) }}</span>
            </div>
            <span class="category-value addition">+{{ formatCurrency(item.total) }}</span>
          </div>
          <div v-if="incomeCategories.length === 0" class="empty-category">
            Ek ödeme kaydı bulunmuyor
          </div>
        </div>
      </div>

      <div class="chart-card">
        <h3>📑 Kesintiler</h3>
        <div class="category-list">
          <div v-for="item in deductionCategories" :key="item.category" class="category-item">
            <div class="category-info">
              <span class="category-icon">{{ getCategoryIcon(item.category) }}</span>
              <span class="category-name">{{ getCategoryName(item.category) }}</span>
            </div>
            <span class="category-value deduction">-{{ formatCurrency(item.total) }}</span>
          </div>
          <div v-if="deductionCategories.length === 0" class="empty-category">
            Kesinti kaydı bulunmuyor
          </div>
        </div>
      </div>

      <!-- Departman Bazlı -->
      <div class="chart-card full-width">
        <h3>🏢 Departman Bazlı Bordro Özeti</h3>
        <div class="dept-table">
          <div class="dept-table-header">
            <span class="col-dept">Departman</span>
            <span class="col-count">Personel</span>
            <span class="col-amount">Brüt</span>
            <span class="col-amount">Ek Ödeme</span>
            <span class="col-amount">Kesinti</span>
            <span class="col-amount">Net</span>
          </div>
          <div v-for="dept in data.byDepartment" :key="dept.departmentId" class="dept-table-row">
            <span class="col-dept">{{ dept.departmentName }}</span>
            <span class="col-count">{{ dept.count }}</span>
            <span class="col-amount">{{ formatCurrency(dept.baseSalary) }}</span>
            <span class="col-amount addition">+{{ formatCurrency(dept.additions) }}</span>
            <span class="col-amount deduction">-{{ formatCurrency(dept.deductions) }}</span>
            <span class="col-amount total">{{ formatCurrency(dept.netSalary) }}</span>
          </div>
          <div class="dept-table-footer">
            <span class="col-dept">TOPLAM</span>
            <span class="col-count">{{ data.summary?.employeeCount || 0 }}</span>
            <span class="col-amount">{{ formatCurrency(data.summary?.totalBaseSalary) }}</span>
            <span class="col-amount addition">+{{ formatCurrency(data.summary?.totalAdditions) }}</span>
            <span class="col-amount deduction">-{{ formatCurrency(data.summary?.totalDeductions) }}</span>
            <span class="col-amount total">{{ formatCurrency(data.summary?.totalNetSalary) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <span class="loading-spinner">⏳</span>
      <p>Veriler yükleniyor...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import { useToast } from '@/composables/useToast'

const { success, error } = useToast()
const loading = ref(false)

const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const selectedMonth = ref<number | null>(null)

const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
const months = [
  { value: 1, label: 'Ocak' }, { value: 2, label: 'Şubat' }, { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' }, { value: 5, label: 'Mayıs' }, { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' }, { value: 8, label: 'Ağustos' }, { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' }, { value: 11, label: 'Kasım' }, { value: 12, label: 'Aralık' }
]

const data = reactive({
  summary: null as any,
  byCategory: [] as any[],
  byDepartment: [] as any[]
})

const incomeCategories = computed(() => data.byCategory.filter(c => c.type === 'Income'))
const deductionCategories = computed(() => data.byCategory.filter(c => c.type === 'Deduction'))

const loadData = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.report.getPayrollSummary(selectedYear.value, selectedMonth.value || undefined)
    if (result.success && result.data) {
      data.summary = result.data.summary
      data.byCategory = result.data.byCategory || []
      data.byDepartment = result.data.byDepartment || []
    }
  } catch (err) {
    error('Veriler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount || 0)

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    'Overtime': '⏰', 'Bonus': '🎁', 'Transport': '🚌', 'Food': '🍽️',
    'Tax': '🏛️', 'Insurance': '🛡️', 'Advance': '💵', 'Absence': '📅', 'Other': '📋'
  }
  return icons[category] || '📋'
}

const getCategoryName = (category: string) => {
  const names: Record<string, string> = {
    'Overtime': 'Fazla Mesai', 'Bonus': 'Prim/İkramiye', 'Transport': 'Yol Yardımı', 'Food': 'Yemek Yardımı',
    'Tax': 'Vergi', 'Insurance': 'Sigorta', 'Advance': 'Avans Kesintisi', 'Absence': 'Devamsızlık', 'Other': 'Diğer'
  }
  return names[category] || category
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

onMounted(() => loadData())
</script>

<style scoped>
.payroll-summary-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }

.filter-group { display: flex; gap: 0.75rem; }
.filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; min-width: 120px; }

.report-content { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
@media (max-width: 1024px) { .report-content { grid-template-columns: 1fr; } }

.chart-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.chart-card.full-width { grid-column: 1 / -1; }
.chart-card h3 { margin: 0 0 1rem; font-size: 1rem; color: #2c3e50; }

.overview-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
@media (max-width: 1024px) { .overview-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .overview-grid { grid-template-columns: repeat(2, 1fr); } }
.overview-item { padding: 1.25rem; background: #f8f9fa; border-radius: 8px; text-align: center; }
.overview-item.addition { background: #d4edda; }
.overview-item.deduction { background: #f8d7da; }
.overview-item.total { background: linear-gradient(135deg, #a9dbb8, #8fcca0); }
.overview-item.average { background: #cce5ff; }
.overview-label { display: block; font-size: 0.8rem; color: #6c757d; margin-bottom: 0.5rem; }
.overview-item.addition .overview-label, .overview-item.deduction .overview-label, .overview-item.total .overview-label { color: #2c3e50; }
.overview-value { font-size: 1.25rem; font-weight: 700; color: #2c3e50; }

.category-list { display: flex; flex-direction: column; gap: 0.75rem; }
.category-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; }
.category-info { display: flex; align-items: center; gap: 0.5rem; }
.category-icon { font-size: 1.25rem; }
.category-name { font-weight: 500; color: #495057; }
.category-value { font-weight: 700; }
.category-value.addition { color: #198754; }
.category-value.deduction { color: #dc3545; }
.empty-category { text-align: center; padding: 1rem; color: #6c757d; font-style: italic; }

.dept-table { overflow-x: auto; }
.dept-table-header, .dept-table-row, .dept-table-footer { display: grid; grid-template-columns: 2fr 1fr 1.5fr 1.5fr 1.5fr 1.5fr; gap: 0.5rem; padding: 0.75rem 1rem; align-items: center; }
.dept-table-header { background: #f8f9fa; border-radius: 8px 8px 0 0; font-weight: 600; color: #495057; font-size: 0.85rem; }
.dept-table-row { border-bottom: 1px solid #e9ecef; }
.dept-table-row:hover { background: #f8f9fa; }
.dept-table-footer { background: linear-gradient(135deg, #a9dbb8, #8fcca0); border-radius: 0 0 8px 8px; font-weight: 700; }
.col-dept { text-align: left; }
.col-count { text-align: center; }
.col-amount { text-align: right; font-size: 0.9rem; }
.col-amount.addition { color: #198754; }
.col-amount.deduction { color: #dc3545; }
.col-amount.total { font-weight: 700; color: #0466c8; }

.loading-state { text-align: center; padding: 3rem; grid-column: 1 / -1; }
.loading-spinner { font-size: 2rem; display: block; margin-bottom: 1rem; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
