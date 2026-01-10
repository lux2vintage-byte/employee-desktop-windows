<template>
  <div class="employee-salary-page">
    <PageHeader 
      title="Person

el Ücretleri" 
      description="Personel ücret kayıtlarını görüntüleyin ve yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Ücret Kaydı
        </button>
      </template>
    </PageHeader>

    <!-- Filtreler -->
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
          <label>Yıl:</label>
          <select v-model="filters.year" @change="loadSalaries" class="filter-select">
            <option value="">Tüm Yıllar</option>
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Departman:</label>
          <select v-model="filters.departmentId" @change="loadSalaries" class="filter-select">
            <option value="">Tüm Departmanlar</option>
            <option v-for="dept in departments" :key="dept.id" :value="dept.id">
              {{ dept.name }}
            </option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <!-- Tablo -->
    <DataTable
      :columns="columns"
      :data="salaries"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Henüz ücret kaydı bulunmuyor"
      @page-change="handlePageChange"
    >
      <template #cell-employee.employeeCode="{ value }">
        <span class="employee-code">{{ value }}</span>
      </template>
      <template #cell-employee="{ row }">
        <div class="employee-name-cell">
          <span class="employee-name">{{ row.employee?.firstName }} {{ row.employee?.lastName }}</span>
        </div>
      </template>
      <template #cell-employee.department.name="{ value }">
        <span class="department-badge">{{ value || '-' }}</span>
      </template>
      <template #cell-employee.position.title="{ value }">
        <span>{{ value || '-' }}</span>
      </template>
      <template #cell-employee.hireDate="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #cell-grossSalary="{ row }">
        <span class="salary-amount">{{ formatCurrency(row.grossSalary) }}</span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        <button class="action-btn delete" @click.stop="confirmDelete(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Ücret Kaydı Düzenle' : 'Yeni Ücret Kaydı' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveRecord" class="modal-body">
              <!-- Personel Seçimi -->
              <div class="form-group" v-if="!isEditing">
                <label>Personel Seçin *</label>
                <EmployeeSearchDropdown
                  v-model="selectedEmployee"
                  placeholder="Personel ara (ad, soyad, sicil no)..."
                  @select="onEmployeeSelect"
                />
              </div>

              <!-- Personel Bilgileri (Readonly) -->
              <div v-if="selectedEmployee" class="employee-details-card">
                <h4>📋 Personel Bilgileri</h4>
                <div class="details-grid">
                  <div class="detail-item">
                    <label>Sicil No:</label>
                    <span>{{ selectedEmployee.employeeCode }}</span>
                  </div>
                  <div class="detail-item">
                    <label>Ad Soyad:</label>
                    <span>{{ selectedEmployee.firstName }} {{ selectedEmployee.lastName }}</span>
                  </div>
                  <div class="detail-item">
                    <label>Departman:</label>
                    <span>{{ selectedEmployee.department?.name || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <label>Pozisyon:</label>
                    <span>{{ selectedEmployee.position?.title || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <label>İşe Başlangıç:</label>
                    <span>{{ formatDate(selectedEmployee.hireDate) }}</span>
                  </div>
                </div>
              </div>

              <!-- Yıl Seçimi -->
              <div class="form-row">
                <div class="form-group">
                  <label>Ait Olduğu Yıl *</label>
                  <select v-model="form.year" required class="form-control" :disabled="isEditing">
                    <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
                  </select>
                  <small class="form-hint">Varsayılan: {{ currentYear }}</small>
                </div>

                <!-- Brüt Maaş -->
                <div class="form-group">
                  <label>Brüt Maaş (₺) *</label>
                  <input
                    v-model.number="form.grossSalary"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="form-control"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <!-- Notlar -->
              <div class="form-group">
                <label>Notlar</label>
                <textarea
                  v-model="form.notes"
                  class="form-control"
                  rows="3"
                  placeholder="Ücret kaydı ile ilgili notlar..."
                ></textarea>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving || !selectedEmployee">
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
import { ref, reactive, computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import EmployeeSearchDropdown from '@/components/EmployeeSearchDropdown.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { showToast } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const salaries = ref<any[]>([])
const departments = ref<any[]>([])
const availableYears = ref<number[]>([])
const selectedEmployee = ref<any>(null)
const currentYear = new Date().getFullYear()

const filters = reactive({
  year: '',
  departmentId: ''
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const form = reactive({
  id: null as number | null,
  employeeId: 0,
  year: currentYear,
  grossSalary: 0,
  notes: ''
})

// Yıl seçenekleri (geçmiş ve gelecek yıllar)
const yearOptions = computed(() => {
  const years: number[] = []
  const startYear = 2020
  const endYear = currentYear + 5
  for (let y = endYear; y >= startYear; y--) {
    years.push(y)
  }
  return years
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employee.employeeCode', label: 'Sicil No', width: '100px', sortable: true },
  { key: 'employee', label: 'Ad Soyad', sortable: true },
  { key: 'employee.department.name', label: 'Departman', sortable: true },
  { key: 'employee.position.title', label: 'Pozisyon' },
  { key: 'employee.hireDate', label: 'İşe Giriş', width: '110px' },
  { key: 'year', label: 'Yıl', width: '80px', sortable: true },
  { key: 'grossSalary', label: 'Brüt Maaş', width: '140px', sortable: true }
]

// Methods
const loadSalaries = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit
    }

    if (filters.year) options.year = Number(filters.year)
    if (filters.departmentId) options.departmentId = Number(filters.departmentId)

    const result = await window.electronAPI.employeeSalary.getAll(options)

    if (result.success) {
      salaries.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 0
    } else {
      showToast(result.errors?.[0] || 'Ücret kayıtları yüklenemedi', 'error')
    }
  } catch (error) {
    showToast('Ücret kayıtları yüklenirken hata oluştu', 'error')
  } finally {
    loading.value = false
  }
}

const loadDepartments = async () => {
  try {
    const result = await window.electronAPI.department.getAll({ limit: 100 })
    if (result.success) {
      departments.value = result.data
    }
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
  }
}

const loadAvailableYears = async () => {
  try {
    const result = await window.electronAPI.employeeSalary.getYears()
    if (result.success) {
      availableYears.value = result.data || []
    }
  } catch (error) {
    console.error('Yıllar yüklenemedi:', error)
  }
}

const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (salary: any) => {
  isEditing.value = true
  form.id = salary.id
  form.employeeId = salary.employeeId
  form.year = salary.year
  form.grossSalary = salary.grossSalary
  form.notes = salary.notes || ''
  selectedEmployee.value = salary.employee
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.id = null
  form.employeeId = 0
  form.year = currentYear
  form.grossSalary = 0
  form.notes = ''
  selectedEmployee.value = null
}

const onEmployeeSelect = async (employee: any) => {
  selectedEmployee.value = employee
  form.employeeId = employee.id

  // Seçilen personelin bu yıla ait kaydı var mı kontrol et
  try {
    const result = await window.electronAPI.employeeSalary.getByEmployeeAndYear(
      employee.id,
      form.year
    )
    if (result.success && result.data) {
      // Kayıt varsa formu doldur
      form.grossSalary = result.data.grossSalary
      form.notes = result.data.notes || ''
      showToast('Bu personelin seçilen yıl için mevcut kaydı bulundu', 'info')
    }
  } catch (error) {
    // Kayıt yoksa normal devam
  }
}

const saveRecord = async () => {
  if (!selectedEmployee.value) {
    showToast('Lütfen bir personel seçin', 'warning')
    return
  }

  saving.value = true
  try {
    const data = {
      employeeId: form.employeeId,
      year: form.year,
      grossSalary: form.grossSalary,
      notes: form.notes || null
    }

    const result = isEditing.value
      ? await window.electronAPI.employeeSalary.update(form.id!, data)
      : await window.electronAPI.employeeSalary.create(data)

    if (result.success) {
      showToast(
        isEditing.value ? 'Ücret kaydı güncellendi' : 'Ücret kaydı oluşturuldu',
        'success'
      )
      closeModal()
      await loadSalaries()
      await loadAvailableYears()
    } else {
      showToast(result.errors?.[0] || 'İşlem başarısız', 'error')
    }
  } catch (error) {
    showToast('Kaydetme sırasında hata oluştu', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (salary: any) => {
  const confirmed = await confirm({
    title: 'Ücret Kaydı Sil',
    message: `${salary.employee?.firstName} ${salary.employee?.lastName} personelinin ${salary.year} yılına ait ücret kaydını silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    cancelText: 'İptal',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.employeeSalary.delete(salary.id)
      if (result.success) {
        showToast('Ücret kaydı silindi', 'success')
        await loadSalaries()
        await loadAvailableYears()
      } else {
        showToast(result.errors?.[0] || 'Silme başarısız', 'error')
      }
    } catch (error) {
      showToast('Silme sırasında hata oluştu', 'error')
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadSalaries()
}

const handlePrint = () => window.print()
const handlePdf = () => showToast('PDF oluşturma özelliği yakında eklenecek', 'info')
const handleExcelExport = () => showToast('Excel export özelliği yakında eklenecek', 'info')

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0)
}

onMounted(() => {
  loadSalaries()
  loadDepartments()
  loadAvailableYears()
})
</script>

<style scoped>
.employee-salary-page {
  max-width: 1400px;
  margin: 0 auto;
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

.btn-primary:hover:not(:disabled) {
  background: #157347;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5c636a;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  min-width: 150px;
}

.employee-code {
  font-family: 'Consolas', monospace;
  font-weight: 600;
  color: #0466c8;
  background: #e7f1ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.employee-name-cell {
  font-weight: 600;
  color: #2c3e50;
}

.department-badge {
  background: #f8f9fa;
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #495057;
}

.salary-amount {
  font-weight: 700;
  color: #198754;
  font-size: 0.95rem;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem 0.5rem;
  transition: transform 0.2s;
}

.action-btn:hover {
  transform: scale(1.2);
}

.action-btn.edit:hover {
  filter: brightness(1.2);
}

.action-btn.delete:hover {
  filter: brightness(1.2);
}

/* Modal */
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
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #dee2e6;
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
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
  margin-top: 1rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #495057;
  font-size: 0.875rem;
}

.form-control {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #0466c8;
  box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1);
}

.form-control:disabled {
  background: #e9ecef;
  cursor: not-allowed;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6c757d;
}

/* Personel Detay Kartı */
.employee-details-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.employee-details-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.875rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span {
  font-size: 0.9rem;
  color: #2c3e50;
  font-weight: 500;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}

@media print {
  .page-header-right,
  .action-toolbar,
  .actions-cell,
  .actions-column {
    display: none !important;
  }
}
</style>
