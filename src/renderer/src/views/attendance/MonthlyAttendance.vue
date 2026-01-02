<template>
  <div class="monthly-attendance-page">
    <PageHeader 
      title="Puantaj (Aylık Devamlılık Tablosu)" 
      description="Personellerin aylık devam durumlarını görüntüleyin"
    >
      <template #actions>
        <button class="btn btn-outline" @click="exportToExcel">
          📊 Excel'e Aktar
        </button>
        <button class="btn btn-primary" @click="generateBulkAttendance">
          ➕ Toplu Kayıt Oluştur
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="👥" :value="stats.totalEmployees" label="Toplam Personel" color="primary" />
      <StatCard icon="📅" :value="stats.workingDays" label="İş Günü" color="info" />
      <StatCard icon="✅" :value="stats.avgAttendance + '%'" label="Ort. Devam Oranı" color="success" />
      <StatCard icon="⏰" :value="stats.totalOvertimeHours + 's'" label="Toplam Mesai" color="warning" />
    </div>

    <!-- Filtreler -->
    <div class="filters-bar">
      <div class="filter-group">
        <label>Ay:</label>
        <select v-model="selectedMonth" @change="loadMonthlyData" class="filter-select">
          <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Yıl:</label>
        <select v-model="selectedYear" @change="loadMonthlyData" class="filter-select">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Departman:</label>
        <select v-model="selectedDepartment" @change="loadMonthlyData" class="filter-select">
          <option value="">Tüm Departmanlar</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Personel:</label>
        <select v-model="selectedEmployee" @change="loadMonthlyData" class="filter-select">
          <option value="">Tüm Personeller</option>
          <option v-for="emp in filteredEmployees" :key="emp.id" :value="emp.id">
            {{ emp.firstName }} {{ emp.lastName }}
          </option>
        </select>
      </div>
    </div>

    <!-- Puantaj Tablosu -->
    <div class="puantaj-container" v-if="!loading">
      <div class="table-scroll-wrapper">
        <table class="puantaj-table">
          <thead>
            <tr>
              <th class="sticky-col employee-col">Personel</th>
              <th v-for="day in daysInMonth" :key="day" :class="getDayClass(day)" class="day-col">
                <div class="day-header">
                  <span class="day-number">{{ day }}</span>
                  <span class="day-name">{{ getDayName(day) }}</span>
                </div>
              </th>
              <th class="summary-col">Geldi</th>
              <th class="summary-col">Gelmedi</th>
              <th class="summary-col">İzin</th>
              <th class="summary-col">Mesai</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in employeeAttendance" :key="emp.employeeId">
              <td class="sticky-col employee-col">
                <div class="employee-cell">
                  <div class="employee-avatar">{{ emp.initials }}</div>
                  <div class="employee-info">
                    <span class="emp-name">{{ emp.name }}</span>
                    <span class="emp-code">{{ emp.code }}</span>
                  </div>
                </div>
              </td>
              <td v-for="day in daysInMonth" :key="day" :class="getCellClass(emp, day)" class="day-cell"
                  @click="openDayDetail(emp, day)">
                <span class="cell-status">{{ getCellStatus(emp, day) }}</span>
              </td>
              <td class="summary-cell success">{{ emp.summary.present }}</td>
              <td class="summary-cell danger">{{ emp.summary.absent }}</td>
              <td class="summary-cell warning">{{ emp.summary.leave }}</td>
              <td class="summary-cell info">{{ emp.summary.overtime }}s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-else class="loading-container">
      <div class="loading-spinner"></div>
      <span>Yükleniyor...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { useToast } from '@/composables/useToast'

const { success, error } = useToast()

// State
const loading = ref(false)
const employees = ref<any[]>([])
const departments = ref<any[]>([])
const attendanceData = ref<any[]>([])
const overtimeData = ref<any[]>([])

const currentDate = new Date()
const selectedMonth = ref(currentDate.getMonth() + 1)
const selectedYear = ref(currentDate.getFullYear())
const selectedDepartment = ref('')
const selectedEmployee = ref('')

