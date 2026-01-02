<template>
  <div class="employee-archive-page">
    <PageHeader 
      title="Personel Arşiv" 
      description="İşten ayrılan ve silinen personel kayıtları"
    >
      <template #actions>
        <router-link to="/employees" class="btn btn-secondary">
          ← Aktif Personeller
        </router-link>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📁" :value="stats.total" label="Toplam Arşiv" color="info" />
      <StatCard icon="🚪" :value="stats.terminated" label="İşten Ayrılan" color="warning" />
      <StatCard icon="🗑️" :value="stats.deleted" label="Silinen" color="danger" />
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
            placeholder="Arşivde ara..."
            @input="handleSearch"
          />
          <span class="search-icon">🔍</span>
        </div>
        <select v-model="filters.reason" @change="loadArchive" class="filter-select">
          <option value="">Tüm Sebepler</option>
          <option value="İstifa">İstifa</option>
          <option value="Emeklilik">Emeklilik</option>
          <option value="Çıkarılma">Çıkarılma</option>
          <option value="Sözleşme Bitimi">Sözleşme Bitimi</option>
        </select>
      </template>
    </ActionToolbar>

    <!-- Arşiv Tablosu -->
    <DataTable
      :columns="columns"
      :data="archivedEmployees"
      :loading="loading"
      :show-actions="true"
      :show-view="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Arşivde kayıt bulunmuyor"
      @view="viewEmployee"
      @page-change="handlePageChange"
    >
      <template #cell-employeeCode="{ value }">
        <span class="employee-code">{{ value }}</span>
      </template>
      <template #cell-fullName="{ row }">
        <div class="employee-name-cell">
          <div class="employee-avatar-placeholder archived">
            {{ row.firstName?.charAt(0) }}{{ row.lastName?.charAt(0) }}
          </div>
          <div class="employee-name-info">
            <span class="employee-name">{{ row.firstName }} {{ row.lastName }}</span>
            <span class="employee-position">{{ row.position?.title || '-' }}</span>
          </div>
        </div>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${value?.toLowerCase()}`]">
          {{ getStatusLabel(value) }}
        </span>
      </template>
      <template #cell-hireDate="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #cell-deletedAt="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #actions="{ row }">
        <button 
          class="action-btn view" 
          @click.stop="viewEmployee(row)"
          title="Görüntüle"
        >
          👁️
        </button>
        <button 
          class="action-btn restore" 
          @click.stop="confirmRestore(row)"
          title="Geri Yükle"
        >
          ♻️
        </button>
        <button 
          class="action-btn delete" 
          @click.stop="confirmPermanentDelete(row)"
          title="Kalıcı Sil"
        >
          ⛔
        </button>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
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
const archivedEmployees = ref<any[]>([])
const searchTerm = ref('')
const searchTimeout = ref<number | null>(null)

const filters = reactive({
  reason: ''
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const stats = reactive({
  total: 0,
  terminated: 0,
  deleted: 0
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'employeeCode', label: 'Sicil No', width: '100px' },
  { key: 'fullName', label: 'Ad Soyad' },
  { key: 'department.name', label: 'Departman' },
  { key: 'hireDate', label: 'İşe Giriş', width: '110px' },
  { key: 'deletedAt', label: 'Arşiv Tarihi', width: '110px' },
  { key: 'status', label: 'Durum', width: '100px' }
]

// Methods
const loadArchive = async () => {
  loading.value = true
  try {
    // Silinen personelleri getir (includeDeleted: true)
    const options: any = {
      page: pagination.page,
      limit: pagination.limit,
      includeDeleted: true,
      status: 'Terminated'
    }
    
    if (searchTerm.value) options.searchTerm = searchTerm.value

    const result = await window.electronAPI.employee.getAll(options)
    
    if (result.success) {
      // Sadece silinmiş veya terminated olanları filtrele
      archivedEmployees.value = result.data.filter((e: any) => 
        e.deletedAt || e.status === 'Terminated'
      )
      pagination.total = archivedEmployees.value.length
      pagination.totalPages = Math.ceil(pagination.total / pagination.limit)
    } else {
      showToast(result.errors?.[0] || 'Arşiv yüklenemedi', 'error')
    }
  } catch (error) {
    showToast('Arşiv yüklenirken hata oluştu', 'error')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 1000, includeDeleted: true })
    if (result.success) {
      const all = result.data
      stats.deleted = all.filter((e: any) => e.deletedAt).length
      stats.terminated = all.filter((e: any) => e.status === 'Terminated' && !e.deletedAt).length
      stats.total = stats.deleted + stats.terminated
    }
  } catch (error) {
    console.error('İstatistikler yüklenemedi:', error)
  }
}

const handleSearch = () => {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = window.setTimeout(() => {
    pagination.page = 1
    loadArchive()
  }, 300)
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadArchive()
}

const viewEmployee = (employee: any) => {
  router.push(`/employees/${employee.id}`)
}

const confirmRestore = async (employee: any) => {
  const confirmed = await confirm({
    title: 'Personeli Geri Yükle',
    message: `${employee.firstName} ${employee.lastName} isimli personeli geri yüklemek istediğinize emin misiniz?`,
    confirmText: 'Geri Yükle',
    cancelText: 'İptal',
    type: 'info'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.employee.restore(employee.id)
      if (result.success) {
        showToast('Personel başarıyla geri yüklendi', 'success')
        loadArchive()
        loadStats()
      } else {
        showToast(result.errors?.[0] || 'Personel geri yüklenemedi', 'error')
      }
    } catch (error) {
      showToast('Personel geri yüklenirken hata oluştu', 'error')
    }
  }
}

const confirmPermanentDelete = async (employee: any) => {
  const confirmed = await confirm({
    title: 'Kalıcı Silme',
    message: `${employee.firstName} ${employee.lastName} isimli personeli kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`,
    confirmText: 'Kalıcı Sil',
    cancelText: 'İptal',
    type: 'danger'
  })

  if (confirmed) {
    showToast('Kalıcı silme özelliği yakında eklenecek', 'info')
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
  loadArchive()
  loadStats()
})
</script>

<style scoped>
.employee-archive-page {
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

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
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

.employee-code {
  font-family: 'Consolas', monospace;
  font-weight: 600;
  color: #6c757d;
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.employee-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

.employee-avatar-placeholder.archived {
  background: linear-gradient(135deg, #dee2e6, #ced4da);
  color: #6c757d;
}

.employee-name-info {
  display: flex;
  flex-direction: column;
}

.employee-name {
  font-weight: 600;
  color: #6c757d;
}

.employee-position {
  font-size: 0.8rem;
  color: #adb5bd;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-terminated {
  background: #e9ecef;
  color: #495057;
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
  background: #e9ecef;
  transform: scale(1.1);
}

.action-btn.restore:hover {
  background: #d4edda;
}

.action-btn.delete:hover {
  background: #fee2e2;
}

@media print {
  .page-header-right,
  .action-toolbar,
  .actions-cell {
    display: none !important;
  }
}
</style>
