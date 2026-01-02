<template>
  <div class="allowance-page">
    <PageHeader 
      title="Kişisel Ek Ödemeler / Kesintiler" 
      description="Personel bazlı ek ödemeleri ve kesintileri yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Kayıt
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📊" :value="stats.totalRecords" label="Toplam Kayıt" color="primary" />
      <StatCard icon="➕" :value="stats.allowanceCount" label="Ek Ödeme" color="success" />
      <StatCard icon="➖" :value="stats.deductionCount" label="Kesinti" color="danger" />
      <StatCard icon="✓" :value="stats.activeCount" label="Aktif Kayıt" color="info" />
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
          <select v-model="filterEmployee" @change="loadAllowances" class="filter-select">
            <option value="">Tüm Personeller</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.firstName }} {{ emp.lastName }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filterType" @change="loadAllowances" class="filter-select">
            <option value="">Tüm Tipler</option>
            <option value="Allowance">Ek Ödemeler</option>
            <option value="Deduction">Kesintiler</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filterActive" @change="loadAllowances" class="filter-select">
            <option value="">Tüm Durumlar</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <!-- Kayıt Tablosu -->
    <DataTable
      :columns="columns"
      :data="allowances"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Kayıt bulunmuyor"
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
      <template #cell-allowanceType="{ value }">
        <span :class="['type-badge', value === 'Allowance' ? 'type-allowance' : 'type-deduction']">
          {{ value === 'Allowance' ? '➕ Ek Ödeme' : '➖ Kesinti' }}
        </span>
      </template>
      <template #cell-amount="{ row }">
        <span :class="['amount-value', row.allowanceType === 'Allowance' ? 'positive' : 'negative']">
          {{ row.isPercentage ? `%${row.amount}` : formatCurrency(row.amount) }}
        </span>
      </template>
      <template #cell-isActive="{ value }">
        <span :class="['status-badge', value ? 'status-active' : 'status-inactive']">
          {{ value ? '✓ Aktif' : '✗ Pasif' }}
        </span>
      </template>
      <template #cell-dateRange="{ row }">
        <span class="date-range">
          {{ row.startDate ? formatDate(row.startDate) : '-' }} / {{ row.endDate ? formatDate(row.endDate) : 'Süresiz' }}
        </span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn toggle" @click.stop="toggleActive(row)" :title="row.isActive ? 'Pasif Yap' : 'Aktif Yap'">
          {{ row.isActive ? '⏸️' : '▶️' }}
        </button>
        <button class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        <button class="action-btn delete" @click.stop="deleteAllowance(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Kayıt Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Kayıt Düzenle' : 'Yeni Kayıt' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveAllowance" class="modal-body">
              <div class="form-group">
                <label>Personel *</label>
                <select v-model="form.employeeId" required class="form-control" :disabled="isEditing">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Tip *</label>
                  <select v-model="form.allowanceType" required class="form-control">
                    <option value="">Seçin</option>
                    <option value="Allowance">Ek Ödeme</option>
                    <option value="Deduction">Kesinti</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Hesaplama Şekli</label>
                  <select v-model="form.isPercentage" class="form-control">
                    <option :value="false">Sabit Tutar</option>
                    <option :value="true">Yüzde (%)</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Adı *</label>
                <input v-model="form.name" type="text" required class="form-control" placeholder="Örn: Yemek Yardımı, İcra Kesintisi" />
              </div>
              <div class="form-group">
                <label>{{ form.isPercentage ? 'Oran (%)' : 'Tutar (₺)' }} *</label>
                <input v-model.number="form.amount" type="number" step="0.01" required class="form-control" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Başlangıç Tarihi</label>
                  <input v-model="form.startDate" type="date" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Bitiş Tarihi</label>
                  <input v-model="form.endDate" type="date" class="form-control" />
                </div>
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea v-model="form.description" class="form-control" rows="2" placeholder="Açıklama..."></textarea>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.isActive" />
                  <span>Aktif</span>
                </label>
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

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const allowances = ref<any[]>([])
const employees = ref<any[]>([])
const filterEmployee = ref('')
const filterType = ref('')
const filterActive = ref('')

const form = reactive({
  id: null as number | null,
  employeeId: '',
  allowanceType: '',
  name: '',
  amount: 0,
  isPercentage: false,
  isActive: true,
  startDate: '',
  endDate: '',
  description: ''
})

const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })

const stats = reactive({
  totalRecords: 0,
  allowanceCount: 0,
  deductionCount: 0,
  activeCount: 0
})

const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'allowanceType', label: 'Tip', width: '130px' },
  { key: 'name', label: 'Adı', sortable: true },
  { key: 'amount', label: 'Tutar/Oran', width: '120px' },
  { key: 'dateRange', label: 'Tarih Aralığı', width: '180px' },
  { key: 'isActive', label: 'Durum', width: '100px' }
]

