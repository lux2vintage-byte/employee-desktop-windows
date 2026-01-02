<template>
  <div class="overtime-page">
    <PageHeader 
      title="Fazla Mesai Kayıtları" 
      description="Personel fazla mesai kayıtlarını yönetin ve onaylayın"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openNewModal">
          ➕ Yeni Mesai Kaydı
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="⏰" :value="stats.totalRecords" label="Toplam Kayıt" color="primary" />
      <StatCard icon="⏳" :value="stats.pending" label="Onay Bekleyen" color="warning" />
      <StatCard icon="✅" :value="stats.approved" label="Onaylanan" color="success" />
      <StatCard icon="🕐" :value="stats.totalHours + 's'" label="Toplam Mesai Saati" color="info" />
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
        <div class="date-range-picker">
          <input v-model="filters.startDate" type="date" class="date-input" @change="loadOvertime" />
          <span>-</span>
          <input v-model="filters.endDate" type="date" class="date-input" @change="loadOvertime" />
        </div>
        <select v-model="filters.employeeId" @change="loadOvertime" class="filter-select">
          <option value="">Tüm Personeller</option>
          <option v-for="emp in employees" :key="emp.id" :value="emp.id">
            {{ emp.firstName }} {{ emp.lastName }}
          </option>
        </select>
        <select v-model="filters.approvalStatus" @change="loadOvertime" class="filter-select">
          <option value="">Tüm Durumlar</option>
          <option value="Pending">Onay Bekliyor</option>
          <option value="Approved">Onaylandı</option>
          <option value="Rejected">Reddedildi</option>
        </select>
      </template>
    </ActionToolbar>

    <!-- Mesai Tablosu -->
    <DataTable
      :columns="columns"
      :data="overtimeRecords"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Fazla mesai kaydı bulunmuyor"
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
      <template #cell-date="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #cell-hours="{ row }">
        <div class="hours-cell">
          <span class="hours-value">{{ row.hours }}s</span>
          <span class="multiplier-badge">x{{ row.multiplier }}</span>
        </div>
      </template>
      <template #cell-approvalStatus="{ value }">
        <span :class="['status-badge', `status-${getStatusClass(value)}`]">
          {{ getStatusLabel(value) }}
        </span>
      </template>
      <template #cell-approver="{ row }">
        <span v-if="row.approver">{{ row.approver.firstName }} {{ row.approver.lastName }}</span>
        <span v-else class="text-muted">-</span>
      </template>
      <template #actions="{ row }">
        <template v-if="row.approvalStatus === 'Pending'">
          <button class="action-btn approve" @click.stop="approveOvertime(row)" title="Onayla">✓</button>
          <button class="action-btn reject" @click.stop="rejectOvertime(row)" title="Reddet">✗</button>
          <button class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        </template>
        <button class="action-btn delete" @click.stop="confirmDelete(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Yeni/Düzenle Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ editingRecord ? 'Mesai Kaydı Düzenle' : 'Yeni Fazla Mesai Kaydı' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveRecord" class="modal-body">
              <div class="form-group">
                <label>Personel *</label>
                <select v-model="form.employeeId" required class="form-control" :disabled="!!editingRecord">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Tarih *</label>
                  <input v-model="form.date" type="date" required class="form-control" />
                </div>
                <div class="form-group">
                  <label>Mesai Saati *</label>
                  <input v-model.number="form.hours" type="number" min="0.5" max="24" step="0.5" required class="form-control" />
                </div>
              </div>
              <div class="form-group">
                <label>Çarpan</label>
                <select v-model.number="form.multiplier" class="form-control">
                  <option :value="1.5">1.5x (Normal Mesai)</option>
                  <option :value="2">2x (Hafta Sonu)</option>
                  <option :value="2.5">2.5x (Resmi Tatil)</option>
                  <option :value="3">3x (Özel Gün)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea v-model="form.description" rows="3" class="form-control" 
                  placeholder="Mesai nedeni ve detayları..."></textarea>
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
const editingRecord = ref<any>(null)
const overtimeRecords = ref<any[]>([])
const employees = ref<any[]>([])

// Tarih filtreleri - bu ayın başı ve sonu
const now = new Date()
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

const filters = reactive({
  startDate: firstDay,
  endDate: lastDay,
  employeeId: '',
  approvalStatus: ''
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  totalRecords: 0,
  pending: 0,
  approved: 0,
  totalHours: 0
})

const form = reactive({
  employeeId: '',
  date: new Date().toISOString().split('T')[0],
  hours: 2,
  multiplier: 1.5,
  description: ''
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'date', label: 'Tarih', width: '110px', sortable: true },
  { key: 'hours', label: 'Mesai', width: '120px' },
  { key: 'description', label: 'Açıklama' },
  { key: 'approvalStatus', label: 'Durum', width: '120px' },
  { key: 'approver', label: 'Onaylayan', width: '150px' }
]

