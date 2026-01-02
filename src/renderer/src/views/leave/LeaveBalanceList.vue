<template>
  <div class="leave-balance-page">
    <PageHeader 
      title="İzin Bakiyeleri" 
      description="Personel izin haklarını ve kullanımlarını takip edin"
    >
      <template #actions>
        <button class="btn btn-secondary" @click="initializeYearlyBalances" style="margin-right: 0.5rem;">
          🔄 Yıllık Bakiye Oluştur
        </button>
        <button class="btn btn-primary" @click="openNewModal">
          ➕ Bakiye Ekle
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="👥" :value="stats.totalEmployees" label="Toplam Personel" color="primary" />
      <StatCard icon="📅" :value="stats.totalEntitled" label="Toplam Hak Edilen" color="success" />
      <StatCard icon="✅" :value="stats.totalUsed" label="Toplam Kullanılan" color="warning" />
      <StatCard icon="📊" :value="stats.totalRemaining" label="Toplam Kalan" color="info" />
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
          <select v-model="filters.year" @change="loadBalances" class="filter-select">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filters.employeeId" @change="loadBalances" class="filter-select">
            <option value="">Tüm Personeller</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.firstName }} {{ emp.lastName }}
            </option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <!-- İzin Bakiyeleri Tablosu -->
    <DataTable
      :columns="columns"
      :data="balances"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="İzin bakiyesi bulunmuyor"
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
      <template #cell-year="{ value }">
        <span class="year-badge">{{ value }}</span>
      </template>
      <template #cell-entitledDays="{ value }">
        <span class="day-value entitled">{{ value }} gün</span>
      </template>
      <template #cell-usedDays="{ value }">
        <span class="day-value used">{{ value }} gün</span>
      </template>
      <template #cell-remainingDays="{ row }">
        <span :class="['day-value', 'remaining', getRemainingClass(row)]">
          {{ row.entitledDays - row.usedDays + (row.carriedForward || 0) }} gün
        </span>
      </template>
      <template #cell-carriedForward="{ value }">
        <span class="day-value carried">{{ value || 0 }} gün</span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn edit" @click.stop="editBalance(row)" title="Düzenle">✏️</button>
        <button class="action-btn transfer" @click.stop="transferBalance(row)" title="Devret">🔄</button>
      </template>
    </DataTable>

    <!-- Yeni/Düzenle Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ editingId ? 'Bakiye Düzenle' : 'Yeni Bakiye Ekle' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveBalance" class="modal-body">
              <div v-if="!editingId" class="form-group">
                <label>Personel *</label>
                <select v-model="form.employeeId" required class="form-control">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div v-if="!editingId" class="form-group">
                <label>Yıl *</label>
                <select v-model="form.year" required class="form-control">
                  <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
                </select>
              </div>
              <div v-if="editingId" class="form-row">
                <div class="form-group">
                  <label>Hak Edilen Gün</label>
                  <input v-model.number="form.entitledDays" type="number" min="0" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Kullanılan Gün</label>
                  <input v-model.number="form.usedDays" type="number" min="0" class="form-control" />
                </div>
              </div>
              <div v-if="editingId" class="form-group">
                <label>Devredilen Gün</label>
                <input v-model.number="form.carriedForward" type="number" min="0" class="form-control" />
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
import { ref, reactive, onMounted, computed } from 'vue'
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
const editingId = ref<number | null>(null)
const balances = ref<any[]>([])
const employees = ref<any[]>([])

const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years = []
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    years.push(y)
  }
  return years
})

const filters = reactive({
  year: currentYear,
  employeeId: ''
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  totalEmployees: 0,
  totalEntitled: 0,
  totalUsed: 0,
  totalRemaining: 0
})

const form = reactive({
  employeeId: '',
  year: currentYear,
  entitledDays: 14,
  usedDays: 0,
  carriedForward: 0
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'year', label: 'Yıl', width: '80px' },
  { key: 'entitledDays', label: 'Hak Edilen', width: '110px' },
  { key: 'usedDays', label: 'Kullanılan', width: '110px' },
  { key: 'remainingDays', label: 'Kalan', width: '100px' },
  { key: 'carriedForward', label: 'Devredilen', width: '110px' }
]