const stats = reactive({
  totalEmployees: 0,
  workingDays: 0,
  avgAttendance: 0,
  totalOvertimeHours: 0
})

// Computed
const months = [
  { value: 1, label: 'Ocak' }, { value: 2, label: 'Şubat' }, { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' }, { value: 5, label: 'Mayıs' }, { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' }, { value: 8, label: 'Ağustos' }, { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' }, { value: 11, label: 'Kasım' }, { value: 12, label: 'Aralık' }
]

const years = computed(() => {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1]
})

const daysInMonth = computed(() => {
  const days = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  return Array.from({ length: days }, (_, i) => i + 1)
})

const filteredEmployees = computed(() => {
  if (!selectedDepartment.value) return employees.value
  return employees.value.filter(e => e.departmentId === Number(selectedDepartment.value))
})

const employeeAttendance = computed(() => {
  let emps = filteredEmployees.value
  if (selectedEmployee.value) {
    emps = emps.filter(e => e.id === Number(selectedEmployee.value))
  }
  
  return emps.map(emp => {
    const empAttendance = attendanceData.value.filter(a => a.employeeId === emp.id)
    const empOvertime = overtimeData.value.filter(o => o.employeeId === emp.id && o.approvalStatus === 'Approved')
    
    const dayMap: Record<number, any> = {}
    empAttendance.forEach(a => {
      const day = new Date(a.date).getDate()
      dayMap[day] = a
    })
    
    const summary = {
      present: empAttendance.filter(a => a.status === 'Geldi').length,
      absent: empAttendance.filter(a => a.status === 'Gelmedi').length,
      leave: empAttendance.filter(a => a.status === 'İzinli').length,
      overtime: empOvertime.reduce((sum, o) => sum + o.hours, 0)
    }
    
    return {
      employeeId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      code: emp.employeeCode,
      initials: `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`,
      days: dayMap,
      summary
    }
  })
})

