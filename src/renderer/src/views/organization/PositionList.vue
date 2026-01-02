<template>
  <div class="position-page">
    <PageHeader 
      title="Pozisyonlar / Unvanlar" 
      description="Departmanlara bağlı pozisyonları ve maaş skalalarını yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Pozisyon
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="💼" :value="stats.total" label="Toplam Pozisyon" color="primary" />
      <StatCard icon="👥" :value="stats.withEmployees" label="Dolu Pozisyon" color="success" />
      <StatCard icon="📊" :value="stats.withSalaryRange" label="Maaş Skalası Tanımlı" color="info" />
      <StatCard icon="🏢" :value="stats.departments" label="Departman" color="warning" />
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
        <div class="search-box">
          <input 
            v-model="searchTerm" 
            type="text" 
            placeholder="Pozisyon ara..."
            @input="handleSearch"
          />
          <span class="search-icon">🔍</span>
        </div>
        <select v-model="filters.departmentId" @change="loadPositions" class="filter-select">
          <option value="">Tüm Departmanlar</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>
      </template>
    </ActionToolbar>

    <!-- Pozisyon Tablosu -->
    <DataTable
      :columns="columns"
      :data="filteredPositions"
      :loading="loading"
      :show-actions="true"
      :show-edit="true"
      :show-delete="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Henüz pozisyon bulunmuyor"
      @edit="openEditModal"
      @delete="confirmDelete"
      @sort="handleSort"
      @page-change="handlePageChange"
    >
      <template #cell-title="{ row }">
        <div class="position-title-cell">
          <span class="position-icon">💼</span>
          <span class="position-title">{{ row.title }}</span>
        </div>
      </template>
      <template #cell-department.name="{ value }">
        <span class="dept-badge">{{ value || '-' }}</span>
      </template>
      <template #cell-salaryRange="{ row }">
        <div v-if="row.baseSalaryMin || row.baseSalaryMax" class="salary-range">
          <span class="salary-min">{{ formatCurrency(row.baseSalaryMin) }}</span>
          <span class="salary-separator">-</span>
          <span class="salary-max">{{ formatCurrency(row.baseSalaryMax) }}</span>
        </div>
        <span v-else class="text-muted">Tanımsız</span>
      </template>
      <template #cell-_count.employees="{ value }">
        <span :class="['count-badge', { filled: value > 0 }]">
          {{ value || 0 }} kişi
        </span>
      </template>
      <template #cell-jobDescription="{ value }">
        <span v-if="value" class="description-preview" :title="value">
          {{ truncate(value, 50) }}
        </span>
        <span v-else class="text-muted">-</span>
      </template>
    </DataTable>

    <!-- Pozisyon Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal">
            <div class="modal-header">
              <h2>{{ modalMode === 'create' ? 'Yeni Pozisyon' : 'Pozisyon Düzenle' }}</h2>
              <button class="btn-close" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="handleSubmit" class="modal-body">
              <div class="form-group">
                <label class="form-label required">Pozisyon Unvanı</label>
                <input 
                  v-model="form.title" 
                  type="text" 
                  class="form-control"
                  placeholder="Örn: Yazılım Geliştirici"
                  autofocus
                />
                <span v-if="formErrors.title" class="form-error">{{ formErrors.title }}</span>
              </div>

              <div class="form-group">
                <label class="form-label required">Departman</label>
                <select v-model="form.departmentId" class="form-control">
                  <option value="">Departman Seçin</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                    {{ dept.name }}
                  </option>
                </select>
                <span v-if="formErrors.departmentId" class="form-error">{{ formErrors.departmentId }}</span>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Minimum Maaş (₺)</label>
                  <input 
                    v-model.number="form.baseSalaryMin" 
                    type="number" 
                    class="form-control"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Maksimum Maaş (₺)</label>
                  <input 
                    v-model.number="form.baseSalaryMax" 
                    type="number" 
                    class="form-control"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <span v-if="formErrors.salary" class="form-error">{{ formErrors.salary }}</span>

              <div class="form-group">
                <label class="form-label">Görev Tanımı</label>
                <textarea 
                  v-model="form.jobDescription" 
                  class="form-control"
                  rows="4"
                  placeholder="Pozisyonun görev ve sorumluluklarını yazın..."
                ></textarea>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" @click="closeModal">
                  İptal
                </button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? 'Kaydediliyor...' : (modalMode === 'create' ? 'Oluştur' : 'Güncelle') }}
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

const { showToast } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(false)
const saving = ref(false)
const positions = ref<any[]>([])
const departments = ref<any[]>([])
const searchTerm = ref('')
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)

const filters = reactive({
  departmentId: ''
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  total: 0,
  withEmployees: 0,
  withSalaryRange: 0,
  departments: 0
})

const form = reactive({
  title: '',
  departmentId: '' as string | number,
  baseSalaryMin: null as number | null,
  baseSalaryMax: null as number | null,
  jobDescription: ''
})

const formErrors = reactive<Record<string, string>>({})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'title', label: 'Pozisyon Unvanı', sortable: true },
  { key: 'department.name', label: 'Departman', sortable: true },
  { key: 'salaryRange', label: 'Maaş Skalası', width: '180px' },
  { key: '_count.employees', label: 'Personel', width: '100px' },
  { key: 'jobDescription', label: 'Görev Tanımı' }
]

// Computed
const filteredPositions = computed(() => {
  let result = positions.value
  
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(p => 
      p.title.toLowerCase().includes(term) ||
      p.department?.name?.toLowerCase().includes(term)
    )
  }
  
  return result
})

