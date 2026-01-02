<template>
  <div class="performance-detail-page">
    <PageHeader 
      :title="`Performans Değerlendirmesi #${reviewId}`" 
      description="Değerlendirme detayları ve geri bildirim"
    >
      <template #actions>
        <button class="btn btn-outline" @click="goBack">← Geri</button>
        <button v-if="review?.status === 'Draft'" class="btn btn-primary" @click="openEditModal">
          ✏️ Düzenle
        </button>
        <button v-if="review?.status === 'Draft'" class="btn btn-success" @click="submitReview">
          📤 Gönder
        </button>
        <button v-if="review?.status === 'Submitted'" class="btn btn-success" @click="acknowledgeReview">
          ✅ Onayla
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="loading-state">
      <span>Yükleniyor...</span>
    </div>

    <div v-else-if="review" class="detail-content">
      <!-- Durum Kartı -->
      <div class="status-card" :class="`status-${review.status.toLowerCase()}`">
        <div class="status-icon">{{ getStatusIcon(review.status) }}</div>
        <div class="status-info">
          <span class="status-label">{{ getStatusLabel(review.status) }}</span>
          <span class="status-date">{{ formatDate(review.createdAt) }}</span>
        </div>
      </div>

      <div class="detail-grid">
        <!-- Personel Bilgileri -->
        <div class="detail-card">
          <h4>👤 Değerlendirilen Personel</h4>
          <div class="person-info">
            <div class="person-avatar">
              {{ review.employee?.firstName?.charAt(0) }}{{ review.employee?.lastName?.charAt(0) }}
            </div>
            <div class="person-details">
              <span class="person-name">{{ review.employee?.firstName }} {{ review.employee?.lastName }}</span>
              <span class="person-code">{{ review.employee?.employeeCode }}</span>
            </div>
          </div>
        </div>

        <!-- Değerlendiren Bilgileri -->
        <div class="detail-card">
          <h4>📋 Değerlendiren</h4>
          <div class="person-info">
            <div class="person-avatar reviewer">
              {{ review.reviewer?.firstName?.charAt(0) }}{{ review.reviewer?.lastName?.charAt(0) }}
            </div>
            <div class="person-details">
              <span class="person-name">{{ review.reviewer?.firstName }} {{ review.reviewer?.lastName }}</span>
              <span class="person-code">{{ review.reviewer?.employeeCode }}</span>
            </div>
          </div>
        </div>

        <!-- Dönem Bilgisi -->
        <div class="detail-card">
          <h4>📅 Değerlendirme Dönemi</h4>
          <div class="period-display">
            <span class="period-value">{{ review.reviewPeriod }}</span>
          </div>
        </div>

        <!-- Puan -->
        <div class="detail-card score-card">
          <h4>⭐ Performans Puanı</h4>
          <div v-if="review.score !== null" class="score-display">
            <div class="score-circle" :class="getScoreClass(review.score)">
              <span class="score-number">{{ review.score }}</span>
              <span class="score-max">/100</span>
            </div>
            <div class="score-details">
              <span class="score-label" :class="getScoreClass(review.score)">{{ getScoreLabel(review.score) }}</span>
              <div class="score-bar-large">
                <div class="bar-fill" :class="getScoreClass(review.score)" :style="{ width: review.score + '%' }"></div>
              </div>
            </div>
          </div>
          <div v-else class="no-score">
            <span>Henüz puan verilmedi</span>
          </div>
        </div>
      </div>

      <!-- Geri Bildirim -->
      <div class="feedback-card">
        <h4>💬 Geri Bildirim / Değerlendirme Notları</h4>
        <div v-if="review.feedback" class="feedback-content">
          <p>{{ review.feedback }}</p>
        </div>
        <div v-else class="no-feedback">
          <span>Henüz geri bildirim yazılmadı</span>
        </div>
      </div>
    </div>

    <!-- Düzenleme Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Değerlendirme Düzenle</h3>
              <button class="close-btn" @click="closeEditModal">✕</button>
            </div>
            <form @submit.prevent="saveReview" class="modal-body">
              <div class="form-group">
                <label>Puan (0-100)</label>
                <input v-model.number="editForm.score" type="number" min="0" max="100" class="form-control" />
              </div>
              <div class="form-group">
                <label>Geri Bildirim</label>
                <textarea v-model="editForm.feedback" class="form-control" rows="5"></textarea>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeEditModal">İptal</button>
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
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const route = useRoute()
const router = useRouter()
const { success, error } = useToast()
const { confirm } = useConfirm()

const reviewId = route.params.id as string
const loading = ref(true)
const saving = ref(false)
const showEditModal = ref(false)
const review = ref<any>(null)

const editForm = reactive({ score: null as number | null, feedback: '' })

const loadReview = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.performance.getById(Number(reviewId))
    if (result.success) {
      review.value = result.data
    } else {
      error('Değerlendirme bulunamadı')
      router.push('/performance/reviews')
    }
  } catch (err) {
    error('Değerlendirme yüklenemedi')
  } finally {
    loading.value = false
  }
}

const goBack = () => router.push('/performance/reviews')

const openEditModal = () => {
  editForm.score = review.value?.score
  editForm.feedback = review.value?.feedback || ''
  showEditModal.value = true
}

const closeEditModal = () => { showEditModal.value = false }

