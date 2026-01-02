<template>
  <div class="training-list-page">
    <PageHeader 
      title="Verilen Eğitimler" 
      description="Eğitim kataloğunu yönetin ve personel atamalarını takip edin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Eğitim
        </button>
      </template>
    </PageHeader>

    <div class="stats-grid">
      <StatCard icon="📚" :value="stats.total" label="Toplam Eğitim" color="primary" />
      <StatCard icon="👥" :value="stats.totalParticipants" label="Toplam Katılımcı" color="info" />
      <StatCard icon="✅" :value="stats.completedCount" label="Tamamlanan" color="success" />
      <StatCard icon="⏳" :value="stats.plannedCount" label="Planlanan" color="warning" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <input v-model="searchTerm" type="text" placeholder="Eğitim ara..." class="search-input" />
        <select v-model="filterCategory" @change="loadTrainings" class="filter-select">
          <option value="">Tüm Kategoriler</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </template>
    </ActionToolbar>

    <DataTable :columns="columns" :data="filteredTrainings" :loading="loading" :show-actions="true"
      :show-pagination="true" :current-page="pagination.page" :total-pages="pagination.totalPages"
      :total="pagination.total" empty-text="Eğitim bulunmuyor" @page-change="handlePageChange">
      <template #cell-title="{ row }">
        <div class="training-cell">
          <span class="training-title">{{ row.title }}</span>
          <span class="training-provider" v-if="row.provider">{{ row.provider }}</span>
        </div>
      </template>
      <template #cell-category="{ value }">
        <span class="category-badge" v-if="value">{{ value }}</span>
        <span v-else class="text-muted">-</span>
      </template>
      <template #cell-durationHours="{ value }">
        <span class="duration-badge">🕐 {{ value }} saat</span>
      </template>
      <template #cell-_count="{ row }">
        <span class="participant-count">👥 {{ row._count?.employeeTrainings || 0 }}</span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn view" @click.stop="viewParticipants(row)" title="Katılımcılar">👥</button>
        <button class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        <button class="action-btn delete" @click.stop="deleteTraining(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Eğitim Düzenle' : 'Yeni Eğitim Ekle' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveTraining" class="modal-body">
              <div class="form-group">
                <label>Eğitim Başlığı *</label>
                <input v-model="form.title" type="text" required class="form-control" placeholder="Eğitim adı" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Sağlayıcı / Eğitmen</label>
                  <input v-model="form.provider" type="text" class="form-control" placeholder="Kurum veya eğitmen adı" />
                </div>
                <div class="form-group">
                  <label>Süre (Saat) *</label>
                  <input v-model.number="form.durationHours" type="number" min="1" required class="form-control" />
                </div>
              </div>
              <div class="form-group">
                <label>Kategori</label>
                <input v-model="form.category" type="text" class="form-control" placeholder="Örn: Teknik, Yönetim, İSG" list="category-list" />
                <datalist id="category-list">
                  <option v-for="cat in categories" :key="cat" :value="cat" />
                </datalist>
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

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showParticipantsModal" class="modal-overlay" @click.self="closeParticipantsModal">
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h3>{{ selectedTraining?.title }} - Katılımcılar</h3>
              <button class="close-btn" @click="closeParticipantsModal">✕</button>
            </div>
            <div class="modal-body">
              <div class="participants-toolbar">
                <button class="btn btn-primary btn-sm" @click="openAssignModal">➕ Personel Ata</button>
              </div>
              <div v-if="participants.length === 0" class="empty-state">
                <span>👥</span>
                <p>Henüz katılımcı yok</p>
              </div>
              <div v-else class="participants-list">
                <div v-for="p in participants" :key="p.id" class="participant-card">
                  <div class="participant-info">
                    <div class="participant-avatar">{{ p.employee?.firstName?.charAt(0) }}{{ p.employee?.lastName?.charAt(0) }}</div>
                    <div class="participant-details">
                      <span class="participant-name">{{ p.employee?.firstName }} {{ p.employee?.lastName }}</span>
                      <span class="participant-code">{{ p.employee?.employeeCode }}</span>
                    </div>
                  </div>
                  <div class="participant-status">
                    <span :class="['status-badge', `status-${p.status.toLowerCase()}`]">{{ getStatusLabel(p.status) }}</span>
                  </div>
                  <div class="participant-actions">
                    <button v-if="p.status === 'Planned'" class="action-btn complete" @click="completeParticipant(p)" title="Tamamla">✅</button>
                    <button v-if="p.status === 'Planned'" class="action-btn fail" @click="failParticipant(p)" title="Başarısız">❌</button>
                    <button v-if="p.status !== 'Completed'" class="action-btn delete" @click="removeParticipant(p)" title="Çıkar">🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAssignModal" class="modal-overlay" @click.self="closeAssignModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Personel Ata</h3>
              <button class="close-btn" @click="closeAssignModal">✕</button>
            </div>
            <form @submit.prevent="assignEmployee" class="modal-body">
              <div class="form-group">
                <label>Personel Seçin *</label>
                <select v-model="assignForm.employeeId" required class="form-control">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in availableEmployees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeAssignModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="assigning">
                  {{ assigning ? 'Atanıyor...' : 'Ata' }}
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
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { success, error } = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const saving = ref(false)
const assigning = ref(false)
const showModal = ref(false)
const showParticipantsModal = ref(false)
const showAssignModal = ref(false)
const isEditing = ref(false)
const trainings = ref<any[]>([])
const employees = ref<any[]>([])
const participants = ref<any[]>([])
const categories = ref<string[]>([])
const selectedTraining = ref<any>(null)
const searchTerm = ref('')
const filterCategory = ref('')

