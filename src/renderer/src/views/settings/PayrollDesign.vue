<template>
  <div class="payroll-design-page">
    <PageHeader 
      title="Bordro Tasarımı" 
      description="Bordro sütunlarını oluşturun ve düzenleyin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Sütun Ekle
        </button>
      </template>
    </PageHeader>

    <!-- Filtreler -->
    <ActionToolbar>
      <template #left>
        <div class="filter-group">
          <label>Sütun Tipi:</label>
          <select v-model="filters.columnType" @change="loadColumns" class="filter-select">
            <option value="">Tümü</option>
            <option value="info">Bilgi</option>
            <option value="income">Gelir</option>
            <option value="deduction">Kesinti</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Durum:</label>
          <select v-model="filters.isActive" @change="loadColumns" class="filter-select">
            <option value="">Tümü</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Arama:</label>
          <input 
            v-model="searchTerm" 
            @input="loadColumns" 
            type="text" 
            class="search-input"
            placeholder="Sütun adı veya kod..."
          />
        </div>
      </template>
    </ActionToolbar>

    <!-- Tablo -->
    <div class="table-container">
      <table class="columns-table">
        <thead>
          <tr>
            <th style="width: 80px">Sıra</th>
            <th style="width: 150px">Sütun Kodu</th>
            <th>Sütun Adı</th>
            <th style="width: 100px">Tip</th>
            <th style="width: 140px">Veri Formatı</th>
            <th style="width: 100px">Genişlik</th>
            <th style="width: 80px">Durum</th>
            <th style="width: 150px">İşlemler</th>
          </tr>
        </thead>
        <tbody v-if="!loading && columns.length > 0">
          <tr v-for="(column, index) in columns" :key="column.id">
            <td class="text-center">
              <div class="sort-buttons">
                <button 
                  @click="moveUp(column)" 
                  :disabled="index === 0"
                  class="sort-btn"
                  title="Yukarı Taşı"
                >↑</button>
                <span class="sort-order">{{ column.sortOrder }}</span>
                <button 
                  @click="moveDown(column)" 
                  :disabled="index === columns.length - 1"
                  class="sort-btn"
                  title="Aşağı Taşı"
                >↓</button>
              </div>
            </td>
            <td>
              <code class="column-code">{{ column.columnCode }}</code>
            </td>
            <td>
              <strong>{{ column.columnName }}</strong>
            </td>
            <td>
              <span :class="['type-badge', column.columnType]">
                {{ getColumnTypeLabel(column.columnType) }}
              </span>
            </td>
            <td>
              <span class="data-type">
                {{ getDataTypeLabel(column.dataType) }}
              </span>
            </td>
            <td class="text-center">
              {{ column.columnWidth }}
            </td>
            <td class="text-center">
              <button 
                @click="toggleActive(column)" 
                :class="['status-badge', { active: column.isActive }]"
              >
                {{ column.isActive ? 'Aktif' : 'Pasif' }}
              </button>
            </td>
            <td class="actions-cell">
              <button class="action-btn edit" @click="openEditModal(column)" title="Düzenle">✏️</button>
              <button 
                class="action-btn delete" 
                @click="confirmDelete(column)" 
                :disabled="column.isSystem"
                title="Sil"
              >🗑️</button>
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="loading">
          <tr>
            <td colspan="8" class="text-center loading-cell">
              Yükleniyor...
            </td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="8" class="text-center empty-cell">
              Henüz sütun tanımlanmamış
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Sütun Düzenle' : 'Yeni Sütun Ekle' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveColumn" class="modal-body">
              <!-- Sistem Sütunu Uyarısı -->
              <div v-if="isEditing && form.isSystem" class="alert alert-warning">
                ⚠️ Bu bir sistem sütunudur. Sadece sütun adı, genişlik, sıra ve durum değiştirilebilir.
              </div>

              <!-- Sütun Kodu - Backend otomatik oluşturuyor -->

              <!-- Sütun Adı -->
              <div class="form-group">
                <label>Sütun Adı *</label>
                <input
                  v-model="form.columnName"
                  type="text"
                  required
                  class="form-control"
                  placeholder="Örnek Sütun Adı"
                />
              </div>

              <!-- Sütun Tipi -->
              <div class="form-row">
                <div class="form-group">
                  <label>Sütun Tipi *</label>
                  <select 
                    v-model="form.columnType" 
                    required 
                    class="form-control"
                    :disabled="isEditing && form.isSystem"
                  >
                    <option value="">Seçiniz</option>
                    <option value="info">📋 Bilgi (Sıra No, Sicil, İsim vb.)</option>
                    <option value="income">📈 Gelir</option>
                    <option value="deduction">📉 Kesinti</option>
                  </select>
                </div>

                <!-- Veri Formatı -->
                <div class="form-group">
                  <label>Veri Formatı *</label>
                  <select 
                    v-model="form.dataType" 
                    required 
                    class="form-control"
                    :disabled="isEditing && form.isSystem"
                  >
                    <option value="text">📝 Metin</option>
                    <option value="integer">🔢 Tam Sayı</option>
                    <option value="float">🔢 Ondalıklı Sayı</option>
                    <option value="currency">💰 Para Birimi</option>
                  </select>
                </div>
              </div>

              <!-- Sütun Genişliği ve Sıra -->
              <div class="form-row">
                <div class="form-group">
                  <label>Sütun Genişliği</label>
                  <input
                    v-model="form.columnWidth"
                    type="text"
                    class="form-control"
                    placeholder="120px, 15%, auto"
                  />
                  <small class="form-hint">Örn: 120px, 15%, auto</small>
                </div>

                <div class="form-group">
                  <label>Sıra No *</label>
                  <input
                    v-model.number="form.sortOrder"
                    type="number"
                    min="0"
                    required
                    class="form-control"
                  />
                </div>
              </div>

              <!-- Kategori -->
              <div class="form-group" v-if="!form.isSystem">
                <label>Kategori</label>
                <select v-model="form.category" class="form-control">
                  <option value="">Seçiniz</option>
                  <option 
                    v-for="paramType in parameterTypes" 
                    :key="paramType.id" 
                    :value="paramType.code"
                  >
                    {{ paramType.name }}
                  </option>
                </select>
                <small class="form-hint">Bordro parametrelerinden bir kategori seçin</small>
              </div>

              <!-- Açıklama -->
              <div class="form-group">
                <label>Açıklama</label>
                <textarea
                  v-model="form.description"
                  class="form-control"
                  rows="3"
                  placeholder="Sütun hakkında açıklama..."
                ></textarea>
              </div>

              <!-- Aktif -->
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.isActive" />
                  Aktif
                </label>
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
import ActionToolbar from '@/components/ActionToolbar.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { ParameterType } from '@/types/electron'

