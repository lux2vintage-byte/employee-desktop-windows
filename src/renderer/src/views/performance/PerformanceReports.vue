<template>
  <div class="performance-reports-page">
    <PageHeader 
      title="Performans Raporları" 
      description="Performans değerlendirme istatistikleri ve analizleri"
    />

    <!-- Filtreler -->
    <div class="filters-bar">
      <div class="filter-group">
        <label>Dönem</label>
        <select v-model="filterPeriod" @change="loadData" class="filter-select">
          <option value="">Tüm Dönemler</option>
          <option v-for="period in periods" :key="period" :value="period">{{ period }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Yıl</label>
        <select v-model="filterYear" @change="loadData" class="filter-select">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <!-- Özet Kartları -->
    <div class="summary-grid">
      <div class="summary-card primary">
        <div class="summary-icon">📊</div>
        <div class="summary-content">
          <span class="summary-value">{{ stats.totalReviews }}</span>
          <span class="summary-label">Toplam Değerlendirme</span>
        </div>
      </div>
      <div class="summary-card success">
        <div class="summary-icon">⭐</div>
        <div class="summary-content">
          <span class="summary-value">{{ stats.avgScore.toFixed(1) }}</span>
          <span class="summary-label">Ortalama Puan</span>
        </div>
      </div>
      <div class="summary-card info">
        <div class="summary-icon">🏆</div>
        <div class="summary-content">
          <span class="summary-value">{{ stats.excellentCount }}</span>
          <span class="summary-label">Mükemmel (80+)</span>
        </div>
      </div>
      <div class="summary-card warning">
        <div class="summary-icon">📈</div>
        <div class="summary-content">
          <span class="summary-value">{{ stats.needsImprovementCount }}</span>
          <span class="summary-label">Geliştirilmeli (&lt;40)</span>
        </div>
      </div>
    </div>

    <!-- Grafikler -->
    <div class="charts-grid">
      <!-- Puan Dağılımı -->
      <div class="chart-card">
        <h4>📊 Puan Dağılımı</h4>
        <div class="distribution-chart">
          <div class="dist-bar" v-for="(item, index) in scoreDistribution" :key="index">
            <div class="dist-label">{{ item.label }}</div>
            <div class="dist-bar-wrapper">
              <div class="dist-bar-fill" :class="item.class" :style="{ width: item.percentage + '%' }"></div>
            </div>
            <div class="dist-count">{{ item.count }} ({{ item.percentage.toFixed(0) }}%)</div>
          </div>
        </div>
      </div>

      <!-- Durum Dağılımı -->
      <div class="chart-card">
        <h4>📋 Durum Dağılımı</h4>
        <div class="status-chart">
          <div class="status-item" v-for="(item, index) in statusDistribution" :key="index">
            <div class="status-circle" :class="item.class">
              <span class="status-value">{{ item.count }}</span>
            </div>
            <span class="status-label">{{ item.label }}</span>
            <span class="status-percentage">{{ item.percentage.toFixed(0) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- En İyi Performanslar -->
    <div class="rankings-section">
      <div class="ranking-card">
        <h4>🏆 En Yüksek Puanlar</h4>
        <div class="ranking-list">
          <div v-for="(review, index) in topPerformers" :key="review.id" class="ranking-item">
            <span class="rank" :class="getRankClass(index)">{{ index + 1 }}</span>
            <div class="ranking-avatar">
              {{ review.employee?.firstName?.charAt(0) }}{{ review.employee?.lastName?.charAt(0) }}
            </div>
            <div class="ranking-info">
              <span class="ranking-name">{{ review.employee?.firstName }} {{ review.employee?.lastName }}</span>
              <span class="ranking-period">{{ review.reviewPeriod }}</span>
            </div>
            <div class="ranking-score" :class="getScoreClass(review.score)">{{ review.score }}</div>
          </div>
          <div v-if="topPerformers.length === 0" class="no-data">Veri bulunmuyor</div>
        </div>
      </div>

      <div class="ranking-card">
        <h4>📉 Geliştirilmesi Gerekenler</h4>
        <div class="ranking-list">
          <div v-for="(review, index) in lowPerformers" :key="review.id" class="ranking-item">
            <span class="rank rank-low">{{ index + 1 }}</span>
            <div class="ranking-avatar low">
              {{ review.employee?.firstName?.charAt(0) }}{{ review.employee?.lastName?.charAt(0) }}
            </div>
            <div class="ranking-info">
              <span class="ranking-name">{{ review.employee?.firstName }} {{ review.employee?.lastName }}</span>
              <span class="ranking-period">{{ review.reviewPeriod }}</span>
            </div>
            <div class="ranking-score score-poor">{{ review.score }}</div>
          </div>
          <div v-if="lowPerformers.length === 0" class="no-data">Veri bulunmuyor</div>
        </div>
      </div>
    </div>

    <!-- Araç Çubuğu -->
    <ActionToolbar
      :show-print="true"
      :show-pdf="true"
      :show-excel-export="true"
      @print="handlePrint"
      @pdf="handlePdf"
      @excel-export="handleExcelExport"
    />

    <!-- Detaylı Tablo -->
    <DataTable
      :columns="columns"
      :data="reviews"
      :loading="loading"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Değerlendirme bulunmuyor"
      @page-change="handlePageChange"
    >
      <template #cell-employee="{ row }">
        <div class="employee-cell">
          <span class="employee-name">{{ row.employee?.firstName }} {{ row.employee?.lastName }}</span>
        </div>
      </template>
      <template #cell-score="{ value }">
        <span v-if="value !== null" :class="['score-badge', getScoreClass(value)]">{{ value }}</span>
        <span v-else class="no-score">-</span>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${value.toLowerCase()}`]">{{ getStatusLabel(value) }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'

const { success } = useToast()

const loading = ref(false)
const reviews = ref<any[]>([])
const filterPeriod = ref('')
const filterYear = ref(new Date().getFullYear())

const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })

const stats = reactive({
  totalReviews: 0,
  avgScore: 0,
  excellentCount: 0,
  needsImprovementCount: 0
})

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

const periods = computed(() => {
  const result: string[] = []
  reviews.value.forEach(r => {
    if (r.reviewPeriod && !result.includes(r.reviewPeriod)) result.push(r.reviewPeriod)
  })
  return result.sort().reverse()
})

const scoredReviews = computed(() => reviews.value.filter(r => r.score !== null))

const scoreDistribution = computed(() => {
  const total = scoredReviews.value.length
  if (total === 0) return []
  
  const excellent = scoredReviews.value.filter(r => r.score >= 80).length
  const good = scoredReviews.value.filter(r => r.score >= 60 && r.score < 80).length
  const average = scoredReviews.value.filter(r => r.score >= 40 && r.score < 60).length
  const poor = scoredReviews.value.filter(r => r.score < 40).length

  return [
    { label: 'Mükemmel (80-100)', count: excellent, percentage: (excellent / total) * 100, class: 'excellent' },
    { label: 'İyi (60-79)', count: good, percentage: (good / total) * 100, class: 'good' },
    { label: 'Orta (40-59)', count: average, percentage: (average / total) * 100, class: 'average' },
    { label: 'Geliştirilmeli (0-39)', count: poor, percentage: (poor / total) * 100, class: 'poor' }
  ]
})

const statusDistribution = computed(() => {
  const total = reviews.value.length
  if (total === 0) return []
  
  const draft = reviews.value.filter(r => r.status === 'Draft').length
  const submitted = reviews.value.filter(r => r.status === 'Submitted').length
  const acknowledged = reviews.value.filter(r => r.status === 'Acknowledged').length

  return [
    { label: 'Taslak', count: draft, percentage: (draft / total) * 100, class: 'draft' },
    { label: 'Gönderildi', count: submitted, percentage: (submitted / total) * 100, class: 'submitted' },
    { label: 'Onaylandı', count: acknowledged, percentage: (acknowledged / total) * 100, class: 'acknowledged' }
  ]
})

const topPerformers = computed(() => {
  return [...scoredReviews.value].sort((a, b) => b.score - a.score).slice(0, 5)
})

const lowPerformers = computed(() => {
  return [...scoredReviews.value].filter(r => r.score < 60).sort((a, b) => a.score - b.score).slice(0, 5)
})

const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'reviewPeriod', label: 'Dönem', width: '140px' },
  { key: 'score', label: 'Puan', width: '100px' },
  { key: 'status', label: 'Durum', width: '130px' }
]

const loadData = async () => {
  loading.value = true
  try {
    const options: any = { page: pagination.page, limit: pagination.limit }
    if (filterPeriod.value) options.reviewPeriod = filterPeriod.value
    
    const result = await window.electronAPI.performance.getAll(options)
    if (result.success) {
      reviews.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    }
  } catch (err) { /* ignore */ }
  finally { loading.value = false }
}

const updateStats = () => {
  stats.totalReviews = reviews.value.length
  const scored = scoredReviews.value
  stats.avgScore = scored.length > 0 ? scored.reduce((sum, r) => sum + r.score, 0) / scored.length : 0
  stats.excellentCount = scored.filter(r => r.score >= 80).length
  stats.needsImprovementCount = scored.filter(r => r.score < 40).length
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadData()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { Draft: 'Taslak', Submitted: 'Gönderildi', Acknowledged: 'Onaylandı' }
  return labels[status] || status
}

const getScoreClass = (score: number) => {
  if (score >= 80) return 'score-excellent'
  if (score >= 60) return 'score-good'
  if (score >= 40) return 'score-average'
  return 'score-poor'
}

const getRankClass = (index: number) => {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

onMounted(() => loadData())
</script>

<style scoped>
.performance-reports-page { max-width: 1400px; margin: 0 auto; }

.filters-bar {
  display: flex; gap: 1rem; margin-bottom: 1.5rem;
  padding: 1rem; background: white; border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.filter-group { display: flex; flex-direction: column; gap: 0.25rem; }
.filter-group label { font-size: 0.8rem; color: #6c757d; font-weight: 500; }
.filter-select {
  padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px;
  font-size: 0.875rem; background: white; min-width: 150px;
}

.summary-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem; margin-bottom: 1.5rem;
}
.summary-card {
  display: flex; align-items: center; gap: 1rem;
  padding: 1.25rem; border-radius: 12px; color: white;
}
.summary-card.primary { background: linear-gradient(135deg, #0466c8, #0353a4); }
.summary-card.success { background: linear-gradient(135deg, #198754, #157347); }
.summary-card.info { background: linear-gradient(135deg, #0dcaf0, #0aa2c0); }
.summary-card.warning { background: linear-gradient(135deg, #fd7e14, #e96b02); }
.summary-icon { font-size: 2rem; }
.summary-content { display: flex; flex-direction: column; }
.summary-value { font-size: 1.75rem; font-weight: 700; }
.summary-label { font-size: 0.85rem; opacity: 0.9; }

.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }

.chart-card {
  background: white; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.chart-card h4 { margin: 0 0 1.25rem 0; font-size: 1rem; color: #2c3e50; }

.distribution-chart { display: flex; flex-direction: column; gap: 0.75rem; }
.dist-bar { display: flex; align-items: center; gap: 0.75rem; }
.dist-label { width: 140px; font-size: 0.85rem; color: #495057; }
.dist-bar-wrapper { flex: 1; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
.dist-bar-fill { height: 100%; border-radius: 10px; transition: width 0.3s; }
.dist-bar-fill.excellent { background: #198754; }
.dist-bar-fill.good { background: #0d6efd; }
.dist-bar-fill.average { background: #fd7e14; }
.dist-bar-fill.poor { background: #dc3545; }
.dist-count { width: 80px; text-align: right; font-size: 0.85rem; color: #6c757d; }

.status-chart { display: flex; justify-content: space-around; padding: 1rem 0; }
.status-item { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.status-circle {
  width: 70px; height: 70px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.status-circle.draft { background: #fff3cd; }
.status-circle.submitted { background: #cce5ff; }
.status-circle.acknowledged { background: #d4edda; }
.status-value { font-size: 1.5rem; font-weight: 700; color: #2c3e50; }
.status-label { font-size: 0.85rem; color: #495057; font-weight: 500; }
.status-percentage { font-size: 0.75rem; color: #6c757d; }

.rankings-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }

.ranking-card {
  background: white; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.ranking-card h4 { margin: 0 0 1rem 0; font-size: 1rem; color: #2c3e50; }

.ranking-list { display: flex; flex-direction: column; gap: 0.5rem; }
.ranking-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem; background: #f8f9fa; border-radius: 8px;
}
.rank {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.85rem; background: #e9ecef; color: #495057;
}
.rank-gold { background: #ffd700; color: #856404; }
.rank-silver { background: #c0c0c0; color: #495057; }
.rank-bronze { background: #cd7f32; color: white; }
.rank-low { background: #f8d7da; color: #721c24; }

.ranking-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 0.75rem;
}
.ranking-avatar.low { background: linear-gradient(135deg, #f8d7da, #f5c6cb); }
.ranking-info { flex: 1; display: flex; flex-direction: column; }
.ranking-name { font-weight: 600; color: #2c3e50; font-size: 0.9rem; }
.ranking-period { font-size: 0.75rem; color: #6c757d; }
.ranking-score { font-weight: 700; font-size: 1.1rem; }

.score-excellent { color: #198754; }
.score-good { color: #0d6efd; }
.score-average { color: #fd7e14; }
.score-poor { color: #dc3545; }

.score-badge {
  display: inline-block; padding: 0.25rem 0.5rem; border-radius: 6px;
  font-weight: 600; font-size: 0.85rem;
}
.score-badge.score-excellent { background: #d4edda; }
.score-badge.score-good { background: #cce5ff; }
.score-badge.score-average { background: #fff3cd; }
.score-badge.score-poor { background: #f8d7da; }

.no-score { color: #adb5bd; }
.no-data { text-align: center; color: #adb5bd; font-style: italic; padding: 1rem; }

.employee-cell { display: flex; flex-direction: column; }
.employee-name { font-weight: 600; color: #2c3e50; }

.status-badge {
  display: inline-block; padding: 0.25rem 0.5rem; border-radius: 12px;
  font-size: 0.75rem; font-weight: 600;
}
.status-draft { background: #fff3cd; color: #856404; }
.status-submitted { background: #cce5ff; color: #004085; }
.status-acknowledged { background: #d4edda; color: #155724; }
</style>
