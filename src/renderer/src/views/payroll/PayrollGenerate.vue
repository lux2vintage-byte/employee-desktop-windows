<template>
  <div class="payroll-generate-page">
    <PageHeader 
      title="Aylık Bordro Hazırlama" 
      description="Seçilen dönem için personel bordrolarını oluşturun ve yönetin"
    >
      <template #actions>
        <button class="btn btn-success" @click="generateBulkPayroll" :disabled="generating">
          {{ generating ? '⏳ Oluşturuluyor...' : '🚀 Toplu Bordro Oluştur' }}
        </button>
      </template>
    </PageHeader>

    <!-- Dönem Seçimi -->
    <div class="period-selector">
      <div class="period-card">
        <div class="period-icon">📅</div>
        <div class="period-content">
          <label>Dönem Seçimi</label>
          <div class="period-inputs">
            <select v-model="selectedMonth" class="period-select" @change="loadPeriodData">
              <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
            <select v-model="selectedYear" class="period-select" @change="loadPeriodData">
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="👥" :value="stats.totalEmployees" label="Toplam Personel" color="primary" />
      <StatCard icon="📄" :value="stats.generatedPayrolls" label="Oluşturulan Bordro" color="success" />
      <StatCard icon="⏳" :value="stats.pendingPayrolls" label="Bekleyen" color="warning" />
      <StatCard icon="✅" :value="stats.finalizedPayrolls" label="Kesinleşen" color="info" />
    </div>

    <!-- Özet Kartları -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-header">
          <span class="summary-icon">💵</span>
          <span class="summary-title">Toplam Brüt Maaş</span>
        </div>
        <div class="summary-value">{{ formatCurrency(stats.totalBaseSalary) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-header">
          <span class="summary-icon">➕</span>
          <span class="summary-title">Toplam Eklemeler</span>
        </div>
        <div class="summary-value positive">+{{ formatCurrency(stats.totalAdditions) }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-header">
          <span class="summary-icon">➖</span>
          <span class="summary-title">Toplam Kesintiler</span>
        </div>
        <div class="summary-value negative">-{{ formatCurrency(stats.totalDeductions) }}</div>
      </div>
      <div class="summary-card highlight">
        <div class="summary-header">
          <span class="summary-icon">💰</span>
          <span class="summary-title">Toplam Net Maaş</span>
        </div>
        <div class="summary-value">{{ formatCurrency(stats.totalNetSalary) }}</div>
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
          <input 
            v-model="searchTerm" 
            type="text" 
            placeholder="Personel ara..." 
            class="search-input"
            @input="filterPayrolls"
          />
        </div>
        <div class="filter-group">
          <select v-model="filterStatus" @change="filterPayrolls" class="filter-select">
            <option value="">Tüm Durumlar</option>
            <option value="pending">Bekleyen</option>
            <option value="finalized">Kesinleşen</option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <!-- Bordro Tablosu -->
    <DataTable
      :columns="columns"
      :data="filteredPayrolls"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Bu dönem için bordro bulunmuyor"
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
      <template #cell-baseSalary="{ value }">
        <span class="money-value">{{ formatCurrency(value) }}</span>
      </template>
      <template #cell-totalAdditions="{ value }">
        <span class="money-value positive">+{{ formatCurrency(value) }}</span>
      </template>
      <template #cell-totalDeductions="{ value }">
        <span class="money-value negative">-{{ formatCurrency(value) }}</span>
      </template>
      <template #cell-netSalary="{ value }">
        <span class="money-value net">{{ formatCurrency(value) }}</span>
      </template>
      <template #cell-isFinalized="{ value }">
        <span :class="['status-badge', value ? 'status-success' : 'status-warning']">
          {{ value ? '✓ Kesinleşti' : '⏳ Bekliyor' }}
        </span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn view" @click.stop="viewPayroll(row)" title="Detay">👁️</button>
        <button 
          v-if="!row.isFinalized" 
          class="action-btn edit" 
          @click.stop="editPayroll(row)" 
          title="Düzenle"
        >✏️</button>
        <button 
          v-if="!row.isFinalized" 
          class="action-btn finalize" 
          @click.stop="finalizePayroll(row)" 
          title="Kesinleştir"
        >✓</button>
      </template>
    </DataTable>

    <!-- Tekil Bordro Oluşturma Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showGenerateModal" class="modal-overlay" @click.self="closeGenerateModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Tekil Bordro Oluştur</h3>
              <button class="close-btn" @click="closeGenerateModal">✕</button>
            </div>
            <form @submit.prevent="generateSinglePayroll" class="modal-body">
              <div class="form-group">
                <label>Personel *</label>
                <select v-model="generateForm.employeeId" required class="form-control">
                  <option value="">Personel Seçin</option>
                  <option 
                    v-for="emp in employeesWithoutPayroll" 
                    :key="emp.id" 
                    :value="emp.id"
                  >
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="info-box">
                <span class="info-icon">ℹ️</span>
                <span>Seçilen personel için {{ getMonthName(selectedMonth) }} {{ selectedYear }} dönemi bordrosu oluşturulacaktır.</span>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeGenerateModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="generatingSingle">
                  {{ generatingSingle ? 'Oluşturuluyor...' : 'Bordro Oluştur' }}
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
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const router = useRouter()
const { success, error } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(false)
const generating = ref(false)
const generatingSingle = ref(false)
const showGenerateModal = ref(false)
const payrolls = ref<any[]>([])
const employees = ref<any[]>([])
const searchTerm = ref('')
const filterStatus = ref('')

const currentDate = new Date()
const selectedMonth = ref(currentDate.getMonth() + 1)
const selectedYear = ref(currentDate.getFullYear())

const generateForm = reactive({
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
  generatedPayrolls: 0,
  pendingPayrolls: 0,
  finalizedPayrolls: 0,
  totalBaseSalary: 0,
  totalAdditions: 0,
  totalDeductions: 0,
  totalNetSalary: 0
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

// Bordrosu olmayan personeller
const employeesWithoutPayroll = computed(() => {
  const payrollEmployeeIds = new Set(payrolls.value.map(p => p.employeeId))
  return employees.value.filter(e => !payrollEmployeeIds.has(e.id))
})

// Filtrelenmiş bordrolar
const filteredPayrolls = computed(() => {
  let result = payrolls.value

  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(p => 
      p.employee?.firstName?.toLowerCase().includes(term) ||
      p.employee?.lastName?.toLowerCase().includes(term) ||
      p.employee?.employeeCode?.toLowerCase().includes(term)
    )
  }

  if (filterStatus.value === 'pending') {
    result = result.filter(p => !p.isFinalized)
  } else if (filterStatus.value === 'finalized') {
    result = result.filter(p => p.isFinalized)
  }

  return result
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'baseSalary', label: 'Brüt Maaş', width: '130px' },
  { key: 'totalAdditions', label: 'Eklemeler', width: '120px' },
  { key: 'totalDeductions', label: 'Kesintiler', width: '120px' },
  { key: 'netSalary', label: 'Net Maaş', width: '130px' },
  { key: 'isFinalized', label: 'Durum', width: '120px' }
]

// Methods
const loadPeriodData = async () => {
  await Promise.all([loadPayrolls(), loadStatistics()])
}

const loadPayrolls = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.payroll.getByPeriod(selectedMonth.value, selectedYear.value)
    if (result.success) {
      payrolls.value = result.data || []
      pagination.total = payrolls.value.length
      pagination.totalPages = Math.ceil(pagination.total / pagination.limit)
    } else {
      error(result.errors?.[0] || 'Bordrolar yüklenemedi')
    }
  } catch (err) {
    error('Bordrolar yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const result = await window.electronAPI.payroll.getPeriodStatistics(selectedMonth.value, selectedYear.value)
    if (result.success && result.data) {
      stats.generatedPayrolls = result.data.totalPayrolls || 0
      stats.pendingPayrolls = result.data.pendingCount || 0
      stats.finalizedPayrolls = result.data.finalizedCount || 0
      stats.totalBaseSalary = result.data.totalBaseSalary || 0
      stats.totalAdditions = result.data.totalAdditions || 0
      stats.totalDeductions = result.data.totalDeductions || 0
      stats.totalNetSalary = result.data.totalNetSalary || 0
    }
  } catch (err) {
    console.error('İstatistikler yüklenemedi:', err)
  }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 500, status: 'Active' })
    if (result.success) {
      employees.value = result.data || []
      stats.totalEmployees = employees.value.length
    }
  } catch (err) {
    console.error('Personeller yüklenemedi:', err)
  }
}

