<template>
  <div class="leave-type-page">
    <PageHeader 
      title="İzin Türleri" 
      description="Yıllık, mazeret, doğum ve diğer izin türlerini yönetin"
    >
      <template #actions>
        <button class="btn btn-secondary" @click="seedDefaults" style="margin-right: 0.5rem;">
          🔄 Varsayılanları Yükle
        </button>
        <button class="btn btn-primary" @click="openNewModal">
          ➕ Yeni İzin Türü
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Tür" color="primary" />
      <StatCard icon="💰" :value="stats.paid" label="Ücretli İzin" color="success" />
      <StatCard icon="📝" :value="stats.unpaid" label="Ücretsiz İzin" color="warning" />
      <StatCard icon="📊" :value="stats.deducting" label="Bakiyeden Düşen" color="info" />
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
          <select v-model="filters.isPaid" @change="loadLeaveTypes" class="filter-select">
            <option value="">Tüm Türler</option>
            <option value="true">Ücretli</option>
            <option value="false">Ücretsiz</option>
          </select>
        </div>
        <div class="filter-group">
          <input 
            v-model="filters.search" 
            @input="loadLeaveTypes" 
            type="text" 
            placeholder="İzin türü ara..." 
            class="filter-input"
          />
        </div>
      </template>
    </ActionToolbar>

    <!-- İzin Türleri Tablosu -->
    <DataTable
      :columns="columns"
      :data="leaveTypes"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="İzin türü bulunmuyor"
      @page-change="handlePageChange"
    >
      <template #cell-name="{ row }">
        <div class="type-name">
          <span class="type-icon">{{ getTypeIcon(row) }}</span>
          <span>{{ row.name }}</span>
        </div>
      </template>
      <template #cell-isPaid="{ value }">
        <span :class="['badge', value ? 'badge-success' : 'badge-warning']">
          {{ value ? 'Ücretli' : 'Ücretsiz' }}
        </span>
      </template>
      <template #cell-maxDays="{ value }">
        <span class="day-value">{{ value || '∞' }} gün</span>
      </template>
      <template #cell-deductsFromBalance="{ value }">
        <span :class="['badge', value ? 'badge-info' : 'badge-secondary']">
          {{ value ? 'Evet' : 'Hayır' }}
        </span>
      </template>
      <template #cell-requiresApproval="{ value }">
        <span :class="['badge', value ? 'badge-primary' : 'badge-secondary']">
          {{ value ? 'Gerekli' : 'Gerekli Değil' }}
        </span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn edit" @click.stop="editLeaveType(row)" title="Düzenle">✏️</button>
        <button class="action-btn delete" @click.stop="deleteLeaveType(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Yeni/Düzenle Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ editingId ? 'İzin Türü Düzenle' : 'Yeni İzin Türü' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveLeaveType" class="modal-body">
              <div class="form-group">
                <label>İzin Türü Adı *</label>
                <input v-model="form.name" type="text" required class="form-control" placeholder="Örn: Yıllık İzin" />
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea v-model="form.description" rows="2" class="form-control" placeholder="İzin türü açıklaması..."></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Maksimum Gün</label>
                  <input v-model.number="form.maxDays" type="number" min="0" class="form-control" placeholder="Sınırsız için boş bırakın" />
                </div>
                <div class="form-group">
                  <label>Varsayılan Gün</label>
                  <input v-model.number="form.defaultDays" type="number" min="0" class="form-control" placeholder="0" />
                </div>
              </div>
              <div class="form-row checkbox-row">
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" v-model="form.isPaid" />
                    Ücretli İzin
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" v-model="form.deductsFromBalance" />
                    Bakiyeden Düşer
                  </label>
                </div>
              </div>
              <div class="form-row checkbox-row">
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" v-model="form.requiresApproval" />
                    Onay Gerektirir
                  </label>
                </div>
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" v-model="form.carryForward" />
                    Sonraki Yıla Devir
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

// State
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingId = ref<number | null>(null)
const leaveTypes = ref<any[]>([])

const filters = reactive({
  isPaid: '',
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
  paid: 0,
  unpaid: 0,
  deducting: 0
})

const form = reactive({
  name: '',
  description: '',
  maxDays: null as number | null,
  defaultDays: 0,
  isPaid: true,
  deductsFromBalance: true,
  requiresApproval: true,
  carryForward: false
})

// Tablo kolonları
const columns: TableColumn[] = [
  { key: 'name', label: 'İzin Türü', sortable: true },
  { key: 'description', label: 'Açıklama' },
  { key: 'isPaid', label: 'Ücret Durumu', width: '120px' },
  { key: 'maxDays', label: 'Maks. Gün', width: '100px' },
  { key: 'deductsFromBalance', label: 'Bakiyeden Düşer', width: '130px' },
  { key: 'requiresApproval', label: 'Onay', width: '120px' }
]

