<template>
  <div class="training-requests-page">
    <PageHeader 
      title="Eğitim Talepleri" 
      description="Personel eğitim atamalarını ve durumlarını takip edin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openAssignModal">
          ➕ Yeni Eğitim Ata
        </button>
      </template>
    </PageHeader>

    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Kayıt" color="primary" />
      <StatCard icon="⏳" :value="stats.planned" label="Planlanan" color="warning" />
      <StatCard icon="✅" :value="stats.completed" label="Tamamlanan" color="success" />
      <StatCard icon="❌" :value="stats.failed" label="Başarısız" color="danger" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <input v-model="searchTerm" type="text" placeholder="Personel ara..." class="search-input" />
        <select v-model="filterStatus" @change="loadRecords" class="filter-select">
          <option value="">Tüm Durumlar</option>
          <option value="Planned">Planlanan</option>
          <option value="Completed">Tamamlanan</option>
          <option value="Failed">Başarısız</option>
        </select>
      </template>
    </ActionToolbar>

    <DataTable :columns="columns" :data="filteredRecords" :loading="loading" :show-actions="true"
      :show-pagination="true" :current-page="pagination.page" :total-pages="pagination.totalPages"
      :total="pagination.total" empty-text="Eğitim kaydı bulunmuyor" @page-change="handlePageChange">
      <template #cell-employee="{ row }">
        <div class="employee-cell">
          <div class="employee-avatar">{{ row.employee?.firstName?.charAt(0) }}{{ row.employee?.lastName?.charAt(0) }}</div>
          <div class="employee-info">
            <span class="employee-name">{{ row.employee?.firstName }} {{ row.employee?.lastName }}</span>
            <span class="employee-code">{{ row.employee?.employeeCode }}</span>
          </div>
        </div>
      </template>
      <template #cell-training="{ row }">
        <div class="training-cell">
          <span class="training-title">{{ row.training?.title }}</span>
          <span class="training-meta">{{ row.training?.provider }} • {{ row.training?.durationHours }} saat</span>
        </div>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${value.toLowerCase()}`]">{{ getStatusLabel(value) }}</span>
      </template>
      <template #cell-completionDate="{ value }">
        <span v-if="value">{{ formatDate(value) }}</span>
        <span v-else class="text-muted">-</span>
      </template>
      <template #cell-certificateUrl="{ value }">
        <a v-if="value" :href="value" target="_blank" class="certificate-link">📜 Sertifika</a>
        <span v-else class="text-muted">-</span>
      </template>
      <template #actions="{ row }">
        <button v-if="row.status === 'Planned'" class="action-btn complete" @click.stop="completeRecord(row)" title="Tamamla">✅</button>
        <button v-if="row.status === 'Planned'" class="action-btn fail" @click.stop="failRecord(row)" title="Başarısız">❌</button>
        <button v-if="row.status === 'Completed' && !row.certificateUrl" class="action-btn cert" @click.stop="addCertificate(row)" title="Sertifika Ekle">📜</button>
        <button v-if="row.status !== 'Completed'" class="action-btn delete" @click.stop="deleteRecord(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAssignModal" class="modal-overlay" @click.self="closeAssignModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Yeni Eğitim Ata</h3>
              <button class="close-btn" @click="closeAssignModal">✕</button>
            </div>
            <form @submit.prevent="assignTraining" class="modal-body">
              <div class="form-group">
                <label>Personel *</label>
                <select v-model="assignForm.employeeId" required class="form-control">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Eğitim *</label>
                <select v-model="assignForm.trainingId" required class="form-control">
                  <option value="">Eğitim Seçin</option>
                  <option v-for="t in trainings" :key="t.id" :value="t.id">
                    {{ t.title }} ({{ t.durationHours }} saat)
                  </option>
                </select>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeAssignModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Atanıyor...' : 'Ata' }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCertModal" class="modal-overlay" @click.self="closeCertModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Sertifika Ekle</h3>
              <button class="close-btn" @click="closeCertModal">✕</button>
            </div>
            <form @submit.prevent="saveCertificate" class="modal-body">
              <div class="form-group">
                <label>Sertifika URL / Dosya Yolu</label>
                <input v-model="certForm.url" type="text" class="form-control" placeholder="https://... veya dosya yolu" />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeCertModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">Kaydet</button>
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
const showAssignModal = ref(false)
const showCertModal = ref(false)
const records = ref<any[]>([])
const employees = ref<any[]>([])
const trainings = ref<any[]>([])
const searchTerm = ref('')
const filterStatus = ref('')
const selectedRecord = ref<any>(null)

const assignForm = reactive({ employeeId: '', trainingId: '' })
const certForm = reactive({ url: '' })
const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })
const stats = reactive({ total: 0, planned: 0, completed: 0, failed: 0 })

const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'training', label: 'Eğitim', sortable: true },
  { key: 'status', label: 'Durum', width: '130px' },
  { key: 'completionDate', label: 'Tamamlanma', width: '120px' },
  { key: 'certificateUrl', label: 'Sertifika', width: '100px' }
]

const filteredRecords = computed(() => {
  if (!searchTerm.value) return records.value
  const term = searchTerm.value.toLowerCase()
  return records.value.filter(r => 
    r.employee?.firstName?.toLowerCase().includes(term) ||
    r.employee?.lastName?.toLowerCase().includes(term) ||
    r.employee?.employeeCode?.toLowerCase().includes(term)
  )
})

const loadRecords = async () => {
  loading.value = true
  try {
    const options: any = { page: pagination.page, limit: pagination.limit }
    if (filterStatus.value) options.status = filterStatus.value
    const result = await window.electronAPI.training.getAllEmployeeTrainings(options)
    if (result.success) {
      records.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    }
  } catch (err) { error('Kayıtlar yüklenemedi') }
  finally { loading.value = false }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 500, status: 'Active' })
    if (result.success) employees.value = result.data || []
  } catch (err) { /* ignore */ }
}

const loadTrainings = async () => {
  try {
    const result = await window.electronAPI.training.getAll({ limit: 500 })
    if (result.success) trainings.value = result.data || []
  } catch (err) { /* ignore */ }
}

const updateStats = () => {
  stats.total = records.value.length
  stats.planned = records.value.filter(r => r.status === 'Planned').length
  stats.completed = records.value.filter(r => r.status === 'Completed').length
  stats.failed = records.value.filter(r => r.status === 'Failed').length
}

const openAssignModal = () => { assignForm.employeeId = ''; assignForm.trainingId = ''; showAssignModal.value = true }
const closeAssignModal = () => { showAssignModal.value = false }

const assignTraining = async () => {
  if (!assignForm.employeeId || !assignForm.trainingId) return
  saving.value = true
  try {
    const result = await window.electronAPI.training.assignEmployee(Number(assignForm.trainingId), Number(assignForm.employeeId))
    if (result.success) { success('Eğitim atandı'); closeAssignModal(); await loadRecords() }
    else { error(result.errors?.[0] || 'Atama başarısız') }
  } catch (err) { error('Atama sırasında hata oluştu') }
  finally { saving.value = false }
}

const completeRecord = async (record: any) => {
  const confirmed = await confirm({ title: 'Eğitimi Tamamla', message: `${record.employee?.firstName} ${record.employee?.lastName} için "${record.training?.title}" eğitimini tamamlandı olarak işaretlemek istiyor musunuz?`, confirmText: 'Tamamla', type: 'success' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.training.completeTraining(record.id)
      if (result.success) { success('Eğitim tamamlandı'); await loadRecords() }
      else { error(result.errors?.[0] || 'İşlem başarısız') }
    } catch (err) { error('İşlem sırasında hata oluştu') }
  }
}

const failRecord = async (record: any) => {
  const confirmed = await confirm({ title: 'Eğitim Başarısız', message: `${record.employee?.firstName} ${record.employee?.lastName} için "${record.training?.title}" eğitimini başarısız olarak işaretlemek istiyor musunuz?`, confirmText: 'Başarısız', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.training.failTraining(record.id)
      if (result.success) { success('Eğitim başarısız olarak işaretlendi'); await loadRecords() }
      else { error(result.errors?.[0] || 'İşlem başarısız') }
    } catch (err) { error('İşlem sırasında hata oluştu') }
  }
}

const deleteRecord = async (record: any) => {
  const confirmed = await confirm({ title: 'Kaydı Sil', message: 'Bu eğitim kaydını silmek istediğinize emin misiniz?', confirmText: 'Sil', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.training.removeEmployee(record.id)
      if (result.success) { success('Kayıt silindi'); await loadRecords() }
      else { error(result.errors?.[0] || 'Silme başarısız') }
    } catch (err) { error('Silme sırasında hata oluştu') }
  }
}

const addCertificate = (record: any) => { selectedRecord.value = record; certForm.url = ''; showCertModal.value = true }
const closeCertModal = () => { showCertModal.value = false; selectedRecord.value = null }

const saveCertificate = async () => {
  if (!selectedRecord.value) return
  saving.value = true
  try {
    const result = await window.electronAPI.training.completeTraining(selectedRecord.value.id, certForm.url || undefined)
    if (result.success) { success('Sertifika eklendi'); closeCertModal(); await loadRecords() }
    else { error(result.errors?.[0] || 'İşlem başarısız') }
  } catch (err) { error('İşlem sırasında hata oluştu') }
  finally { saving.value = false }
}

const handlePageChange = (page: number) => { pagination.page = page; loadRecords() }
const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { Planned: '⏳ Planlanan', Completed: '✅ Tamamlandı', Failed: '❌ Başarısız' }
  return labels[status] || status
}
const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR')

onMounted(async () => { await loadEmployees(); await loadTrainings(); await loadRecords() })
</script>

<style scoped>
.training-requests-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-input, .filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; }
.search-input { min-width: 200px; }
.filter-select { min-width: 150px; }

.employee-cell { display: flex; align-items: center; gap: 0.75rem; }
.employee-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.75rem; }
.employee-info { display: flex; flex-direction: column; }
.employee-name { font-weight: 600; color: #2c3e50; }
.employee-code { font-size: 0.75rem; color: #6c757d; }

.training-cell { display: flex; flex-direction: column; }
.training-title { font-weight: 600; color: #2c3e50; }
.training-meta { font-size: 0.8rem; color: #6c757d; }
.text-muted { color: #adb5bd; }
.certificate-link { color: #0466c8; text-decoration: none; font-weight: 500; }
.certificate-link:hover { text-decoration: underline; }

.status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.status-planned { background: #fff3cd; color: #856404; }
.status-completed { background: #d4edda; color: #155724; }
.status-failed { background: #f8d7da; color: #721c24; }

.action-btn { padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: all 0.2s; margin: 0 0.125rem; }
.action-btn:hover { transform: scale(1.1); }
.action-btn.complete:hover { background: #d4edda; }
.action-btn.fail:hover { background: #f8d7da; }
.action-btn.cert:hover { background: #e7f1ff; }
.action-btn.delete:hover { background: #f8d7da; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-container { background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.95rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #e9ecef; margin-top: 1rem; }
.btn { padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
