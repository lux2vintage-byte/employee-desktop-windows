<template>
  <div class="personnel-cost-page">
    <PageHeader 
      title="Personel Maliyet Raporu" 
      description="Aylık ve yıllık personel maliyet analizleri"
    />

    <div class="stats-grid">
      <StatCard icon="💰" :value="formatCurrency(summary.totalNetSalary)" label="Toplam Maliyet" color="primary" />
      <StatCard icon="👥" :value="summary.employeeCount" label="Personel Sayısı" color="info" />
      <StatCard icon="📊" :value="formatCurrency(summary.averageSalary)" label="Ortalama Maaş" color="success" />
      <StatCard icon="📈" :value="formatCurrency(summary.totalAdditions)" label="Toplam Ek Ödeme" color="warning" />
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
      <!-- Yıllık Görünüm -->
      <div v-if="!selectedMonth" class="yearly-view">
        <div class="chart-card full-width">
          <h3>📈 Aylık Maliyet Trendi</h3>
          <div class="trend-chart">
            <div class="trend-bars">
              <div v-for="item in yearlyData.monthlyTotals" :key="item.month" class="trend-bar-wrapper">
                <div class="trend-bar" :style="{ height: getTrendHeight(item.total) + '%' }">
                  <span class="trend-value">{{ formatShortCurrency(item.total) }}</span>
                </div>
                <span class="trend-label">{{ getMonthName(item.month) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <h3>🏢 Departman Bazlı Maliyet</h3>
          <div class="dept-cost-list">
            <div v-for="dept in yearlyData.byDepartment" :key="dept.departmentId" class="dept-cost-item">
              <div class="dept-info">
                <span class="dept-name">{{ dept.departmentName }}</span>
                <span class="dept-total">{{ formatCurrency(dept.total) }}</span>
              </div>
              <div class="dept-bar-wrapper">
                <div class="dept-bar" :style="{ width: getDeptBarWidth(dept.total) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <h3>📊 Yıllık Özet</h3>
          <div class="summary-cards">
            <div class="summary-item">
              <span class="summary-label">Toplam Yıllık Maliyet</span>
              <span class="summary-value primary">{{ formatCurrency(yearlyData.totalCost) }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Aylık Ortalama</span>
              <span class="summary-value">{{ formatCurrency(yearlyData.averageMonthly) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Aylık Görünüm -->
      <div v-else class="monthly-view">
        <div class="chart-card">
          <h3>🏢 Departman Bazlı Dağılım</h3>
          <div class="dept-cost-list">
            <div v-for="dept in monthlyData.byDepartment" :key="dept.name" class="dept-cost-item">
              <div class="dept-info">
                <span class="dept-name">{{ dept.name }}</span>
                <div class="dept-details">
                  <span>{{ dept.count }} kişi</span>
                  <span>Ort: {{ formatCurrency(dept.average) }}</span>
                </div>
              </div>
              <span class="dept-total">{{ formatCurrency(dept.total) }}</span>
            </div>
          </div>
        </div>

        <div class="chart-card full-width">
          <h3>📋 Personel Detayları</h3>
          <DataTable :columns="columns" :data="monthlyData.details" :loading="false"
            :show-pagination="true" :current-page="1" :total-pages="1" :total="monthlyData.details?.length || 0"
            empty-text="Bordro verisi bulunmuyor">
            <template #cell-netSalary="{ value }">
              <span class="salary-value">{{ formatCurrency(value) }}</span>
            </template>
            <template #cell-baseSalary="{ value }">{{ formatCurrency(value) }}</template>
            <template #cell-additions="{ value }">
              <span class="addition-value">+{{ formatCurrency(value) }}</span>
            </template>
            <template #cell-deductions="{ value }">
              <span class="deduction-value">-{{ formatCurrency(value) }}</span>
            </template>
          </DataTable>
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
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
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

const summary = reactive({ totalNetSalary: 0, employeeCount: 0, averageSalary: 0, totalAdditions: 0 })
const yearlyData = reactive({ totalCost: 0, averageMonthly: 0, monthlyTotals: [] as any[], byDepartment: [] as any[] })
const monthlyData = reactive({ byDepartment: [] as any[], details: [] as any[] })

const columns: TableColumn[] = [
  { key: 'employeeCode', label: 'Sicil No', width: '100px' },
  { key: 'employeeName', label: 'Personel', sortable: true },
  { key: 'department', label: 'Departman' },
  { key: 'baseSalary', label: 'Brüt Maaş', width: '120px' },
  { key: 'additions', label: 'Ek Ödeme', width: '100px' },
  { key: 'deductions', label: 'Kesinti', width: '100px' },
  { key: 'netSalary', label: 'Net Maaş', width: '120px' }
]

const maxMonthlyTotal = computed(() => Math.max(...yearlyData.monthlyTotals.map(m => m.total), 1))
const maxDeptTotal = computed(() => Math.max(...yearlyData.byDepartment.map(d => d.total), 1))

const loadData = async () => {
  loading.value = true
  try {
    if (selectedMonth.value) {
      const result = await window.electronAPI.report.getMonthlyCost(selectedYear.value, selectedMonth.value)
      if (result.success && result.data) {
        Object.assign(summary, result.data.summary)
        monthlyData.byDepartment = result.data.byDepartment || []
        monthlyData.details = result.data.details || []
      }
    } else {
      const result = await window.electronAPI.report.getYearlyCost(selectedYear.value)
      if (result.success && result.data) {
        yearlyData.totalCost = result.data.totalCost
        yearlyData.averageMonthly = result.data.averageMonthly
        yearlyData.monthlyTotals = result.data.monthlyTotals || []
        yearlyData.byDepartment = result.data.byDepartment || []
        summary.totalNetSalary = result.data.totalCost
        summary.averageSalary = result.data.averageMonthly
        summary.employeeCount = yearlyData.byDepartment.reduce((sum, d) => sum + (d.count || 0), 0)
      }
    }
  } catch (err) {
    error('Veriler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const getTrendHeight = (value: number) => Math.max((value / maxMonthlyTotal.value) * 100, 5)
const getDeptBarWidth = (value: number) => Math.round((value / maxDeptTotal.value) * 100)
const getMonthName = (month: number) => months.find(m => m.value === month)?.label.substring(0, 3) || ''

const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount || 0)
const formatShortCurrency = (amount: number) => {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M'
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K'
  return amount.toString()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

onMounted(() => loadData())
</script>

<style scoped>
.personnel-cost-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }

.filter-group { display: flex; gap: 0.75rem; }
.filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; min-width: 120px; }

.report-content { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
@media (max-width: 1024px) { .report-content { grid-template-columns: 1fr; } }

.chart-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.chart-card.full-width { grid-column: 1 / -1; }
.chart-card h3 { margin: 0 0 1rem; font-size: 1rem; color: #2c3e50; }

.trend-chart { padding: 1rem 0; }
.trend-bars { display: flex; align-items: flex-end; justify-content: space-between; height: 200px; gap: 0.5rem; }
.trend-bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.trend-bar { width: 100%; max-width: 50px; background: linear-gradient(180deg, #a9dbb8, #8fcca0); border-radius: 4px 4px 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 0.5rem; transition: height 0.5s ease; }
.trend-value { font-size: 0.7rem; font-weight: 600; color: #2c3e50; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
.trend-label { margin-top: 0.5rem; font-size: 0.75rem; color: #6c757d; }

.dept-cost-list { display: flex; flex-direction: column; gap: 1rem; }
.dept-cost-item { }
.dept-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.dept-name { font-weight: 600; color: #2c3e50; }
.dept-details { display: flex; gap: 1rem; font-size: 0.8rem; color: #6c757d; }
.dept-total { font-weight: 700; color: #0466c8; }
.dept-bar-wrapper { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
.dept-bar { height: 100%; background: linear-gradient(90deg, #0466c8, #0353a4); border-radius: 4px; transition: width 0.5s ease; }

.summary-cards { display: flex; flex-direction: column; gap: 1rem; }
.summary-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
.summary-label { color: #6c757d; }
.summary-value { font-size: 1.25rem; font-weight: 700; color: #2c3e50; }
.summary-value.primary { color: #0466c8; }

.salary-value { font-weight: 700; color: #0466c8; }
.addition-value { color: #198754; }
.deduction-value { color: #dc3545; }

.loading-state { text-align: center; padding: 3rem; grid-column: 1 / -1; }
.loading-spinner { font-size: 2rem; display: block; margin-bottom: 1rem; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.yearly-view, .monthly-view { display: contents; }
</style>