const saveReview = async () => {
  saving.value = true
  try {
    const result = await window.electronAPI.performance.update(Number(reviewId), editForm)
    if (result.success) {
      success('Değerlendirme güncellendi')
      closeEditModal()
      await loadReview()
    } else {
      error(result.errors?.[0] || 'Güncelleme başarısız')
    }
  } catch (err) {
    error('Güncelleme sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const submitReview = async () => {
  if (review.value?.score === null) {
    error('Göndermek için puan girilmelidir')
    return
  }
  const confirmed = await confirm({
    title: 'Değerlendirmeyi Gönder',
    message: 'Bu değerlendirmeyi göndermek istediğinize emin misiniz?',
    confirmText: 'Gönder',
    type: 'info'
  })
  if (confirmed) {
    try {
      const result = await window.electronAPI.performance.submit(Number(reviewId))
      if (result.success) {
        success('Değerlendirme gönderildi')
        await loadReview()
      } else {
        error(result.errors?.[0] || 'Gönderme başarısız')
      }
    } catch (err) {
      error('Gönderme sırasında hata oluştu')
    }
  }
}

const acknowledgeReview = async () => {
  const confirmed = await confirm({
    title: 'Değerlendirmeyi Onayla',
    message: 'Bu değerlendirmeyi onaylamak istediğinize emin misiniz?',
    confirmText: 'Onayla',
    type: 'success'
  })
  if (confirmed) {
    try {
      const result = await window.electronAPI.performance.acknowledge(Number(reviewId))
      if (result.success) {
        success('Değerlendirme onaylandı')
        await loadReview()
      } else {
        error(result.errors?.[0] || 'Onaylama başarısız')
      }
    } catch (err) {
      error('Onaylama sırasında hata oluştu')
    }
  }
}

const getStatusIcon = (status: string) => {
  const icons: Record<string, string> = { Draft: '📝', Submitted: '📤', Acknowledged: '✅' }
  return icons[status] || '📋'
}

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

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Mükemmel'
  if (score >= 60) return 'İyi'
  if (score >= 40) return 'Orta'
  return 'Geliştirilmeli'
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })

onMounted(() => loadReview())
</script>

<style scoped>
.performance-detail-page { max-width: 1000px; margin: 0 auto; }

.loading-state { text-align: center; padding: 3rem; color: #6c757d; }

.status-card {
  display: flex; align-items: center; gap: 1rem;
  padding: 1rem 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;
}
.status-card.status-draft { background: linear-gradient(135deg, #fff3cd, #ffeeba); }
.status-card.status-submitted { background: linear-gradient(135deg, #cce5ff, #b8daff); }
.status-card.status-acknowledged { background: linear-gradient(135deg, #d4edda, #c3e6cb); }
.status-icon { font-size: 2rem; }
.status-info { display: flex; flex-direction: column; }
.status-label { font-weight: 700; font-size: 1.1rem; color: #2c3e50; }
.status-date { font-size: 0.85rem; color: #6c757d; }

.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; }

.detail-card {
  background: white; border-radius: 12px; padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.detail-card h4 { margin: 0 0 1rem 0; font-size: 0.95rem; color: #6c757d; }

.person-info { display: flex; align-items: center; gap: 1rem; }
.person-avatar {
  width: 50px; height: 50px; border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1rem;
}
.person-avatar.reviewer { background: linear-gradient(135deg, #cce5ff, #b8daff); }
.person-details { display: flex; flex-direction: column; }
.person-name { font-weight: 600; font-size: 1.1rem; color: #2c3e50; }
.person-code { font-size: 0.85rem; color: #6c757d; }

.period-display { padding: 0.5rem 0; }
.period-value { font-size: 1.25rem; font-weight: 600; color: #0466c8; }

.score-card { grid-column: span 2; }
.score-display { display: flex; align-items: center; gap: 2rem; }
.score-circle {
  width: 100px; height: 100px; border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #f8f9fa; border: 4px solid;
}
.score-circle.score-excellent { border-color: #198754; }
.score-circle.score-good { border-color: #0d6efd; }
.score-circle.score-average { border-color: #fd7e14; }
.score-circle.score-poor { border-color: #dc3545; }
.score-number { font-size: 2rem; font-weight: 700; line-height: 1; }
.score-max { font-size: 0.85rem; color: #6c757d; }
.score-details { flex: 1; }
.score-label { font-size: 1.25rem; font-weight: 600; display: block; margin-bottom: 0.5rem; }
.score-label.score-excellent { color: #198754; }
.score-label.score-good { color: #0d6efd; }
.score-label.score-average { color: #fd7e14; }
.score-label.score-poor { color: #dc3545; }
.score-bar-large { height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden; }
.score-bar-large .bar-fill { height: 100%; border-radius: 6px; transition: width 0.3s; }
.score-bar-large .bar-fill.score-excellent { background: #198754; }
.score-bar-large .bar-fill.score-good { background: #0d6efd; }
.score-bar-large .bar-fill.score-average { background: #fd7e14; }
.score-bar-large .bar-fill.score-poor { background: #dc3545; }
.no-score { color: #adb5bd; font-style: italic; }

.feedback-card {
  background: white; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.feedback-card h4 { margin: 0 0 1rem 0; font-size: 1rem; color: #6c757d; }
.feedback-content p { margin: 0; line-height: 1.7; color: #2c3e50; white-space: pre-wrap; }
.no-feedback { color: #adb5bd; font-style: italic; }

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
.btn-success { background: #198754; color: white; }
.btn-success:hover { background: #157347; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }
.btn-outline { background: transparent; border: 1px solid #dee2e6; color: #495057; }
.btn-outline:hover { background: #f8f9fa; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
