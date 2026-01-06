<template>
  <div class="parameter-type-page">
    <PageHeader 
      title="Parametre Türü Tanımları" 
      description="Maaş parametrelerinde kullanılacak parametre türlerini yönetin (SGK Oranları, Vergi Dilimleri vb.)"
    >
      <template #actions>
        <button class="btn btn-secondary" @click="seedDefaults" style="margin-right: 0.5rem;">
          🔄 Varsayılanları Yükle
        </button>
        <button class="btn btn-primary" @click="openNewModal">
          ➕ Yeni Parametre Türü
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Tür" color="primary" />
      <StatCard icon="✅" :value="stats.active" label="Aktif" color="success" />
      <StatCard icon="⏸️" :value="stats.inactive" label="Pasif" color="warning" />
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
          <select v-model="filters.isActive" @change="loadParameterTypes" class="filter-select">
            <option value="">Tüm Durumlar</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
        </div>
        <div class="filter-group">
          <input 
            v-model="filters.search" 
            @input="loadParameterTypes" 
            type="text" 
            placeholder="Parametre türü ara..." 
            class="filter-input"
          />
        </div>
      </template>
    </ActionToolbar>

    <!-- Parametre Türleri Tablosu -->
    <DataTable
      :columns="columns"
      :data="parameterTypes"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Parametre türü bulunmuyor"
      @page-change="handlePageChange"
    >
      <template #cell-name="{ row }">
        <span class="type-name">{{ row.name }}</span>
      </template>
      <template #cell-isActive="{ value }">
        <span :class="['badge', value ? 'badge-success' : 'badge-warning']">
          {{ value ? 'Aktif' : 'Pasif' }}
        </span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn edit" @click.stop="editParameterType(row)" title="Düzenle">✏️</button>
        <button class="action-btn delete" @click.stop="deleteParameterType(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Yeni/Düzenle Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ editingId ? 'Parametre Türü Düzenle' : 'Yeni Parametre Türü' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveParameterType" class="modal-body">
              <div class="form-group">
                <label>Parametre Türü Adı *</label>
                <input v-model="form.name" type="text" required class="form-control" placeholder="Örn: SGK İşçi Payı Oranı" />
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea v-model="form.description" class="form-control" rows="3" placeholder="Bu parametre türünün ne için kullanıldığını açıklayın..."></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Sıralama</label>
                  <input v-model.number="form.sortOrder" type="number" min="0" class="form-control" placeholder="0" />
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" v-model="form.isActive" />
                    Aktif
                  </label>
                </div>
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
import { ref, reactive, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { success, error } = useToast()
const { confirm } = useConfirm()

// Types
interface ParameterType {
  id: number
  name: string
  code: string
  description: string | null
  category: string | null
  sortOrder: number
  isActive: boolean
}

interface ParameterTypeOptions {
  page: number
  limit: number
  isActive?: boolean
  search?: string
}

// State
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingId = ref<number | null>(null)
const parameterTypes = ref<ParameterType[]>([])

const filters = reactive({
  isActive: '',
  search: ''
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
  inactive: 0
})

const form = reactive({
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'name', label: 'Parametre Türü', sortable: true },
  { key: 'description', label: 'Açıklama' },
  { key: 'isActive', label: 'Durum', width: '100px' }
]

// Methods
const loadParameterTypes = async () => {
  loading.value = true
  try {
    const options: ParameterTypeOptions = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (filters.isActive !== '') options.isActive = filters.isActive === 'true'
    if (filters.search) options.search = filters.search

    const result = await window.electronAPI.parameterType.getAll(options)
    
    if (result.success) {
      parameterTypes.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    } else {
      error(result.errors?.[0] || 'Parametre türleri yüklenemedi')
    }
  } catch {
    error('Parametre türleri yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  const all = parameterTypes.value
  stats.total = pagination.total
  stats.active = all.filter(t => t.isActive).length
  stats.inactive = all.filter(t => !t.isActive).length
}

const openNewModal = () => {
  editingId.value = null
  resetForm()
  showModal.value = true
}

const editParameterType = (paramType: ParameterType) => {
  editingId.value = paramType.id
  form.name = paramType.name
  form.description = paramType.description || ''
  form.sortOrder = paramType.sortOrder
  form.isActive = paramType.isActive
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingId.value = null
  resetForm()
}

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.sortOrder = 0
  form.isActive = true
}

const saveParameterType = async () => {
  saving.value = true
  try {
    const data = {
      name: form.name,
      description: form.description || null,
      sortOrder: form.sortOrder,
      isActive: form.isActive
    }

    let result
    if (editingId.value) {
      result = await window.electronAPI.parameterType.update(editingId.value, data)
    } else {
      result = await window.electronAPI.parameterType.create(data)
    }

    if (result && result.success) {
      success(editingId.value ? 'Parametre türü güncellendi' : 'Parametre türü oluşturuldu')
      closeModal()
      loadParameterTypes()
    } else {
      error(result?.errors?.[0] || 'İşlem başarısız')
    }
  } catch {
    error('Kayıt sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const deleteParameterType = async (paramType: ParameterType) => {
  const confirmed = await confirm({
    title: 'Parametre Türünü Sil',
    message: `"${paramType.name}" parametre türünü silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.parameterType.delete(paramType.id)
      if (result && result.success) {
        success('Parametre türü silindi')
        loadParameterTypes()
      } else {
        error(result?.errors?.[0] || 'Silme başarısız')
      }
    } catch {
      error('Silme sırasında hata oluştu')
    }
  }
}

const seedDefaults = async () => {
  const confirmed = await confirm({
    title: 'Varsayılan Parametre Türleri',
    message: 'Varsayılan parametre türlerini yüklemek istiyor musunuz? Mevcut türler etkilenmez.',
    confirmText: 'Yükle',
    type: 'info'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.parameterType.seedDefaults()
      if (result && result.success) {
        success(result.message || 'Varsayılan parametre türleri yüklendi')
        loadParameterTypes()
      } else {
        error(result?.errors?.[0] || 'Yükleme başarısız')
      }
    } catch {
      error('Yükleme sırasında hata oluştu')
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadParameterTypes()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

// Lifecycle
onMounted(() => {
  loadParameterTypes()
})
</script>

<style scoped>
.parameter-type-page {
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

.filter-select, .filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 160px;
}

.type-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.type-icon {
  font-size: 1.1rem;
}

.code-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #e7f1ff;
  color: #0466c8;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: monospace;
}

.category-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #f8f9fa;
  color: #495057;
  border-radius: 4px;
  font-size: 0.8rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success { background: #d4edda; color: #155724; }
.badge-warning { background: #fff3cd; color: #856404; }

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

.action-btn:hover { transform: scale(1.1); }
.action-btn.edit:hover { background: #e7f1ff; }
.action-btn.delete:hover { background: #f8d7da; }

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
  max-width: 600px;
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

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #6c757d;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.checkbox-group {
  display: flex;
  align-items: center;
  padding-top: 1.5rem;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
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
