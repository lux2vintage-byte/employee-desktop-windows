<template>
  <div class="advance-list-page">
    <PageHeader 
      title="Avans Talepleri" 
      description="Personel avans taleplerini görüntüleyin ve yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openNewModal">
          ➕ Yeni Avans Talebi
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Talep" color="primary" />
      <StatCard icon="⏳" :value="stats.pending" label="Onay Bekleyen" color="warning" />
      <StatCard icon="✅" :value="stats.approved" label="Onaylanan" color="success" />
      <StatCard icon="💵" :value="stats.paid" label="Ödenen" color="info" />
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
          <select v-model="filters.status" @change="loadAdvances" class="filter-select">
            <option value="">Tüm Durumlar</option>
            <option value="Pending">Onay Bekliyor</option>
            <option value="Approved">Onaylandı</option>
            <option value="Rejected">Reddedildi</option>
            <option value="Paid">Ödendi</option>
            <option value="Deducted">Kesildi</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filters.employeeId" @change="loadAdvances" class="filter-select">
            <option value="">Tüm Personeller</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.firstName }} {{ emp.lastName }}
            </option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <!-- Avans Tablosu -->
    <DataTable
      :columns="columns"
      :data="advances"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Avans talebi bulunmuyor"
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
      <template #cell-requestDate="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #cell-amount="{ value }">
        <span class="money-value">{{ formatCurrency(value) }}</span>
      </template>
      <template #cell-deductionPeriod="{ value }">
        <span v-if="value" class="period-badge">{{ formatPeriod(value) }}</span>
        <span v-else class="text-muted">-</span>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${getStatusClass(value)}`]">
          {{ getStatusLabel(value) }}
        </span>
      </template>
      <template #actions="{ row }">
        <template v-if="row.status === 'Pending'">
          <button class="action-btn approve" @click.stop="approveAdvance(row)" title="Onayla">✓</button>
          <button class="action-btn reject" @click.stop="rejectAdvance(row)" title="Reddet">✗</button>
        </template>
        <button 
          v-if="row.status === 'Approved'" 
          class="action-btn pay" 
          @click.stop="markAsPaid(row)" 
          title="Ödendi İşaretle"
        >💵</button>
        <button 
          v-if="row.status === 'Paid'" 
          class="action-btn deduct" 
          @click.stop="markAsDeducted(row)" 
          title="Kesildi İşaretle"
        >📉</button>
        <button class="action-btn view" @click.stop="viewAdvance(row)" title="Detay">👁️</button>
      </template>
    </DataTable>

    <!-- Yeni Avans Talebi Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ viewMode ? 'Avans Detayı' : 'Yeni Avans Talebi' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <div v-if="viewMode" class="modal-body">
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Personel</label>
                  <span>{{ selectedAdvance?.employee?.firstName }} {{ selectedAdvance?.employee?.lastName }}</span>
                </div>
                <div class="detail-item">
                  <label>Talep Tarihi</label>
                  <span>{{ formatDate(selectedAdvance?.requestDate) }}</span>
                </div>
                <div class="detail-item">
                  <label>Tutar</label>
                  <span class="money-value">{{ formatCurrency(selectedAdvance?.amount) }}</span>
                </div>
                <div class="detail-item">
                  <label>Durum</label>
                  <span :class="['status-badge', `status-${getStatusClass(selectedAdvance?.status)}`]">
                    {{ getStatusLabel(selectedAdvance?.status) }}
                  </span>
                </div>
                <div class="detail-item" v-if="selectedAdvance?.deductionPeriod">
                  <label>Kesinti Dönemi</label>
                  <span>{{ formatPeriod(selectedAdvance?.deductionPeriod) }}</span>
                </div>
                <div class="detail-item" v-if="selectedAdvance?.paymentDate">
                  <label>Ödeme Tarihi</label>
                  <span>{{ formatDate(selectedAdvance?.paymentDate) }}</span>
                </div>
              </div>
            </div>
            <form v-else @submit.prevent="saveAdvance" class="modal-body">
              <div class="form-group">
                <label>Personel *</label>
                <select v-model="form.employeeId" required class="form-control" @change="loadMaxAmount">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div v-if="maxAmount > 0" class="info-box">
                <span class="info-icon">ℹ️</span>
                <span>Maksimum avans tutarı: <strong>{{ formatCurrency(maxAmount) }}</strong></span>
              </div>
              <div class="form-group">
                <label>Avans Tutarı (₺) *</label>
                <input 
                  v-model.number="form.amount" 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  :max="maxAmount || undefined"
                  required 
                  class="form-control"
                  placeholder="0.00"
                />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? 'Kaydediliyor...' : 'Talep Oluştur' }}
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

    <!-- Onay Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showApproveModal" class="modal-overlay" @click.self="closeApproveModal">
          <div class="modal-container modal-sm">
            <div class="modal-header">
              <h3>Avans Onayı</h3>
              <button class="close-btn" @click="closeApproveModal">✕</button>
            </div>
            <form @submit.prevent="confirmApprove" class="modal-body">
              <p class="approve-info">
                <strong>{{ approveTarget?.employee?.firstName }} {{ approveTarget?.employee?.lastName }}</strong> 
                için <strong>{{ formatCurrency(approveTarget?.amount) }}</strong> tutarındaki avans talebini onaylıyorsunuz.
              </p>
              <div class="form-group">
                <label>Kesinti Dönemi *</label>
                <input 
                  v-model="approveForm.deductionPeriod" 
                  type="month" 
                  required 
                  class="form-control"
                />
                <small class="form-hint">Avansın maaştan kesileceği dönem</small>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeApproveModal">İptal</button>
                <button type="submit" class="btn btn-success" :disabled="approving">
                  {{ approving ? 'Onaylanıyor...' : 'Onayla' }}
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
const approving = ref(false)
const showModal = ref(false)
const viewMode = ref(false)
const showApproveModal = ref(false)
const advances = ref<any[]>([])
const employees = ref<any[]>([])
const selectedAdvance = ref<any>(null)
const approveTarget = ref<any>(null)
const maxAmount = ref(0)

const filters = reactive({
  status: '',
  employeeId: ''
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
  paid: 0
})

const form = reactive({
  employeeId: '',
  amount: 0
})

const approveForm = reactive({
  deductionPeriod: ''
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'requestDate', label: 'Talep Tarihi', width: '120px' },
  { key: 'amount', label: 'Tutar', width: '130px' },
  { key: 'deductionPeriod', label: 'Kesinti Dönemi', width: '130px' },
  { key: 'status', label: 'Durum', width: '130px' }
]

// Methods
const loadAdvances = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (filters.status) options.status = filters.status
    if (filters.employeeId) options.employeeId = Number(filters.employeeId)

    const result = await window.electronAPI.advance.getAll(options)
    
    if (result.success) {
      advances.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    } else {
      error(result.errors?.[0] || 'Avanslar yüklenemedi')
    }
  } catch (err) {
    error('Avanslar yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  const all = advances.value
  stats.total = pagination.total
  stats.pending = all.filter(a => a.status === 'Pending').length
  stats.approved = all.filter(a => a.status === 'Approved').length
  stats.paid = all.filter(a => a.status === 'Paid').length
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

const loadMaxAmount = async () => {
  if (!form.employeeId) {
    maxAmount.value = 0
    return
  }
  try {
    const result = await window.electronAPI.advance.getMaxAmount(Number(form.employeeId))
    if (result.success) {
      maxAmount.value = (result.data as any)?.maxAmount ?? result.data ?? 0
    }
  } catch (err) {
    console.error('Max tutar alınamadı:', err)
  }
}

const openNewModal = () => {
  viewMode.value = false
  selectedAdvance.value = null
  form.employeeId = ''
  form.amount = 0
  maxAmount.value = 0
  showModal.value = true
}

const viewAdvance = (advance: any) => {
  viewMode.value = true
  selectedAdvance.value = advance
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  viewMode.value = false
  selectedAdvance.value = null
}

const saveAdvance = async () => {
  saving.value = true
  try {
    const result = await window.electronAPI.advance.request(
      Number(form.employeeId),
      { employeeId: Number(form.employeeId), amount: form.amount }
    )

    if (result.success) {
      success('Avans talebi oluşturuldu')
      closeModal()
      loadAdvances()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kayıt sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const approveAdvance = (advance: any) => {
  approveTarget.value = advance
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  approveForm.deductionPeriod = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
  showApproveModal.value = true
}

const closeApproveModal = () => {
  showApproveModal.value = false
  approveTarget.value = null
}

const confirmApprove = async () => {
  approving.value = true
  try {
    const result = await window.electronAPI.advance.approve(
      approveTarget.value.id,
      1, // approverId
      approveForm.deductionPeriod
    )
    if (result.success) {
      success('Avans onaylandı')
      closeApproveModal()
      loadAdvances()
    } else {
      error(result.errors?.[0] || 'Onaylama başarısız')
    }
  } catch (err) {
    error('Onaylama sırasında hata oluştu')
  } finally {
    approving.value = false
  }
}

const rejectAdvance = async (advance: any) => {
  const confirmed = await confirm({
    title: 'Avans Talebini Reddet',
    message: `${advance.employee?.firstName} ${advance.employee?.lastName} için avans talebini reddetmek istiyor musunuz?`,
    confirmText: 'Reddet',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.advance.reject(advance.id, 1)
      if (result.success) {
        success('Avans talebi reddedildi')
        loadAdvances()
      } else {
        error(result.errors?.[0] || 'Reddetme başarısız')
      }
    } catch (err) {
      error('Reddetme sırasında hata oluştu')
    }
  }
}

const markAsPaid = async (advance: any) => {
  const confirmed = await confirm({
    title: 'Ödeme Onayı',
    message: `${formatCurrency(advance.amount)} tutarındaki avansı ödenmiş olarak işaretlemek istiyor musunuz?`,
    confirmText: 'Ödendi İşaretle',
    type: 'info'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.advance.markAsPaid(advance.id, new Date().toISOString())
      if (result.success) {
        success('Avans ödenmiş olarak işaretlendi')
        loadAdvances()
      } else {
        error(result.errors?.[0] || 'İşlem başarısız')
      }
    } catch (err) {
      error('İşlem sırasında hata oluştu')
    }
  }
}

const markAsDeducted = async (advance: any) => {
  const confirmed = await confirm({
    title: 'Kesinti Onayı',
    message: `${formatCurrency(advance.amount)} tutarındaki avansı kesilmiş olarak işaretlemek istiyor musunuz?`,
    confirmText: 'Kesildi İşaretle',
    type: 'info'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.advance.markAsDeducted(advance.id)
      if (result.success) {
        success('Avans kesilmiş olarak işaretlendi')
        loadAdvances()
      } else {
        error(result.errors?.[0] || 'İşlem başarısız')
      }
    } catch (err) {
      error('İşlem sırasında hata oluştu')
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadAdvances()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

// Helpers
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0)
}

const formatPeriod = (period: string) => {
  if (!period) return '-'
  const [year, month] = period.split('-')
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  return `${months[parseInt(month || '0') - 1]} ${year}`
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'Pending': 'warning',
    'Approved': 'info',
    'Rejected': 'danger',
    'Paid': 'success',
    'Deducted': 'secondary'
  }
  return classes[status] || 'default'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'Pending': 'Onay Bekliyor',
    'Approved': 'Onaylandı',
    'Rejected': 'Reddedildi',
    'Paid': 'Ödendi',
    'Deducted': 'Kesildi'
  }
  return labels[status] || status
}

// Lifecycle
onMounted(() => {
  loadAdvances()
  loadEmployees()
})
</script>

<style scoped>
.advance-list-page {
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

.money-value {
  font-weight: 600;
  font-family: 'Consolas', monospace;
  color: #0466c8;
}

.period-badge {
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.text-muted {
  color: #6c757d;
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
.status-info { background: #d1ecf1; color: #0c5460; }
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
.action-btn.pay { color: #0466c8; }
.action-btn.pay:hover { background: #e7f1ff; }
.action-btn.deduct { color: #6c757d; }
.action-btn.deduct:hover { background: #e9ecef; }
.action-btn.view:hover { background: #e9ecef; }

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

.modal-sm {
  max-width: 420px;
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
}

.form-control:focus {
  outline: none;
  border-color: #0466c8;
  box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1);
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #6c757d;
}

.info-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #e7f1ff;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.info-icon {
  font-size: 1.25rem;
}

.info-box span:last-child {
  font-size: 0.9rem;
  color: #0466c8;
}

.approve-info {
  margin: 0 0 1rem;
  line-height: 1.6;
  color: #495057;
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

.btn-success {
  background: #198754;
  color: white;
}

.btn-success:hover {
  background: #157347;
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