const form = reactive({ id: null as number | null, title: '', provider: '', durationHours: 1, category: '' })
const assignForm = reactive({ employeeId: '' })
const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })
const stats = reactive({ total: 0, totalParticipants: 0, completedCount: 0, plannedCount: 0 })

const columns: TableColumn[] = [
  { key: 'title', label: 'Eğitim', sortable: true },
  { key: 'category', label: 'Kategori', width: '150px' },
  { key: 'durationHours', label: 'Süre', width: '100px' },
  { key: '_count', label: 'Katılımcı', width: '100px' }
]

const filteredTrainings = computed(() => {
  if (!searchTerm.value) return trainings.value
  const term = searchTerm.value.toLowerCase()
  return trainings.value.filter(t => t.title?.toLowerCase().includes(term) || t.provider?.toLowerCase().includes(term))
})

const availableEmployees = computed(() => {
  const participantIds = participants.value.map(p => p.employeeId)
  return employees.value.filter(e => !participantIds.includes(e.id))
})

const loadTrainings = async () => {
  loading.value = true
  try {
    const options: any = { page: pagination.page, limit: pagination.limit }
    if (filterCategory.value) options.category = filterCategory.value
    const result = await window.electronAPI.training.getAll(options)
    if (result.success) {
      trainings.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    }
  } catch (err) { error('Eğitimler yüklenemedi') }
  finally { loading.value = false }
}

const loadCategories = async () => {
  try {
    const result = await window.electronAPI.training.getCategories()
    if (result.success) categories.value = result.data || []
  } catch (err) { /* ignore */ }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 500, status: 'Active' })
    if (result.success) employees.value = result.data || []
  } catch (err) { /* ignore */ }
}

const loadParticipants = async (trainingId: number) => {
  try {
    const result = await window.electronAPI.training.getTrainingParticipants(trainingId)
    if (result.success) participants.value = result.data || []
  } catch (err) { error('Katılımcılar yüklenemedi') }
}

const updateStats = async () => {
  stats.total = trainings.value.length
  stats.totalParticipants = trainings.value.reduce((sum, t) => sum + (t._count?.employeeTrainings || 0), 0)
  try {
    const allTrainings = await window.electronAPI.training.getAllEmployeeTrainings({ limit: 1000 })
    if (allTrainings.success) {
      const data = allTrainings.data || []
      stats.completedCount = data.filter((t: any) => t.status === 'Completed').length
      stats.plannedCount = data.filter((t: any) => t.status === 'Planned').length
    }
  } catch (err) { /* ignore */ }
}

const openCreateModal = () => { isEditing.value = false; resetForm(); showModal.value = true }
const openEditModal = (training: any) => {
  isEditing.value = true
  Object.assign(form, { id: training.id, title: training.title, provider: training.provider || '', durationHours: training.durationHours, category: training.category || '' })
  showModal.value = true
}
const closeModal = () => { showModal.value = false; resetForm() }
const resetForm = () => { form.id = null; form.title = ''; form.provider = ''; form.durationHours = 1; form.category = '' }

const saveTraining = async () => {
  saving.value = true
  try {
    const data = { title: form.title, provider: form.provider || null, durationHours: form.durationHours, category: form.category || null }
    const result = isEditing.value ? await window.electronAPI.training.update(form.id!, data) : await window.electronAPI.training.create(data)
    if (result.success) {
      success(isEditing.value ? 'Eğitim güncellendi' : 'Eğitim oluşturuldu')
      closeModal(); await loadTrainings(); await loadCategories()
    } else { error(result.errors?.[0] || 'İşlem başarısız') }
  } catch (err) { error('Kaydetme sırasında hata oluştu') }
  finally { saving.value = false }
}

const deleteTraining = async (training: any) => {
  const confirmed = await confirm({ title: 'Eğitim Sil', message: `"${training.title}" eğitimini silmek istediğinize emin misiniz?`, confirmText: 'Sil', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.training.delete(training.id)
      if (result.success) { success('Eğitim silindi'); await loadTrainings() }
      else { error(result.errors?.[0] || 'Silme başarısız') }
    } catch (err) { error('Silme sırasında hata oluştu') }
  }
}

