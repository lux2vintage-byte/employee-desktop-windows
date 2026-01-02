<template>
  <div class="leave-usage-report-page">
    <PageHeader 
      title="İzin Kullanım Raporu" 
      description="Yıllık izin kullanım analizi ve bakiye durumu"
    />

    <div class="stats-grid">
      <StatCard icon="📋" :value="data.summary?.totalRequests || 0" label="Toplam Talep" color="primary" />
      <StatCard icon="📅" :value="data.summary?.totalDays || 0" label="Kullanılan Gün" color="info" />
      <StatCard icon="✅" :value="data.summary?.totalRemaining || 0" label="Kalan Gün" color="success" />
      <StatCard icon="📊" :value="(data.summary?.usageRate || 0) + '%'" label="Kullanım Oranı" color="warning" />
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
      <!-- İzin Türü Dağılımı -->
      <div class="chart-card">
        <h3>📑 İzin Türüne Göre Kullanım</h3>
        <div class="type-list">
          <div v-for="(item, index) in data.byType" :key="item.type" class="type-item">
            <div class="type-header">
              <span class="type-icon">{{ getTypeIcon(item.type) }}</span>
              <span class="type-name">{{ item.type }}</span>
            </div>
            <div class="type-stats">
              <div class="type-stat">
                <span class="stat-value">{{ item.count }}</span>
                <span class="stat-label">Talep</span>
              </div>
              <div class="type-stat">
                <span class="stat-value">{{ item.days }}</span>
                <span class="stat-label">Gün</span>
              </div>
            </div>
            <div class="type-bar-wrapper">
              <div class="type-bar" :style="{ width: getTypeBarWidth(item.days) + '%', background: typeColors[index % typeColors.length] }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Aylık Kullanım -->
      <div class="chart-card">
        <h3>📅 Aylık İzin Kullanımı</h3>
        <div class="monthly-chart">
          <div v-for="item in data.monthlyUsage" :key="item.month" class="month-bar-wrapper">
            <div class="month-bar" :style="{ height: getMonthBarHeight(item.days) + '%' }">
              <span class="month-value" v-if="item.days > 0">{{ item.days }}</span>
            </div>
            <span class="month-label">{{ getMonthName(item.month) }}</span>
          </div>
        </div>
      </div>

      <!-- Departman Bazlı Kullanım -->
      <div class="chart-card full-width">
        <h3>🏢 Departman Bazlı İzin Kullanımı</h3>
        <div class="dept-grid">
          <div v-for="dept in data.byDepartment" :key="dept.departmentId" class="dept-card">
            <div class="dept-header">
              <span class="dept-name">{{ dept.departmentName }}</span>
              <span class="dept-days">{{ dept.days }} gün</span>
            </div>
            <div class="dept-bar-wrapper">
              <div class="dept-bar" :style="{ width: getDeptBarWidth(dept.days) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Özet Bilgiler -->
      <div class="chart-card full-width">
        <h3>📊 Yıllık Özet</h3>
        <div class="summary-grid">
          <div class="summary-card">
            <span class="summary-icon">🎯</span>
            <div class="summary-content">
              <span class="summary-value">{{ data.summary?.totalEntitlement || 0 }}</span>
              <span class="summary-label">Toplam Hak Edilen</span>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-icon">✅</span>
            <div class="summary-content">
              <span class="summary-value">{{ data.summary?.totalUsed || 0 }}</span>
              <span class="summary-label">Kullanılan</span>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-icon">⏳</span>
            <div class="summary-content">
              <span class="summary-value">{{ data.summary?.totalRemaining || 0 }}</span>
              <span class="summary-label">Kalan</span>
            </div>
          </div>
          <div class="summary-card highlight">
            <span class="summary-icon">📈</span>
            <div class="summary-content">
              <span class="summary-value">%{{ data.summary?.usageRate || 0 }}</span>
              <span class="summary-label">Kullanım Oranı</span>
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
const typeColors = ['#0466c8', '#198754', '#ffc107', '#dc3545', '#6c757d', '#17a2b8']