// Methods
const loadBalances = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit,
      year: filters.year
    }
    
    if (filters.employeeId) options.employeeId = Number(filters.employeeId)

    const result = await window.electronAPI.leaveBalance.getAll(options)
    
    if (result.success) {
      balances.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    } else {
      error(result.errors?.[0] || 'İzin bakiyeleri yüklenemedi')
    }
  } catch (err) {
    error('İzin bakiyeleri yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  const all = balances.value
  stats.totalEmployees = pagination.total
  stats.totalEntitled = all.reduce((sum, b) => sum + (b.entitledDays || 0), 0)
  stats.totalUsed = all.reduce((sum, b) => sum + (b.usedDays || 0), 0)
  stats.totalRemaining = all.reduce((sum, b) => sum + (b.entitledDays - b.usedDays + (b.carriedForward || 0)), 0)
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
  editingId.value = null
  resetForm()
  showModal.value = true
}

const editBalance = (balance: any) => {
  editingId.value = balance.id
  form.employeeId = balance.employeeId
  form.year = balance.year
  form.entitledDays = balance.entitledDays
  form.usedDays = balance.usedDays
  form.carriedForward = balance.carriedForward || 0
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingId.value = null
  resetForm()
}

const resetForm = () => {
  form.employeeId = ''
  form.year = currentYear
  form.entitledDays = 14
  form.usedDays = 0
  form.carriedForward = 0
}

const saveBalance = async () => {
  saving.value = true
  try {
    let result
    if (editingId.value) {
      const data = {
        entitledDays: form.entitledDays,
        usedDays: form.usedDays,
        carriedForward: form.carriedForward
      }
      result = await window.electronAPI.leaveBalance.update(editingId.value, data)
    } else {
      result = await window.electronAPI.leaveBalance.create(Number(form.employeeId), form.year)
    }

    if (result.success) {
      success(editingId.value ? 'Bakiye güncellendi' : 'Bakiye oluşturuldu')
      closeModal()
      loadBalances()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kayıt sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const transferBalance = async (balance: any) => {
  const confirmed = await confirm({
    title: 'İzin Devri',
    message: `${balance.employee?.firstName} ${balance.employee?.lastName} için ${balance.year} yılından ${balance.year + 1} yılına izin devri yapmak istiyor musunuz?`,
    confirmText: 'Devret',
    type: 'info'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.leaveBalance.transferToNextYear(balance.employeeId, balance.year)
      if (result.success) {
        success('İzin devri yapıldı')
        loadBalances()
      } else {
        error(result.errors?.[0] || 'Devir başarısız')
      }
    } catch (err) {
      error('Devir sırasında hata oluştu')
    }
  }
}

const initializeYearlyBalances = async () => {
  const confirmed = await confirm({
    title: 'Yıllık Bakiye Oluştur',
    message: `${filters.year} yılı için tüm aktif personellere izin bakiyesi oluşturmak istiyor musunuz?`,
    confirmText: 'Oluştur',
    type: 'info'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.leaveBalance.initializeYearly(filters.year)
      if (result.success) {
        success(result.message || 'Yıllık bakiyeler oluşturuldu')
        loadBalances()
      } else {
        error(result.errors?.[0] || 'Oluşturma başarısız')
      }
    } catch (err) {
      error('Oluşturma sırasında hata oluştu')
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadBalances()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

// Helpers
const getRemainingClass = (balance: any) => {
  const remaining = balance.entitledDays - balance.usedDays + (balance.carriedForward || 0)
  if (remaining <= 0) return 'danger'
  if (remaining <= 5) return 'warning'
  return 'success'
}

// Lifecycle
onMounted(() => {
  loadBalances()
  loadEmployees()
})
</script>

<style scoped>
.leave-balance-page {
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

.year-badge {
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}

.day-value {
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.day-value.entitled { color: #0466c8; }
.day-value.used { color: #856404; }
.day-value.carried { color: #6c757d; }
.day-value.remaining.success { color: #155724; background: #d4edda; }
.day-value.remaining.warning { color: #856404; background: #fff3cd; }
.day-value.remaining.danger { color: #721c24; background: #f8d7da; }

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
.action-btn.edit:hover { background: #e7f1ff; }
.action-btn.transfer:hover { background: #d4edda; }

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
  max-width: 450px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