const viewParticipants = async (training: any) => {
  selectedTraining.value = training
  await loadParticipants(training.id)
  showParticipantsModal.value = true
}
const closeParticipantsModal = () => { showParticipantsModal.value = false; selectedTraining.value = null; participants.value = [] }

const openAssignModal = () => { assignForm.employeeId = ''; showAssignModal.value = true }
const closeAssignModal = () => { showAssignModal.value = false }

const assignEmployee = async () => {
  if (!assignForm.employeeId || !selectedTraining.value) return
  assigning.value = true
  try {
    const result = await window.electronAPI.training.assignEmployee(selectedTraining.value.id, Number(assignForm.employeeId))
    if (result.success) {
      success('Personel eğitime atandı')
      closeAssignModal()
      await loadParticipants(selectedTraining.value.id)
      await loadTrainings()
    } else { error(result.errors?.[0] || 'Atama başarısız') }
  } catch (err) { error('Atama sırasında hata oluştu') }
  finally { assigning.value = false }
}

const completeParticipant = async (participant: any) => {
  const confirmed = await confirm({ title: 'Eğitimi Tamamla', message: 'Bu personelin eğitimini tamamlandı olarak işaretlemek istiyor musunuz?', confirmText: 'Tamamla', type: 'success' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.training.completeTraining(participant.id)
      if (result.success) { success('Eğitim tamamlandı'); await loadParticipants(selectedTraining.value.id); await loadTrainings() }
      else { error(result.errors?.[0] || 'İşlem başarısız') }
    } catch (err) { error('İşlem sırasında hata oluştu') }
  }
}

const failParticipant = async (participant: any) => {
  const confirmed = await confirm({ title: 'Eğitim Başarısız', message: 'Bu personelin eğitimini başarısız olarak işaretlemek istiyor musunuz?', confirmText: 'Başarısız', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.training.failTraining(participant.id)
      if (result.success) { success('Eğitim başarısız olarak işaretlendi'); await loadParticipants(selectedTraining.value.id); await loadTrainings() }
      else { error(result.errors?.[0] || 'İşlem başarısız') }
    } catch (err) { error('İşlem sırasında hata oluştu') }
  }
}

const removeParticipant = async (participant: any) => {
  const confirmed = await confirm({ title: 'Katılımcı Çıkar', message: 'Bu personeli eğitimden çıkarmak istiyor musunuz?', confirmText: 'Çıkar', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.training.removeEmployee(participant.id)
      if (result.success) { success('Personel eğitimden çıkarıldı'); await loadParticipants(selectedTraining.value.id); await loadTrainings() }
      else { error(result.errors?.[0] || 'İşlem başarısız') }
    } catch (err) { error('İşlem sırasında hata oluştu') }
  }
}

const handlePageChange = (page: number) => { pagination.page = page; loadTrainings() }
const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { Planned: '⏳ Planlanan', Completed: '✅ Tamamlandı', Failed: '❌ Başarısız' }
  return labels[status] || status
}

onMounted(async () => { await loadEmployees(); await loadCategories(); await loadTrainings() })
</script>

<style scoped>
.training-list-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-input, .filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; }
.search-input { min-width: 200px; }
.filter-select { min-width: 150px; }

.training-cell { display: flex; flex-direction: column; }
.training-title { font-weight: 600; color: #2c3e50; }
.training-provider { font-size: 0.8rem; color: #6c757d; }
.category-badge { display: inline-block; padding: 0.25rem 0.5rem; background: #e7f1ff; color: #0466c8; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
.duration-badge { color: #495057; font-weight: 500; }
.participant-count { color: #0466c8; font-weight: 600; }
.text-muted { color: #adb5bd; }

.action-btn { padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: all 0.2s; margin: 0 0.125rem; }
.action-btn:hover { transform: scale(1.1); }
.action-btn.view:hover { background: #e7f1ff; }
.action-btn.edit:hover { background: #fff3cd; }
.action-btn.delete:hover { background: #f8d7da; }
.action-btn.complete:hover { background: #d4edda; }
.action-btn.fail:hover { background: #f8d7da; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-container { background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
.modal-container.modal-lg { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.95rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #e9ecef; margin-top: 1rem; }
.btn { padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; }

.participants-toolbar { margin-bottom: 1rem; }
.empty-state { text-align: center; padding: 2rem; color: #6c757d; }
.empty-state span { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
.participants-list { display: flex; flex-direction: column; gap: 0.75rem; }
.participant-card { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
.participant-info { display: flex; align-items: center; gap: 0.75rem; }
.participant-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem; }
.participant-details { display: flex; flex-direction: column; }
.participant-name { font-weight: 600; color: #2c3e50; }
.participant-code { font-size: 0.75rem; color: #6c757d; }
.participant-actions { display: flex; gap: 0.25rem; }

.status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.status-planned { background: #fff3cd; color: #856404; }
.status-completed { background: #d4edda; color: #155724; }
.status-failed { background: #f8d7da; color: #721c24; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
