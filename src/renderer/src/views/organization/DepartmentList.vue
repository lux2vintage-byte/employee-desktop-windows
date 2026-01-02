<template>
  <div class="department-page">
    <PageHeader 
      title="Departmanlar" 
      description="Şirket organizasyon yapısını ve departmanları yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Departman
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="🏢" :value="stats.total" label="Toplam Departman" color="primary" />
      <StatCard icon="🌳" :value="stats.root" label="Ana Departman" color="success" />
      <StatCard icon="📂" :value="stats.withChildren" label="Alt Departmanlı" color="info" />
      <StatCard icon="👥" :value="stats.withEmployees" label="Personelli" color="warning" />
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
            placeholder="Departman ara..."
            @input="handleSearch"
          />
          <span class="search-icon">🔍</span>
        </div>
        <button 
          :class="['view-toggle', { active: viewMode === 'tree' }]"
          @click="viewMode = 'tree'"
          title="Ağaç Görünümü"
        >
          🌳
        </button>
        <button 
          :class="['view-toggle', { active: viewMode === 'list' }]"
          @click="viewMode = 'list'"
          title="Liste Görünümü"
        >
          📋
        </button>
      </template>
    </ActionToolbar>

    <!-- Ağaç Görünümü -->
    <div v-if="viewMode === 'tree'" class="tree-view">
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <span>Yükleniyor...</span>
      </div>
      <div v-else-if="hierarchy.length === 0" class="empty-state">
        <span class="empty-icon">🏢</span>
        <p>Henüz departman oluşturulmamış</p>
        <button class="btn btn-primary" @click="openCreateModal">İlk Departmanı Oluştur</button>
      </div>
      <div v-else class="tree-container">
        <DepartmentTreeNode 
          v-for="dept in hierarchy" 
          :key="dept.id" 
          :department="dept"
          @edit="openEditModal"
          @delete="confirmDelete"
          @add-child="openCreateChildModal"
        />
      </div>
    </div>

    <!-- Liste Görünümü -->
    <div v-else class="list-view">
      <DataTable
        :columns="columns"
        :data="filteredDepartments"
        :loading="loading"
        :show-actions="true"
        :show-edit="true"
        :show-delete="true"
        :show-pagination="true"
        :current-page="pagination.page"
        :total-pages="pagination.totalPages"
        :total="pagination.total"
        empty-text="Henüz departman bulunmuyor"
        @edit="openEditModal"
        @delete="confirmDelete"
        @sort="handleSort"
        @page-change="handlePageChange"
      >
        <template #cell-name="{ row }">
          <div class="dept-name-cell">
            <span v-if="row.parentDepartmentId" class="dept-indent">↳</span>
            <span class="dept-name">{{ row.name }}</span>
          </div>
        </template>
        <template #cell-parentDepartment.name="{ value }">
          <span v-if="value" class="parent-badge">{{ value }}</span>
          <span v-else class="root-badge">Ana Departman</span>
        </template>
        <template #cell-manager="{ row }">
          <span v-if="row.manager">
            {{ row.manager.firstName }} {{ row.manager.lastName }}
          </span>
          <span v-else class="text-muted">-</span>
        </template>
        <template #cell-_count.employees="{ value }">
          <span class="count-badge">{{ value || 0 }}</span>
        </template>
        <template #cell-costCenterCode="{ value }">
          <span v-if="value" class="code-badge">{{ value }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </DataTable>
    </div>

    <!-- Departman Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal">
            <div class="modal-header">
              <h2>{{ modalMode === 'create' ? 'Yeni Departman' : 'Departman Düzenle' }}</h2>
              <button class="btn-close" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="handleSubmit" class="modal-body">
              <div class="form-group">
                <label class="form-label required">Departman Adı</label>
                <input 
                  v-model="form.name" 
                  type="text" 
                  class="form-control"
                  placeholder="Departman adını girin"
                  autofocus
                />
                <span v-if="formErrors.name" class="form-error">{{ formErrors.name }}</span>
              </div>

              <div class="form-group">
                <label class="form-label">Üst Departman</label>
                <select v-model="form.parentDepartmentId" class="form-control">
                  <option :value="null">Ana Departman (Üst departman yok)</option>
                  <option 
                    v-for="dept in availableParents" 
                    :key="dept.id" 
                    :value="dept.id"
                  >
                    {{ dept.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Maliyet Merkezi Kodu</label>
                <input 
                  v-model="form.costCenterCode" 
                  type="text" 
                  class="form-control"
                  placeholder="Örn: CC-001"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Departman Yöneticisi</label>
                <select v-model="form.managerId" class="form-control">
                  <option :value="null">Yönetici Seçin (Opsiyonel)</option>
                  <option 
                    v-for="emp in employees" 
                    :key="emp.id" 
                    :value="emp.id"
                  >
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
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
import DepartmentTreeNode from '@/components/DepartmentTreeNode.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { showToast } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(false)
const saving = ref(false)
const departments = ref<any[]>([])
const hierarchy = ref<any[]>([])
const employees = ref<any[]>([])
const searchTerm = ref('')
const viewMode = ref<'tree' | 'list'>('tree')
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  total: 0,
  root: 0,
  withChildren: 0,
  withEmployees: 0
})

const form = reactive({
  name: '',
  parentDepartmentId: null as number | null,
  costCenterCode: '',
  managerId: null as number | null
})

const formErrors = reactive<Record<string, string>>({})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'name', label: 'Departman Adı', sortable: true },
  { key: 'parentDepartment.name', label: 'Üst Departman' },
  { key: 'manager', label: 'Yönetici' },
  { key: '_count.employees', label: 'Personel', width: '100px' },
  { key: 'costCenterCode', label: 'Maliyet Merkezi', width: '140px' }
]

