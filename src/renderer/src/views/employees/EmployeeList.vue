<template>
  <div class="employee-list-page">
    <PageHeader 
      title="Personel Listesi" 
      description="Tüm aktif personelleri görüntüleyin ve yönetin"
    >
      <template #actions>
        <router-link to="/employees/new" class="btn btn-primary">
          ➕ Yeni Personel
        </router-link>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="👥" :value="stats.total" label="Toplam Personel" color="primary" />
      <StatCard icon="✅" :value="stats.active" label="Aktif" color="success" />
      <StatCard icon="🏖️" :value="stats.onLeave" label="İzinli" color="warning" />
      <StatCard icon="⏸️" :value="stats.passive" label="Pasif" color="danger" />
    </div>

    <!-- Araç Çubuğu -->
    <ActionToolbar
      :show-print="true"
      :show-pdf="true"
      :show-excel-export="true"
      :show-excel-import="true"
      @print="handlePrint"
      @pdf="handlePdf"
      @excel-export="handleExcelExport"
      @excel-import="handleExcelImport"
    >
      <template #left>
        <div class="search-box">
          <input 
            v-model="searchTerm" 
            type="text" 
            placeholder="Personel ara (ad, soyad, sicil no)..."
            @input="handleSearch"
          />
          <span class="search-icon">🔍</span>
        </div>
        <select v-model="filters.departmentId" @change="loadEmployees" class="filter-select">
          <option value="">Tüm Departmanlar</option>
          <option v-for="dept in departments" :key="dept.id" :value="dept.id">
            {{ dept.name }}
          </option>
        </select>
        <select v-model="filters.status" @change="loadEmployees" class="filter-select">
          <option value="">Tüm Durumlar</option>
          <option value="Active">Aktif</option>
          <option value="Passive">Pasif</option>
          <option value="OnLeave">İzinli</option>
        </select>
      </template>
    </ActionToolbar>

    <!-- Personel Tablosu -->
    <DataTable
      :columns="columns"
      :data="employees"
      :loading="loading"
      :show-actions="true"
      :show-view="true"
      :show-edit="true"
      :show-delete="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      :row-clickable="true"
      empty-text="Henüz personel kaydı bulunmuyor"
      @row-click="viewEmployee"
      @view="viewEmployee"
      @edit="editEmployee"
      @delete="confirmDelete"
      @sort="handleSort"
      @page-change="handlePageChange"
    >
      <template #cell-employeeCode="{ value }">
        <span class="employee-code">{{ value }}</span>
      </template>
      <template #cell-fullName="{ row }">
        <div class="employee-name-cell">
          <img 
            v-if="row.photoUrl" 
            :src="row.photoUrl" 
            :alt="row.firstName"
            class="employee-avatar"
          />
          <div v-else class="employee-avatar-placeholder">
            {{ row.firstName?.charAt(0) }}{{ row.lastName?.charAt(0) }}
          </div>
          <div class="employee-name-info">
            <span class="employee-name">{{ row.firstName }} {{ row.lastName }}</span>
            <span class="employee-position">{{ row.position?.title || '-' }}</span>
          </div>
        </div>
      </template>
      <template #cell-department.name="{ value }">
        <span class="department-badge">{{ value || '-' }}</span>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${value?.toLowerCase()}`]">
          {{ getStatusLabel(value) }}
        </span>
      </template>
      <template #cell-hireDate="{ value }">
        {{ formatDate(value) }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const router = useRouter()
const { showToast } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(false)
const employees = ref<any[]>([])
const departments = ref<any[]>([])
const searchTerm = ref('')
const searchTimeout = ref<number | null>(null)

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
  total: 0,
  active: 0,
  passive: 0,
  onLeave: 0
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employeeCode', label: 'Sicil No', width: '100px', sortable: true },
  { key: 'fullName', label: 'Ad Soyad', sortable: true },
  { key: 'department.name', label: 'Departman', sortable: true },
  { key: 'phonePrimary', label: 'Telefon', width: '130px' },
  { key: 'emailWork', label: 'E-Posta' },
  { key: 'hireDate', label: 'İşe Giriş', width: '110px', sortable: true },
  { key: 'status', label: 'Durum', width: '100px', sortable: true }
]

// Methods
const loadEmployees = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (searchTerm.value) options.searchTerm = searchTerm.value
    if (filters.departmentId) options.departmentId = Number(filters.departmentId)
    if (filters.status) options.status = filters.status

    const result = await window.electronAPI.employee.getAll(options)
    
    if (result.success) {
      employees.value = result.data
      pagination.total = result.total
      pagination.totalPages = result.totalPages
    } else {
      showToast(result.errors?.[0] || 'Personeller yüklenemedi', 'error')
    }
  } catch (error) {
    showToast('Personeller yüklenirken hata oluştu', 'error')
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

const loadStats = async () => {
  try {
    // Toplam aktif personel
    const activeResult = await window.electronAPI.employee.getActiveCount()
    if (activeResult.success) {
      stats.active = activeResult.data?.count || 0
    }

    // Tüm personeller için istatistik
    const allResult = await window.electronAPI.employee.getAll({ limit: 1000 })
    if (allResult.success) {
      stats.total = allResult.total
      stats.passive = allResult.data.filter((e: any) => e.status === 'Passive').length
      stats.onLeave = allResult.data.filter((e: any) => e.status === 'OnLeave').length
    }
  } catch (error) {
    console.error('İstatistikler yüklenemedi:', error)
  }
}

const handleSearch = () => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = window.setTimeout(() => {
    pagination.page = 1
    loadEmployees()
  }, 300)
}

const handleSort = (key: string, order: 'asc' | 'desc') => {
  // Backend'e sort parametresi gönder
  loadEmployees()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadEmployees()
}

const viewEmployee = (employee: any) => {
  router.push(`/employees/${employee.id}`)
}

const editEmployee = (employee: any) => {
  router.push(`/employees/${employee.id}/edit`)
}

const confirmDelete = async (employee: any) => {
  const confirmed = await confirm({
    title: 'Personel Sil',
    message: `${employee.firstName} ${employee.lastName} isimli personeli silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    cancelText: 'İptal',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.employee.delete(employee.id)
      if (result.success) {
        showToast('Personel başarıyla silindi', 'success')
        loadEmployees()
        loadStats()
      } else {
        showToast(result.errors?.[0] || 'Personel silinemedi', 'error')
      }
    } catch (error) {
      showToast('Personel silinirken hata oluştu', 'error')
    }
  }
}

