<template>
  <div class="resignation-requests-page">
    <PageHeader 
      title="İşten Ayrılma Talepleri" 
      description="Personel ayrılma taleplerini yönetin ve takip edin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Talep
        </button>
      </template>
    </PageHeader>

    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Talep" color="primary" />
      <StatCard icon="⏳" :value="stats.pending" label="Bekleyen" color="warning" />
      <StatCard icon="✅" :value="stats.approved" label="Onaylanan" color="success" />
      <StatCard icon="🏁" :value="stats.completed" label="Tamamlanan" color="info" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <input v-model="searchTerm" type="text" placeholder="Personel ara..." class="search-input" />
        <select v-model="filterStatus" @change="loadRequests" class="filter-select">
          <option value="">Tüm Durumlar</option>
          <option value="Pending">Bekleyen</option>
          <option value="Approved">Onaylanan</option>
          <option value="Completed">Tamamlanan</option>
        </select>
        <select v-model="filterReason" @change="loadRequests" class="filter-select">
          <option value="">Tüm Nedenler</option>
          <option v-for="r in reasonCategories" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </template>
    </ActionToolbar>

    <DataTable :columns="columns" :data="filteredRequests" :loading="loading" :show-actions="true"
      :show-pagination="true" :current-page="pagination.page" :total-pages="pagination.totalPages"
      :total="pagination.total" empty-text="Ayrılma talebi bulunmuyor" @page-change="handlePageChange">
      <template #cell-employee="{ row }">
        <div class="employee-cell">
          <div class="employee-avatar">{{ row.employee?.firstName?.charAt(0) }}{{ row.employee?.lastName?.charAt(0) }}</div>
          <div class="employee-info">
            <span class="employee-name">{{ row.employee?.firstName }} {{ row.employee?.lastName }}</span>
            <span class="employee-code">{{ row.employee?.employeeCode }}</span>
          </div>
        </div>
      </template>
      <template #cell-requestDate="{ value }">{{ formatDate(value) }}</template>
      <template #cell-reasonCategory="{ value }">
        <span :class="['reason-badge', `reason-${getReasonClass(value)}`]">{{ value }}</span>
      </template>
      <template #cell-lastWorkingDay="{ value }">
        <span v-if="value">{{ formatDate(value) }}</span>
        <span v-else class="text-muted">Belirlenmedi</span>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${value.toLowerCase()}`]">{{ getStatusLabel(value) }}</span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn view" @click.stop="viewRequest(row)" title="Detay">👁️</button>
        <button v-if="row.status === 'Pending'" class="action-btn approve" @click.stop="approveRequest(row)" title="Onayla">✅</button>
        <button v-if="row.status === 'Approved'" class="action-btn complete" @click.stop="completeRequest(row)" title="Tamamla">🏁</button>
        <button v-if="row.status === 'Pending'" class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        <button v-if="row.status === 'Pending'" class="action-btn delete" @click.stop="deleteRequest(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Talep Düzenle' : 'Yeni Ayrılma Talebi' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveRequest" class="modal-body">
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
                  <label>Talep Tarihi *</label>
                  <input v-model="form.requestDate" type="date" required class="form-control" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Ayrılma Nedeni *</label>
                  <select v-model="form.reasonCategory" required class="form-control">
                    <option value="">Seçin</option>
                    <option v-for="r in reasonCategories" :key="r.value" :value="r.value">{{ r.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Son Çalışma Günü</label>
                  <input v-model="form.lastWorkingDay" type="date" class="form-control" />
                </div>
              </div>
              <div class="form-group">
                <label>Detaylı Açıklama</label>
                <textarea v-model="form.reasonDetail" class="form-control" rows="3" placeholder="Ayrılma nedeni hakkında detay..."></textarea>
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
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h3>Ayrılma Talebi Detayı</h3>
              <button class="close-btn" @click="closeDetailModal">✕</button>
            </div>
            <div class="modal-body" v-if="selectedRequest">
              <div class="detail-card">
                <div class="detail-header">
                  <div class="employee-large">
                    <div class="avatar-lg">{{ selectedRequest.employee?.firstName?.charAt(0) }}{{ selectedRequest.employee?.lastName?.charAt(0) }}</div>
                    <div class="employee-details">
                      <h4>{{ selectedRequest.employee?.firstName }} {{ selectedRequest.employee?.lastName }}</h4>
                      <span>{{ selectedRequest.employee?.employeeCode }}</span>
                    </div>
                  </div>
                  <span :class="['status-badge', `status-${selectedRequest.status.toLowerCase()}`]">{{ getStatusLabel(selectedRequest.status) }}</span>
                </div>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="label">Talep Tarihi</span>
                    <span class="value">{{ formatDate(selectedRequest.requestDate) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Ayrılma Nedeni</span>
                    <span :class="['reason-badge', `reason-${getReasonClass(selectedRequest.reasonCategory)}`]">{{ selectedRequest.reasonCategory }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Son Çalışma Günü</span>
                    <span class="value">{{ selectedRequest.lastWorkingDay ? formatDate(selectedRequest.lastWorkingDay) : 'Belirlenmedi' }}</span>
                  </div>
                  <div class="detail-item" v-if="selectedRequest.reasonDetail">
                    <span class="label">Detay</span>
                    <span class="value">{{ selectedRequest.reasonDetail }}</span>
                  </div>
                </div>
              </div>
              <div class="exit-interview-section" v-if="selectedRequest.status !== 'Pending'">
                <h4>Çıkış Mülakatı</h4>
                <div v-if="exitInterview" class="interview-card">
                  <div class="interview-item">
                    <span class="label">Yorumlar:</span>
                    <p>{{ exitInterview.comments || 'Yorum yok' }}</p>
                  </div>
                  <div class="interview-item">
                    <span class="label">Tekrar İşe Alınır mı?</span>
                    <span :class="exitInterview.wouldRehire ? 'text-success' : 'text-danger'">
                      {{ exitInterview.wouldRehire ? '✅ Evet' : '❌ Hayır' }}
                    </span>
                  </div>
                </div>
                <div v-else class="no-interview">
                  <p>Çıkış mülakatı henüz yapılmadı</p>
                  <button class="btn btn-outline btn-sm" @click="openInterviewModal">➕ Mülakat Ekle</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showInterviewModal" class="modal-overlay" @click.self="closeInterviewModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Çıkış Mülakatı</h3>
              <button class="close-btn" @click="closeInterviewModal">✕</button>
            </div>
            <form @submit.prevent="saveInterview" class="modal-body">
              <div class="form-group">
                <label>Yorumlar / Geri Bildirim</label>
                <textarea v-model="interviewForm.comments" class="form-control" rows="4" placeholder="Çıkış mülakatı notları..."></textarea>
              </div>
              <div class="form-group">
                <label>Tekrar İşe Alınır mı?</label>
                <div class="radio-group">
                  <label class="radio-label"><input type="radio" v-model="interviewForm.wouldRehire" :value="true" /> Evet</label>
                  <label class="radio-label"><input type="radio" v-model="interviewForm.wouldRehire" :value="false" /> Hayır</label>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeInterviewModal">İptal</button>
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
const showModal = ref(false)
const showDetailModal = ref(false)
const showInterviewModal = ref(false)
const isEditing = ref(false)
const requests = ref<any[]>([])
const employees = ref<any[]>([])
const selectedRequest = ref<any>(null)
const exitInterview = ref<any>(null)
const searchTerm = ref('')
const filterStatus = ref('')
const filterReason = ref('')

const form = reactive({ id: null as number | null, employeeId: '', requestDate: '', reasonCategory: '', reasonDetail: '', lastWorkingDay: '' })
const interviewForm = reactive({ comments: '', wouldRehire: null as boolean | null })
const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })
const stats = reactive({ total: 0, pending: 0, approved: 0, completed: 0 })

const reasonCategories = [
  { value: 'İstifa', label: '📝 İstifa' },
  { value: 'Emeklilik', label: '🏖️ Emeklilik' },
  { value: 'Çıkarılma', label: '🚪 Çıkarılma' },
  { value: 'Sözleşme Bitimi', label: '📄 Sözleşme Bitimi' }
]

const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'requestDate', label: 'Talep Tarihi', width: '120px' },
  { key: 'reasonCategory', label: 'Neden', width: '140px' },
  { key: 'lastWorkingDay', label: 'Son Gün', width: '120px' },
  { key: 'status', label: 'Durum', width: '130px' }
]

const filteredRequests = computed(() => {
  if (!searchTerm.value) return requests.value
  const term = searchTerm.value.toLowerCase()
  return requests.value.filter(r => 
    r.employee?.firstName?.toLowerCase().includes(term) ||
    r.employee?.lastName?.toLowerCase().includes(term) ||
    r.employee?.employeeCode?.toLowerCase().includes(term)
  )
})

const loadRequests = async () => {
  loading.value = true
  try {
    const options: any = { page: pagination.page, limit: pagination.limit }
    if (filterStatus.value) options.status = filterStatus.value
    if (filterReason.value) options.reasonCategory = filterReason.value
    const result = await window.electronAPI.offboarding.getAllResignations(options)
    if (result.success) {
      requests.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    }
  } catch (err) { error('Talepler yüklenemedi') }
  finally { loading.value = false }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 500, status: 'Active' })
    if (result.success) employees.value = result.data || []
  } catch (err) { /* ignore */ }
}

const updateStats = () => {
  stats.total = requests.value.length
  stats.pending = requests.value.filter(r => r.status === 'Pending').length
  stats.approved = requests.value.filter(r => r.status === 'Approved').length
  stats.completed = requests.value.filter(r => r.status === 'Completed').length
}

const openCreateModal = () => { isEditing.value = false; resetForm(); form.requestDate = new Date().toISOString().split('T')[0] || ''; showModal.value = true }
const openEditModal = (req: any) => {
  isEditing.value = true
  Object.assign(form, { id: req.id, employeeId: req.employeeId, requestDate: req.requestDate?.split('T')[0] || '', reasonCategory: req.reasonCategory, reasonDetail: req.reasonDetail || '', lastWorkingDay: req.lastWorkingDay?.split('T')[0] || '' })
  showModal.value = true
}
const closeModal = () => { showModal.value = false; resetForm() }
const resetForm = () => { form.id = null; form.employeeId = ''; form.requestDate = ''; form.reasonCategory = ''; form.reasonDetail = ''; form.lastWorkingDay = '' }

const saveRequest = async () => {
  saving.value = true
  try {
    const data = { employeeId: Number(form.employeeId), requestDate: new Date(form.requestDate), reasonCategory: form.reasonCategory, reasonDetail: form.reasonDetail || null, lastWorkingDay: form.lastWorkingDay ? new Date(form.lastWorkingDay) : null }
    const result = isEditing.value ? await window.electronAPI.offboarding.updateResignation(form.id!, data) : await window.electronAPI.offboarding.createResignation(data)
    if (result.success) { success(isEditing.value ? 'Talep güncellendi' : 'Talep oluşturuldu'); closeModal(); await loadRequests() }
    else { error(result.errors?.[0] || 'İşlem başarısız') }
  } catch (err) { error('Kaydetme sırasında hata oluştu') }
  finally { saving.value = false }
}

const viewRequest = async (req: any) => {
  selectedRequest.value = req
  exitInterview.value = null
  try {
    const result = await window.electronAPI.offboarding.getExitInterviewByResignation(req.id)
    if (result.success && result.data) exitInterview.value = result.data
  } catch (err) { /* ignore */ }
  showDetailModal.value = true
}
const closeDetailModal = () => { showDetailModal.value = false; selectedRequest.value = null; exitInterview.value = null }

const approveRequest = async (req: any) => {
  const confirmed = await confirm({ title: 'Talebi Onayla', message: `${req.employee?.firstName} ${req.employee?.lastName} için ayrılma talebini onaylamak istiyor musunuz?`, confirmText: 'Onayla', type: 'warning' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.offboarding.approveResignation(req.id, req.lastWorkingDay)
      if (result.success) { success('Talep onaylandı'); await loadRequests() }
      else { error(result.errors?.[0] || 'Onaylama başarısız') }
    } catch (err) { error('Onaylama sırasında hata oluştu') }
  }
}

const completeRequest = async (req: any) => {
  const confirmed = await confirm({ title: 'Talebi Tamamla', message: 'Bu ayrılma işlemini tamamlamak istiyor musunuz? Personel durumu "Terminated" olarak güncellenecektir.', confirmText: 'Tamamla', type: 'info' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.offboarding.completeResignation(req.id)
      if (result.success) { success('Ayrılma işlemi tamamlandı'); await loadRequests() }
      else { error(result.errors?.[0] || 'Tamamlama başarısız') }
    } catch (err) { error('Tamamlama sırasında hata oluştu') }
  }
}

const deleteRequest = async (req: any) => {
  const confirmed = await confirm({ title: 'Talebi Sil', message: 'Bu ayrılma talebini silmek istediğinize emin misiniz?', confirmText: 'Sil', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.offboarding.deleteResignation(req.id)
      if (result.success) { success('Talep silindi'); await loadRequests() }
      else { error(result.errors?.[0] || 'Silme başarısız') }
    } catch (err) { error('Silme sırasında hata oluştu') }
  }
}

const openInterviewModal = () => { interviewForm.comments = ''; interviewForm.wouldRehire = null; showInterviewModal.value = true }
const closeInterviewModal = () => { showInterviewModal.value = false }

const saveInterview = async () => {
  if (!selectedRequest.value) return
  saving.value = true
  try {
    const data = { comments: interviewForm.comments || null, wouldRehire: interviewForm.wouldRehire }
    const result = await window.electronAPI.offboarding.createExitInterview(selectedRequest.value.id, data)
    if (result.success) { success('Çıkış mülakatı kaydedildi'); closeInterviewModal(); await viewRequest(selectedRequest.value) }
    else { error(result.errors?.[0] || 'Kaydetme başarısız') }
  } catch (err) { error('Kaydetme sırasında hata oluştu') }
  finally { saving.value = false }
}

const handlePageChange = (page: number) => { pagination.page = page; loadRequests() }
const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { Pending: '⏳ Bekliyor', Approved: '✅ Onaylandı', Completed: '🏁 Tamamlandı' }
  return labels[status] || status
}
const getReasonClass = (reason: string) => {
  const map: Record<string, string> = { 'İstifa': 'resign', 'Emeklilik': 'retire', 'Çıkarılma': 'terminate', 'Sözleşme Bitimi': 'contract' }
  return map[reason] || 'other'
}
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('tr-TR') : '-'

onMounted(async () => { await loadEmployees(); await loadRequests() })
</script>

<style scoped>
.resignation-requests-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-input, .filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; }
.search-input { min-width: 180px; }
.filter-select { min-width: 130px; }

.employee-cell { display: flex; align-items: center; gap: 0.75rem; }
.employee-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.75rem; }
.employee-info { display: flex; flex-direction: column; }
.employee-name { font-weight: 600; color: #2c3e50; }
.employee-code { font-size: 0.75rem; color: #6c757d; }
.text-muted { color: #adb5bd; }

.reason-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
.reason-resign { background: #fff3cd; color: #856404; }
.reason-retire { background: #d4edda; color: #155724; }
.reason-terminate { background: #f8d7da; color: #721c24; }
.reason-contract { background: #cce5ff; color: #004085; }

.status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.status-pending { background: #fff3cd; color: #856404; }
.status-approved { background: #d4edda; color: #155724; }
.status-completed { background: #cce5ff; color: #004085; }

.action-btn { padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: all 0.2s; margin: 0 0.125rem; }
.action-btn:hover { transform: scale(1.1); }
.action-btn.view:hover { background: #e7f1ff; }
.action-btn.approve:hover { background: #d4edda; }
.action-btn.complete:hover { background: #cce5ff; }
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
.btn-outline { background: white; border: 1px solid #dee2e6; color: #495057; }
.btn-outline:hover { background: #f8f9fa; }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; }

.detail-card { background: #f8f9fa; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e9ecef; }
.employee-large { display: flex; align-items: center; gap: 1rem; }
.avatar-lg { width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1rem; }
.employee-details h4 { margin: 0; color: #2c3e50; }
.employee-details span { font-size: 0.85rem; color: #6c757d; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
.detail-item .label { font-size: 0.8rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
.detail-item .value { color: #2c3e50; font-weight: 500; }

.exit-interview-section { margin-top: 1.5rem; }
.exit-interview-section h4 { margin: 0 0 1rem; color: #2c3e50; font-size: 1rem; }
.interview-card { background: #f8f9fa; border-radius: 8px; padding: 1rem; }
.interview-item { margin-bottom: 0.75rem; }
.interview-item .label { font-weight: 600; color: #495057; }
.interview-item p { margin: 0.25rem 0 0; color: #2c3e50; }
.text-success { color: #198754; }
.text-danger { color: #dc3545; }
.no-interview { text-align: center; padding: 1.5rem; background: #f8f9fa; border-radius: 8px; }
.no-interview p { margin: 0 0 1rem; color: #6c757d; }

.radio-group { display: flex; gap: 1.5rem; }
.radio-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.radio-label input { cursor: pointer; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
