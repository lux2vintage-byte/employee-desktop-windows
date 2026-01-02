<template>
  <div class="onboarding-page">
    <PageHeader 
      title="Yeni Personel Oryantasyon Listesi" 
      description="Yeni işe başlayan personellerin oryantasyon süreçlerini takip edin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Oryantasyon
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Kayıt" color="primary" />
      <StatCard icon="📅" :value="stats.planned" label="Planlanan" color="info" />
      <StatCard icon="🔄" :value="stats.inProgress" label="Devam Eden" color="warning" />
      <StatCard icon="✅" :value="stats.completed" label="Tamamlanan" color="success" />
    </div>

    <!-- Araç Çubuğu -->
    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true" @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <div class="search-box">
          <input v-model="searchTerm" type="text" placeholder="Personel ara..." />
          <span class="search-icon">🔍</span>
        </div>
        <select v-model="filterStatus" class="filter-select" @change="loadData">
          <option value="">Tüm Durumlar</option>
          <option value="Planned">Planlanan</option>
          <option value="InProgress">Devam Eden</option>
          <option value="Completed">Tamamlanan</option>
          <option value="Cancelled">İptal</option>
        </select>
      </template>
    </ActionToolbar>

    <!-- Veri Tablosu -->
    <DataTable
      :columns="columns"
      :data="filteredData"
      :loading="loading"
      :show-actions="true"
      :show-edit="true"
      :show-delete="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Henüz oryantasyon kaydı bulunmuyor"
      @edit="openEditModal"
      @delete="confirmDelete"
      @page-change="handlePageChange"
    >
      <template #cell-employee="{ row }">
        <div class="employee-cell">
          <span class="employee-name">{{ row.employee?.firstName }} {{ row.employee?.lastName }}</span>
          <span class="employee-code">{{ row.employee?.employeeCode }}</span>
        </div>
      </template>
      <template #cell-startDate="{ value }">{{ formatDate(value) }}</template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${value?.toLowerCase()}`]">{{ getStatusLabel(value) }}</span>
      </template>
      <template #cell-completionRate="{ value }">
        <div class="progress-cell">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${value || 0}%` }"></div>
          </div>
          <span class="progress-text">%{{ Math.round(value || 0) }}</span>
        </div>
      </template>
      <template #extra-actions="{ row }">
        <button v-if="row.status === 'Planned'" class="btn-icon btn-start" @click="handleStart(row)" title="Başlat">▶</button>
        <button v-if="row.status === 'InProgress'" class="btn-icon btn-complete" @click="handleComplete(row)" title="Tamamla">✔</button>
        <button class="btn-icon btn-tasks" @click="openTasksModal(row)" title="Görevler">📋</button>
      </template>
    </DataTable>

    <!-- Oryantasyon Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal">
            <div class="modal-header">
              <h2>{{ modalMode === 'create' ? 'Yeni Oryantasyon' : 'Oryantasyon Düzenle' }}</h2>
              <button class="btn-close" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="handleSubmit" class="modal-body">
              <div class="form-group">
                <label class="form-label required">Personel</label>
                <select v-model="form.employeeId" class="form-control" :disabled="modalMode === 'edit'">
                  <option :value="null">Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label required">Başlangıç Tarihi</label>
                  <input v-model="form.startDate" type="date" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Bitiş Tarihi</label>
                  <input v-model="form.endDate" type="date" class="form-control" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Mentor</label>
                <select v-model="form.mentorId" class="form-control">
                  <option :value="null">Seçin (Opsiyonel)</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Notlar</label>
                <textarea v-model="form.notes" class="form-control" rows="3"></textarea>
              </div>
              <div v-if="modalMode === 'create'" class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="createWithTasks" />
                  <span>Varsayılan görevleri otomatik oluştur</span>
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? 'Kaydediliyor...' : (modalMode === 'create' ? 'Oluştur' : 'Güncelle') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Görevler Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showTasksModal" class="modal-overlay" @click.self="closeTasksModal">
          <div class="modal modal-lg">
            <div class="modal-header">
              <h2>Oryantasyon Görevleri - {{ selectedOnboarding?.employee?.firstName }} {{ selectedOnboarding?.employee?.lastName }}</h2>
              <button class="btn-close" @click="closeTasksModal">✕</button>
            </div>
            <div class="modal-body">
              <div class="tasks-header">
                <div class="completion-info">
                  <span>Tamamlanma: %{{ Math.round(selectedOnboarding?.completionRate || 0) }}</span>
                </div>
                <button class="btn btn-sm btn-primary" @click="openAddTaskModal">➕ Görev Ekle</button>
              </div>
              <div class="tasks-list">
                <div v-for="task in selectedOnboarding?.tasks" :key="task.id" :class="['task-item', `task-${task.status?.toLowerCase()}`]">
                  <div class="task-checkbox">
                    <input type="checkbox" :checked="task.status === 'Completed'" @change="toggleTask(task)" :disabled="task.status === 'Completed'" />
                  </div>
                  <div class="task-content">
                    <span class="task-title">{{ task.title }}</span>
                    <span class="task-category">{{ task.category }}</span>
                  </div>
                  <div class="task-actions">
                    <button class="btn-icon btn-delete" @click="deleteTask(task)" title="Sil">🗑️</button>
                  </div>
                </div>
                <div v-if="!selectedOnboarding?.tasks?.length" class="empty-tasks">
                  Henüz görev eklenmemiş
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Görev Ekle Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddTaskModal" class="modal-overlay" @click.self="closeAddTaskModal">
          <div class="modal">
            <div class="modal-header">
              <h2>Yeni Görev Ekle</h2>
              <button class="btn-close" @click="closeAddTaskModal">✕</button>
            </div>
            <form @submit.prevent="handleAddTask" class="modal-body">
              <div class="form-group">
                <label class="form-label required">Görev Başlığı</label>
                <input v-model="taskForm.title" type="text" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label required">Kategori</label>
                <select v-model="taskForm.category" class="form-control">
                  <option value="HR">HR</option>
                  <option value="IT">IT</option>
                  <option value="Eğitim">Eğitim</option>
                  <option value="Departman">Departman</option>
                  <option value="Genel">Genel</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Açıklama</label>
                <textarea v-model="taskForm.description" class="form-control" rows="2"></textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" @click="closeAddTaskModal">İptal</button>
                <button type="submit" class="btn btn-primary">Ekle</button>
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

const { showToast } = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const saving = ref(false)
const data = ref<any[]>([])
const employees = ref<any[]>([])
const searchTerm = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const showTasksModal = ref(false)
const showAddTaskModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const selectedOnboarding = ref<any>(null)
const createWithTasks = ref(true)

const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })
const stats = reactive({ total: 0, planned: 0, inProgress: 0, completed: 0, avgCompletionRate: 0 })

const form = reactive({
  employeeId: null as number | null,
  startDate: '',
  endDate: '',
  mentorId: null as number | null,
  notes: ''
})

const taskForm = reactive({ title: '', category: 'Genel', description: '' })

const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel' },
  { key: 'startDate', label: 'Başlangıç', width: '120px' },
  { key: 'status', label: 'Durum', width: '120px' },
  { key: 'completionRate', label: 'İlerleme', width: '150px' }
]

const filteredData = computed(() => {
  if (!searchTerm.value) return data.value
  const term = searchTerm.value.toLowerCase()
  return data.value.filter(d => 
    d.employee?.firstName?.toLowerCase().includes(term) ||
    d.employee?.lastName?.toLowerCase().includes(term) ||
    d.employee?.employeeCode?.toLowerCase().includes(term)
  )
})

const loadData = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.onboarding.getAll({ page: pagination.page, limit: pagination.limit })
    if (result.success) {
      data.value = filterStatus.value ? result.data.filter((d: any) => d.status === filterStatus.value) : result.data
      pagination.total = result.total
      pagination.totalPages = result.totalPages
    }
  } catch (error) { showToast('Veriler yüklenemedi', 'error') }
  finally { loading.value = false }
}

const loadStats = async () => {
  try {
    const result = await window.electronAPI.onboarding.getStats()
    if (result.success) Object.assign(stats, result.data)
  } catch (error) { /* ignore */ }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ status: 'Active', limit: 500 })
    if (result.success) employees.value = result.data
  } catch (error) { /* ignore */ }
}

const getStatusLabel = (s: string) => ({ 'Planned': 'Planlanan', 'InProgress': 'Devam Ediyor', 'Completed': 'Tamamlandı', 'Cancelled': 'İptal' }[s] || s)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('tr-TR') : '-'

const handlePageChange = (page: number) => { pagination.page = page; loadData() }
const handlePrint = () => window.print()
const handlePdf = () => showToast('PDF özelliği yakında', 'info')
const handleExcelExport = () => showToast('Excel özelliği yakında', 'info')

const openCreateModal = () => { modalMode.value = 'create'; editingId.value = null; resetForm(); showModal.value = true }

const openEditModal = (row: any) => {
  modalMode.value = 'edit'
  editingId.value = row.id
  form.employeeId = row.employeeId
  form.startDate = row.startDate ? row.startDate.split('T')[0] : ''
  form.endDate = row.endDate ? row.endDate.split('T')[0] : ''
  form.mentorId = row.mentorId
  form.notes = row.notes || ''
  showModal.value = true
}

const closeModal = () => { showModal.value = false; resetForm() }

const resetForm = () => {
  form.employeeId = null
  form.startDate = new Date().toISOString().split('T')[0] || ''
  form.endDate = ''
  form.mentorId = null
  form.notes = ''
  createWithTasks.value = true
}

const handleSubmit = async () => {
  if (!form.employeeId || !form.startDate) { showToast('Personel ve başlangıç tarihi zorunludur', 'error'); return }
  saving.value = true
  try {
    const payload = { ...form, startDate: new Date(form.startDate), endDate: form.endDate ? new Date(form.endDate) : null }
    let result
    if (modalMode.value === 'create') {
      result = createWithTasks.value 
        ? await window.electronAPI.onboarding.createWithTasks(payload)
        : await window.electronAPI.onboarding.create(payload)
    } else {
      result = await window.electronAPI.onboarding.update(editingId.value!, payload)
    }
    if (result.success) {
      showToast(modalMode.value === 'create' ? 'Oryantasyon oluşturuldu' : 'Oryantasyon güncellendi', 'success')
      closeModal(); await loadData(); await loadStats()
    } else { showToast(result.errors?.[0] || 'İşlem başarısız', 'error') }
  } catch (error) { showToast('Bir hata oluştu', 'error') }
  finally { saving.value = false }
}

const confirmDelete = async (row: any) => {
  const confirmed = await confirm({ title: 'Oryantasyon Sil', message: `Bu oryantasyon kaydını silmek istediğinize emin misiniz?`, confirmText: 'Sil', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.onboarding.delete(row.id)
      if (result.success) { showToast('Kayıt silindi', 'success'); await loadData(); await loadStats() }
      else showToast(result.errors?.[0] || 'Silinemedi', 'error')
    } catch (error) { showToast('Hata oluştu', 'error') }
  }
}

const handleStart = async (row: any) => {
  try {
    const result = await window.electronAPI.onboarding.start(row.id)
    if (result.success) { showToast('Oryantasyon başlatıldı', 'success'); await loadData(); await loadStats() }
    else showToast(result.errors?.[0] || 'Başlatılamadı', 'error')
  } catch (error) { showToast('Hata oluştu', 'error') }
}

const handleComplete = async (row: any) => {
  try {
    const result = await window.electronAPI.onboarding.complete(row.id)
    if (result.success) { showToast('Oryantasyon tamamlandı', 'success'); await loadData(); await loadStats() }
    else showToast(result.errors?.[0] || 'Tamamlanamadı', 'error')
  } catch (error) { showToast('Hata oluştu', 'error') }
}

const openTasksModal = async (row: any) => {
  try {
    const result = await window.electronAPI.onboarding.getById(row.id)
    if (result.success) { selectedOnboarding.value = result.data; showTasksModal.value = true }
  } catch (error) { showToast('Görevler yüklenemedi', 'error') }
}

const closeTasksModal = () => { showTasksModal.value = false; selectedOnboarding.value = null }

const openAddTaskModal = () => { taskForm.title = ''; taskForm.category = 'Genel'; taskForm.description = ''; showAddTaskModal.value = true }
const closeAddTaskModal = () => { showAddTaskModal.value = false }

const handleAddTask = async () => {
  if (!taskForm.title) { showToast('Görev başlığı zorunludur', 'error'); return }
  try {
    const result = await window.electronAPI.onboarding.addTask(selectedOnboarding.value.id, taskForm)
    if (result.success) {
      showToast('Görev eklendi', 'success')
      closeAddTaskModal()
      const updated = await window.electronAPI.onboarding.getById(selectedOnboarding.value.id)
      if (updated.success) selectedOnboarding.value = updated.data
      await loadData()
    } else { showToast(result.errors?.[0] || 'Eklenemedi', 'error') }
  } catch (error) { showToast('Hata oluştu', 'error') }
}

const toggleTask = async (task: any) => {
  if (task.status === 'Completed') return
  try {
    const result = await window.electronAPI.onboarding.completeTask(task.id)
    if (result.success) {
      const updated = await window.electronAPI.onboarding.getById(selectedOnboarding.value.id)
      if (updated.success) selectedOnboarding.value = updated.data
      await loadData(); await loadStats()
    }
  } catch (error) { showToast('Hata oluştu', 'error') }
}

const deleteTask = async (task: any) => {
  const confirmed = await confirm({ title: 'Görev Sil', message: `"${task.title}" görevini silmek istiyor musunuz?`, confirmText: 'Sil', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.onboarding.deleteTask(task.id)
      if (result.success) {
        showToast('Görev silindi', 'success')
        const updated = await window.electronAPI.onboarding.getById(selectedOnboarding.value.id)
        if (updated.success) selectedOnboarding.value = updated.data
        await loadData()
      }
    } catch (error) { showToast('Hata oluştu', 'error') }
  }
}

onMounted(async () => { await Promise.all([loadData(), loadStats(), loadEmployees()]) })
</script>

<style scoped>
.onboarding-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-box { position: relative; display: flex; align-items: center; }
.search-box input { padding: 0.5rem 0.75rem 0.5rem 2.25rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; width: 250px; }
.search-box input:focus { outline: none; border-color: #0466c8; box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1); }
.search-icon { position: absolute; left: 0.75rem; color: #6c757d; }
.filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; }
.employee-cell { display: flex; flex-direction: column; }
.employee-name { font-weight: 500; }
.employee-code { font-size: 0.75rem; color: #6c757d; }
.status-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.status-planned { background: #cce5ff; color: #004085; }
.status-inprogress { background: #fff3cd; color: #856404; }
.status-completed { background: #d4edda; color: #155724; }
.status-cancelled { background: #e9ecef; color: #495057; }
.progress-cell { display: flex; align-items: center; gap: 0.5rem; }
.progress-bar { flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: #198754; transition: width 0.3s; }
.progress-text { font-size: 0.75rem; font-weight: 600; color: #495057; min-width: 40px; }
.btn-icon { width: 28px; height: 28px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-left: 4px; }
.btn-start { background: #cce5ff; color: #004085; }
.btn-start:hover { background: #b8daff; }
.btn-complete { background: #d4edda; color: #155724; }
.btn-complete:hover { background: #c3e6cb; }
.btn-tasks { background: #e7f1ff; color: #0466c8; }
.btn-tasks:hover { background: #d0e3ff; }
.btn-delete { background: #f8d7da; color: #721c24; }
.btn-delete:hover { background: #f5c6cb; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal-lg { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h2 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.btn-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #6c757d; }
.modal-body { padding: 1.5rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #495057; }
.form-label.required::after { content: ' *'; color: #dc3545; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.9rem; }
.form-control:focus { outline: none; border-color: #0466c8; box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1); }
.form-control:disabled { background: #e9ecef; cursor: not-allowed; }
textarea.form-control { resize: vertical; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; }
.checkbox-label input { width: 18px; height: 18px; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e9ecef; }
.btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #198754; color: white; }
.btn-primary:hover:not(:disabled) { background: #157347; }
.btn-secondary { background: #6c757d; color: white; }
.btn-secondary:hover:not(:disabled) { background: #5a6268; }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; }
.tasks-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.completion-info { font-weight: 600; color: #198754; }
.tasks-list { display: flex; flex-direction: column; gap: 0.5rem; }
.task-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; }
.task-item.task-completed { background: #d4edda; }
.task-checkbox input { width: 20px; height: 20px; cursor: pointer; }
.task-content { flex: 1; display: flex; flex-direction: column; }
.task-title { font-weight: 500; }
.task-category { font-size: 0.75rem; color: #6c757d; }
.task-actions { display: flex; gap: 0.25rem; }
.empty-tasks { text-align: center; padding: 2rem; color: #6c757d; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