const generateBulkPayroll = async () => {
  const confirmed = await confirm({
    title: 'Toplu Bordro Oluştur',
    message: `${getMonthName(selectedMonth.value)} ${selectedYear.value} dönemi için tüm aktif personellerin bordroları oluşturulacak. Devam etmek istiyor musunuz?`,
    confirmText: 'Oluştur',
    type: 'info'
  })

  if (confirmed) {
    generating.value = true
    try {
      const result = await window.electronAPI.payroll.generateBulk(selectedMonth.value, selectedYear.value)
      if (result.success) {
        const count = result.data?.length || 0
        success(`${count} bordro başarıyla oluşturuldu`)
        await loadPeriodData()
      } else {
        error(result.errors?.[0] || 'Toplu bordro oluşturulamadı')
      }
    } catch (err) {
      error('Toplu bordro oluşturulurken hata oluştu')
    } finally {
      generating.value = false
    }
  }
}

const generateSinglePayroll = async () => {
  if (!generateForm.employeeId) return

  generatingSingle.value = true
  try {
    const result = await window.electronAPI.payroll.generate(
      Number(generateForm.employeeId),
      selectedMonth.value,
      selectedYear.value
    )
    if (result.success) {
      success('Bordro başarıyla oluşturuldu')
      closeGenerateModal()
      await loadPeriodData()
    } else {
      error(result.errors?.[0] || 'Bordro oluşturulamadı')
    }
  } catch (err) {
    error('Bordro oluşturulurken hata oluştu')
  } finally {
    generatingSingle.value = false
  }
}

