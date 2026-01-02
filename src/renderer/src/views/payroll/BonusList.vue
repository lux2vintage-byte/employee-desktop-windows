<template>
  <div class="bonus-list-page">
    <PageHeader 
      title="Prim / İkramiye Yönetimi" 
      description="Personel prim ve ikramiye eklemelerini yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openNewModal">
          ➕ Yeni Prim/İkramiye Ekle
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="🎁" :value="stats.totalBonuses" label="Toplam Kayıt" color="primary" />
      <StatCard icon="💰" :value="formatCurrency(stats.totalAmount)" label="Toplam Tutar" color="success" />
      <StatCard icon="👥" :value="stats.employeeCount" label="Personel Sayısı" color="info" />
      <StatCard icon="📅" :value="stats.currentMonth" label="Bu Ay" color="warning" />
    </div>

    <!-- Dönem Seçimi -->
    <div class="period-selector">
      <div class="period-card">
        <div class="period-icon">📅</div>
        <div class="period-content">
          <label>Dönem Filtresi</label>
          <div class="period-inputs">
            <select v-model="selectedMonth" class="period-select" @change="loadBonuses">
              <option value="">Tüm Aylar</option>
              <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
            <select v-model="selectedYear" class="period-select" @change="loadBonuses">
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
        </div>
      </div>
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
          <select v-model="filters.category" @change="loadBonuses" class="filter-select">
            <option value="">Tüm Kategoriler</option>
            <option value="Bonus">Prim / İkramiye</option>
            <option value="Overtime">Fazla Mesai</option>
            <option value="Transport">Yol Yardımı</option>
            <option value="Food">Yemek Yardımı</option>
            <option value="Other">Diğer</option>
          </select>
        </div>
        <div class="filter-group">
          <input 
            v-model="filters.search" 
            type="text" 
            placeholder="Personel ara..." 
            class="search-input"
            @input="filterBonuses"
          />
        </div>
      </template>
    </ActionToolbar>

    <!-- Prim/İkramiye Tablosu -->
    <DataTable
      :columns="columns"
      :data="filteredBonuses"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Prim/İkramiye kaydı bulunmuyor"
      @page-change="handlePageChange"
    >
      <template #cell-employee="{ row }">
        <div class="employee-cell">
          <div class="employee-avatar">
            {{ row.payroll?.employee?.firstName?.charAt(0) }}{{ row.payroll?.employee?.lastName?.charAt(0) }}
          </div>
          <div class="employee-info">
            <span class="employee-name">{{ row.payroll?.employee?.firstName }} {{ row.payroll?.employee?.lastName }}</span>
            <span class="employee-code">{{ row.payroll?.employee?.employeeCode }}</span>
          </div>
        </div>
      </template>
      <template #cell-period="{ row }">
        <span class="period-badge">
          {{ getMonthName(row.payroll?.periodMonth) }} {{ row.payroll?.periodYear }}
        </span>
      </template>
      <template #cell-category="{ value }">
        <span :class="['category-badge', `category-${value?.toLowerCase()}`]">
          {{ getCategoryLabel(value) }}
        </span>
      </template>
      <template #cell-amount="{ value }">
        <span class="money-value positive">+{{ formatCurrency(value) }}</span>
      </template>
      <template #cell-isFinalized="{ row }">
        <span :class="['status-badge', row.payroll?.isFinalized ? 'status-success' : 'status-warning']">
          {{ row.payroll?.isFinalized ? '✓ Kesinleşti' : '⏳ Bekliyor' }}
        </span>
      </template>
      <template #actions="{ row }">
        <button 
          v-if="!row.payroll?.isFinalized" 
          class="action-btn delete" 
          @click.stop="deleteBonus(row)" 
          title="Sil"
        >🗑️</button>
      </template>
    </DataTable>

    <!-- Yeni Prim/İkramiye Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Yeni Prim / İkramiye Ekle</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveBonus" class="modal-body">
              <div class="form-group">
                <label>Personel *</label>
                <select v-model="form.employeeId" required class="form-control" @change="loadEmployeePayroll">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Dönem Ay *</label>
                  <select v-model="form.periodMonth" required class="form-control" @change="loadEmployeePayroll">
                    <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Dönem Yıl *</label>
                  <select v-model="form.periodYear" required class="form-control" @change="loadEmployeePayroll">
                    <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                  </select>
                </div>
              </div>
              <div v-if="!employeePayroll && form.employeeId" class="warning-box">
                <span class="warning-icon">⚠️</span>
                <span>Bu personel için seçilen dönemde bordro bulunmuyor. Önce bordro oluşturulmalıdır.</span>
              </div>
              <div v-if="employeePayroll?.isFinalized" class="warning-box">
                <span class="warning-icon">⚠️</span>
                <span>Bu dönem bordrosu kesinleşmiş. Ekleme yapılamaz.</span>
              </div>
              <div class="form-group">
                <label>Kategori *</label>
                <select v-model="form.category" required class="form-control">
                  <option value="">Kategori Seçin</option>
                  <option value="Bonus">Prim / İkramiye</option>
                  <option value="Overtime">Fazla Mesai</option>
                  <option value="Transport">Yol Yardımı</option>
                  <option value="Food">Yemek Yardımı</option>
                  <option value="Other">Diğer</option>
                </select>
              </div>
              <div class="form-group">
                <label>Tutar (₺) *</label>
                <input 
                  v-model.number="form.amount" 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  required 
                  class="form-control"
                  placeholder="0.00"
                />
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <input 
                  v-model="form.description" 
                  type="text" 
                  class="form-control"
                  placeholder="Opsiyonel açıklama..."
                />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button 
                  type="submit" 
                  class="btn btn-primary" 
                  :disabled="saving || !employeePayroll || employeePayroll?.isFinalized"
                >
                  {{ saving ? 'Ekleniyor...' : 'Ekle' }}
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

