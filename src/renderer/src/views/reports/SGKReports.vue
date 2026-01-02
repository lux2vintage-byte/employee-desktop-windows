<template>
  <div class="sgk-reports-page">
    <PageHeader 
      title="SGK / İşkur Raporları" 
      description="Yasal bildirim raporları ve hazır formatlar"
    />

    <div class="stats-grid">
      <StatCard icon="🏛️" :value="sgkData.summary?.employeeCount || 0" label="Bildirilen Personel" color="primary" />
      <StatCard icon="💰" :value="formatCurrency(sgkData.summary?.totalSGKMatrah)" label="SGK Matrahı" color="info" />
      <StatCard icon="👤" :value="formatCurrency(sgkData.summary?.totalEmployeePremium)" label="İşçi Primi" color="success" />
      <StatCard icon="🏢" :value="formatCurrency(sgkData.summary?.totalEmployerPremium)" label="İşveren Primi" color="warning" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <div class="filter-group">
          <select v-model="selectedYear" @change="loadData" class="filter-select">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <select v-model="selectedMonth" @change="loadData" class="filter-select">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="tab-buttons">
          <button :class="['tab-btn', { active: activeTab === 'sgk' }]" @click="activeTab = 'sgk'">
            🏛️ SGK Raporu
          </button>
          <button :class="['tab-btn', { active: activeTab === 'iskur' }]" @click="activeTab = 'iskur'; loadIskurData()">
            📋 İşkur Raporu
          </button>
        </div>
      </template>
    </ActionToolbar>

    <div class="report-content" v-if="!loading">
      <!-- SGK Raporu -->
      <template v-if="activeTab === 'sgk'">
        <div class="chart-card full-width">
          <h3>🏛️ SGK Aylık Prim ve Hizmet Belgesi (APHB)</h3>
          <div class="report-info">
            <span>Dönem: {{ selectedMonth }}/{{ selectedYear }}</span>
            <span>Toplam Prim: {{ formatCurrency(sgkData.summary?.grandTotal) }}</span>
          </div>
          
          <div class="sgk-table">
            <div class="sgk-table-header">
              <span class="col-code">Sicil No</span>
              <span class="col-name">Ad Soyad</span>
              <span class="col-ssn">SGK No</span>
              <span class="col-days">Gün</span>
              <span class="col-amount">SGK Matrahı</span>
              <span class="col-amount">İşçi Primi</span>
              <span class="col-amount">İşveren Primi</span>
              <span class="col-amount">Toplam</span>
            </div>
            <div v-for="record in sgkData.records" :key="record.employeeCode" class="sgk-table-row">
              <span class="col-code">{{ record.employeeCode }}</span>
              <span class="col-name">{{ record.employeeName }}</span>
              <span class="col-ssn">{{ record.ssn || '-' }}</span>
              <span class="col-days">{{ record.workDays }}</span>
              <span class="col-amount">{{ formatCurrency(record.sgkMatrah) }}</span>
              <span class="col-amount">{{ formatCurrency(record.employeePremium) }}</span>
              <span class="col-amount">{{ formatCurrency(record.employerPremium) }}</span>
              <span class="col-amount total">{{ formatCurrency(record.totalPremium) }}</span>
            </div>
            <div class="sgk-table-footer">
              <span class="col-code"></span>
              <span class="col-name">TOPLAM</span>
              <span class="col-ssn"></span>
              <span class="col-days"></span>
              <span class="col-amount">{{ formatCurrency(sgkData.summary?.totalSGKMatrah) }}</span>
              <span class="col-amount">{{ formatCurrency(sgkData.summary?.totalEmployeePremium) }}</span>
              <span class="col-amount">{{ formatCurrency(sgkData.summary?.totalEmployerPremium) }}</span>
              <span class="col-amount total">{{ formatCurrency(sgkData.summary?.grandTotal) }}</span>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <h3>📊 Prim Dağılımı</h3>
          <div class="premium-breakdown">
            <div class="premium-item">
              <div class="premium-header">
                <span class="premium-label">İşçi Primi</span>
                <span class="premium-rate">%14</span>
              </div>
              <div class="premium-bar-wrapper">
                <div class="premium-bar employee" :style="{ width: getEmployeeRatio + '%' }"></div>
              </div>
              <span class="premium-value">{{ formatCurrency(sgkData.summary?.totalEmployeePremium) }}</span>
            </div>
            <div class="premium-item">
              <div class="premium-header">
                <span class="premium-label">İşveren Primi</span>
                <span class="premium-rate">%20.5</span>
              </div>
              <div class="premium-bar-wrapper">
                <div class="premium-bar employer" :style="{ width: getEmployerRatio + '%' }"></div>
              </div>
              <span class="premium-value">{{ formatCurrency(sgkData.summary?.totalEmployerPremium) }}</span>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <h3>📋 Özet Bilgiler</h3>
          <div class="summary-list">
            <div class="summary-row">
              <span class="summary-label">Bildirilen Personel Sayısı</span>
              <span class="summary-value">{{ sgkData.summary?.employeeCount || 0 }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Toplam SGK Matrahı</span>
              <span class="summary-value">{{ formatCurrency(sgkData.summary?.totalSGKMatrah) }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Toplam İşçi Primi</span>
              <span class="summary-value">{{ formatCurrency(sgkData.summary?.totalEmployeePremium) }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Toplam İşveren Primi</span>
              <span class="summary-value">{{ formatCurrency(sgkData.summary?.totalEmployerPremium) }}</span>
            </div>
            <div class="summary-row total">
              <span class="summary-label">Toplam Ödenecek Prim</span>
              <span class="summary-value">{{ formatCurrency(sgkData.summary?.grandTotal) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- İşkur Raporu -->
      <template v-if="activeTab === 'iskur'">
        <div class="chart-card full-width">
          <h3>📋 İşkur Aylık Bildirim Raporu</h3>
          <div class="report-info">
            <span>Dönem: {{ selectedMonth }}/{{ selectedYear }}</span>
            <span>Net Değişim: {{ iskurData.summary?.netChange > 0 ? '+' : '' }}{{ iskurData.summary?.netChange || 0 }}</span>
          </div>

          <div class="iskur-summary">
            <div class="iskur-card hired">
              <span class="iskur-icon">➕</span>
              <span class="iskur-count">{{ iskurData.summary?.hiredCount || 0 }}</span>
              <span class="iskur-label">İşe Alınan</span>
            </div>
            <div class="iskur-card terminated">
              <span class="iskur-icon">➖</span>
              <span class="iskur-count">{{ iskurData.summary?.terminatedCount || 0 }}</span>
              <span class="iskur-label">Ayrılan</span>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <h3>➕ İşe Alınanlar</h3>
          <div class="person-list" v-if="iskurData.hired?.length > 0">
            <div v-for="person in iskurData.hired" :key="person.employeeCode" class="person-item">
              <div class="person-info">
                <span class="person-name">{{ person.employeeName }}</span>
                <span class="person-code">{{ person.employeeCode }}</span>
              </div>
              <div class="person-details">
                <span>{{ person.position }}</span>
                <span>{{ person.department }}</span>
                <span class="person-date">{{ formatDate(person.hireDate) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-list">Bu dönemde işe alım bulunmuyor</div>
        </div>

        <div class="chart-card">
          <h3>➖ Ayrılanlar</h3>
          <div class="person-list" v-if="iskurData.terminated?.length > 0">
            <div v-for="person in iskurData.terminated" :key="person.employeeCode" class="person-item">
              <div class="person-info">
                <span class="person-name">{{ person.employeeName }}</span>
                <span class="person-code">{{ person.employeeCode }}</span>
              </div>
              <div class="person-details">
                <span>{{ person.position }}</span>
                <span class="person-reason">{{ person.reason }}</span>
                <span class="person-date">{{ formatDate(person.terminationDate) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-list">Bu dönemde ayrılan personel bulunmuyor</div>
        </div>
      </template>
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
const activeTab = ref('sgk')

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth)

const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
const months = [
  { value: 1, label: 'Ocak' }, { value: 2, label: 'Şubat' }, { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' }, { value: 5, label: 'Mayıs' }, { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' }, { value: 8, label: 'Ağustos' }, { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' }, { value: 11, label: 'Kasım' }, { value: 12, label: 'Aralık' }
]

const sgkData = reactive({ summary: null as any, records: [] as any[] })
const iskurData = reactive({ summary: null as any, hired: [] as any[], terminated: [] as any[] })

const getEmployeeRatio = computed(() => {
  const total = (sgkData.summary?.totalEmployeePremium || 0) + (sgkData.summary?.totalEmployerPremium || 0)
  return total > 0 ? ((sgkData.summary?.totalEmployeePremium || 0) / total) * 100 : 0
})

const getEmployerRatio = computed(() => {
  const total = (sgkData.summary?.totalEmployeePremium || 0) + (sgkData.summary?.totalEmployerPremium || 0)
  return total > 0 ? ((sgkData.summary?.totalEmployerPremium || 0) / total) * 100 : 0
})

const loadData = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.report.getSGK(selectedYear.value, selectedMonth.value)
    if (result.success && result.data) {
      sgkData.summary = result.data.summary
      sgkData.records = result.data.records || []
    }
  } catch (err) {
    error('SGK verileri yüklenemedi')
  } finally {
    loading.value = false
  }
}

const loadIskurData = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.report.getIskur(selectedYear.value, selectedMonth.value)
    if (result.success && result.data) {
      iskurData.summary = result.data.summary
      iskurData.hired = result.data.hired || []
      iskurData.terminated = result.data.terminated || []
    }
  } catch (err) {
    error('İşkur verileri yüklenemedi')
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount || 0)
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('tr-TR') : '-'

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

onMounted(() => loadData())
</script>

<style scoped>
.sgk-reports-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }

.filter-group { display: flex; gap: 0.75rem; }
.filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; min-width: 100px; }

.tab-buttons { display: flex; gap: 0.5rem; margin-left: 1rem; }
.tab-btn { padding: 0.5rem 1rem; border: 1px solid #dee2e6; border-radius: 6px; background: white; color: #495057; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
.tab-btn.active { background: #0466c8; color: white; border-color: #0466c8; }
.tab-btn:hover:not(.active) { background: #f8f9fa; }

.report-content { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
@media (max-width: 1024px) { .report-content { grid-template-columns: 1fr; } }

.chart-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.chart-card.full-width { grid-column: 1 / -1; }
.chart-card h3 { margin: 0 0 1rem; font-size: 1rem; color: #2c3e50; }

.report-info { display: flex; justify-content: space-between; margin-bottom: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; font-size: 0.9rem; color: #495057; }

.sgk-table { overflow-x: auto; }
.sgk-table-header, .sgk-table-row, .sgk-table-footer { display: grid; grid-template-columns: 1fr 2fr 1.5fr 0.5fr 1.2fr 1.2fr 1.2fr 1.2fr; gap: 0.5rem; padding: 0.75rem; align-items: center; font-size: 0.85rem; }
.sgk-table-header { background: #f8f9fa; border-radius: 8px 8px 0 0; font-weight: 600; color: #495057; }
.sgk-table-row { border-bottom: 1px solid #e9ecef; }
.sgk-table-row:hover { background: #f8f9fa; }
.sgk-table-footer { background: linear-gradient(135deg, #a9dbb8, #8fcca0); border-radius: 0 0 8px 8px; font-weight: 700; }
.col-code { font-family: monospace; }
.col-name { }
.col-ssn { font-family: monospace; font-size: 0.8rem; }
.col-days { text-align: center; }
.col-amount { text-align: right; }
.col-amount.total { font-weight: 700; color: #0466c8; }

.premium-breakdown { display: flex; flex-direction: column; gap: 1.5rem; }
.premium-item { }
.premium-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
.premium-label { font-weight: 600; color: #495057; }
.premium-rate { font-size: 0.85rem; color: #6c757d; }
.premium-bar-wrapper { height: 24px; background: #e9ecef; border-radius: 12px; overflow: hidden; margin-bottom: 0.5rem; }
.premium-bar { height: 100%; border-radius: 12px; transition: width 0.5s ease; }
.premium-bar.employee { background: linear-gradient(90deg, #0466c8, #0353a4); }
.premium-bar.employer { background: linear-gradient(90deg, #a9dbb8, #8fcca0); }
.premium-value { font-size: 1.25rem; font-weight: 700; color: #2c3e50; }

.summary-list { display: flex; flex-direction: column; gap: 0.75rem; }
.summary-row { display: flex; justify-content: space-between; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; }
.summary-row.total { background: linear-gradient(135deg, #a9dbb8, #8fcca0); }
.summary-label { color: #495057; }
.summary-value { font-weight: 700; color: #2c3e50; }

.iskur-summary { display: flex; gap: 2rem; justify-content: center; margin: 1.5rem 0; }
.iskur-card { text-align: center; padding: 2rem 3rem; border-radius: 12px; }
.iskur-card.hired { background: #d4edda; }
.iskur-card.terminated { background: #f8d7da; }
.iskur-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
.iskur-count { font-size: 3rem; font-weight: 700; display: block; }
.iskur-card.hired .iskur-count { color: #198754; }
.iskur-card.terminated .iskur-count { color: #dc3545; }
.iskur-label { font-size: 0.9rem; color: #495057; }

.person-list { display: flex; flex-direction: column; gap: 0.75rem; }
.person-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; }
.person-info { display: flex; flex-direction: column; }
.person-name { font-weight: 600; color: #2c3e50; }
.person-code { font-size: 0.8rem; color: #6c757d; font-family: monospace; }
.person-details { display: flex; gap: 1rem; font-size: 0.85rem; color: #495057; }
.person-reason { color: #dc3545; }
.person-date { color: #0466c8; }
.empty-list { text-align: center; padding: 2rem; color: #6c757d; font-style: italic; }

.loading-state { text-align: center; padding: 3rem; grid-column: 1 / -1; }
.loading-spinner { font-size: 2rem; display: block; margin-bottom: 1rem; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
