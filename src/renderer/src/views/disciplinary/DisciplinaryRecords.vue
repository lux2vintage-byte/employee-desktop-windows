<template>
  <div class="disciplinary-records-page">
    <PageHeader 
      title="Uyarı / Ceza Kayıtları" 
      description="Personel disiplin kayıtlarını oluşturun ve yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Kayıt
        </button>
      </template>
    </PageHeader>

    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Kayıt" color="primary" />
      <StatCard icon="⚠️" :value="stats.warnings" label="Uyarı" color="warning" />
      <StatCard icon="📝" :value="stats.written" label="Yazılı Uyarı" color="info" />
      <StatCard icon="💰" :value="stats.deductions" label="Maaş Kesintisi" color="danger" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <input v-model="searchTerm" type="text" placeholder="Personel ara..." class="search-input" />
        <select v-model="filterViolation" @change="loadRecords" class="filter-select">
          <option value="">Tüm İhlaller</option>
          <option v-for="v in violationTypes" :key="v.value" :value="v.value">{{ v.label }}</option>
        </select>
        <select v-model="filterAction" @change="loadRecords" class="filter-select">
          <option value="">Tüm Aksiyonlar</option>
          <option v-for="a in actionTypes" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
      </template>
    </ActionToolbar>

    <DataTable :columns="columns" :data="filteredRecords" :loading="loading" :show-actions="true"
      :show-pagination="true" :current-page="pagination.page" :total-pages="pagination.totalPages"
      :total="pagination.total" empty-text="Disiplin kaydı bulunmuyor" @page-change="handlePageChange">
      <template #cell-employee="{ row }">
        <div class="employee-cell">
          <div class="employee-avatar">{{ row.employee?.firstName?.charAt(0) }}{{ row.employee?.lastName?.charAt(0) }}</div>
          <div class="employee-info">
            <span class="employee-name">{{ row.employee?.firstName }} {{ row.employee?.lastName }}</span>
            <span class="employee-code">{{ row.employee?.employeeCode }}</span>
          </div>
        </div>
      </template>
      <template #cell-incidentDate="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #cell-violationType="{ value }">
        <span :class="['violation-badge', `violation-${getViolationClass(value)}`]">{{ getViolationLabel(value) }}</span>
      </template>
      <template #cell-actionTaken="{ value }">
        <span :class="['action-badge', `action-${getActionClass(value)}`]">{{ getActionLabel(value) }}</span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn view" @click.stop="viewRecord(row)" title="Detay">👁️</button>
        <button class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        <button class="action-btn delete" @click.stop="deleteRecord(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Kayıt Düzenle' : 'Yeni Disiplin Kaydı' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveRecord" class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Personel *</label>
                  <select v-model="form.employeeId" required class="form-control" :disabled="isEditing">
                    <option value="">Personel Seçin</option>
                    <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                      {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Olay Tarihi *</label>
                  <input v-model="form.incidentDate" type="date" required class="form-control" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>İhlal Türü *</label>
                  <select v-model="form.violationType" required class="form-control">
                    <option value="">Seçin</option>
                    <option v-for="v in violationTypes" :key="v.value" :value="v.value">{{ v.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Alınan Aksiyon *</label>
                  <select v-model="form.actionTaken" required class="form-control">
                    <option value="">Seçin</option>
                    <option v-for="a in actionTypes" :key="a.value" :value="a.value">{{ a.label }}</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Savunma</label>
                <textarea v-model="form.defense" class="form-control" rows="3" placeholder="Personelin savunması..."></textarea>
              </div>
              <div class="form-group">
                <label>Belge Yolu</label>
                <input v-model="form.documentPath" type="text" class="form-control" placeholder="Belge dosya yolu veya URL" />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Disiplin Kaydı Detayı</h3>
              <button class="close-btn" @click="closeDetailModal">✕</button>
            </div>
            <div class="modal-body" v-if="selectedRecord">
              <div class="detail-section">
                <div class="detail-row">
                  <span class="detail-label">Personel:</span>
                  <span class="detail-value">{{ selectedRecord.employee?.firstName }} {{ selectedRecord.employee?.lastName }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Olay Tarihi:</span>
                  <span class="detail-value">{{ formatDate(selectedRecord.incidentDate) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">İhlal Türü:</span>
                  <span :class="['violation-badge', `violation-${getViolationClass(selectedRecord.violationType)}`]">{{ getViolationLabel(selectedRecord.violationType) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Alınan Aksiyon:</span>
                  <span :class="['action-badge', `action-${getActionClass(selectedRecord.actionTaken)}`]">{{ getActionLabel(selectedRecord.actionTaken) }}</span>
                </div>
                <div class="detail-row" v-if="selectedRecord.defense">
                  <span class="detail-label">Savunma:</span>
                  <span class="detail-value detail-text">{{ selectedRecord.defense }}</span>
                </div>
                <div class="detail-row" v-if="selectedRecord.documentPath">
                  <span class="detail-label">Belge:</span>
                  <a :href="selectedRecord.documentPath" target="_blank" class="detail-link">📄 Belgeyi Görüntüle</a>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Kayıt Tarihi:</span>
                  <span class="detail-value">{{ formatDateTime(selectedRecord.createdAt) }}</span>
                </div>
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
const showModal = ref(false)
const showDetailModal = ref(false)
const isEditing = ref(false)
const records = ref<any[]>([])
const employees = ref<any[]>([])
const selectedRecord = ref<any>(null)
const searchTerm = ref('')
const filterViolation = ref('')
const filterAction = ref('')

const form = reactive({
  id: null as number | null,
  employeeId: '',
  incidentDate: '',
  violationType: '',
  actionTaken: '',
  defense: '',
  documentPath: ''
})

const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })
const stats = reactive({ total: 0, warnings: 0, written: 0, deductions: 0 })

const violationTypes = [
  { value: 'İşe Geç Kalma', label: '⏰ İşe Geç Kalma' },
  { value: 'İş Güvenliği İhlali', label: '🦺 İş Güvenliği İhlali' },
  { value: 'Devamsızlık', label: '📅 Devamsızlık' },
  { value: 'Görev İhmali', label: '📋 Görev İhmali' },
  { value: 'Diğer', label: '📝 Diğer' }
]

const actionTypes = [
  { value: 'Sözlü Uyarı', label: '💬 Sözlü Uyarı' },
  { value: 'Yazılı Uyarı', label: '📝 Yazılı Uyarı' },
  { value: 'Tutanak', label: '📋 Tutanak' },
  { value: 'Maaş Kesintisi', label: '💰 Maaş Kesintisi' },
  { value: 'İşten Çıkarma', label: '🚪 İşten Çıkarma' }
]

const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'incidentDate', label: 'Olay Tarihi', width: '120px' },
  { key: 'violationType', label: 'İhlal Türü', width: '160px' },
  { key: 'actionTaken', label: 'Alınan Aksiyon', width: '150px' }
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
    if (filterViolation.value) options.violationType = filterViolation.value
    if (filterAction.value) options.actionTaken = filterAction.value
    const result = await window.electronAPI.disciplinary.getAll(options)
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

const updateStats = () => {
  stats.total = records.value.length
  stats.warnings = records.value.filter(r => r.actionTaken === 'Sözlü Uyarı').length
  stats.written = records.value.filter(r => r.actionTaken === 'Yazılı Uyarı' || r.actionTaken === 'Tutanak').length
  stats.deductions = records.value.filter(r => r.actionTaken === 'Maaş Kesintisi').length
}

const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  form.incidentDate = new Date().toISOString().split('T')[0] || ''
  showModal.value = true
}

const openEditModal = (record: any) => {
  isEditing.value = true
  Object.assign(form, {
    id: record.id,
    employeeId: record.employeeId,
    incidentDate: record.incidentDate?.split('T')[0] || '',
    violationType: record.violationType,
    actionTaken: record.actionTaken,
    defense: record.defense || '',
    documentPath: record.documentPath || ''
  })
  showModal.value = true
}

const closeModal = () => { showModal.value = false; resetForm() }
const resetForm = () => {
  form.id = null; form.employeeId = ''; form.incidentDate = ''
  form.violationType = ''; form.actionTaken = ''; form.defense = ''; form.documentPath = ''
}

const saveRecord = async () => {
  saving.value = true
  try {
    const data = {
      employeeId: Number(form.employeeId),
      incidentDate: new Date(form.incidentDate),
      violationType: form.violationType,
      actionTaken: form.actionTaken,
      defense: form.defense || null,
      documentPath: form.documentPath || null
    }
    const result = isEditing.value
      ? await window.electronAPI.disciplinary.update(form.id!, data)
      : await window.electronAPI.disciplinary.create(data)
    if (result.success) {
      success(isEditing.value ? 'Kayıt güncellendi' : 'Kayıt oluşturuldu')
      closeModal(); await loadRecords()
    } else { error(result.errors?.[0] || 'İşlem başarısız') }
  } catch (err) { error('Kaydetme sırasında hata oluştu') }
  finally { saving.value = false }
}

const viewRecord = (record: any) => { selectedRecord.value = record; showDetailModal.value = true }
const closeDetailModal = () => { showDetailModal.value = false; selectedRecord.value = null }

const deleteRecord = async (record: any) => {
  const confirmed = await confirm({
    title: 'Kaydı Sil',
    message: 'Bu disiplin kaydını silmek istediğinize emin misiniz?',
    confirmText: 'Sil',
    type: 'danger'
  })
  if (confirmed) {
    try {
      const result = await window.electronAPI.disciplinary.delete(record.id)
      if (result.success) { success('Kayıt silindi'); await loadRecords() }
      else { error(result.errors?.[0] || 'Silme başarısız') }
    } catch (err) { error('Silme sırasında hata oluştu') }
  }
}

const handlePageChange = (page: number) => { pagination.page = page; loadRecords() }
const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

const getViolationLabel = (type: string) => violationTypes.find(v => v.value === type)?.label || type
const getViolationClass = (type: string) => {
  const map: Record<string, string> = { 'İşe Geç Kalma': 'late', 'İş Güvenliği İhlali': 'safety', 'Devamsızlık': 'absence', 'Görev İhmali': 'neglect', 'Diğer': 'other' }
  return map[type] || 'other'
}
const getActionLabel = (action: string) => actionTypes.find(a => a.value === action)?.label || action
const getActionClass = (action: string) => {
  const map: Record<string, string> = { 'Sözlü Uyarı': 'verbal', 'Yazılı Uyarı': 'written', 'Tutanak': 'record', 'Maaş Kesintisi': 'deduction', 'İşten Çıkarma': 'termination' }
  return map[action] || 'other'
}
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('tr-TR') : '-'
const formatDateTime = (date: string) => date ? new Date(date).toLocaleString('tr-TR') : '-'

onMounted(async () => { await loadEmployees(); await loadRecords() })
</script>

<style scoped>
.disciplinary-records-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-input, .filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; }
.search-input { min-width: 180px; }
.filter-select { min-width: 140px; }

.employee-cell { display: flex; align-items: center; gap: 0.75rem; }
.employee-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.75rem; }
.employee-info { display: flex; flex-direction: column; }
.employee-name { font-weight: 600; color: #2c3e50; }
.employee-code { font-size: 0.75rem; color: #6c757d; }

.violation-badge, .action-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
.violation-late { background: #fff3cd; color: #856404; }
.violation-safety { background: #f8d7da; color: #721c24; }
.violation-absence { background: #cce5ff; color: #004085; }
.violation-neglect { background: #e2e3e5; color: #383d41; }
.violation-other { background: #f8f9fa; color: #495057; }

.action-verbal { background: #d4edda; color: #155724; }
.action-written { background: #fff3cd; color: #856404; }
.action-record { background: #cce5ff; color: #004085; }
.action-deduction { background: #f8d7da; color: #721c24; }
.action-termination { background: #721c24; color: white; }

.action-btn { padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: all 0.2s; margin: 0 0.125rem; }
.action-btn:hover { transform: scale(1.1); }
.action-btn.view:hover { background: #e7f1ff; }
.action-btn.edit:hover { background: #fff3cd; }
.action-btn.delete:hover { background: #f8d7da; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-container { background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
.modal-container.modal-lg { max-width: 650px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.95rem; }
textarea.form-control { resize: vertical; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #e9ecef; margin-top: 1rem; }
.btn { padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }

.detail-section { display: flex; flex-direction: column; gap: 1rem; }
.detail-row { display: flex; align-items: flex-start; gap: 1rem; }
.detail-label { font-weight: 600; color: #6c757d; min-width: 120px; }
.detail-value { color: #2c3e50; }
.detail-text { white-space: pre-wrap; }
.detail-link { color: #0466c8; text-decoration: none; }
.detail-link:hover { text-decoration: underline; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