// Computed
const filteredDepartments = computed(() => {
  if (!searchTerm.value) return departments.value
  const term = searchTerm.value.toLowerCase()
  return departments.value.filter(d => 
    d.name.toLowerCase().includes(term) ||
    d.costCenterCode?.toLowerCase().includes(term)
  )
})

const availableParents = computed(() => {
  if (modalMode.value === 'create') {
    return departments.value
  }
  // Düzenleme modunda kendisini ve alt departmanlarını hariç tut
  return departments.value.filter(d => d.id !== editingId.value)
})

// Methods
const loadDepartments = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.department.getAll({ limit: 500 })
    if (result.success) {
      departments.value = result.data
      pagination.total = result.total
      pagination.totalPages = result.totalPages
      calculateStats()
    } else {
      showToast(result.errors?.[0] || 'Departmanlar yüklenemedi', 'error')
    }
  } catch (error) {
    showToast('Departmanlar yüklenirken hata oluştu', 'error')
  } finally {
    loading.value = false
  }
}

const loadHierarchy = async () => {
  try {
    const result = await window.electronAPI.department.getHierarchy()
    if (result.success) {
      hierarchy.value = result.data
    }
  } catch (error) {
    console.error('Hiyerarşi yüklenemedi:', error)
  }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ status: 'Active', limit: 500 })
    if (result.success) {
      employees.value = result.data
    }
  } catch (error) {
    console.error('Personeller yüklenemedi:', error)
  }
}

const calculateStats = () => {
  stats.total = departments.value.length
  stats.root = departments.value.filter(d => !d.parentDepartmentId).length
  stats.withChildren = departments.value.filter(d => d._count?.childDepartments > 0).length
  stats.withEmployees = departments.value.filter(d => d._count?.employees > 0).length
}

const handleSearch = () => {
  // Arama için debounce gerekirse eklenebilir
}

const handleSort = (key: string, order: 'asc' | 'desc') => {
  // Sıralama işlemi
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadDepartments()
}

const openCreateModal = () => {
  modalMode.value = 'create'
  editingId.value = null
  resetForm()
  showModal.value = true
}

const openCreateChildModal = (parentId: number) => {
  modalMode.value = 'create'
  editingId.value = null
  resetForm()
  form.parentDepartmentId = parentId
  showModal.value = true
}

const openEditModal = (department: any) => {
  modalMode.value = 'edit'
  editingId.value = department.id
  form.name = department.name
  form.parentDepartmentId = department.parentDepartmentId
  form.costCenterCode = department.costCenterCode || ''
  form.managerId = department.managerId
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.name = ''
  form.parentDepartmentId = null
  form.costCenterCode = ''
  form.managerId = null
  Object.keys(formErrors).forEach(key => formErrors[key] = '')
}

const validateForm = (): boolean => {
  Object.keys(formErrors).forEach(key => formErrors[key] = '')
  let isValid = true

  if (!form.name.trim()) {
    formErrors.name = 'Departman adı zorunludur'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  saving.value = true
  try {
    const data = {
      name: form.name.trim(),
      parentDepartmentId: form.parentDepartmentId,
      costCenterCode: form.costCenterCode.trim() || null,
      managerId: form.managerId
    }

    let result
    if (modalMode.value === 'create') {
      result = await window.electronAPI.department.create(data)
    } else {
      result = await window.electronAPI.department.update(editingId.value!, data)
    }

    if (result.success) {
      showToast(
        modalMode.value === 'create' ? 'Departman oluşturuldu' : 'Departman güncellendi',
        'success'
      )
      closeModal()
      await loadDepartments()
      await loadHierarchy()
    } else {
      showToast(result.errors?.[0] || 'İşlem başarısız', 'error')
    }
  } catch (error) {
    showToast('Bir hata oluştu', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (department: any) => {
  const confirmed = await confirm({
    title: 'Departman Sil',
    message: `"${department.name}" departmanını silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    cancelText: 'İptal',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.department.delete(department.id)
      if (result.success) {
        showToast('Departman silindi', 'success')
        await loadDepartments()
        await loadHierarchy()
      } else {
        showToast(result.errors?.[0] || 'Departman silinemedi', 'error')
      }
    } catch (error) {
      showToast('Departman silinirken hata oluştu', 'error')
    }
  }
}

const handlePrint = () => window.print()
const handlePdf = () => showToast('PDF özelliği yakında eklenecek', 'info')
const handleExcelExport = () => showToast('Excel export özelliği yakında eklenecek', 'info')

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadDepartments(),
    loadHierarchy(),
    loadEmployees()
  ])
})
</script>

<style scoped>
.department-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.view-toggle {
  padding: 0.5rem 0.75rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.view-toggle:hover {
  background: #e9ecef;
}

.view-toggle.active {
  background: #0466c8;
  border-color: #0466c8;
  color: white;
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

.tree-view, .list-view {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  min-height: 400px;
}

.tree-container {
  padding: 1.5rem;
}

.loading-container, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6c757d;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e9ecef;
  border-top-color: #0466c8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state p {
  margin: 0 0 1.5rem;
  font-size: 1.1rem;
}

.dept-name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dept-indent {
  color: #6c757d;
}

.dept-name {
  font-weight: 500;
}

.parent-badge {
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.root-badge {
  background: #d4edda;
  color: #155724;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.count-badge {
  background: #f8f9fa;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.code-badge {
  font-family: 'Consolas', monospace;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
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
  max-width: 500px;
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
