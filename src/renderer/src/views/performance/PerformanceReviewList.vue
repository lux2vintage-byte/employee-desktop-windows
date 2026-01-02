<template>
  <div class="performance-review-page">
    <PageHeader 
      title="Performans Değerlendirme Formları" 
      description="Personel performans değerlendirmelerini oluşturun ve yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Değerlendirme
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📊" :value="stats.total" label="Toplam Değerlendirme" color="primary" />
      <StatCard icon="📝" :value="stats.draft" label="Taslak" color="warning" />
      <StatCard icon="📤" :value="stats.submitted" label="Gönderilmiş" color="info" />
      <StatCard icon="✅" :value="stats.acknowledged" label="Onaylanmış" color="success" />
    </div>

    <!-- Özet Kartları -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-header">
          <span class="summary-icon">⭐</span>
          <span class="summary-title">Ortalama Puan</span>
        </div>
        <div class="summary-value">{{ stats.avgScore.toFixed(1) }}</div>
        <div class="summary-bar">
          <div class="bar-fill" :style="{ width: stats.avgScore + '%' }"></div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-header">
          <span class="summary-icon">🏆</span>
          <span class="summary-title">En Yüksek Puan</span>
        </div>
        <div class="summary-value highlight-success">{{ stats.maxScore }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-header">
          <span class="summary-icon">📉</span>
          <span class="summary-title">En Düşük Puan</span>
        </div>
        <div class="summary-value highlight-warning">{{ stats.minScore }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-header">
          <span class="summary-icon">📅</span>
          <span class="summary-title">Aktif Dönem</span>
        </div>
        <div class="summary-value period">{{ currentPeriod }}</div>
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
    >
      <template #left>
        <div class="filter-group">
          <input 
            v-model="searchTerm" 
            type="text" 
            placeholder="Personel ara..." 
            class="search-input"
          />
        </div>
        <div class="filter-group">
          <select v-model="filterPeriod" @change="loadReviews" class="filter-select">
            <option value="">Tüm Dönemler</option>
            <option v-for="period in periods" :key="period" :value="period">{{ period }}</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filterStatus" @change="loadReviews" class="filter-select">
            <option value="">Tüm Durumlar</option>
            <option value="Draft">Taslak</option>
            <option value="Submitted">Gönderilmiş</option>
            <option value="Acknowledged">Onaylanmış</option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <!-- Değerlendirme Tablosu -->
    <DataTable
      :columns="columns"
      :data="filteredReviews"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Değerlendirme bulunmuyor"
      @page-change="handlePageChange"
    >
      <template #cell-employee="{ row }">
        <div class="employee-cell">
          <div class="employee-avatar">
            {{ row.employee?.firstName?.charAt(0) }}{{ row.employee?.lastName?.charAt(0) }}
          </div>
          <div class="employee-info">
            <span class="employee-name">{{ row.employee?.firstName }} {{ row.employee?.lastName }}</span>
            <span class="employee-code">{{ row.employee?.employeeCode }}</span>
          </div>
        </div>
      </template>
      <template #cell-reviewer="{ row }">
        <div class="reviewer-info">
          <span class="reviewer-name">{{ row.reviewer?.firstName }} {{ row.reviewer?.lastName }}</span>
        </div>
      </template>
      <template #cell-score="{ value }">
        <div class="score-cell" v-if="value !== null">
          <div class="score-value" :class="getScoreClass(value)">{{ value }}</div>
          <div class="score-bar">
            <div class="bar-fill" :class="getScoreClass(value)" :style="{ width: value + '%' }"></div>
          </div>
        </div>
        <span v-else class="no-score">-</span>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${value.toLowerCase()}`]">
          {{ getStatusLabel(value) }}
        </span>
      </template>
      <template #cell-createdAt="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #actions="{ row }">
        <button class="action-btn view" @click.stop="viewReview(row)" title="Detay">👁️</button>
        <button v-if="row.status === 'Draft'" class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        <button v-if="row.status === 'Draft'" class="action-btn submit" @click.stop="submitReview(row)" title="Gönder">📤</button>
        <button v-if="row.status === 'Submitted'" class="action-btn acknowledge" @click.stop="acknowledgeReview(row)" title="Onayla">✅</button>
        <button v-if="row.status === 'Draft'" class="action-btn delete" @click.stop="deleteReview(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Değerlendirme Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Değerlendirme Düzenle' : 'Yeni Performans Değerlendirmesi' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveReview" class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Değerlendirilen Personel *</label>
                  <select v-model="form.employeeId" required class="form-control" :disabled="isEditing">
                    <option value="">Personel Seçin</option>
                    <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                      {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Değerlendiren *</label>
                  <select v-model="form.reviewerId" required class="form-control" :disabled="isEditing">
                    <option value="">Değerlendiren Seçin</option>
                    <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                      {{ emp.firstName }} {{ emp.lastName }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Değerlendirme Dönemi *</label>
                  <select v-model="form.reviewPeriod" required class="form-control">
                    <option value="">Dönem Seçin</option>
                    <option v-for="period in availablePeriods" :key="period" :value="period">{{ period }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Puan (0-100)</label>
                  <div class="score-input-wrapper">
                    <input v-model.number="form.score" type="number" min="0" max="100" class="form-control" placeholder="0-100" />
                    <div class="score-preview" v-if="form.score !== null && form.score !== ''">
                      <div class="preview-bar">
                        <div class="bar-fill" :class="getScoreClass(form.score)" :style="{ width: form.score + '%' }"></div>
                      </div>
                      <span :class="getScoreClass(form.score)">{{ getScoreLabel(form.score) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>Geri Bildirim / Değerlendirme Notları</label>
                <textarea v-model="form.feedback" class="form-control" rows="5" placeholder="Performans değerlendirmesi hakkında detaylı geri bildirim yazın..."></textarea>
              </div>
              <div class="info-box" v-if="!isEditing">
                <span class="info-icon">ℹ️</span>
                <span>Değerlendirme taslak olarak kaydedilecektir. Göndermek için kayıt sonrası "Gönder" butonunu kullanın.</span>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
                </button>
              </div>
            </form>
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
import StatCard from '@/components/StatCard.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const router = useRouter()
const { success, error } = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const reviews = ref<any[]>([])
const employees = ref<any[]>([])
const searchTerm = ref('')
const filterPeriod = ref('')
const filterStatus = ref('')

const form = reactive({
  id: null as number | null,
  employeeId: '',
  reviewerId: '',
  reviewPeriod: '',
  score: null as number | null,
  feedback: ''
})

const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })

const stats = reactive({
  total: 0,
  draft: 0,
  submitted: 0,
  acknowledged: 0,
  avgScore: 0,
  maxScore: 0,
  minScore: 0
})

const currentYear = new Date().getFullYear()
const currentPeriod = computed(() => `${currentYear} Q${Math.ceil((new Date().getMonth() + 1) / 3)}`)

const periods = computed(() => {
  const result: string[] = []
  reviews.value.forEach(r => {
    if (r.reviewPeriod && !result.includes(r.reviewPeriod)) result.push(r.reviewPeriod)
  })
  return result.sort().reverse()
})

const availablePeriods = computed(() => {
  const result: string[] = []
  for (let y = currentYear; y >= currentYear - 2; y--) {
    result.push(`${y} Yıl Sonu`)
    for (let q = 4; q >= 1; q--) result.push(`${y} Q${q}`)
  }
  return result
})

const filteredReviews = computed(() => {
  let result = reviews.value
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(r => 
      r.employee?.firstName?.toLowerCase().includes(term) ||
      r.employee?.lastName?.toLowerCase().includes(term) ||
      r.employee?.employeeCode?.toLowerCase().includes(term)
    )
  }
  return result
})

const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'reviewer', label: 'Değerlendiren', sortable: true },
  { key: 'reviewPeriod', label: 'Dönem', width: '140px' },
  { key: 'score', label: 'Puan', width: '150px' },
  { key: 'status', label: 'Durum', width: '130px' },
  { key: 'createdAt', label: 'Tarih', width: '110px' }
]

const loadReviews = async () => {
  loading.value = true
  try {
    const options: any = { page: pagination.page, limit: pagination.limit }
    if (filterPeriod.value) options.reviewPeriod = filterPeriod.value
    if (filterStatus.value) options.status = filterStatus.value
    
    const result = await window.electronAPI.performance.getAll(options)
    if (result.success) {
      reviews.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    }
  } catch (err) {
    error('Değerlendirmeler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 500, status: 'Active' })
    if (result.success) employees.value = result.data || []
  } catch (err) { /* ignore */ }
}

const updateStats = () => {
  stats.total = reviews.value.length
  stats.draft = reviews.value.filter(r => r.status === 'Draft').length
  stats.submitted = reviews.value.filter(r => r.status === 'Submitted').length
  stats.acknowledged = reviews.value.filter(r => r.status === 'Acknowledged').length
  
  const scored = reviews.value.filter(r => r.score !== null)
  if (scored.length > 0) {
    stats.avgScore = scored.reduce((sum, r) => sum + r.score, 0) / scored.length
    stats.maxScore = Math.max(...scored.map(r => r.score))
    stats.minScore = Math.min(...scored.map(r => r.score))
  } else {
    stats.avgScore = 0
    stats.maxScore = 0
    stats.minScore = 0
  }
}

const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (review: any) => {
  isEditing.value = true
  Object.assign(form, {
    id: review.id,
    employeeId: review.employeeId,
    reviewerId: review.reviewerId,
    reviewPeriod: review.reviewPeriod,
    score: review.score,
    feedback: review.feedback || ''
  })
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.id = null
  form.employeeId = ''
  form.reviewerId = ''
  form.reviewPeriod = ''
  form.score = null
  form.feedback = ''
}

const saveReview = async () => {
  if (form.employeeId === form.reviewerId) {
    error('Personel kendi kendini değerlendiremez')
    return
  }
  
  saving.value = true
  try {
    const data = {
      employeeId: Number(form.employeeId),
      reviewerId: Number(form.reviewerId),
      reviewPeriod: form.reviewPeriod,
      score: form.score,
      feedback: form.feedback || null
    }
    
    const result = isEditing.value
      ? await window.electronAPI.performance.update(form.id!, data)
      : await window.electronAPI.performance.create(data)
    
    if (result.success) {
      success(isEditing.value ? 'Değerlendirme güncellendi' : 'Değerlendirme oluşturuldu')
      closeModal()
      await loadReviews()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kaydetme sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const viewReview = (review: any) => {
  router.push(`/performance/reviews/${review.id}`)
}

const submitReview = async (review: any) => {
  if (review.score === null) {
    error('Göndermek için puan girilmelidir')
    return
  }
  
  const confirmed = await confirm({
    title: 'Değerlendirmeyi Gönder',
    message: 'Bu değerlendirmeyi göndermek istediğinize emin misiniz? Gönderildikten sonra düzenlenemez.',
    confirmText: 'Gönder',
    type: 'info'
  })
  
  if (confirmed) {
    try {
      const result = await window.electronAPI.performance.submit(review.id)
      if (result.success) {
        success('Değerlendirme gönderildi')
        await loadReviews()
      } else {
        error(result.errors?.[0] || 'Gönderme başarısız')
      }
    } catch (err) {
      error('Gönderme sırasında hata oluştu')
    }
  }
}

const acknowledgeReview = async (review: any) => {
  const confirmed = await confirm({
    title: 'Değerlendirmeyi Onayla',
    message: 'Bu değerlendirmeyi onaylamak istediğinize emin misiniz?',
    confirmText: 'Onayla',
    type: 'success'
  })
  
  if (confirmed) {
    try {
      const result = await window.electronAPI.performance.acknowledge(review.id)
      if (result.success) {
        success('Değerlendirme onaylandı')
        await loadReviews()
      } else {
        error(result.errors?.[0] || 'Onaylama başarısız')
      }
    } catch (err) {
      error('Onaylama sırasında hata oluştu')
    }
  }
}

const deleteReview = async (review: any) => {
  const confirmed = await confirm({
    title: 'Değerlendirme Sil',
    message: 'Bu değerlendirmeyi silmek istediğinize emin misiniz?',
    confirmText: 'Sil',
    type: 'danger'
  })
  
  if (confirmed) {
    try {
      const result = await window.electronAPI.performance.delete(review.id)
      if (result.success) {
        success('Değerlendirme silindi')
        await loadReviews()
      } else {
        error(result.errors?.[0] || 'Silme başarısız')
      }
    } catch (err) {
      error('Silme sırasında hata oluştu')
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadReviews()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { Draft: '📝 Taslak', Submitted: '📤 Gönderildi', Acknowledged: '✅ Onaylandı' }
  return labels[status] || status
}

const getScoreClass = (score: number) => {
  if (score >= 80) return 'score-excellent'
  if (score >= 60) return 'score-good'
  if (score >= 40) return 'score-average'
  return 'score-poor'
}

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Mükemmel'
  if (score >= 60) return 'İyi'
  if (score >= 40) return 'Orta'
  return 'Geliştirilmeli'
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR')

onMounted(async () => {
  await loadEmployees()
  await loadReviews()
})
</script>

<style scoped>
.performance-review-page { max-width: 1400px; margin: 0 auto; }

.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem; margin-bottom: 1.5rem;
}

.summary-cards {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem; margin-bottom: 1.5rem;
}

.summary-card {
  padding: 1.25rem; background: white; border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.summary-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
.summary-icon { font-size: 1.25rem; }
.summary-title { font-size: 0.85rem; color: #6c757d; }
.summary-value { font-size: 1.75rem; font-weight: 700; color: #2c3e50; }
.summary-value.highlight-success { color: #198754; }
.summary-value.highlight-warning { color: #fd7e14; }
.summary-value.period { font-size: 1.25rem; color: #0466c8; }

.summary-bar { height: 6px; background: #e9ecef; border-radius: 3px; margin-top: 0.5rem; overflow: hidden; }
.summary-bar .bar-fill { height: 100%; background: linear-gradient(90deg, #198754, #20c997); border-radius: 3px; transition: width 0.3s; }

.filter-group { display: flex; align-items: center; gap: 0.5rem; }
.search-input, .filter-select {
  padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px;
  font-size: 0.875rem; background: white;
}
.search-input { min-width: 200px; }
.filter-select { min-width: 150px; }

.employee-cell { display: flex; align-items: center; gap: 0.75rem; }
.employee-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 0.75rem;
}
.employee-info { display: flex; flex-direction: column; }
.employee-name { font-weight: 600; color: #2c3e50; }
.employee-code { font-size: 0.75rem; color: #6c757d; }
.reviewer-name { font-weight: 500; color: #495057; }

.score-cell { display: flex; flex-direction: column; gap: 0.25rem; }
.score-value { font-weight: 700; font-size: 1.1rem; }
.score-bar { height: 4px; background: #e9ecef; border-radius: 2px; overflow: hidden; width: 80px; }
.score-bar .bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.no-score { color: #adb5bd; }

.score-excellent { color: #198754; }
.score-excellent.bar-fill { background: #198754; }
.score-good { color: #0d6efd; }
.score-good.bar-fill { background: #0d6efd; }
.score-average { color: #fd7e14; }
.score-average.bar-fill { background: #fd7e14; }
.score-poor { color: #dc3545; }
.score-poor.bar-fill { background: #dc3545; }

.status-badge {
  display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}
.status-draft { background: #fff3cd; color: #856404; }
.status-submitted { background: #cce5ff; color: #004085; }
.status-acknowledged { background: #d4edda; color: #155724; }

.action-btn {
  padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px;
  cursor: pointer; font-size: 1rem; transition: all 0.2s; margin: 0 0.125rem;
}
.action-btn:hover { transform: scale(1.1); }
.action-btn.view:hover { background: #e9ecef; }
.action-btn.edit:hover { background: #e7f1ff; }
.action-btn.submit:hover { background: #cce5ff; }
.action-btn.acknowledge:hover { background: #d4edda; }
.action-btn.delete:hover { background: #f8d7da; }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
  justify-content: center; z-index: 10000;
}
.modal-container {
  background: white; border-radius: 12px; width: 90%; max-width: 600px;
  max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
.modal-container.modal-lg { max-width: 700px; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef;
}
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }
.form-control {
  width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6;
  border-radius: 6px; font-size: 0.95rem;
}
textarea.form-control { resize: vertical; }

.score-input-wrapper { display: flex; flex-direction: column; gap: 0.5rem; }
.score-preview { display: flex; align-items: center; gap: 0.75rem; }
.preview-bar { flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
.preview-bar .bar-fill { height: 100%; border-radius: 4px; }

.info-box {
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 1rem; background: #e7f1ff; border-radius: 8px; margin-bottom: 1rem;
}
.info-icon { font-size: 1.25rem; }
.info-box span:last-child { font-size: 0.9rem; color: #0466c8; }

.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding: 1rem 1.5rem; border-top: 1px solid #e9ecef;
}
.btn {
  padding: 0.625rem 1.25rem; border: none; border-radius: 6px;
  font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
