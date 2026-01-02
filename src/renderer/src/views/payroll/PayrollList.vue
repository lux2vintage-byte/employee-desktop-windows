<template>
  <div class="payroll-list-page">
    <PageHeader 
      title="Bordro Listesi" 
      description="Tüm dönemlere ait bordro kayıtlarını görüntüleyin ve yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="$router.push('/payroll/generate')">
          ➕ Yeni Bordro Oluştur
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📄" :value="stats.total" label="Toplam Bordro" color="primary" />
      <StatCard icon="✅" :value="stats.finalized" label="Kesinleşen" color="success" />
      <StatCard icon="⏳" :value="stats.pending" label="Bekleyen" color="warning" />
      <StatCard icon="💰" :value="formatCurrency(stats.totalNet)" label="Toplam Net" color="info" />
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
            v-model="filters.search" 
            type="text" 
            placeholder="Personel ara..." 
            class="search-input"
            @input="loadPayrolls"
          />
        </div>
        <div class="filter-group">
          <select v-model="filters.year" @change="loadPayrolls" class="filter-select">
            <option value="">Tüm Yıllar</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filters.month" @change="loadPayrolls" class="filter-select">
            <option value="">Tüm Aylar</option>
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filters.status" @change="loadPayrolls" class="filter-select">
            <option value="">Tüm Durumlar</option>
            <option value="true">Kesinleşen</option>
            <option value="false">Bekleyen</option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <!-- Bordro Tablosu -->
    <DataTable
      :columns="columns"
      :data="payrolls"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Bordro kaydı bulunmuyor"
      @page-change="handlePageChange"
      @sort="handleSort"
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
      <template #cell-period="{ row }">
        <span class="period-badge">
          {{ getMonthName(row.periodMonth) }} {{ row.periodYear }}
        </span>
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
        <button 
          class="action-btn pdf" 
          @click.stop="exportPayrollPdf(row)" 
          title="PDF İndir"
        >📄</button>
      </template>
    </DataTable>
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
const payrolls = ref<any[]>([])

const filters = reactive({
  search: '',
  year: '',
  month: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  total: 0,
  finalized: 0,
  pending: 0,
  totalNet: 0
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
  return Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'period', label: 'Dönem', width: '140px', sortable: true },
  { key: 'baseSalary', label: 'Brüt Maaş', width: '130px' },
  { key: 'totalAdditions', label: 'Eklemeler', width: '110px' },
  { key: 'totalDeductions', label: 'Kesintiler', width: '110px' },
  { key: 'netSalary', label: 'Net Maaş', width: '130px' },
  { key: 'isFinalized', label: 'Durum', width: '120px' }
]

// Methods
const loadPayrolls = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit,
      orderBy: 'createdAt',
      order: 'desc'
    }

    if (filters.year) options.periodYear = Number(filters.year)
    if (filters.month) options.periodMonth = Number(filters.month)
    if (filters.status !== '') options.isFinalized = filters.status === 'true'

    const result = await window.electronAPI.payroll.getAll(options)
    
    if (result.success) {
      let data = result.data || []
      
      // Client-side search filter
      if (filters.search) {
        const term = filters.search.toLowerCase()
        data = data.filter((p: any) => 
          p.employee?.firstName?.toLowerCase().includes(term) ||
          p.employee?.lastName?.toLowerCase().includes(term) ||
          p.employee?.employeeCode?.toLowerCase().includes(term)
        )
      }
      
      payrolls.value = data
      pagination.total = result.total || data.length
      pagination.totalPages = result.totalPages || Math.ceil(pagination.total / pagination.limit)
      
      updateStats()
    } else {
      error(result.errors?.[0] || 'Bordrolar yüklenemedi')
    }
  } catch (err) {
    error('Bordrolar yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  stats.total = pagination.total
  stats.finalized = payrolls.value.filter(p => p.isFinalized).length
  stats.pending = payrolls.value.filter(p => !p.isFinalized).length
  stats.totalNet = payrolls.value.reduce((sum, p) => sum + (p.netSalary || 0), 0)
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
    message: `${payroll.employee?.firstName} ${payroll.employee?.lastName} için ${getMonthName(payroll.periodMonth)} ${payroll.periodYear} bordrosunu kesinleştirmek istiyor musunuz? Bu işlem geri alınamaz.`,
    confirmText: 'Kesinleştir',
    type: 'warning'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.payroll.finalize(payroll.id)
      if (result.success) {
        success('Bordro kesinleştirildi')
        await loadPayrolls()
      } else {
        error(result.errors?.[0] || 'Kesinleştirme başarısız')
      }
    } catch (err) {
      error('Kesinleştirme sırasında hata oluştu')
    }
  }
}

const exportPayrollPdf = (payroll: any) => {
  success('PDF export özelliği yakında eklenecek')
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadPayrolls()
}

const handleSort = (key: string, order: 'asc' | 'desc') => {
  // Sorting handled by backend
  loadPayrolls()
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
onMounted(() => {
  loadPayrolls()
})
</script>

<style scoped>
.payroll-list-page {
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

.search-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 180px;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 120px;
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

.action-btn.pdf {
  color: #dc3545;
}

.action-btn.pdf:hover {
  background: #f8d7da;
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
</style>
