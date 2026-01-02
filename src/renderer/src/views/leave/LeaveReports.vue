<template>
  <div class="leave-reports-page">
    <PageHeader 
      title="İzin Raporları" 
      description="Kişi bazlı ve genel izin kullanım raporlarını görüntüleyin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="generateReport">
          📊 Rapor Oluştur
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📅" :value="stats.totalRequests" label="Toplam Talep" color="primary" />
      <StatCard icon="✅" :value="stats.approvedRequests" label="Onaylanan" color="success" />
      <StatCard icon="📊" :value="stats.totalDaysUsed" label="Kullanılan Gün" color="warning" />
      <StatCard icon="📈" :value="stats.avgDaysPerEmployee + ' gün'" label="Ort. Kullanım" color="info" />
    </div>

    <!-- Filtreler -->
    <div class="report-filters">
      <div class="filter-card">
        <h4>Rapor Filtreleri</h4>
        <div class="filter-grid">
          <div class="filter-group">
            <label>Rapor Türü</label>
            <select v-model="filters.reportType" class="filter-select">
              <option value="general">Genel Rapor</option>
              <option value="employee">Personel Bazlı</option>
              <option value="department">Departman Bazlı</option>
              <option value="leaveType">İzin Türü Bazlı</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Yıl</label>
            <select v-model="filters.year" class="filter-select">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
          <div class="filter-group" v-if="filters.reportType === 'employee'">
            <label>Personel</label>
            <select v-model="filters.employeeId" class="filter-select">
              <option value="">Tüm Personeller</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                {{ emp.firstName }} {{ emp.lastName }}
              </option>
            </select>
          </div>
          <div class="filter-group" v-if="filters.reportType === 'leaveType'">
            <label>İzin Türü</label>
            <select v-model="filters.leaveTypeId" class="filter-select">
              <option value="">Tüm Türler</option>
              <option v-for="lt in leaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Tarih Aralığı</label>
            <div class="date-range-inputs">
              <input v-model="filters.startDate" type="date" class="filter-input" />
              <span>-</span>
              <input v-model="filters.endDate" type="date" class="filter-input" />
            </div>
          </div>
        </div>
        <div class="filter-actions">
          <button class="btn btn-secondary" @click="resetFilters">Sıfırla</button>
          <button class="btn btn-primary" @click="loadReport">Filtrele</button>
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
    />

    <!-- Rapor Tablosu -->
    <DataTable
      :columns="currentColumns"
      :data="reportData"
      :loading="loading"
      :show-actions="false"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Rapor verisi bulunmuyor"
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
      <template #cell-totalDays="{ value }">
        <span class="day-count">{{ value }} gün</span>
      </template>
      <template #cell-requestCount="{ value }">
        <span class="count-badge">{{ value }} talep</span>
      </template>
    </DataTable>

    <!-- Özet Kartları -->
    <div v-if="reportData.length > 0" class="summary-section">
      <h4>Rapor Özeti</h4>
      <div class="summary-grid">
        <div class="summary-card">
          <span class="summary-label">Toplam Kayıt</span>
          <span class="summary-value">{{ pagination.total }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Toplam Gün</span>
          <span class="summary-value">{{ summaryStats.totalDays }} gün</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Ortalama Süre</span>
          <span class="summary-value">{{ summaryStats.avgDays }} gün</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'

const { success, error } = useToast()

// State
const loading = ref(false)
const reportData = ref<any[]>([])
const employees = ref<any[]>([])
const leaveTypes = ref<any[]>([])

const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years = []
  for (let y = currentYear - 3; y <= currentYear; y++) {
    years.push(y)
  }
  return years
})

const filters = reactive({
  reportType: 'general',
  year: currentYear,
  employeeId: '',
  leaveTypeId: '',
  startDate: `${currentYear}-01-01`,
  endDate: `${currentYear}-12-31`
})

const pagination = reactive({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  totalRequests: 0,
  approvedRequests: 0,
  totalDaysUsed: 0,
  avgDaysPerEmployee: 0
})

