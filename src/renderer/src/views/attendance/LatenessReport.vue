<template>
  <div class="lateness-report-page">
    <PageHeader 
      title="Geç Kalma / Erken Çıkma Raporu" 
      description="Personellerin geç kalma ve erken çıkma durumlarını analiz edin"
    >
      <template #actions>
        <button class="btn btn-outline" @click="exportToExcel">
          📊 Excel'e Aktar
        </button>
        <button class="btn btn-outline" @click="generatePdf">
          📄 PDF Oluştur
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="⏰" :value="stats.totalLate" label="Toplam Geç Kalma" color="warning" />
      <StatCard icon="🚪" :value="stats.totalEarlyLeave" label="Toplam Erken Çıkma" color="danger" />
      <StatCard icon="⏱️" :value="stats.avgLateMinutes + ' dk'" label="Ort. Geç Kalma" color="info" />
      <StatCard icon="👥" :value="stats.affectedEmployees" label="Etkilenen Personel" color="primary" />
    </div>

    <!-- Filtreler -->
    <div class="filters-bar">
      <div class="filter-group">
        <label>Başlangıç:</label>
        <input v-model="filters.startDate" type="date" class="date-input" @change="loadReport" />
      </div>
      <div class="filter-group">
        <label>Bitiş:</label>
        <input v-model="filters.endDate" type="date" class="date-input" @change="loadReport" />
      </div>
      <div class="filter-group">
        <label>Departman:</label>
        <select v-model="filters.departmentId" @change="loadReport" class="filter-select">
          <option value="">Tüm Departmanlar</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Personel:</label>
        <select v-model="filters.employeeId" @change="loadReport" class="filter-select">
          <option value="">Tüm Personeller</option>
          <option v-for="emp in employees" :key="emp.id" :value="emp.id">
            {{ emp.firstName }} {{ emp.lastName }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label>Rapor Türü:</label>
        <select v-model="filters.reportType" @change="loadReport" class="filter-select">
          <option value="all">Tümü</option>
          <option value="late">Sadece Geç Kalma</option>
          <option value="early">Sadece Erken Çıkma</option>
        </select>
      </div>
    </div>

    <!-- Çalışma Saatleri Ayarı -->
    <div class="work-hours-config">
      <span class="config-label">📋 Mesai Saatleri:</span>
      <div class="time-inputs">
        <label>Giriş:</label>
        <input v-model="workHours.start" type="time" class="time-input" @change="loadReport" />
        <label>Çıkış:</label>
        <input v-model="workHours.end" type="time" class="time-input" @change="loadReport" />
        <label>Tolerans (dk):</label>
        <input v-model.number="workHours.tolerance" type="number" min="0" max="30" class="tolerance-input" @change="loadReport" />
      </div>
    </div>

    <!-- Rapor Tablosu -->
    <DataTable
      :columns="columns"
      :data="reportData"
      :loading="loading"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Seçilen kriterlere uygun kayıt bulunmuyor"
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
            <span class="employee-dept">{{ row.employee?.department?.name || '-' }}</span>
          </div>
        </div>
      </template>
      <template #cell-date="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #cell-checkInTime="{ value, row }">
        <div class="time-cell">
          <span class="time-value">{{ formatTime(value) }}</span>
          <span v-if="row.lateMinutes > 0" class="late-badge">+{{ row.lateMinutes }} dk</span>
        </div>
      </template>
      <template #cell-checkOutTime="{ value, row }">
        <div class="time-cell">
          <span class="time-value">{{ formatTime(value) }}</span>
          <span v-if="row.earlyMinutes > 0" class="early-badge">-{{ row.earlyMinutes }} dk</span>
        </div>
      </template>
      <template #cell-type="{ row }">
        <div class="type-badges">
          <span v-if="row.lateMinutes > 0" class="type-badge late">Geç Kalma</span>
          <span v-if="row.earlyMinutes > 0" class="type-badge early">Erken Çıkma</span>
        </div>
      </template>
      <template #cell-totalMinutes="{ row }">
        <span class="total-minutes">{{ row.lateMinutes + row.earlyMinutes }} dk</span>
      </template>
    </DataTable>

    <!-- Özet Grafik Alanı -->
    <div class="summary-section" v-if="!loading && reportData.length > 0">
      <div class="summary-card">
        <h4>📊 Personel Bazlı Özet</h4>
        <div class="summary-list">
          <div v-for="summary in employeeSummary" :key="summary.employeeId" class="summary-item">
            <div class="summary-employee">
              <span class="summary-name">{{ summary.name }}</span>
              <span class="summary-dept">{{ summary.department }}</span>
            </div>
            <div class="summary-stats">
              <span class="stat-item late">{{ summary.lateCount }} geç</span>
              <span class="stat-item early">{{ summary.earlyCount }} erken</span>
              <span class="stat-item total">{{ summary.totalMinutes }} dk</span>
            </div>
            <div class="summary-bar">
              <div class="bar-fill" :style="{ width: summary.percentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'

const { success, error } = useToast()

// State
const loading = ref(false)
const employees = ref<any[]>([])
const departments = ref<any[]>([])
const attendanceData = ref<any[]>([])

// Tarih filtreleri - bu ayın başı ve sonu
const now = new Date()
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

const filters = reactive({
  startDate: firstDay,
  endDate: lastDay,
  departmentId: '',
  employeeId: '',
  reportType: 'all'
})

const workHours = reactive({
  start: '08:30',
  end: '17:30',
  tolerance: 5
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  totalLate: 0,
  totalEarlyLeave: 0,
  avgLateMinutes: 0,
  affectedEmployees: 0
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'date', label: 'Tarih', width: '110px', sortable: true },
  { key: 'checkInTime', label: 'Giriş Saati', width: '140px' },
  { key: 'checkOutTime', label: 'Çıkış Saati', width: '140px' },
  { key: 'type', label: 'Durum', width: '180px' },
  { key: 'totalMinutes', label: 'Toplam', width: '100px', sortable: true }
]

// Computed
const reportData = computed(() => {
  return attendanceData.value
    .map(record => {
      const lateMinutes = calculateLateMinutes(record.checkInTime)
      const earlyMinutes = calculateEarlyMinutes(record.checkOutTime)
      
      return {
        ...record,
        lateMinutes,
        earlyMinutes
      }
    })
    .filter(record => {
      if (filters.reportType === 'late') return record.lateMinutes > 0
      if (filters.reportType === 'early') return record.earlyMinutes > 0
      return record.lateMinutes > 0 || record.earlyMinutes > 0
    })
})

const employeeSummary = computed(() => {
  const summaryMap = new Map<number, any>()
  
  reportData.value.forEach(record => {
    const empId = record.employeeId
    if (!summaryMap.has(empId)) {
      summaryMap.set(empId, {
        employeeId: empId,
        name: `${record.employee?.firstName} ${record.employee?.lastName}`,
        department: record.employee?.department?.name || '-',
        lateCount: 0,
        earlyCount: 0,
        totalMinutes: 0
      })
    }
    
    const summary = summaryMap.get(empId)
    if (record.lateMinutes > 0) summary.lateCount++
    if (record.earlyMinutes > 0) summary.earlyCount++
    summary.totalMinutes += record.lateMinutes + record.earlyMinutes
  })
  
  const summaries = Array.from(summaryMap.values())
  const maxMinutes = Math.max(...summaries.map(s => s.totalMinutes), 1)
  
  return summaries
    .map(s => ({ ...s, percentage: (s.totalMinutes / maxMinutes) * 100 }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 10)
})

// Methods
const loadReport = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.attendance.getAll({
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: 5000
    })
    
    if (result.success) {
      let data = result.data || []
      
      // Departman filtresi
      if (filters.departmentId) {
        data = data.filter((r: any) => r.employee?.departmentId === Number(filters.departmentId))
      }
      
      // Personel filtresi
      if (filters.employeeId) {
        data = data.filter((r: any) => r.employeeId === Number(filters.employeeId))
      }
      
      // Sadece giriş/çıkış yapanları al
      data = data.filter((r: any) => r.checkInTime || r.checkOutTime)
      
      attendanceData.value = data
      updateStats()
    } else {
      error(result.errors?.[0] || 'Rapor yüklenemedi')
    }
  } catch (err) {
    error('Rapor yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  const data = reportData.value
  stats.totalLate = data.filter(r => r.lateMinutes > 0).length
  stats.totalEarlyLeave = data.filter(r => r.earlyMinutes > 0).length
  
  const totalLateMinutes = data.reduce((sum, r) => sum + r.lateMinutes, 0)
  stats.avgLateMinutes = stats.totalLate > 0 ? Math.round(totalLateMinutes / stats.totalLate) : 0
  
  const uniqueEmployees = new Set(data.map(r => r.employeeId))
  stats.affectedEmployees = uniqueEmployees.size
  
  pagination.total = data.length
  pagination.totalPages = Math.ceil(data.length / pagination.limit)
}

const calculateLateMinutes = (checkInTime: string | null) => {
  if (!checkInTime) return 0
  
  const checkIn = new Date(checkInTime)
  const [startHour, startMin] = workHours.start.split(':').map(Number)
  const expectedStart = new Date(checkIn)
  expectedStart.setHours(startHour || 0, (startMin || 0) + workHours.tolerance, 0, 0)
  
  if (checkIn > expectedStart) {
    return Math.round((checkIn.getTime() - expectedStart.getTime()) / 60000)
  }
  return 0
}

const calculateEarlyMinutes = (checkOutTime: string | null) => {
  if (!checkOutTime) return 0
  
  const checkOut = new Date(checkOutTime)
  const [endHour, endMin] = workHours.end.split(':').map(Number)
  const expectedEnd = new Date(checkOut)
  expectedEnd.setHours(endHour || 0, (endMin || 0) - workHours.tolerance, 0, 0)
  
  if (checkOut < expectedEnd) {
    return Math.round((expectedEnd.getTime() - checkOut.getTime()) / 60000)
  }
  return 0
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

const loadDepartments = async () => {
  try {
    const result = await window.electronAPI.department.getAll({ limit: 100 })
    if (result.success) {
      departments.value = result.data
    }
  } catch (err) {
    console.error('Departmanlar yüklenemedi:', err)
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
}

const handleSort = (key: string, order: 'asc' | 'desc') => {
  // Sıralama işlemi
}

const exportToExcel = () => {
  success('Excel export özelliği yakında eklenecek')
}

const generatePdf = () => {
  success('PDF oluşturma özelliği yakında eklenecek')
}

// Helpers
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const formatTime = (datetime: string) => {
  if (!datetime) return '-'
  return new Date(datetime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

// Lifecycle
onMounted(async () => {
  await loadEmployees()
  await loadDepartments()
  await loadReport()
})
</script>

<style scoped>
.lateness-report-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  margin-bottom: 1rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 500;
  color: #495057;
  white-space: nowrap;
}

.date-input,
.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
}

.filter-select {
  min-width: 150px;
}

.work-hours-config {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #e7f1ff;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.config-label {
  font-weight: 600;
  color: #0466c8;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.time-inputs label {
  font-size: 0.875rem;
  color: #495057;
}

.time-input {
  padding: 0.375rem 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.875rem;
  width: 100px;
}

.tolerance-input {
  padding: 0.375rem 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.875rem;
  width: 60px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline {
  background: white;
  color: #0466c8;
  border: 1px solid #0466c8;
}

.btn-outline:hover {
  background: #e7f1ff;
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

.employee-dept {
  font-size: 0.75rem;
  color: #6c757d;
}

.time-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-value {
  font-weight: 500;
}

.late-badge {
  background: #fff3cd;
  color: #856404;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.early-badge {
  background: #f8d7da;
  color: #721c24;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.type-badges {
  display: flex;
  gap: 0.375rem;
}

.type-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.type-badge.late {
  background: #fff3cd;
  color: #856404;
}

.type-badge.early {
  background: #f8d7da;
  color: #721c24;
}

.total-minutes {
  font-weight: 700;
  color: #dc3545;
}

/* Özet Bölümü */
.summary-section {
  margin-top: 2rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.summary-card h4 {
  margin: 0 0 1.25rem;
  color: #2c3e50;
  font-size: 1.1rem;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-item {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.summary-employee {
  display: flex;
  flex-direction: column;
}

.summary-name {
  font-weight: 600;
  color: #2c3e50;
}

.summary-dept {
  font-size: 0.75rem;
  color: #6c757d;
}

.summary-stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.stat-item.late {
  background: #fff3cd;
  color: #856404;
}

.stat-item.early {
  background: #f8d7da;
  color: #721c24;
}

.stat-item.total {
  background: #e9ecef;
  color: #495057;
}

.summary-bar {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffc107, #dc3545);
  border-radius: 4px;
  transition: width 0.3s ease;
}

@media (max-width: 768px) {
  .summary-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .filters-bar {
    flex-direction: column;
  }
  
  .work-hours-config {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .time-inputs {
    flex-wrap: wrap;
  }
}
</style>