const data = reactive({
  summary: null as any,
  byType: [] as any[],
  monthlyUsage: [] as any[],
  byDepartment: [] as any[]
})

const maxTypeDays = computed(() => Math.max(...data.byType.map(t => t.days), 1))
const maxMonthlyDays = computed(() => Math.max(...data.monthlyUsage.map(m => m.days), 1))
const maxDeptDays = computed(() => Math.max(...data.byDepartment.map(d => d.days), 1))

const loadData = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.report.getLeaveUsage(selectedYear.value)
    if (result.success && result.data) {
      data.summary = result.data.summary
      data.byType = result.data.byType || []
      data.monthlyUsage = result.data.monthlyUsage || []
      data.byDepartment = result.data.byDepartment || []
    }
  } catch (err) {
    error('Veriler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const getMonthName = (month: number) => months[month - 1] || ''
const getTypeBarWidth = (days: number) => Math.round((days / maxTypeDays.value) * 100)
const getMonthBarHeight = (days: number) => Math.max((days / maxMonthlyDays.value) * 100, 5)
const getDeptBarWidth = (days: number) => Math.round((days / maxDeptDays.value) * 100)

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    'Yıllık İzin': '🏖️', 'Hastalık İzni': '🏥', 'Mazeret İzni': '📋',
    'Evlilik İzni': '💒', 'Doğum İzni': '👶', 'Ölüm İzni': '🕯️',
    'Ücretsiz İzin': '📝'
  }
  return icons[type] || '📅'
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

onMounted(() => loadData())
</script>

<style scoped>
.leave-usage-report-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; min-width: 100px; }

.report-content { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
@media (max-width: 1024px) { .report-content { grid-template-columns: 1fr; } }

.chart-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.chart-card.full-width { grid-column: 1 / -1; }
.chart-card h3 { margin: 0 0 1rem; font-size: 1rem; color: #2c3e50; }

.type-list { display: flex; flex-direction: column; gap: 1rem; }
.type-item { padding: 1rem; background: #f8f9fa; border-radius: 8px; }
.type-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
.type-icon { font-size: 1.25rem; }
.type-name { font-weight: 600; color: #2c3e50; }
.type-stats { display: flex; gap: 1.5rem; margin-bottom: 0.75rem; }
.type-stat { display: flex; flex-direction: column; }
.stat-value { font-size: 1.25rem; font-weight: 700; color: #0466c8; }
.stat-label { font-size: 0.75rem; color: #6c757d; }
.type-bar-wrapper { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
.type-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }

.monthly-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 180px; padding: 1rem 0; }
.month-bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.month-bar { width: 70%; max-width: 30px; background: linear-gradient(180deg, #a9dbb8, #8fcca0); border-radius: 4px 4px 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 0.25rem; transition: height 0.5s ease; }
.month-value { font-size: 0.7rem; font-weight: 600; color: #2c3e50; }
.month-label { margin-top: 0.5rem; font-size: 0.7rem; color: #6c757d; }

.dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.dept-card { padding: 1rem; background: #f8f9fa; border-radius: 8px; }
.dept-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.dept-name { font-size: 0.85rem; color: #495057; }
.dept-days { font-weight: 700; color: #0466c8; }
.dept-bar-wrapper { height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden; }
.dept-bar { height: 100%; background: linear-gradient(90deg, #a9dbb8, #8fcca0); border-radius: 3px; transition: width 0.5s ease; }

.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
@media (max-width: 768px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
.summary-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; background: #f8f9fa; border-radius: 8px; }
.summary-card.highlight { background: linear-gradient(135deg, #a9dbb8, #8fcca0); }
.summary-icon { font-size: 2rem; }
.summary-content { display: flex; flex-direction: column; }
.summary-value { font-size: 1.5rem; font-weight: 700; color: #2c3e50; }
.summary-label { font-size: 0.8rem; color: #6c757d; }
.summary-card.highlight .summary-label { color: #2c3e50; }

.loading-state { text-align: center; padding: 3rem; grid-column: 1 / -1; }
.loading-spinner { font-size: 2rem; display: block; margin-bottom: 1rem; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