// Methods
const loadPositions = async () => {
  loading.value = true
  try {
    const options: any = { limit: 500 }
    if (filters.departmentId) {
      options.departmentId = Number(filters.departmentId)
    }
    
    const result = await window.electronAPI.position.getAll(options)
    if (result.success) {
      positions.value = result.data
      pagination.total = result.total
      pagination.totalPages = result.totalPages
      calculateStats()
    } else {
      showToast(result.errors?.[0] || 'Pozisyonlar yüklenemedi', 'error')
    }
  } catch (error) {
    showToast('Pozisyonlar yüklenirken hata oluştu', 'error')
  } finally {
    loading.value = false
  }
}

const loadDepartments = async () => {
  try {
    const result = await window.electronAPI.department.getAll({ limit: 500 })
    if (result.success) {
      departments.value = result.data
    }
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
  }
}

const calculateStats = () => {
  stats.total = positions.value.length
  stats.withEmployees = positions.value.filter(p => p._count?.employees > 0).length
  stats.withSalaryRange = positions.value.filter(p => p.baseSalaryMin || p.baseSalaryMax).length
  
  const uniqueDepts = new Set(positions.value.map(p => p.departmentId))
  stats.departments = uniqueDepts.size
}

const handleSearch = () => {
  // Debounce eklenebilir
}

const handleSort = (key: string, order: 'asc' | 'desc') => {
  // Sıralama
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadPositions()
}

const openCreateModal = () => {
  modalMode.value = 'create'
  editingId.value = null
  resetForm()
  showModal.value = true
}

const openEditModal = (position: any) => {
  modalMode.value = 'edit'
  editingId.value = position.id
  form.title = position.title
  form.departmentId = position.departmentId
  form.baseSalaryMin = position.baseSalaryMin
  form.baseSalaryMax = position.baseSalaryMax
  form.jobDescription = position.jobDescription || ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.title = ''
  form.departmentId = ''
  form.baseSalaryMin = null
  form.baseSalaryMax = null
  form.jobDescription = ''
  Object.keys(formErrors).forEach(key => formErrors[key] = '')
}

const validateForm = (): boolean => {
  Object.keys(formErrors).forEach(key => formErrors[key] = '')
  let isValid = true

  if (!form.title.trim()) {
    formErrors.title = 'Pozisyon unvanı zorunludur'
    isValid = false
  }

  if (!form.departmentId) {
    formErrors.departmentId = 'Departman seçimi zorunludur'
    isValid = false
  }

  if (form.baseSalaryMin && form.baseSalaryMax && form.baseSalaryMin > form.baseSalaryMax) {
    formErrors.salary = 'Minimum maaş maksimum maaştan büyük olamaz'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  saving.value = true
  try {
    const data = {
      title: form.title.trim(),
      departmentId: Number(form.departmentId),
      baseSalaryMin: form.baseSalaryMin || null,
      baseSalaryMax: form.baseSalaryMax || null,
      jobDescription: form.jobDescription.trim() || null
    }

    let result
    if (modalMode.value === 'create') {
      result = await window.electronAPI.position.create(data)
    } else {
      result = await window.electronAPI.position.update(editingId.value!, data)
    }

    if (result.success) {
      showToast(
        modalMode.value === 'create' ? 'Pozisyon oluşturuldu' : 'Pozisyon güncellendi',
        'success'
      )
      closeModal()
      await loadPositions()
    } else {
      showToast(result.errors?.[0] || 'İşlem başarısız', 'error')
    }
  } catch (error) {
    showToast('Bir hata oluştu', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (position: any) => {
  const confirmed = await confirm({
    title: 'Pozisyon Sil',
    message: `"${position.title}" pozisyonunu silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    cancelText: 'İptal',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.position.delete(position.id)
      if (result.success) {
        showToast('Pozisyon silindi', 'success')
        await loadPositions()
      } else {
        showToast(result.errors?.[0] || 'Pozisyon silinemedi', 'error')
      }
    } catch (error) {
      showToast('Pozisyon silinirken hata oluştu', 'error')
    }
  }
}

const formatCurrency = (value: number | null) => {
  if (!value) return '-'
  return new Intl.NumberFormat('tr-TR', { 
    style: 'currency', 
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const truncate = (text: string, length: number) => {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

const handlePrint = () => window.print()
const handlePdf = () => showToast('PDF özelliği yakında eklenecek', 'info')
const handleExcelExport = () => showToast('Excel export özelliği yakında eklenecek', 'info')

// Lifecycle
onMounted(async () => {
  await loadDepartments()
  await loadPositions()
})
</script>

<style scoped>
.position-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box input {
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  width: 250px;
}

.search-box input:focus {
  outline: none;
  border-color: #0466c8;
  box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: #6c757d;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  min-width: 180px;
}

.position-title-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.position-icon {
  font-size: 1.1rem;
}

.position-title {
  font-weight: 600;
  color: #2c3e50;
}

.dept-badge {
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.salary-range {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.salary-min, .salary-max {
  font-weight: 500;
  color: #2c3e50;
}

.salary-separator {
  color: #6c757d;
}

.count-badge {
  background: #f8f9fa;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.8rem;
  color: #6c757d;
}

.count-badge.filled {
  background: #d4edda;
  color: #155724;
}

.description-preview {
  font-size: 0.85rem;
  color: #495057;
}

.text-muted {
  color: #6c757d;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #2c3e50;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0.25rem;
}

.btn-close:hover {
  color: #2c3e50;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #495057;
}

.form-label.required::after {
  content: ' *';
  color: #dc3545;
}

.form-control {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #0466c8;
  box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1);
}

textarea.form-control {
  resize: vertical;
  min-height: 100px;
}

.form-error {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #dc3545;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #198754;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #157347;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

/* Modal Animation */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal, .modal-leave-active .modal {
  transition: transform 0.2s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal, .modal-leave-to .modal {
  transform: scale(0.95);
}
</style>