const viewPayroll = (payroll: any) => {
  router.push(`/payroll/${payroll.id}`)
}

const editPayroll = (payroll: any) => {
  router.push(`/payroll/${payroll.id}`)
}

const finalizePayroll = async (payroll: any) => {
  const confirmed = await confirm({
    title: 'Bordroyu Kesinleştir',
    message: `${payroll.employee?.firstName} ${payroll.employee?.lastName} için bordroyu kesinleştirmek istiyor musunuz? Bu işlem geri alınamaz.`,
    confirmText: 'Kesinleştir',
    type: 'warning'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.payroll.finalize(payroll.id)
      if (result.success) {
        success('Bordro kesinleştirildi')
        await loadPeriodData()
      } else {
        error(result.errors?.[0] || 'Kesinleştirme başarısız')
      }
    } catch (err) {
      error('Kesinleştirme sırasında hata oluştu')
    }
  }
}

const closeGenerateModal = () => {
  showGenerateModal.value = false
  generateForm.employeeId = ''
}

const filterPayrolls = () => {
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

// Lifecycle
onMounted(async () => {
  await loadEmployees()
  await loadPeriodData()
})
</script>

<style scoped>
.payroll-generate-page {
  max-width: 1400px;
  margin: 0 auto;
}

.period-selector {
  margin-bottom: 1.5rem;
}

.period-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #0466c8;
}

.period-icon {
  font-size: 2rem;
}

.period-content {
  flex: 1;
}

.period-content label {
  display: block;
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.period-inputs {
  display: flex;
  gap: 0.75rem;
}

.period-select {
  padding: 0.625rem 1rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  background: white;
  min-width: 140px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.summary-card.highlight {
  background: linear-gradient(135deg, #198754 0%, #157347 100%);
  color: white;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.summary-icon {
  font-size: 1.25rem;
}

.summary-title {
  font-size: 0.85rem;
  color: #6c757d;
}

.summary-card.highlight .summary-title {
  color: rgba(255, 255, 255, 0.85);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
}

.summary-card.highlight .summary-value {
  color: white;
}

.summary-value.positive {
  color: #198754;
}

.summary-value.negative {
  color: #dc3545;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 200px;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 140px;
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
}

.money-value.positive {
  color: #198754;
}

.money-value.negative {
  color: #dc3545;
}

.money-value.net {
  color: #0466c8;
  font-size: 1rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-warning {
  background: #fff3cd;
  color: #856404;
}

.status-success {
  background: #d4edda;
  color: #155724;
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

.action-btn.view:hover {
  background: #e9ecef;
}

.action-btn.edit:hover {
  background: #e7f1ff;
}

.action-btn.finalize {
  color: #198754;
}

.action-btn.finalize:hover {
  background: #d4edda;
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

.info-box {
  display: flex;
  align-items: flex-start;
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
  background: #0466c8;
  color: white;
}

.btn-primary:hover {
  background: #0353a4;
}

.btn-success {
  background: #198754;
  color: white;
}

.btn-success:hover {
  background: #157347;
}

.btn-success:disabled {
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
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>