const handlePrint = () => {
  window.print()
}

const handlePdf = () => {
  showToast('PDF oluşturma özelliği yakında eklenecek', 'info')
}

const handleExcelExport = () => {
  showToast('Excel export özelliği yakında eklenecek', 'info')
}

const handleExcelImport = () => {
  showToast('Excel import özelliği yakında eklenecek', 'info')
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'Active': 'Aktif',
    'Passive': 'Pasif',
    'OnLeave': 'İzinli',
    'Terminated': 'Ayrıldı'
  }
  return labels[status] || status
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

// Lifecycle
onMounted(() => {
  loadEmployees()
  loadDepartments()
  loadStats()
})
</script>

<style scoped>
.employee-list-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
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
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #198754;
  color: white;
}

.btn-primary:hover {
  background: #157347;
  transform: translateY(-1px);
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
  width: 280px;
  transition: border-color 0.2s, box-shadow 0.2s;
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
  font-size: 0.875rem;
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

.filter-select:focus {
  outline: none;
  border-color: #0466c8;
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
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.employee-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.employee-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0);
  color: #2c3e50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.employee-name-info {
  display: flex;
  flex-direction: column;
}

.employee-name {
  font-weight: 600;
  color: #2c3e50;
}

.employee-position {
  font-size: 0.8rem;
  color: #6c757d;
}

.department-badge {
  background: #f8f9fa;
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #495057;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-passive {
  background: #f8d7da;
  color: #721c24;
}

.status-onleave {
  background: #fff3cd;
  color: #856404;
}

.status-terminated {
  background: #e9ecef;
  color: #495057;
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