// State
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const bonuses = ref<any[]>([])
const employees = ref<any[]>([])
const employeePayroll = ref<any>(null)

const currentDate = new Date()
const selectedMonth = ref<number | string>('')
const selectedYear = ref(currentDate.getFullYear())

const filters = reactive({
  category: '',
  search: ''
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  totalBonuses: 0,
  totalAmount: 0,
  employeeCount: 0,
  currentMonth: 0
})

const form = reactive({
  employeeId: '',
  periodMonth: currentDate.getMonth() + 1,
  periodYear: currentDate.getFullYear(),
  category: '',
  amount: 0,
  description: ''
})

// Aylar
const months = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' }
]

// Yıllar
const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

// Filtrelenmiş bonuslar
const filteredBonuses = computed(() => {
  let result = bonuses.value
  if (filters.search) {
    const term = filters.search.toLowerCase()
    result = result.filter(b => 
      b.payroll?.employee?.firstName?.toLowerCase().includes(term) ||
      b.payroll?.employee?.lastName?.toLowerCase().includes(term) ||
      b.payroll?.employee?.employeeCode?.toLowerCase().includes(term)
    )
  }
  return result
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'period', label: 'Dönem', width: '140px' },
  { key: 'category', label: 'Kategori', width: '140px' },
  { key: 'description', label: 'Açıklama' },
  { key: 'amount', label: 'Tutar', width: '130px' },
  { key: 'isFinalized', label: 'Durum', width: '120px' }
]

// Kategori etiketleri
const categoryLabels: Record<string, string> = {
  Bonus: 'Prim / İkramiye',
  Overtime: 'Fazla Mesai',
  Transport: 'Yol Yardımı',
  Food: 'Yemek Yardımı',
  Other: 'Diğer'
}