// Methods
const loadLeaveTypes = async () => {
  loading.value = true
  try {
    const options: any = {
      page: pagination.page,
      limit: pagination.limit
    }
    
    if (filters.isPaid !== '') options.isPaid = filters.isPaid === 'true'
    if (filters.search) options.search = filters.search

    const result = await window.electronAPI.leaveType.getAll(options)
    
    if (result.success) {
      leaveTypes.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    } else {
      error(result.errors?.[0] || 'İzin türleri yüklenemedi')
    }
  } catch (err) {
    error('İzin türleri yüklenirken hata oluştu')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  const all = leaveTypes.value
  stats.total = pagination.total
  stats.paid = all.filter(t => t.isPaid).length
  stats.unpaid = all.filter(t => !t.isPaid).length
  stats.deducting = all.filter(t => t.deductsFromBalance).length
}

const openNewModal = () => {
  editingId.value = null
  resetForm()
  showModal.value = true
}

const editLeaveType = (leaveType: any) => {
  editingId.value = leaveType.id
  form.name = leaveType.name
  form.description = leaveType.description || ''
  form.maxDays = leaveType.maxDays
  form.defaultDays = leaveType.defaultDays || 0
  form.isPaid = leaveType.isPaid
  form.deductsFromBalance = leaveType.deductsFromBalance
  form.requiresApproval = leaveType.requiresApproval
  form.carryForward = leaveType.carryForward || false
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
  form.maxDays = null
  form.defaultDays = 0
  form.isPaid = true
  form.deductsFromBalance = true
  form.requiresApproval = true
  form.carryForward = false
}

const saveLeaveType = async () => {
  saving.value = true
  try {
    const data = {
      name: form.name,
      description: form.description || null,
      maxDays: form.maxDays,
      defaultDays: form.defaultDays,
      isPaid: form.isPaid,
      deductsFromBalance: form.deductsFromBalance,
      requiresApproval: form.requiresApproval,
      carryForward: form.carryForward
    }

    let result
    if (editingId.value) {
      result = await window.electronAPI.leaveType.update(editingId.value, data)
    } else {
      result = await window.electronAPI.leaveType.create(data)
    }

    if (result.success) {
      success(editingId.value ? 'İzin türü güncellendi' : 'İzin türü oluşturuldu')
      closeModal()
      loadLeaveTypes()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kayıt sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const deleteLeaveType = async (leaveType: any) => {
  const confirmed = await confirm({
    title: 'İzin Türünü Sil',
    message: `"${leaveType.name}" izin türünü silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.leaveType.delete(leaveType.id)
      if (result.success) {
        success('İzin türü silindi')
        loadLeaveTypes()
      } else {
        error(result.errors?.[0] || 'Silme başarısız')
      }
    } catch (err) {
      error('Silme sırasında hata oluştu')
    }
  }
}

const seedDefaults = async () => {
  const confirmed = await confirm({
    title: 'Varsayılan İzin Türleri',
    message: 'Varsayılan izin türlerini yüklemek istiyor musunuz? Mevcut türler etkilenmez.',
    confirmText: 'Yükle',
    type: 'info'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.leaveType.seedDefaults()
      if (result.success) {
        success(result.message || 'Varsayılan izin türleri yüklendi')
        loadLeaveTypes()
      } else {
        error(result.errors?.[0] || 'Yükleme başarısız')
      }
    } catch (err) {
      error('Yükleme sırasında hata oluştu')
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadLeaveTypes()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

// Helpers
const getTypeIcon = (leaveType: any) => {
  if (leaveType.name?.includes('Yıllık')) return '🏖️'
  if (leaveType.name?.includes('Mazeret')) return '📝'
  if (leaveType.name?.includes('Doğum')) return '👶'
  if (leaveType.name?.includes('Evlilik')) return '💒'
  if (leaveType.name?.includes('Ölüm') || leaveType.name?.includes('Vefat')) return '🕯️'
  if (leaveType.name?.includes('Hastalık') || leaveType.name?.includes('Rapor')) return '🏥'
  return '📋'
}

// Lifecycle
onMounted(() => {
  loadLeaveTypes()
})
</script>

<style scoped>
.leave-type-page {
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
  font-size: 1.2rem;
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
.badge-info { background: #d1ecf1; color: #0c5460; }
.badge-primary { background: #cce5ff; color: #004085; }
.badge-secondary { background: #e9ecef; color: #495057; }

.day-value {
  font-weight: 600;
  color: #0466c8;
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

.checkbox-row {
  margin-top: 0.5rem;
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