// Methods
const loadMonthlyData = async () => {
  loading.value = true
  try {
    const startDate = new Date(selectedYear.value, selectedMonth.value - 1, 1)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(selectedYear.value, selectedMonth.value, 0)
    endDate.setHours(23, 59, 59, 999)
    
    // Puantaj verilerini yükle
    const attendanceResult = await window.electronAPI.attendance.getAll({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 5000
    })
    
    if (attendanceResult.success) {
      attendanceData.value = attendanceResult.data || []
    }
    
    // Mesai verilerini yükle
    const overtimeResult = await window.electronAPI.overtime.getAll({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 5000
    })
    
    if (overtimeResult.success) {
      overtimeData.value = overtimeResult.data || []
    }
    
    updateStats()
  } catch (err) {
    error('Veriler yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 500, status: 'Active' })
    if (result.success) {
      employees.value = result.data
      stats.totalEmployees = result.data.length
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

const updateStats = () => {
  // İş günü hesapla (hafta sonları hariç)
  let workingDays = 0
  daysInMonth.value.forEach(day => {
    const date = new Date(selectedYear.value, selectedMonth.value - 1, day)
    if (date.getDay() !== 0 && date.getDay() !== 6) workingDays++
  })
  stats.workingDays = workingDays
  
  // Ortalama devam oranı
  const totalPresent = attendanceData.value.filter(a => a.status === 'Geldi').length
  const totalRecords = attendanceData.value.length
  stats.avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0
  
  // Toplam mesai
  stats.totalOvertimeHours = overtimeData.value
    .filter(o => o.approvalStatus === 'Approved')
    .reduce((sum, o) => sum + o.hours, 0)
}

const getDayClass = (day: number) => {
  const date = new Date(selectedYear.value, selectedMonth.value - 1, day)
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0) return 'weekend sunday'
  if (dayOfWeek === 6) return 'weekend saturday'
  return ''
}

const getDayName = (day: number) => {
  const date = new Date(selectedYear.value, selectedMonth.value - 1, day)
  const names = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct']
  return names[date.getDay()]
}

const getCellClass = (emp: any, day: number) => {
  const record = emp.days[day]
  if (!record) return 'empty'
  
  const classes: Record<string, string> = {
    'Geldi': 'present',
    'Gelmedi': 'absent',
    'İzinli': 'leave',
    'Tatil': 'holiday'
  }
  return classes[record.status] || 'empty'
}

const getCellStatus = (emp: any, day: number) => {
  const record = emp.days[day]
  if (!record) return ''
  
  const symbols: Record<string, string> = {
    'Geldi': '✓',
    'Gelmedi': '✗',
    'İzinli': 'İ',
    'Tatil': 'T'
  }
  return symbols[record.status] || ''
}

const openDayDetail = (emp: any, day: number) => {
  // Gün detayı modalı açılabilir
  console.log('Day detail:', emp.name, day)
}

const generateBulkAttendance = () => {
  success('Toplu kayıt oluşturma özelliği yakında eklenecek')
}

const exportToExcel = () => {
  success('Excel export özelliği yakında eklenecek')
}

// Lifecycle
onMounted(async () => {
  await loadEmployees()
  await loadDepartments()
  await loadMonthlyData()
})
</script>

<style scoped>
.monthly-attendance-page {
  max-width: 100%;
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
  margin-bottom: 1.5rem;
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

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 140px;
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

.btn-primary {
  background: #198754;
  color: white;
}

.btn-primary:hover {
  background: #157347;
}

.btn-outline {
  background: white;
  color: #0466c8;
  border: 1px solid #0466c8;
}

.btn-outline:hover {
  background: #e7f1ff;
}

.puantaj-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-scroll-wrapper {
  overflow-x: auto;
  max-height: calc(100vh - 400px);
}

.puantaj-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.puantaj-table th,
.puantaj-table td {
  padding: 0.5rem;
  text-align: center;
  border: 1px solid #e9ecef;
}

.puantaj-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 20;
  background: white;
}

.puantaj-table th.sticky-col {
  z-index: 30;
  background: #f8f9fa;
}

.employee-col {
  min-width: 200px;
  text-align: left;
}

.day-col {
  min-width: 45px;
  max-width: 45px;
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.day-number {
  font-weight: 700;
  font-size: 0.9rem;
}

.day-name {
  font-size: 0.7rem;
  color: #6c757d;
}

.weekend {
  background: #fff3cd !important;
}

.weekend .day-name {
  color: #856404;
}

.summary-col {
  min-width: 60px;
  font-weight: 600;
}

.employee-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem;
}

.employee-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0);
  color: #2c3e50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.7rem;
  flex-shrink: 0;
}

.employee-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.emp-name {
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.emp-code {
  font-size: 0.7rem;
  color: #6c757d;
}

.day-cell {
  cursor: pointer;
  transition: all 0.2s;
}

.day-cell:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.day-cell.present {
  background: #d4edda;
}

.day-cell.absent {
  background: #f8d7da;
}

.day-cell.leave {
  background: #fff3cd;
}

.day-cell.holiday {
  background: #cce5ff;
}

.day-cell.empty {
  background: #f8f9fa;
}

.cell-status {
  font-weight: 700;
  font-size: 0.9rem;
}

.day-cell.present .cell-status { color: #155724; }
.day-cell.absent .cell-status { color: #721c24; }
.day-cell.leave .cell-status { color: #856404; }
.day-cell.holiday .cell-status { color: #004085; }

.summary-cell {
  font-weight: 700;
}

.summary-cell.success { color: #155724; background: #d4edda; }
.summary-cell.danger { color: #721c24; background: #f8d7da; }
.summary-cell.warning { color: #856404; background: #fff3cd; }
.summary-cell.info { color: #004085; background: #cce5ff; }

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: white;
  border-radius: 12px;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e9ecef;
  border-top-color: #0466c8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media print {
  .filters-bar,
  .stats-grid {
    display: none !important;
  }
  
  .puantaj-container {
    box-shadow: none;
  }
}
</style>