// Methods
const loadOvertime = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit,
      startDate: filters.startDate,
      endDate: filters.endDate
    }
    
    if (filters.employeeId) options.employeeId = Number(filters.employeeId)
    if (filters.approvalStatus) options.approvalStatus = filters.approvalStatus

    const result = await window.electronAPI.overtime.getAll(options)
    
    if (result.success) {
      overtimeRecords.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats(result.data || [])
    } else {
      error(result.errors?.[0] || 'Kayıtlar yüklenemedi')
    }
  } catch (err) {
    error('Kayıtlar yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = (records: any[]) => {
  stats.totalRecords = records.length
  stats.pending = records.filter(r => r.approvalStatus === 'Pending').length
  stats.approved = records.filter(r => r.approvalStatus === 'Approved').length
  stats.totalHours = records
    .filter(r => r.approvalStatus === 'Approved')
    .reduce((sum, r) => sum + r.hours, 0)
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

const openNewModal = () => {
  editingRecord.value = null
  resetForm()
  showModal.value = true
}

const openEditModal = (record: any) => {
  editingRecord.value = record
  form.employeeId = record.employeeId
  form.date = record.date?.split('T')[0] || ''
  form.hours = record.hours
  form.multiplier = record.multiplier
  form.description = record.description || ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingRecord.value = null
  resetForm()
}

const resetForm = () => {
  form.employeeId = ''
  form.date = new Date().toISOString().split('T')[0]
  form.hours = 2
  form.multiplier = 1.5
  form.description = ''
}

const saveRecord = async () => {
  saving.value = true
  try {
    const data = {
      employeeId: Number(form.employeeId),
      date: form.date,
      hours: form.hours,
      multiplier: form.multiplier,
      description: form.description || null
    }

    const result = await window.electronAPI.overtime.create(data)

    if (result.success) {
      success('Mesai kaydı oluşturuldu')
      closeModal()
      loadOvertime()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kayıt kaydedilirken hata oluştu')
  } finally {
    saving.value = false
  }
}

const approveOvertime = async (record: any) => {
  const confirmed = await confirm({
    title: 'Mesai Onayla',
    message: `${record.employee?.firstName} ${record.employee?.lastName} için ${record.hours} saatlik mesaiyi onaylamak istiyor musunuz?`,
    confirmText: 'Onayla',
    type: 'info'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.overtime.approve(record.id, 1) // approverId: 1 (admin)
      if (result.success) {
        success('Mesai onaylandı')
        loadOvertime()
      } else {
        error(result.errors?.[0] || 'Onaylama başarısız')
      }
    } catch (err) {
      error('Onaylama sırasında hata oluştu')
    }
  }
}

const rejectOvertime = async (record: any) => {
  const confirmed = await confirm({
    title: 'Mesai Reddet',
    message: `${record.employee?.firstName} ${record.employee?.lastName} için mesai kaydını reddetmek istiyor musunuz?`,
    confirmText: 'Reddet',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.overtime.reject(record.id, 1)
      if (result.success) {
        success('Mesai reddedildi')
        loadOvertime()
      } else {
        error(result.errors?.[0] || 'Reddetme başarısız')
      }
    } catch (err) {
      error('Reddetme sırasında hata oluştu')
    }
  }
}

const confirmDelete = async (record: any) => {
  const confirmed = await confirm({
    title: 'Kaydı Sil',
    message: 'Bu mesai kaydını silmek istediğinize emin misiniz?',
    confirmText: 'Sil',
    type: 'danger'
  })

  if (confirmed) {
    success('Kayıt silindi')
    loadOvertime()
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadOvertime()
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
    'Rejected': 'danger'
  }
  return classes[status] || 'default'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'Pending': 'Onay Bekliyor',
    'Approved': 'Onaylandı',
    'Rejected': 'Reddedildi'
  }
  return labels[status] || status
}

// Lifecycle
onMounted(() => {
  loadOvertime()
  loadEmployees()
})
</script>

<style scoped>
.overtime-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.date-range-picker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 150px;
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

.hours-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hours-value {
  font-weight: 700;
  color: #0466c8;
  font-size: 1rem;
}

.multiplier-badge {
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
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

.text-muted {
  color: #6c757d;
}

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

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn.approve {
  color: #198754;
}

.action-btn.approve:hover {
  background: #d4edda;
}

.action-btn.reject {
  color: #dc3545;
}

.action-btn.reject:hover {
  background: #f8d7da;
}

.action-btn.edit:hover {
  background: #e9ecef;
}

.action-btn.delete:hover {
  background: #f8d7da;
}

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

.form-control:disabled {
  background: #e9ecef;
  cursor: not-allowed;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
  margin-top: 1rem;
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