const summaryStats = reactive({
  totalDays: 0,
  avgDays: 0
})

// Tablo kolonları - rapor türüne göre değişir
const generalColumns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'leaveType', label: 'İzin Türü', width: '140px' },
  { key: 'dateRange', label: 'Tarih Aralığı', width: '200px' },
  { key: 'dayCount', label: 'Süre', width: '80px' },
  { key: 'status', label: 'Durum', width: '120px' }
]

const employeeColumns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'leaveType', label: 'İzin Türü', width: '140px' },
  { key: 'dateRange', label: 'Tarih Aralığı', width: '200px' },
  { key: 'dayCount', label: 'Süre', width: '80px' },
  { key: 'status', label: 'Durum', width: '120px' }
]

const summaryColumns: TableColumn[] = [
  { key: 'name', label: 'Kategori', sortable: true },
  { key: 'requestCount', label: 'Talep Sayısı', width: '120px' },
  { key: 'totalDays', label: 'Toplam Gün', width: '120px' }
]

const currentColumns = computed(() => {
  if (filters.reportType === 'department' || filters.reportType === 'leaveType') {
    return summaryColumns
  }
  return generalColumns
})

// Methods
const loadReport = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit,
      status: 'Approved'
    }
    
    if (filters.startDate) options.startDate = filters.startDate
    if (filters.endDate) options.endDate = filters.endDate
    if (filters.employeeId) options.employeeId = Number(filters.employeeId)
    if (filters.leaveTypeId) options.leaveTypeId = Number(filters.leaveTypeId)

    const result = await window.electronAPI.leaveRequest.getAll(options)
    
    if (result.success) {
      reportData.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
      updateSummary()
    } else {
      error(result.errors?.[0] || 'Rapor yüklenemedi')
    }
  } catch (err) {
    error('Rapor yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = async () => {
  try {
    // Tüm talepleri al
    const allResult = await window.electronAPI.leaveRequest.getAll({ limit: 1000 })
    if (allResult.success) {
      const all = allResult.data || []
      stats.totalRequests = allResult.total || 0
      stats.approvedRequests = all.filter((r: any) => r.status === 'Approved').length
      stats.totalDaysUsed = all
        .filter((r: any) => r.status === 'Approved')
        .reduce((sum: number, r: any) => sum + (r.dayCount || 0), 0)
      
      const uniqueEmployees = new Set(all.map((r: any) => r.employeeId)).size
      stats.avgDaysPerEmployee = uniqueEmployees > 0 
        ? Math.round(stats.totalDaysUsed / uniqueEmployees * 10) / 10 
        : 0
    }
  } catch (err) {
    console.error('İstatistikler yüklenemedi:', err)
  }
}

const updateSummary = () => {
  const data = reportData.value
  summaryStats.totalDays = data.reduce((sum, r) => sum + (r.dayCount || 0), 0)
  summaryStats.avgDays = data.length > 0 
    ? Math.round(summaryStats.totalDays / data.length * 10) / 10 
    : 0
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

const resetFilters = () => {
  filters.reportType = 'general'
  filters.year = currentYear
  filters.employeeId = ''
  filters.leaveTypeId = ''
  filters.startDate = `${currentYear}-01-01`
  filters.endDate = `${currentYear}-12-31`
  loadReport()
}

const generateReport = () => {
  loadReport()
  success('Rapor oluşturuldu')
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadReport()
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
  loadReport()
  loadEmployees()
  loadLeaveTypes()
})
</script>

<style scoped>
.leave-reports-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.report-filters {
  margin-bottom: 1.5rem;
}

.filter-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-card h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #495057;
}

.filter-select, .filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
}

.date-range-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-range-inputs span {
  color: #6c757d;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
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

.day-count, .count-badge {
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

.summary-section {
  margin-top: 2rem;
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.summary-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.summary-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.summary-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
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

.btn-secondary {
  background: #e9ecef;
  color: #495057;
}

.btn-secondary:hover {
  background: #dee2e6;
}
</style>