// Methods
const loadBonuses = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (selectedMonth.value) options.periodMonth = Number(selectedMonth.value)
    if (selectedYear.value) options.periodYear = Number(selectedYear.value)

    const result = await window.electronAPI.payroll.getAll(options)
    
    if (result.success) {
      // Tüm bordrolardan Income tipindeki kalemleri çıkar
      const allBonuses: any[] = []
      for (const payroll of (result.data || [])) {
        const items = payroll.items || []
        const incomeItems = items.filter((item: any) => 
          item.type === 'Income' && 
          (!filters.category || item.category === filters.category)
        )
        incomeItems.forEach((item: any) => {
          allBonuses.push({ ...item, payroll })
        })
      }
      
      bonuses.value = allBonuses
      pagination.total = allBonuses.length
      pagination.totalPages = Math.ceil(pagination.total / pagination.limit)
      updateStats()
    } else {
      error(result.errors?.[0] || 'Veriler yüklenemedi')
    }
  } catch (err) {
    error('Veriler yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  stats.totalBonuses = bonuses.value.length
  stats.totalAmount = bonuses.value.reduce((sum, b) => sum + (b.amount || 0), 0)
  const uniqueEmployees = new Set(bonuses.value.map(b => b.payroll?.employeeId))
  stats.employeeCount = uniqueEmployees.size
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  stats.currentMonth = bonuses.value.filter(b => 
    b.payroll?.periodMonth === currentMonth && b.payroll?.periodYear === currentYear
  ).length
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

const loadEmployeePayroll = async () => {
  if (!form.employeeId || !form.periodMonth || !form.periodYear) {
    employeePayroll.value = null
    return
  }
  try {
    const result = await window.electronAPI.payroll.getByEmployeePeriod(
      Number(form.employeeId),
      form.periodMonth,
      form.periodYear
    )
    employeePayroll.value = result.success ? result.data : null
  } catch (err) {
    employeePayroll.value = null
  }
}

const openNewModal = () => {
  form.employeeId = ''
  form.periodMonth = currentDate.getMonth() + 1
  form.periodYear = currentDate.getFullYear()
  form.category = ''
  form.amount = 0
  form.description = ''
  employeePayroll.value = null
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveBonus = async () => {
  if (!employeePayroll.value || employeePayroll.value.isFinalized) return

  saving.value = true
  try {
    const result = await window.electronAPI.payroll.addItem(employeePayroll.value.id, {
      type: 'Income',
      category: form.category,
      amount: form.amount,
      description: form.description || undefined
    })

    if (result.success) {
      success('Prim/İkramiye başarıyla eklendi')
      closeModal()
      loadBonuses()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kayıt sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const deleteBonus = async (bonus: any) => {
  if (bonus.payroll?.isFinalized) {
    error('Kesinleşmiş bordrodan kalem silinemez')
    return
  }

  const confirmed = await confirm({
    title: 'Kalemi Sil',
    message: `"${getCategoryLabel(bonus.category)}" kalemini silmek istiyor musunuz?`,
    confirmText: 'Sil',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.payroll.removeItem(bonus.id)
      if (result.success) {
        success('Kalem silindi')
        loadBonuses()
      } else {
        error(result.errors?.[0] || 'Silme başarısız')
      }
    } catch (err) {
      error('Silme sırasında hata oluştu')
    }
  }
}

const filterBonuses = () => {
  pagination.page = 1
}

const handlePageChange = (page: number) => {
  pagination.page = page
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

// Helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0)
}

const getMonthName = (month: number) => {
  return months.find(m => m.value === month)?.label || ''
}

const getCategoryLabel = (category: string) => {
  return categoryLabels[category] || category
}

// Lifecycle
onMounted(() => {
  loadBonuses()
  loadEmployees()
})
</script>

<style scoped>
.bonus-list-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.period-selector {
  margin-bottom: 1.5rem;
}

.period-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #0466c8;
}

.period-icon {
  font-size: 1.5rem;
}

.period-content {
  flex: 1;
}

.period-content label {
  display: block;
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.period-inputs {
  display: flex;
  gap: 0.75rem;
}

.period-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  min-width: 120px;
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

.search-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 180px;
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

.period-badge {
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.category-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.category-bonus { background: #fff3cd; color: #856404; }
.category-overtime { background: #d1ecf1; color: #0c5460; }
.category-transport { background: #d4edda; color: #155724; }
.category-food { background: #f8d7da; color: #721c24; }
.category-other { background: #e9ecef; color: #495057; }

.money-value {
  font-weight: 600;
  font-family: 'Consolas', monospace;
}

.money-value.positive {
  color: #198754;
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

.action-btn {
  padding: 0.375rem 0.5rem;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.action-btn.delete:hover {
  background: #f8d7da;
  transform: scale(1.1);
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

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff3cd;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid #ffeeba;
}

.warning-icon {
  font-size: 1.25rem;
}

.warning-box span:last-child {
  font-size: 0.9rem;
  color: #856404;
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
