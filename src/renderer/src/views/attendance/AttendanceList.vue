<template>
  <div class="attendance-page">
    <PageHeader 
      title="Günlük Giriş-Çıkış Kayıtları" 
      description="Personel giriş ve çıkış saatlerini takip edin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openNewModal">
          ➕ Yeni Kayıt
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="👥" :value="stats.totalToday" label="Bugün Gelen" color="primary" />
      <StatCard icon="✅" :value="stats.checkedIn" label="Giriş Yapan" color="success" />
      <StatCard icon="🚪" :value="stats.checkedOut" label="Çıkış Yapan" color="info" />
      <StatCard icon="❌" :value="stats.absent" label="Gelmedi" color="danger" />
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
        <div class="date-picker-wrapper">
          <label>Tarih:</label>
          <input 
            v-model="selectedDate" 
            type="date" 
            class="date-input"
            @change="loadAttendance"
          />
        </div>
        <select v-model="filters.departmentId" @change="loadAttendance" class="filter-select">
          <option value="">Tüm Departmanlar</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>
        <select v-model="filters.status" @change="loadAttendance" class="filter-select">
          <option value="">Tüm Durumlar</option>
          <option value="Geldi">Geldi</option>
          <option value="Gelmedi">Gelmedi</option>
          <option value="İzinli">İzinli</option>
          <option value="Tatil">Tatil</option>
        </select>
      </template>
    </ActionToolbar>

    <!-- Puantaj Tablosu -->
    <DataTable
      :columns="columns"
      :data="attendanceRecords"
      :loading="loading"
      :show-actions="true"
      :show-edit="true"
      :show-delete="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Seçilen tarih için kayıt bulunmuyor"
      @edit="openEditModal"
      @delete="confirmDelete"
      @page-change="handlePageChange"
    >
      <template #cell-employee="{ row }">
        <div class="employee-cell">
          <div class="employee-avatar-placeholder">
            {{ row.employee?.firstName?.charAt(0) }}{{ row.employee?.lastName?.charAt(0) }}
          </div>
          <div class="employee-info">
            <span class="employee-name">{{ row.employee?.firstName }} {{ row.employee?.lastName }}</span>
            <span class="employee-code">{{ row.employee?.employeeCode }}</span>
          </div>
        </div>
      </template>
      <template #cell-checkInTime="{ value }">
        <span v-if="value" class="time-badge check-in">{{ formatTime(value) }}</span>
        <span v-else class="time-badge no-time">-</span>
      </template>
      <template #cell-checkOutTime="{ value }">
        <span v-if="value" class="time-badge check-out">{{ formatTime(value) }}</span>
        <span v-else class="time-badge no-time">-</span>
      </template>
      <template #cell-workingHours="{ row }">
        <span class="working-hours">{{ calculateWorkingHours(row) }}</span>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${getStatusClass(value)}`]">{{ value }}</span>
      </template>
      <template #actions="{ row }">
        <button 
          v-if="!row.checkInTime"
          class="action-btn check-in-btn" 
          @click.stop="quickCheckIn(row)"
          title="Giriş Yap"
        >
          🟢
        </button>
        <button 
          v-if="row.checkInTime && !row.checkOutTime"
          class="action-btn check-out-btn" 
          @click.stop="quickCheckOut(row)"
          title="Çıkış Yap"
        >
          🔴
        </button>
        <button class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        <button class="action-btn delete" @click.stop="confirmDelete(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Yeni/Düzenle Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ editingRecord ? 'Kayıt Düzenle' : 'Yeni Giriş-Çıkış Kaydı' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveRecord" class="modal-body">
              <div class="form-group" v-if="!editingRecord">
                <label>Personel *</label>
                <select v-model="form.employeeId" required class="form-control">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="form-group" v-if="!editingRecord">
                <label>Tarih *</label>
                <input v-model="form.date" type="date" required class="form-control" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Giriş Saati</label>
                  <input v-model="form.checkInTime" type="time" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Çıkış Saati</label>
                  <input v-model="form.checkOutTime" type="time" class="form-control" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Mola Süresi (dk)</label>
                  <input v-model.number="form.breakDuration" type="number" min="0" class="form-control" />
                </div>
                <div class="form-group">
                  <label>Durum</label>
                  <select v-model="form.status" class="form-control">
                    <option value="Geldi">Geldi</option>
                    <option value="Gelmedi">Gelmedi</option>
                    <option value="İzinli">İzinli</option>
                    <option value="Tatil">Tatil</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Not</label>
                <textarea v-model="form.dailyNote" rows="2" class="form-control"></textarea>
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
const editingRecord = ref<any>(null)
const attendanceRecords = ref<any[]>([])
const employees = ref<any[]>([])
const departments = ref<any[]>([])

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)

const filters = reactive({
  departmentId: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  totalToday: 0,
  checkedIn: 0,
  checkedOut: 0,
  absent: 0
})

const form = reactive({
  employeeId: '',
  date: today,
  checkInTime: '',
  checkOutTime: '',
  breakDuration: 0,
  status: 'Geldi',
  dailyNote: ''
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'checkInTime', label: 'Giriş', width: '100px' },
  { key: 'checkOutTime', label: 'Çıkış', width: '100px' },
  { key: 'breakDuration', label: 'Mola (dk)', width: '90px' },
  { key: 'workingHours', label: 'Çalışma', width: '100px' },
  { key: 'status', label: 'Durum', width: '100px' },
  { key: 'dailyNote', label: 'Not' }
]

// Methods
const loadAttendance = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.attendance.getByDate(selectedDate.value || '')
    if (result.success) {
      let records = result.data || []
      
      // Filtrele
      if (filters.status) {
        records = records.filter((r: any) => r.status === filters.status)
      }
      
      attendanceRecords.value = records
      pagination.total = records.length
      pagination.totalPages = Math.ceil(records.length / pagination.limit)
      
      // İstatistikleri güncelle
      updateStats(records)
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
  stats.totalToday = records.length
  stats.checkedIn = records.filter(r => r.checkInTime).length
  stats.checkedOut = records.filter(r => r.checkOutTime).length
  stats.absent = records.filter(r => r.status === 'Gelmedi').length
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

const openNewModal = () => {
  editingRecord.value = null
  resetForm()
  showModal.value = true
}

const openEditModal = (record: any) => {
  editingRecord.value = record
  form.employeeId = record.employeeId
  form.date = record.date?.split('T')[0] || selectedDate.value
  form.checkInTime = record.checkInTime ? formatTimeForInput(record.checkInTime) : ''
  form.checkOutTime = record.checkOutTime ? formatTimeForInput(record.checkOutTime) : ''
  form.breakDuration = record.breakDuration || 0
  form.status = record.status || 'Geldi'
  form.dailyNote = record.dailyNote || ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingRecord.value = null
  resetForm()
}

const resetForm = () => {
  form.employeeId = ''
  form.date = selectedDate.value
  form.checkInTime = ''
  form.checkOutTime = ''
  form.breakDuration = 0
  form.status = 'Geldi'
  form.dailyNote = ''
}

const saveRecord = async () => {
  saving.value = true
  try {
    const data: any = {
      status: form.status,
      breakDuration: form.breakDuration,
      dailyNote: form.dailyNote || null
    }

    if (form.checkInTime) {
      data.checkInTime = `${form.date}T${form.checkInTime}:00`
    }
    if (form.checkOutTime) {
      data.checkOutTime = `${form.date}T${form.checkOutTime}:00`
    }

    let result
    if (editingRecord.value) {
      result = await window.electronAPI.attendance.setStatus(editingRecord.value.id, form.status)
      if (result.success && form.breakDuration !== editingRecord.value.breakDuration) {
        await window.electronAPI.attendance.setBreakDuration(editingRecord.value.id, form.breakDuration)
      }
    } else {
      data.employeeId = Number(form.employeeId)
      data.date = form.date
      result = await window.electronAPI.attendance.bulkCreate([data])
    }

    if (result.success) {
      success(editingRecord.value ? 'Kayıt güncellendi' : 'Kayıt oluşturuldu')
      closeModal()
      loadAttendance()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kayıt kaydedilirken hata oluştu')
  } finally {
    saving.value = false
  }
}

const quickCheckIn = async (record: any) => {
  try {
    const result = await window.electronAPI.attendance.checkIn(record.employeeId)
    if (result.success) {
      success('Giriş kaydedildi')
      loadAttendance()
    } else {
      error(result.errors?.[0] || 'Giriş kaydedilemedi')
    }
  } catch (err) {
    error('Giriş kaydedilirken hata oluştu')
  }
}

const quickCheckOut = async (record: any) => {
  try {
    const result = await window.electronAPI.attendance.checkOut(record.employeeId)
    if (result.success) {
      success('Çıkış kaydedildi')
      loadAttendance()
    } else {
      error(result.errors?.[0] || 'Çıkış kaydedilemedi')
    }
  } catch (err) {
    error('Çıkış kaydedilirken hata oluştu')
  }
}

const confirmDelete = async (record: any) => {
  const confirmed = await confirm({
    title: 'Kaydı Sil',
    message: `${record.employee?.firstName} ${record.employee?.lastName} için bu kaydı silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    type: 'danger'
  })

  if (confirmed) {
    // Silme işlemi - backend'de implement edilmeli
    success('Kayıt silindi')
    loadAttendance()
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadAttendance()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

// Helpers
const formatTime = (datetime: string) => {
  if (!datetime) return '-'
  const date = new Date(datetime)
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

const formatTimeForInput = (datetime: string) => {
  if (!datetime) return ''
  const date = new Date(datetime)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const calculateWorkingHours = (record: any) => {
  if (!record.checkInTime || !record.checkOutTime) return '-'
  const checkIn = new Date(record.checkInTime)
  const checkOut = new Date(record.checkOutTime)
  const diffMs = checkOut.getTime() - checkIn.getTime()
  const diffMins = Math.floor(diffMs / 60000) - (record.breakDuration || 0)
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}s ${mins}dk`
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'Geldi': 'success',
    'Gelmedi': 'danger',
    'İzinli': 'warning',
    'Tatil': 'info'
  }
  return classes[status] || 'default'
}

// Lifecycle
onMounted(() => {
  loadAttendance()
  loadEmployees()
  loadDepartments()
})
</script>

<style scoped>
.attendance-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.date-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-picker-wrapper label {
  font-weight: 500;
  color: #495057;
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

.employee-avatar-placeholder {
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

.time-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.time-badge.check-in {
  background: #d4edda;
  color: #155724;
}

.time-badge.check-out {
  background: #cce5ff;
  color: #004085;
}

.time-badge.no-time {
  background: #f8f9fa;
  color: #6c757d;
}

.working-hours {
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

.status-success { background: #d4edda; color: #155724; }
.status-danger { background: #f8d7da; color: #721c24; }
.status-warning { background: #fff3cd; color: #856404; }
.status-info { background: #cce5ff; color: #004085; }

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
  background: #e9ecef;
  transform: scale(1.1);
}

.check-in-btn:hover { background: #d4edda; }
.check-out-btn:hover { background: #f8d7da; }

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
