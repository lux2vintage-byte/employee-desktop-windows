<template>
  <div class="leave-request-page">
    <PageHeader 
      title="İzin Talepleri" 
      description="Personel izin taleplerini görüntüleyin ve yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openNewModal">
          ➕ Yeni İzin Talebi
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Talep" color="primary" />
      <StatCard icon="⏳" :value="stats.pending" label="Onay Bekleyen" color="warning" />
      <StatCard icon="✅" :value="stats.approved" label="Onaylanan" color="success" />
      <StatCard icon="❌" :value="stats.rejected" label="Reddedilen" color="danger" />
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
          <select v-model="filters.status" @change="loadRequests" class="filter-select">
            <option value="">Tüm Durumlar</option>
            <option value="Pending">Onay Bekliyor</option>
            <option value="Approved">Onaylandı</option>
            <option value="Rejected">Reddedildi</option>
            <option value="Cancelled">İptal Edildi</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filters.employeeId" @change="loadRequests" class="filter-select">
            <option value="">Tüm Personeller</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.firstName }} {{ emp.lastName }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filters.leaveTypeId" @change="loadRequests" class="filter-select">
            <option value="">Tüm İzin Türleri</option>
            <option v-for="lt in leaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <!-- İzin Talepleri Tablosu -->
    <DataTable
      :columns="columns"
      :data="requests"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="İzin talebi bulunmuyor"
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
      <template #cell-leaveType="{ row }">
        <span class="leave-type-badge">{{ row.leaveType?.name || '-' }}</span>
      </template>
      <template #cell-dateRange="{ row }">
        <div class="date-range">
          <span>{{ formatDate(row.startDate) }}</span>
          <span class="date-separator">→</span>
          <span>{{ formatDate(row.endDate) }}</span>
        </div>
      </template>
      <template #cell-dayCount="{ value }">
        <span class="day-count">{{ value }} gün</span>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${getStatusClass(value)}`]">
          {{ getStatusLabel(value) }}
        </span>
      </template>
      <template #actions="{ row }">
        <template v-if="row.status === 'Pending'">
          <button class="action-btn approve" @click.stop="approveRequest(row)" title="Onayla">✓</button>
          <button class="action-btn reject" @click.stop="rejectRequest(row)" title="Reddet">✗</button>
        </template>
        <button class="action-btn view" @click.stop="viewRequest(row)" title="Detay">👁️</button>
        <button 
          v-if="row.status === 'Pending'" 
          class="action-btn delete" 
          @click.stop="cancelRequest(row)" 
          title="İptal Et"
        >🗑️</button>
      </template>
    </DataTable>

    <!-- Yeni İzin Talebi Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h3>{{ viewMode ? 'İzin Talebi Detayı' : 'Yeni İzin Talebi' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <div v-if="viewMode" class="modal-body">
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Personel</label>
                  <span>{{ selectedRequest?.employee?.firstName }} {{ selectedRequest?.employee?.lastName }}</span>
                </div>
                <div class="detail-item">
                  <label>İzin Türü</label>
                  <span>{{ selectedRequest?.leaveType?.name }}</span>
                </div>
                <div class="detail-item">
                  <label>Başlangıç</label>
                  <span>{{ formatDate(selectedRequest?.startDate) }}</span>
                </div>
                <div class="detail-item">
                  <label>Bitiş</label>
                  <span>{{ formatDate(selectedRequest?.endDate) }}</span>
                </div>
                <div class="detail-item">
                  <label>Gün Sayısı</label>
                  <span>{{ selectedRequest?.dayCount }} gün</span>
                </div>
                <div class="detail-item">
                  <label>Durum</label>
                  <span :class="['status-badge', `status-${getStatusClass(selectedRequest?.status)}`]">
                    {{ getStatusLabel(selectedRequest?.status) }}
                  </span>
                </div>
                <div class="detail-item full-width" v-if="selectedRequest?.reason">
                  <label>Açıklama</label>
                  <span>{{ selectedRequest?.reason }}</span>
                </div>
              </div>
            </div>
            <form v-else @submit.prevent="saveRequest" class="modal-body">
              <div class="form-group">
                <label>Personel *</label>
                <select v-model="form.employeeId" required class="form-control">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>İzin Türü *</label>
                <select v-model="form.leaveTypeId" required class="form-control">
                  <option value="">İzin Türü Seçin</option>
                  <option v-for="lt in leaveTypes" :key="lt.id" :value="lt.id">
                    {{ lt.name }} {{ lt.isPaid ? '(Ücretli)' : '(Ücretsiz)' }}
                  </option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Başlangıç Tarihi *</label>
                  <input v-model="form.startDate" type="date" required class="form-control" @change="calculateDays" />
                </div>
                <div class="form-group">
                  <label>Bitiş Tarihi *</label>
                  <input v-model="form.endDate" type="date" required class="form-control" @change="calculateDays" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Gün Sayısı</label>
                  <input :value="calculatedDays + ' gün'" disabled class="form-control" />
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" v-model="form.isHalfDay" @change="calculateDays" />
                    Yarım Gün İzin
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea v-model="form.reason" rows="3" class="form-control" placeholder="İzin nedeni..."></textarea>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
                </button>
              </div>
            </form>
            <div v-if="viewMode" class="modal-footer">
              <button class="btn btn-secondary" @click="closeModal">Kapat</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { success, error } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const viewMode = ref(false)
const selectedRequest = ref<any>(null)
const requests = ref<any[]>([])
const employees = ref<any[]>([])
const leaveTypes = ref<any[]>([])
const calculatedDays = ref(0)

const filters = reactive({
  status: '',
  employeeId: '',
  leaveTypeId: ''
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0
})

const form = reactive({
  employeeId: '',
  leaveTypeId: '',
  startDate: '',
  endDate: '',
  reason: '',
  isHalfDay: false
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'leaveType', label: 'İzin Türü', width: '140px' },
  { key: 'dateRange', label: 'Tarih Aralığı', width: '200px' },
  { key: 'dayCount', label: 'Süre', width: '80px' },
  { key: 'reason', label: 'Açıklama' },
  { key: 'status', label: 'Durum', width: '120px' }
]

// Methods
const loadRequests = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (filters.status) options.status = filters.status
    if (filters.employeeId) options.employeeId = Number(filters.employeeId)
    if (filters.leaveTypeId) options.leaveTypeId = Number(filters.leaveTypeId)

    const result = await window.electronAPI.leaveRequest.getAll(options)
    
    if (result.success) {
      requests.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    } else {
      error(result.errors?.[0] || 'İzin talepleri yüklenemedi')
    }
  } catch (err) {
    error('İzin talepleri yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  const all = requests.value
  stats.total = pagination.total
  stats.pending = all.filter(r => r.status === 'Pending').length
  stats.approved = all.filter(r => r.status === 'Approved').length
  stats.rejected = all.filter(r => r.status === 'Rejected').length
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 500, status: 'Active' })
    if (result.success) {
      employees.value = result.data
    }
  } catch (err) {
    console.error('Personeller yüklenemedi:', err)
  }
}

const loadLeaveTypes = async () => {
  try {
    const result = await window.electronAPI.leaveType.getAll({ limit: 100 })
    if (result.success) {
      leaveTypes.value = result.data
    }
  } catch (err) {
    console.error('İzin türleri yüklenemedi:', err)
  }
}

const openNewModal = () => {
  viewMode.value = false
  selectedRequest.value = null
  resetForm()
  showModal.value = true
}

const viewRequest = (request: any) => {
  viewMode.value = true
  selectedRequest.value = request
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  viewMode.value = false
  selectedRequest.value = null
  resetForm()
}

const resetForm = () => {
  form.employeeId = ''
  form.leaveTypeId = ''
  form.startDate = ''
  form.endDate = ''
  form.reason = ''
  form.isHalfDay = false
  calculatedDays.value = 0
}

const calculateDays = () => {
  if (form.startDate && form.endDate) {
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    if (form.isHalfDay) days = 0.5
    calculatedDays.value = days
  }
}

const saveRequest = async () => {
  saving.value = true
  try {
    const data = {
      employeeId: Number(form.employeeId),
      leaveTypeId: Number(form.leaveTypeId),
      startDate: form.startDate,
      endDate: form.endDate,
      dayCount: calculatedDays.value,
      reason: form.reason || null
    }

    const result = await window.electronAPI.leaveRequest.create(data)

    if (result.success) {
      success('İzin talebi oluşturuldu')
      closeModal()
      loadRequests()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kayıt sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const approveRequest = async (request: any) => {
  const confirmed = await confirm({
    title: 'İzin Talebini Onayla',
    message: `${request.employee?.firstName} ${request.employee?.lastName} için ${request.dayCount} günlük izin talebini onaylamak istiyor musunuz?`,
    confirmText: 'Onayla',
    type: 'info'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.leaveRequest.approve(request.id, 1)
      if (result.success) {
        success('İzin talebi onaylandı')
        loadRequests()
      } else {
        error(result.errors?.[0] || 'Onaylama başarısız')
      }
    } catch (err) {
      error('Onaylama sırasında hata oluştu')
    }
  }
}

const rejectRequest = async (request: any) => {
  const confirmed = await confirm({
    title: 'İzin Talebini Reddet',
    message: `${request.employee?.firstName} ${request.employee?.lastName} için izin talebini reddetmek istiyor musunuz?`,
    confirmText: 'Reddet',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.leaveRequest.reject(request.id, 1)
      if (result.success) {
        success('İzin talebi reddedildi')
        loadRequests()
      } else {
        error(result.errors?.[0] || 'Reddetme başarısız')
      }
    } catch (err) {
      error('Reddetme sırasında hata oluştu')
    }
  }
}

const cancelRequest = async (request: any) => {
  const confirmed = await confirm({
    title: 'İzin Talebini İptal Et',
    message: 'Bu izin talebini iptal etmek istediğinize emin misiniz?',
    confirmText: 'İptal Et',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.leaveRequest.cancel(request.id)
      if (result.success) {
        success('İzin talebi iptal edildi')
        loadRequests()
      } else {
        error(result.errors?.[0] || 'İptal başarısız')
      }
    } catch (err) {
      error('İptal sırasında hata oluştu')
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadRequests()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

// Helpers
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'Pending': 'warning',
    'Approved': 'success',
    'Rejected': 'danger',
    'Cancelled': 'secondary'
  }
  return classes[status] || 'default'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'Pending': 'Onay Bekliyor',
    'Approved': 'Onaylandı',
    'Rejected': 'Reddedildi',
    'Cancelled': 'İptal Edildi'
  }
  return labels[status] || status
}

// Lifecycle
onMounted(() => {
  loadRequests()
  loadEmployees()
  loadLeaveTypes()
})
</script>

<style scoped>
.leave-request-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 160px;
}

.employee-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.employee-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0);
  color: #2c3e50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
}

.employee-info {
  display: flex;
  flex-direction: column;
}

.employee-name {
  font-weight: 600;
  color: #2c3e50;
}

.employee-code {
  font-size: 0.75rem;
  color: #6c757d;
}

.leave-type-badge {
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.date-separator {
  color: #6c757d;
}

.day-count {
  font-weight: 600;
  color: #0466c8;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-warning { background: #fff3cd; color: #856404; }
.status-success { background: #d4edda; color: #155724; }
.status-danger { background: #f8d7da; color: #721c24; }
.status-secondary { background: #e9ecef; color: #495057; }

.action-btn {
  padding: 0.375rem 0.5rem;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  margin: 0 0.125rem;
}

.action-btn:hover { transform: scale(1.1); }
.action-btn.approve { color: #198754; }
.action-btn.approve:hover { background: #d4edda; }
.action-btn.reject { color: #dc3545; }
.action-btn.reject:hover { background: #f8d7da; }
.action-btn.view:hover { background: #e9ecef; }
.action-btn.delete:hover { background: #f8d7da; }

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-lg {
  max-width: 600px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6c757d;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 500;
}

.detail-item span {
  font-size: 0.95rem;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #495057;
}

.form-control {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #0466c8;
  box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
}

.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #198754;
  color: white;
}

.btn-primary:hover {
  background: #157347;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
}

.btn-secondary:hover {
  background: #dee2e6;
}

/* Modal Animation */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>
