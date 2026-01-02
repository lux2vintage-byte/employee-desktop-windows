<template>
  <div class="performance-calendar-page">
    <PageHeader 
      title="Değerlendirme Takvimi" 
      description="Performans değerlendirme dönemlerini ve planlarını görüntüleyin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Dönem Planla
        </button>
      </template>
    </PageHeader>

    <!-- Yıl Seçimi -->
    <div class="year-selector">
      <button class="year-nav" @click="prevYear">◀</button>
      <span class="year-display">{{ selectedYear }}</span>
      <button class="year-nav" @click="nextYear">▶</button>
    </div>

    <!-- Dönem Kartları -->
    <div class="periods-grid">
      <div 
        v-for="period in yearPeriods" 
        :key="period.name" 
        class="period-card"
        :class="{ 'period-active': period.isActive, 'period-past': period.isPast, 'period-future': period.isFuture }"
      >
        <div class="period-header">
          <span class="period-icon">{{ period.icon }}</span>
          <span class="period-name">{{ period.name }}</span>
        </div>
        <div class="period-dates">
          <span>{{ period.startDate }} - {{ period.endDate }}</span>
        </div>
        <div class="period-stats">
          <div class="stat-item">
            <span class="stat-value">{{ period.totalReviews }}</span>
            <span class="stat-label">Değerlendirme</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ period.completedReviews }}</span>
            <span class="stat-label">Tamamlanan</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ period.avgScore || '-' }}</span>
            <span class="stat-label">Ort. Puan</span>
          </div>
        </div>
        <div class="period-progress" v-if="period.totalReviews > 0">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (period.completedReviews / period.totalReviews * 100) + '%' }"></div>
          </div>
          <span class="progress-text">{{ Math.round(period.completedReviews / period.totalReviews * 100) }}% Tamamlandı</span>
        </div>
        <div class="period-actions">
          <button class="btn btn-sm btn-outline" @click="viewPeriodReviews(period.name)">
            📋 Değerlendirmeleri Gör
          </button>
        </div>
      </div>
    </div>

    <!-- Yaklaşan Değerlendirmeler -->
    <div class="upcoming-section">
      <h3>📅 Yaklaşan Değerlendirmeler</h3>
      <div v-if="upcomingReviews.length > 0" class="upcoming-list">
        <div v-for="review in upcomingReviews" :key="review.id" class="upcoming-item">
          <div class="upcoming-avatar">
            {{ review.employee?.firstName?.charAt(0) }}{{ review.employee?.lastName?.charAt(0) }}
          </div>
          <div class="upcoming-info">
            <span class="upcoming-name">{{ review.employee?.firstName }} {{ review.employee?.lastName }}</span>
            <span class="upcoming-period">{{ review.reviewPeriod }}</span>
          </div>
          <div class="upcoming-status">
            <span :class="['status-badge', `status-${review.status.toLowerCase()}`]">
              {{ getStatusLabel(review.status) }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="no-upcoming">
        <span>Yaklaşan değerlendirme bulunmuyor</span>
      </div>
    </div>

    <!-- Yeni Dönem Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Yeni Değerlendirme Dönemi Planla</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Dönem Adı *</label>
                <select v-model="newPeriod.name" class="form-control">
                  <option value="">Dönem Seçin</option>
                  <option v-for="p in availablePeriods" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea v-model="newPeriod.description" class="form-control" rows="3" placeholder="Dönem hakkında notlar..."></textarea>
              </div>
              <div class="info-box">
                <span class="info-icon">💡</span>
                <span>Dönem planlandıktan sonra, bu dönem için değerlendirmeler oluşturabilirsiniz.</span>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button type="button" class="btn btn-primary" @click="savePeriod">Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { success } = useToast()

const selectedYear = ref(new Date().getFullYear())
const reviews = ref<any[]>([])
const showModal = ref(false)

const newPeriod = reactive({ name: '', description: '' })

const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
const currentPeriodName = `${selectedYear.value} Q${currentQuarter}`

const yearPeriods = computed(() => {
  const periods = [
    { name: `${selectedYear.value} Q1`, icon: '🌸', startDate: '01 Ocak', endDate: '31 Mart' },
    { name: `${selectedYear.value} Q2`, icon: '☀️', startDate: '01 Nisan', endDate: '30 Haziran' },
    { name: `${selectedYear.value} Q3`, icon: '🍂', startDate: '01 Temmuz', endDate: '30 Eylül' },
    { name: `${selectedYear.value} Q4`, icon: '❄️', startDate: '01 Ekim', endDate: '31 Aralık' },
    { name: `${selectedYear.value} Yıl Sonu`, icon: '📊', startDate: '01 Ocak', endDate: '31 Aralık' }
  ]

  return periods.map(p => {
    const periodReviews = reviews.value.filter(r => r.reviewPeriod === p.name)
    const completedReviews = periodReviews.filter(r => r.status === 'Acknowledged')
    const scoredReviews = periodReviews.filter(r => r.score !== null)
    const avgScore = scoredReviews.length > 0 
      ? Math.round(scoredReviews.reduce((sum, r) => sum + r.score, 0) / scoredReviews.length)
      : null

    const isActive = p.name === currentPeriodName || p.name === `${selectedYear.value} Yıl Sonu`
    const isPast = selectedYear.value < new Date().getFullYear() || 
      (selectedYear.value === new Date().getFullYear() && parseInt(p.name.split('Q')[1]) < currentQuarter)
    const isFuture = selectedYear.value > new Date().getFullYear() ||
      (selectedYear.value === new Date().getFullYear() && parseInt(p.name.split('Q')[1]) > currentQuarter)

    return {
      ...p,
      totalReviews: periodReviews.length,
      completedReviews: completedReviews.length,
      avgScore,
      isActive: isActive && !isPast,
      isPast,
      isFuture
    }
  })
})

const upcomingReviews = computed(() => {
  return reviews.value
    .filter(r => r.status === 'Draft' || r.status === 'Submitted')
    .slice(0, 5)
})

const availablePeriods = computed(() => {
  const result: string[] = []
  for (let y = selectedYear.value; y <= selectedYear.value + 1; y++) {
    result.push(`${y} Yıl Sonu`)
    for (let q = 1; q <= 4; q++) result.push(`${y} Q${q}`)
  }
  return result
})

const loadReviews = async () => {
  try {
    const result = await window.electronAPI.performance.getAll({ limit: 500 })
    if (result.success) reviews.value = result.data || []
  } catch (err) { /* ignore */ }
}

const prevYear = () => { selectedYear.value-- }
const nextYear = () => { selectedYear.value++ }

const viewPeriodReviews = (periodName: string) => {
  router.push({ path: '/performance/reviews', query: { period: periodName } })
}

const openCreateModal = () => { showModal.value = true }
const closeModal = () => { 
  showModal.value = false 
  newPeriod.name = ''
  newPeriod.description = ''
}

const savePeriod = () => {
  success(`${newPeriod.name} dönemi planlandı`)
  closeModal()
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { Draft: 'Taslak', Submitted: 'Gönderildi', Acknowledged: 'Onaylandı' }
  return labels[status] || status
}

onMounted(() => loadReviews())
</script>

<style scoped>
.performance-calendar-page { max-width: 1200px; margin: 0 auto; }

.year-selector {
  display: flex; align-items: center; justify-content: center; gap: 1.5rem;
  margin-bottom: 2rem;
}
.year-nav {
  width: 40px; height: 40px; border: none; border-radius: 50%;
  background: #e9ecef; color: #495057; cursor: pointer;
  font-size: 1rem; transition: all 0.2s;
}
.year-nav:hover { background: #a9dbb8; color: #2c3e50; }
.year-display { font-size: 2rem; font-weight: 700; color: #2c3e50; }

.periods-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem; margin-bottom: 2rem;
}

.period-card {
  background: white; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #dee2e6; transition: all 0.2s;
}
.period-card.period-active { border-left-color: #198754; background: linear-gradient(135deg, #f8fff9, white); }
.period-card.period-past { border-left-color: #6c757d; opacity: 0.8; }
.period-card.period-future { border-left-color: #0466c8; }

.period-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.period-icon { font-size: 1.5rem; }
.period-name { font-size: 1.1rem; font-weight: 700; color: #2c3e50; }
.period-dates { font-size: 0.85rem; color: #6c757d; margin-bottom: 1rem; }

.period-stats { display: flex; gap: 1rem; margin-bottom: 1rem; }
.stat-item { text-align: center; flex: 1; }
.stat-value { display: block; font-size: 1.25rem; font-weight: 700; color: #2c3e50; }
.stat-label { font-size: 0.7rem; color: #6c757d; text-transform: uppercase; }

.period-progress { margin-bottom: 1rem; }
.progress-bar { height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden; margin-bottom: 0.25rem; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #198754, #20c997); border-radius: 3px; transition: width 0.3s; }
.progress-text { font-size: 0.75rem; color: #6c757d; }

.period-actions { text-align: center; }

.upcoming-section {
  background: white; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.upcoming-section h3 { margin: 0 0 1rem 0; font-size: 1.1rem; color: #2c3e50; }

.upcoming-list { display: flex; flex-direction: column; gap: 0.75rem; }
.upcoming-item {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.75rem; background: #f8f9fa; border-radius: 8px;
}
.upcoming-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 0.8rem;
}
.upcoming-info { flex: 1; display: flex; flex-direction: column; }
.upcoming-name { font-weight: 600; color: #2c3e50; }
.upcoming-period { font-size: 0.8rem; color: #6c757d; }
.no-upcoming { color: #adb5bd; font-style: italic; text-align: center; padding: 1rem; }

.status-badge {
  display: inline-block; padding: 0.25rem 0.5rem; border-radius: 12px;
  font-size: 0.7rem; font-weight: 600;
}
.status-draft { background: #fff3cd; color: #856404; }
.status-submitted { background: #cce5ff; color: #004085; }
.status-acknowledged { background: #d4edda; color: #155724; }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
  justify-content: center; z-index: 10000;
}
.modal-container {
  background: white; border-radius: 12px; width: 90%; max-width: 500px;
  max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef;
}
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }
.form-control {
  width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6;
  border-radius: 6px; font-size: 0.95rem;
}
.info-box {
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 1rem; background: #fff3cd; border-radius: 8px; margin-bottom: 1rem;
}
.info-icon { font-size: 1.25rem; }
.info-box span:last-child { font-size: 0.9rem; color: #856404; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding: 1rem 1.5rem; border-top: 1px solid #e9ecef;
}
.btn {
  padding: 0.625rem 1.25rem; border: none; border-radius: 6px;
  font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }
.btn-outline { background: transparent; border: 1px solid #dee2e6; color: #495057; }
.btn-outline:hover { background: #f8f9fa; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
