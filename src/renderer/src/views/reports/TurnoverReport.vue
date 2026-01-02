<template>
  <div class="turnover-report-page">
    <PageHeader 
      title="Turnover (Personel Devir Hızı) Raporu" 
      description="Personel giriş-çıkış analizi ve devir oranları"
    />

    <div class="stats-grid">
      <StatCard icon="📊" :value="data.summary?.turnoverRate + '%'" label="Turnover Oranı" color="primary" />
      <StatCard icon="➕" :value="data.summary?.hired || 0" label="İşe Alınan" color="success" />
      <StatCard icon="➖" :value="data.summary?.terminated || 0" label="Ayrılan" color="danger" />
      <StatCard icon="👥" :value="data.summary?.endCount || 0" label="Mevcut Personel" color="info" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <select v-model="selectedYear" @change="loadData" class="filter-select">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </template>
    </ActionToolbar>

    <div class="report-content" v-if="!loading">
      <!-- Özet Kartları -->
      <div class="chart-card full-width">
        <h3>📈 Yıl Özeti</h3>
        <div class="summary-flow">
          <div class="flow-item start">
            <span class="flow-label">Yıl Başı</span>
            <span class="flow-value">{{ data.summary?.startCount || 0 }}</span>
          </div>
          <div class="flow-arrow">
            <span class="arrow-up">+{{ data.summary?.hired || 0 }}</span>
            <span class="arrow-line">→</span>
            <span class="arrow-down">-{{ data.summary?.terminated || 0 }}</span>
          </div>
          <div class="flow-item end">
            <span class="flow-label">Yıl Sonu</span>
            <span class="flow-value">{{ data.summary?.endCount || 0 }}</span>
          </div>
          <div class="flow-rate">
            <span class="rate-label">Devir Oranı</span>
            <span class="rate-value" :class="getTurnoverClass(data.summary?.turnoverRate)">
              {{ data.summary?.turnoverRate || 0 }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Aylık Ayrılmalar -->
      <div class="chart-card">
        <h3>📅 Aylık Ayrılmalar</h3>
        <div class="monthly-chart">
          <div v-for="item in data.monthlyTerminations" :key="item.month" class="month-bar-wrapper">
            <div class="month-bar" :style="{ height: getMonthBarHeight(item.count) + '%' }">
              <span class="month-value" v-if="item.count > 0">{{ item.count }}</span>
            </div>
            <span class="month-label">{{ getMonthName(item.month) }}</span>
          </div>
        </div>
      </div>

      <!-- Ayrılma Nedenleri -->
      <div class="chart-card">
        <h3>📋 Ayrılma Nedenleri</h3>
        <div class="reason-list">
          <div v-for="(item, index) in data.byReason" :key="item.reason" class="reason-item">
            <div class="reason-info">
              <span class="reason-icon">{{ getReasonIcon(item.reason) }}</span>
              <span class="reason-name">{{ item.reason }}</span>
            </div>
            <div class="reason-stats">
              <span class="reason-count">{{ item.count }}</span>
              <div class="reason-bar-wrapper">
                <div class="reason-bar" :style="{ width: getReasonBarWidth(item.count) + '%', background: reasonColors[index % reasonColors.length] }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Departman Bazlı Ayrılmalar -->
      <div class="chart-card full-width">
        <h3>🏢 Departman Bazlı Ayrılmalar</h3>
        <div class="dept-grid">
          <div v-for="dept in data.byDepartment" :key="dept.departmentId" class="dept-card">
            <div class="dept-header">
              <span class="dept-name">{{ dept.departmentName }}</span>
              <span class="dept-count">{{ dept.count }}</span>
            </div>
            <div class="dept-bar-wrapper">
              <div class="dept-bar" :style="{ width: getDeptBarWidth(dept.count) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Turnover Analizi -->
      <div class="chart-card full-width">
        <h3>💡 Turnover Analizi</h3>
        <div class="analysis-cards">
          <div class="analysis-item" :class="getTurnoverClass(data.summary?.turnoverRate)">
            <span class="analysis-icon">{{ getTurnoverIcon(data.summary?.turnoverRate) }}</span>
            <div class="analysis-content">
              <span class="analysis-title">{{ getTurnoverTitle(data.summary?.turnoverRate) }}</span>
              <span class="analysis-desc">{{ getTurnoverDesc(data.summary?.turnoverRate) }}</span>
            </div>
          </div>
          <div class="analysis-item info">
            <span class="analysis-icon">📊</span>
            <div class="analysis-content">
              <span class="analysis-title">Sektör Ortalaması</span>
              <span class="analysis-desc">Türkiye'de ortalama yıllık turnover oranı %15-20 arasındadır.</span>
            </div>
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
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const reasonColors = ['#dc3545', '#ffc107', '#0466c8', '#6c757d']

const data = reactive({
  summary: null as any,
  monthlyTerminations: [] as any[],
  byReason: [] as any[],
  byDepartment: [] as any[]
})

const maxMonthlyCount = computed(() => Math.max(...data.monthlyTerminations.map(m => m.count), 1))
const maxReasonCount = computed(() => Math.max(...data.byReason.map(r => r.count), 1))
const maxDeptCount = computed(() => Math.max(...data.byDepartment.map(d => d.count), 1))

const loadData = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.report.getTurnover(selectedYear.value)
    if (result.success && result.data) {
      data.summary = result.data.summary
      data.monthlyTerminations = result.data.monthlyTerminations || []
      data.byReason = result.data.byReason || []
      data.byDepartment = result.data.byDepartment || []
    }
  } catch (err) {
    error('Veriler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const getMonthName = (month: number) => months[month - 1] || ''
const getMonthBarHeight = (count: number) => Math.max((count / maxMonthlyCount.value) * 100, 5)
const getReasonBarWidth = (count: number) => Math.round((count / maxReasonCount.value) * 100)
const getDeptBarWidth = (count: number) => Math.round((count / maxDeptCount.value) * 100)

const getReasonIcon = (reason: string) => {
  const icons: Record<string, string> = {
    'İstifa': '📝', 'Emeklilik': '🏖️', 'Çıkarılma': '🚪', 'Sözleşme Bitimi': '📄'
  }
  return icons[reason] || '📋'
}

const getTurnoverClass = (rate: number) => {
  if (!rate) return 'info'
  if (rate < 10) return 'success'
  if (rate < 20) return 'warning'
  return 'danger'
}

const getTurnoverIcon = (rate: number) => {
  if (!rate) return '📊'
  if (rate < 10) return '✅'
  if (rate < 20) return '⚠️'
  return '🚨'
}

const getTurnoverTitle = (rate: number) => {
  if (!rate) return 'Veri Yok'
  if (rate < 10) return 'Düşük Turnover'
  if (rate < 20) return 'Normal Turnover'
  return 'Yüksek Turnover'
}

const getTurnoverDesc = (rate: number) => {
  if (!rate) return 'Yeterli veri bulunmuyor.'
  if (rate < 10) return 'Personel bağlılığı yüksek, çalışan memnuniyeti iyi durumda.'
  if (rate < 20) return 'Sektör ortalamasında, iyileştirme alanları değerlendirilebilir.'
  return 'Dikkat! Yüksek personel devir hızı maliyetleri artırabilir.'
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

onMounted(() => loadData())
</script>

<style scoped>
.turnover-report-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; min-width: 100px; }

.report-content { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
@media (max-width: 1024px) { .report-content { grid-template-columns: 1fr; } }

.chart-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.chart-card.full-width { grid-column: 1 / -1; }
.chart-card h3 { margin: 0 0 1rem; font-size: 1rem; color: #2c3e50; }

.summary-flow { display: flex; align-items: center; justify-content: center; gap: 2rem; padding: 1rem; }
.flow-item { text-align: center; padding: 1rem 2rem; background: #f8f9fa; border-radius: 8px; }
.flow-item.start { border-left: 4px solid #6c757d; }
.flow-item.end { border-left: 4px solid #0466c8; }
.flow-label { display: block; font-size: 0.8rem; color: #6c757d; margin-bottom: 0.25rem; }
.flow-value { font-size: 2rem; font-weight: 700; color: #2c3e50; }
.flow-arrow { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
.arrow-up { color: #198754; font-weight: 600; }
.arrow-down { color: #dc3545; font-weight: 600; }
.arrow-line { font-size: 1.5rem; color: #adb5bd; }
.flow-rate { text-align: center; padding: 1rem 2rem; background: linear-gradient(135deg, #a9dbb8, #8fcca0); border-radius: 8px; }
.rate-label { display: block; font-size: 0.8rem; color: #2c3e50; margin-bottom: 0.25rem; }
.rate-value { font-size: 2rem; font-weight: 700; }
.rate-value.success { color: #198754; }
.rate-value.warning { color: #ffc107; }
.rate-value.danger { color: #dc3545; }

.monthly-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 180px; padding: 1rem 0; }
.month-bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.month-bar { width: 70%; max-width: 30px; background: linear-gradient(180deg, #dc3545, #c82333); border-radius: 4px 4px 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 0.25rem; transition: height 0.5s ease; }
.month-value { font-size: 0.7rem; font-weight: 600; color: white; }
.month-label { margin-top: 0.5rem; font-size: 0.7rem; color: #6c757d; }

.reason-list { display: flex; flex-direction: column; gap: 1rem; }
.reason-item { display: flex; align-items: center; gap: 1rem; }
.reason-info { display: flex; align-items: center; gap: 0.5rem; min-width: 140px; }
.reason-icon { font-size: 1.25rem; }
.reason-name { font-size: 0.9rem; color: #495057; }
.reason-stats { flex: 1; display: flex; align-items: center; gap: 0.75rem; }
.reason-count { font-weight: 700; color: #2c3e50; min-width: 30px; }
.reason-bar-wrapper { flex: 1; height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden; }
.reason-bar { height: 100%; border-radius: 6px; transition: width 0.5s ease; }

.dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.dept-card { padding: 1rem; background: #f8f9fa; border-radius: 8px; }
.dept-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.dept-name { font-size: 0.85rem; color: #495057; }
.dept-count { font-weight: 700; color: #dc3545; }
.dept-bar-wrapper { height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden; }
.dept-bar { height: 100%; background: #dc3545; border-radius: 3px; transition: width 0.5s ease; }

.analysis-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
@media (max-width: 768px) { .analysis-cards { grid-template-columns: 1fr; } }
.analysis-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1.25rem; border-radius: 8px; }
.analysis-item.success { background: #d4edda; }
.analysis-item.warning { background: #fff3cd; }
.analysis-item.danger { background: #f8d7da; }
.analysis-item.info { background: #cce5ff; }
.analysis-icon { font-size: 2rem; }
.analysis-content { flex: 1; }
.analysis-title { display: block; font-weight: 700; color: #2c3e50; margin-bottom: 0.25rem; }
.analysis-desc { font-size: 0.85rem; color: #495057; }

.loading-state { text-align: center; padding: 3rem; grid-column: 1 / -1; }
.loading-spinner { font-size: 2rem; display: block; margin-bottom: 1rem; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