const { showToast } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const columns = ref<any[]>([])
const searchTerm = ref('')
const parameterTypes = ref<ParameterType[]>([])

const filters = reactive({
  columnType: '',
  isActive: ''
})

const form = reactive({
  id: null as number | null,
  columnCode: '',
  columnName: '',
  columnType: '',
  dataType: 'text',
  columnWidth: '120px',
  sortOrder: 0,
  category: '',
  description: '',
  isActive: true,
  isSystem: false
})

// Data type labels
const getDataTypeLabel = (dataType: string) => {
  const labels: Record<string, string> = {
    text: '📝 Metin',
    integer: '🔢 Tam Sayı',
    float: '🔢 Ondalıklı',
    currency: '💰 Para Birimi'
  }
  return labels[dataType] || dataType
}

// Column type labels
const getColumnTypeLabel = (columnType: string) => {
  const labels: Record<string, string> = {
    info: '📋 Bilgi',
    income: '📈 Gelir',
    deduction: '📉 Kesinti'
  }
  return labels[columnType] || columnType
}

// Load columns
const loadColumns = async () => {
  loading.value = true
  try {
    const options: any = {}
    
    if (filters.columnType) options.columnType = filters.columnType
    if (filters.isActive) options.isActive = filters.isActive === 'true'

    const result = await window.electronAPI.payrollColumnMapping.getAll(options)
    
    if (result.success) {
      let data = result.data || []
      
      // Search filter
      if (searchTerm.value.trim()) {
        const term = searchTerm.value.toLowerCase()
        data = data.filter((col: any) => 
          col.columnCode.toLowerCase().includes(term) || 
          col.columnName.toLowerCase().includes(term)
        )
      }
      
      // Sort by sortOrder
      columns.value = data.sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    } else {
      showToast(result.errors?.[0] || 'Sütunlar yüklenemedi', 'error')
    }
  } catch (error) {
    showToast('Yükleme sırasında hata oluştu', 'error')
  } finally {
    loading.value = false
  }
}