const loadAllowances = async () => {
  loading.value = true
  try {
    const options: any = { page: pagination.page, limit: pagination.limit }
    if (filterEmployee.value) options.employeeId = Number(filterEmployee.value)
    if (filterType.value) options.allowanceType = filterType.value
    if (filterActive.value) options.isActive = filterActive.value === 'true'
    
    const result = await window.electronAPI.employeeAllowance.getAll(options)
    if (result.success) {
      allowances.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    }
  } catch (err) {
    error('Kayıtlar yüklenemedi')
  } finally {
    loading.value = false
  }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 500, status: 'Active' })
    if (result.success) employees.value = result.data || []
  } catch (err) { /* ignore */ }
}

const updateStats = () => {
  stats.totalRecords = allowances.value.length
  stats.allowanceCount = allowances.value.filter(a => a.allowanceType === 'Allowance').length
  stats.deductionCount = allowances.value.filter(a => a.allowanceType === 'Deduction').length
  stats.activeCount = allowances.value.filter(a => a.isActive).length
}

const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (item: any) => {
  isEditing.value = true
  Object.assign(form, {
    id: item.id,
    employeeId: item.employeeId,
    allowanceType: item.allowanceType,
    name: item.name,
    amount: item.amount,
    isPercentage: item.isPercentage,
    isActive: item.isActive,
    startDate: item.startDate ? item.startDate.split('T')[0] : '',
    endDate: item.endDate ? item.endDate.split('T')[0] : '',
    description: item.description || ''
  })
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.id = null
  form.employeeId = ''
  form.allowanceType = ''
  form.name = ''
  form.amount = 0
  form.isPercentage = false
  form.isActive = true
  form.startDate = ''
  form.endDate = ''
  form.description = ''
}

const saveAllowance = async () => {
  saving.value = true
  try {
    const data = {
      ...form,
      employeeId: Number(form.employeeId),
      startDate: form.startDate || null,
      endDate: form.endDate || null
    }
    const result = isEditing.value
      ? await window.electronAPI.employeeAllowance.update(form.id!, data)
      : await window.electronAPI.employeeAllowance.create(data)
    
    if (result.success) {
      success(isEditing.value ? 'Kayıt güncellendi' : 'Kayıt oluşturuldu')
      closeModal()
      await loadAllowances()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kaydetme sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const toggleActive = async (item: any) => {
  try {
    const result = await window.electronAPI.employeeAllowance.toggleActive(item.id)
    if (result.success) {
      success(item.isActive ? 'Kayıt pasif yapıldı' : 'Kayıt aktif yapıldı')
      await loadAllowances()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('İşlem sırasında hata oluştu')
  }
}

const deleteAllowance = async (item: any) => {
  const confirmed = await confirm({
    title: 'Kayıt Sil',
    message: `"${item.name}" kaydını silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    type: 'danger'
  })
  if (confirmed) {
    try {
      const result = await window.electronAPI.employeeAllowance.delete(item.id)
      if (result.success) {
        success('Kayıt silindi')
        await loadAllowances()
      } else {
        error(result.errors?.[0] || 'Silme başarısız')
      }
    } catch (err) {
      error('Silme sırasında hata oluştu')
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadAllowances()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('tr-TR')
}

onMounted(async () => {
  await loadEmployees()
  await loadAllowances()
})
</script>

<style scoped>
.allowance-page { max-width: 1400px; margin: 0 auto; }

.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem; margin-bottom: 1.5rem;
}

.filter-group { display: flex; align-items: center; gap: 0.5rem; }

.filter-select {
  padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px;
  font-size: 0.875rem; background: white; min-width: 160px;
}

.employee-cell { display: flex; align-items: center; gap: 0.75rem; }

.employee-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 0.75rem;
}

.employee-info { display: flex; flex-direction: column; }
.employee-name { font-weight: 600; color: #2c3e50; }
.employee-code { font-size: 0.75rem; color: #6c757d; }

.type-badge {
  display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}

.type-allowance { background: #d4edda; color: #155724; }
.type-deduction { background: #f8d7da; color: #721c24; }

.amount-value { font-weight: 600; font-family: 'Consolas', monospace; }
.amount-value.positive { color: #198754; }
.amount-value.negative { color: #dc3545; }

.date-range { font-size: 0.85rem; color: #6c757d; }

.status-badge {
  display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}

.status-active { background: #d4edda; color: #155724; }
.status-inactive { background: #f8d7da; color: #721c24; }

.action-btn {
  padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px;
  cursor: pointer; font-size: 1rem; transition: all 0.2s; margin: 0 0.125rem;
}

.action-btn:hover { transform: scale(1.1); }
.action-btn.toggle:hover { background: #fff3cd; }
.action-btn.edit:hover { background: #e7f1ff; }
.action-btn.delete:hover { background: #f8d7da; }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
  justify-content: center; z-index: 10000;
}

.modal-container {
  background: white; border-radius: 12px; width: 90%; max-width: 600px;
  max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef;
}

.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }

.form-control {
  width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6;
  border-radius: 6px; font-size: 0.95rem;
}

.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.checkbox-label input { width: 18px; height: 18px; }

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
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