// Open modals
const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  form.sortOrder = columns.value.length > 0 ? Math.max(...columns.value.map(c => c.sortOrder)) + 1 : 0
  showModal.value = true
}

const openEditModal = (column: any) => {
  isEditing.value = true
  form.id = column.id
  form.columnCode = column.columnCode
  form.columnName = column.columnName
  form.columnType = column.columnType
  form.dataType = column.dataType || 'text'
  form.columnWidth = column.columnWidth || '120px'
  form.sortOrder = column.sortOrder
  form.category = column.category || ''
  form.description = column.description || ''
  form.isActive = column.isActive
  form.isSystem = column.isSystem
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.id = null
  form.columnCode = ''
  form.columnName = ''
  form.columnType = ''
  form.dataType = 'text'
  form.columnWidth = '120px'
  form.sortOrder = 0
  form.category = ''
  form.description = ''
  form.isActive = true
  form.isSystem = false
}

// Save column
const saveColumn = async () => {
  saving.value = true
  try {
    const data: any = {
      columnName: form.columnName,
      columnType: form.columnType,
      dataType: form.dataType,
      columnWidth: form.columnWidth,
      sortOrder: form.sortOrder,
      category: form.category || null,
      description: form.description || null,
      isActive: form.isActive
    }

    if (!isEditing.value) {
      // columnCode backend tarafından otomatik oluşturulacak
      // parameterTypes ve formula opsiyonel - Bordro Tasarımı için gerekmez
      data.parameterTypes = []
    }

    const result = isEditing.value
      ? await window.electronAPI.payrollColumnMapping.update(form.id!, data)
      : await window.electronAPI.payrollColumnMapping.create(data)

    if (result.success) {
      showToast(
        isEditing.value ? 'Sütun güncellendi' : 'Sütun oluşturuldu',
        'success'
      )
      closeModal()
      await loadColumns()
    } else {
      showToast(result.errors?.[0] || 'İşlem başarısız', 'error')
    }
  } catch (error) {
    showToast('Kaydetme sırasında hata oluştu', 'error')
  } finally {
    saving.value = false
  }
}

// Delete column
const confirmDelete = async (column: any) => {
  if (column.isSystem) {
    showToast('Sistem sütunları silinemez', 'warning')
    return
  }

  const confirmed = await confirm({
    title: 'Sütunu Sil',
    message: `"${column.columnName}" sütununu silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    cancelText: 'İptal',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.payrollColumnMapping.delete(column.id)
      if (result.success) {
        showToast('Sütun silindi', 'success')
        await loadColumns()
      } else {
        showToast(result.errors?.[0] || 'Silme başarısız', 'error')
      }
    } catch (error) {
      showToast('Silme sırasında hata oluştu', 'error')
    }
  }
}

// Toggle active status
const toggleActive = async (column: any) => {
  try {
    const result = await window.electronAPI.payrollColumnMapping.update(column.id, {
      isActive: !column.isActive
    })
    if (result.success) {
      column.isActive = !column.isActive
      showToast(`Sütun ${column.isActive ? 'aktif' : 'pasif'} edildi`, 'success')
    } else {
      showToast('Durum değiştirilemedi', 'error')
    }
  } catch (error) {
    showToast('İşlem başarısız', 'error')
  }
}

// Move up/down
const moveUp = async (column: any) => {
  const currentIndex = columns.value.findIndex(c => c.id === column.id)
  if (currentIndex === 0) return

  const prevColumn = columns.value[currentIndex - 1]
  await swapSortOrder(column, prevColumn)
}

const moveDown = async (column: any) => {
  const currentIndex = columns.value.findIndex(c => c.id === column.id)
  if (currentIndex === columns.value.length - 1) return

  const nextColumn = columns.value[currentIndex + 1]
  await swapSortOrder(column, nextColumn)
}

const swapSortOrder = async (col1: any, col2: any) => {
  try {
    const temp = col1.sortOrder
    
    await Promise.all([
      window.electronAPI.payrollColumnMapping.update(col1.id, { sortOrder: col2.sortOrder }),
      window.electronAPI.payrollColumnMapping.update(col2.id, { sortOrder: temp })
    ])

    await loadColumns()
    showToast('Sıralama güncellendi', 'success')
  } catch (error) {
    showToast('Sıralama değiştirilemedi', 'error')
  }
}

// Parametre türlerini yükle
const loadParameterTypes = async () => {
  try {
    const result = await window.electronAPI.parameterType.getActive()
    if (result.success) {
      parameterTypes.value = result.data || []
    }
  } catch (_) {
    console.error('Parametre türleri yüklenemedi')
  }
}

onMounted(() => {
  loadColumns()
  loadParameterTypes()
})
</script>

<style scoped>
.payroll-design-page {
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
  background: #0466c8;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0353a4;
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

.filter-select,
.search-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
}

.filter-select {
  cursor: pointer;
  min-width: 120px;
}

.search-input {
  min-width: 200px;
}

/* Table */
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-top: 1.5rem;
}

.columns-table {
  width: 100%;
  border-collapse: collapse;
}

.columns-table thead {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.columns-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #495057;
  font-size: 0.875rem;
  border-bottom: 2px solid #dee2e6;
}

.columns-table td {
  padding: 1rem;
  border-bottom: 1px solid #f1f3f5;
}

.columns-table tbody tr:hover {
  background: #f8f9fa;
}

.text-center {
  text-align: center !important;
}

.column-code {
  font-family: 'Consolas', monospace;
  background: #e7f1ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #0466c8;
}

.type-badge {
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  display: inline-block;
}

.type-badge.income {
  background: #d1f2eb;
  color: #0a5e47;
}

.type-badge.deduction {
  background: #f8d7da;
  color: #721c24;
}

.type-badge.info {
  background: #e7f1ff;
  color: #0466c8;
}

.data-type {
  font-size: 0.875rem;
  color: #495057;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.status-badge.active {
  background: #28a745;
  color: white;
}

.status-badge:not(.active) {
  background: #6c757d;
  color: white;
}

.status-badge:hover {
  transform: scale(1.05);
}

.sort-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.sort-btn {
  background: #0466c8;
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.sort-btn:hover:not(:disabled) {
  background: #0353a4;
  transform: scale(1.1);
}

.sort-btn:disabled {
  background: #e9ecef;
  color: #adb5bd;
  cursor: not-allowed;
}

.sort-order {
  font-weight: 600;
  color: #495057;
  min-width: 20px;
  text-align: center;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem 0.5rem;
  transition: transform 0.2s;
}

.action-btn:hover:not(:disabled) {
  transform: scale(1.2);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.loading-cell,
.empty-cell {
  padding: 3rem;
  color: #6c757d;
  font-style: italic;
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.alert-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
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
</style>
