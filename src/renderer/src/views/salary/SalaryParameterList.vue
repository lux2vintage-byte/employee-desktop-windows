<template>
  <div class="salary-parameter-page">
    <PageHeader 
      title="Maaş Parametreleri" 
      description="SGK oranları, vergi dilimleri, asgari ücret ve diğer maaş parametrelerini yönetin"
    >
      <template #actions>
        <button class="btn btn-outline" @click="seedDefaults" :disabled="seeding">
          {{ seeding ? '⏳ Oluşturuluyor...' : '🔄 Varsayılanları Oluştur' }}
        </button>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Parametre
        </button>
      </template>
    </PageHeader>

    <!-- Yıl Seçimi -->
    <div class="year-selector">
      <div class="year-card">
        <div class="year-icon">📅</div>
        <div class="year-content">
          <label>Yıl Seçimi</label>
          <div class="year-inputs">
            <input 
              type="number" 
              v-model.number="selectedYear" 
              class="year-input" 
              min="2020" 
              max="2099"
              @change="loadParameters"
              placeholder="YYYY"
            />
            <button class="btn btn-sm btn-outline" @click="copyFromPreviousYear" :disabled="copying">
              {{ copying ? '⏳' : '📋' }} Önceki Yıldan Kopyala
            </button>
          </div>
        </div>
      </div>
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
          <select v-model="filterType" @change="loadParameters" class="filter-select">
            <option value="">Tüm Tipler</option>
            <option v-for="pType in parameterTypes" :key="pType.code" :value="pType.code">
              {{ pType.name }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <input 
            v-model="searchTerm" 
            type="text" 
            placeholder="Parametre ara..." 
            class="search-input"
          />
        </div>
      </template>
    </ActionToolbar>

    <!-- Parametre Tablosu -->
    <DataTable
      :columns="columns"
      :data="filteredParameters"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Bu yıl için parametre bulunmuyor"
      @page-change="handlePageChange"
    >
      <template #cell-parameterType="{ value }">
        <span :class="['type-badge', `type-${value.toLowerCase()}`]">
          {{ getTypeLabel(value) }}
        </span>
      </template>
      <template #cell-parameterValue="{ row }">
        <span class="value-display">
          {{ formatValue(row) }}
        </span>
      </template>
      <template #cell-isActive="{ value }">
        <span :class="['status-badge', value ? 'status-active' : 'status-inactive']">
          {{ value ? '✓ Aktif' : '✗ Pasif' }}
        </span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        <button class="action-btn delete" @click.stop="deleteParameter(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Parametre Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Parametre Düzenle' : 'Yeni Parametre' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveParameter" class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Ait Olduğu Yıl *</label>
                  <input 
                    type="number" 
                    v-model.number="form.year" 
                    class="form-control year-picker" 
                    min="2020" 
                    max="2099"
                    required
                    placeholder="YYYY"
                  />
                </div>
                <div class="form-group">
                  <label>Ay (Opsiyonel)</label>
                  <select v-model="form.month" class="form-control">
                    <option :value="null">Tüm Yıl</option>
                    <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Parametre Tipi *</label>
                  <select v-model="form.parameterType" required class="form-control">
                    <option value="">Seçin</option>
                    <option v-for="pType in parameterTypes" :key="pType.code" :value="pType.code">
                      {{ pType.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Parametre Adı *</label>
                  <input v-model="form.parameterKey" type="text" required class="form-control" placeholder="Örn: Brüt Ücret, 1. Dilim Oranı" />
                </div>
                <div class="form-group">
                  <label>Değer Tipi *</label>
                  <select v-model="form.valueType" required class="form-control">
                    <option value="percentage">Yüzde</option>
                    <option value="amount">Tutar</option>
                  </select>
                </div>
              </div>
              <!-- Tutar Alanı -->
              <div class="form-row" v-if="form.valueType === 'amount'">
                <div class="form-group full-width">
                  <label>Tutar *</label>
                  <div class="input-with-suffix">
                    <input 
                      v-model.number="form.parameterValue" 
                      type="number" 
                      step="0.01" 
                      required 
                      class="form-control currency-input" 
                      placeholder="0,00"
                    />
                    <span class="input-suffix">₺</span>
                  </div>
                </div>
              </div>
              <!-- Yüzde Alanı -->
              <div class="form-row" v-if="form.valueType === 'percentage'">
                <div class="form-group full-width">
                  <label>Yüzde *</label>
                  <div class="input-with-suffix">
                    <input 
                      v-model.number="form.percentageValue" 
                      type="number" 
                      step="0.001" 
                      required 
                      class="form-control percentage-input" 
                      placeholder="0,00"
                    />
                    <span class="input-suffix">%</span>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea v-model="form.description" class="form-control" rows="2" placeholder="Parametre açıklaması..."></textarea>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.isActive" />
                  <span>Aktif</span>
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
import { ref, reactive, computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { success, error } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(false)
const saving = ref(false)
const seeding = ref(false)
const copying = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const parameters = ref<any[]>([])
const parameterTypes = ref<any[]>([])
const searchTerm = ref('')
const filterType = ref('')
const selectedYear = ref(new Date().getFullYear())

const form = reactive({
  id: null as number | null,
  year: new Date().getFullYear(),
  parameterType: '',
  parameterKey: '',
  valueType: 'percentage' as 'percentage' | 'amount',
  parameterValue: 0,
  percentageValue: 0,
  month: null as number | null,
  description: '',
  isActive: true
})

const pagination = reactive({
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0
})

const months = [
  { value: 1, label: 'Ocak' }, { value: 2, label: 'Şubat' }, { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' }, { value: 5, label: 'Mayıs' }, { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' }, { value: 8, label: 'Ağustos' }, { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' }, { value: 11, label: 'Kasım' }, { value: 12, label: 'Aralık' }
]

const filteredParameters = computed(() => {
  let result = parameters.value
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(p => p.parameterKey?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term))
  }
  return result
})

const columns: TableColumn[] = [
  { key: 'year', label: 'Yıl', width: '80px' },
  { key: 'parameterType', label: 'Tip', width: '140px' },
  { key: 'parameterKey', label: 'Parametre Adı', sortable: true },
  { key: 'parameterValue', label: 'Değer', width: '150px' },
  { key: 'month', label: 'Ay', width: '100px' },
  { key: 'isActive', label: 'Durum', width: '100px' }
]

const loadParameters = async () => {
  loading.value = true
  try {
    const options: any = { year: selectedYear.value, page: pagination.page, limit: pagination.limit }
    if (filterType.value) options.parameterType = filterType.value
    
    const result = await window.electronAPI.salaryParameter.getAll(options)
    if (result.success) {
      parameters.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
    }
  } catch (err) {
    error('Parametreler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  form.year = selectedYear.value
  showModal.value = true
}

const openEditModal = (param: any) => {
  isEditing.value = true
  Object.assign(form, {
    id: param.id,
    year: param.year,
    parameterType: param.parameterType,
    parameterKey: param.parameterKey,
    valueType: param.valueType || 'percentage',
    parameterValue: param.parameterValue || 0,
    percentageValue: param.percentageValue || 0,
    month: param.month,
    description: param.description || '',
    isActive: param.isActive
  })
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.id = null
  form.year = new Date().getFullYear()
  form.parameterType = ''
  form.parameterKey = ''
  form.valueType = 'percentage'
  form.parameterValue = 0
  form.percentageValue = 0
  form.month = null
  form.description = ''
  form.isActive = true
}

const saveParameter = async () => {
  saving.value = true
  try {
    const { id, ...formData } = form
    const data = { 
      year: formData.year,
      month: formData.month,
      parameterType: formData.parameterType,
      parameterKey: formData.parameterKey,
      valueType: formData.valueType,
      parameterValue: formData.valueType === 'amount' ? formData.parameterValue : 0,
      percentageValue: formData.valueType === 'percentage' ? formData.percentageValue : null,
      description: formData.description,
      isActive: formData.isActive
    }
    const result = isEditing.value
      ? await window.electronAPI.salaryParameter.update(id!, data)
      : await window.electronAPI.salaryParameter.create(data)
    
    if (result.success) {
      success(isEditing.value ? 'Parametre güncellendi' : 'Parametre oluşturuldu')
      closeModal()
      await loadParameters()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kaydetme sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const deleteParameter = async (param: any) => {
  const confirmed = await confirm({
    title: 'Parametre Sil',
    message: `"${param.parameterKey}" parametresini silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    type: 'danger'
  })
  if (confirmed) {
    try {
      const result = await window.electronAPI.salaryParameter.delete(param.id)
      if (result.success) {
        success('Parametre silindi')
        await loadParameters()
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
    title: 'Varsayılan Parametreler',
    message: `${selectedYear.value} yılı için varsayılan maaş parametreleri oluşturulsun mu?`,
    confirmText: 'Oluştur',
    type: 'info'
  })
  if (confirmed) {
    seeding.value = true
    try {
      const result = await window.electronAPI.salaryParameter.seedDefaults(selectedYear.value)
      if (result.success) {
        success(`${result.data?.length || 0} parametre oluşturuldu`)
        await loadParameters()
      } else {
        error(result.errors?.[0] || 'Oluşturma başarısız')
      }
    } catch (err) {
      error('Oluşturma sırasında hata oluştu')
    } finally {
      seeding.value = false
    }
  }
}

const copyFromPreviousYear = async () => {
  const confirmed = await confirm({
    title: 'Önceki Yıldan Kopyala',
    message: `${selectedYear.value - 1} yılındaki parametreler ${selectedYear.value} yılına kopyalansın mı?`,
    confirmText: 'Kopyala',
    type: 'info'
  })
  if (confirmed) {
    copying.value = true
    try {
      const result = await window.electronAPI.salaryParameter.copyFromYear(selectedYear.value - 1, selectedYear.value)
      if (result.success) {
        success(`${result.data?.length || 0} parametre kopyalandı`)
        await loadParameters()
      } else {
        error(result.errors?.[0] || 'Kopyalama başarısız')
      }
    } catch (err) {
      error('Kopyalama sırasında hata oluştu')
    } finally {
      copying.value = false
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadParameters()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

const loadParameterTypes = async () => {
  try {
    const result = await window.electronAPI.parameterType.getActive()
    if (result.success) {
      parameterTypes.value = result.data || []
    }
  } catch (err) {
    console.error('Parametre türleri yüklenemedi')
  }
}

const getTypeLabel = (type: string) => {
  const found = parameterTypes.value.find(p => p.code === type)
  if (found) return found.name
  
  // Fallback için eski etiketler
  const labels: Record<string, string> = {
    MinimumWage: 'Asgari Ücret',
    SGKEmployeeRate: 'SGK İşçi',
    SGKEmployerRate: 'SGK İşveren',
    IncomeTaxBracket: 'Vergi Dilimi',
    StampTax: 'Damga Vergisi',
    UnemploymentEmployee: 'İşsizlik İşçi',
    UnemploymentEmployer: 'İşsizlik İşveren'
  }
  return labels[type] || type
}

const formatValue = (row: any) => {
  if (row.valueType === 'amount') {
    return formatCurrency(row.parameterValue)
  }
  if (row.valueType === 'percentage') {
    return `%${row.percentageValue ?? 0}`
  }
  // Fallback for legacy data
  if (row.parameterType === 'MinimumWage') return formatCurrency(row.parameterValue)
  if (row.parameterType.includes('Rate') || row.parameterType === 'StampTax' || row.parameterType === 'IncomeTaxBracket') {
    return row.parameterKey.includes('limit') ? formatCurrency(row.parameterValue) : `%${row.parameterValue}`
  }
  return row.parameterValue
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0)
}

onMounted(() => {
  loadParameterTypes()
  loadParameters()
})
</script>

<style scoped>
.salary-parameter-page { max-width: 1400px; margin: 0 auto; }

.year-selector { margin-bottom: 1.5rem; }

.year-card {
  display: flex; align-items: center; gap: 1rem;
  padding: 1.25rem 1.5rem; background: white; border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border-left: 4px solid #0466c8;
}

.year-icon { font-size: 2rem; }
.year-content { flex: 1; }
.year-content label { display: block; font-size: 0.85rem; color: #6c757d; margin-bottom: 0.5rem; }
.year-inputs { display: flex; gap: 0.75rem; align-items: center; }

.year-select {
  padding: 0.625rem 1rem; border: 1px solid #dee2e6; border-radius: 6px;
  font-size: 1rem; font-weight: 600; background: white; min-width: 120px;
}

.year-input {
  padding: 0.625rem 1rem; border: 1px solid #dee2e6; border-radius: 6px;
  font-size: 1rem; font-weight: 600; background: white; min-width: 120px; max-width: 120px;
  text-align: center;
}

.year-input::-webkit-outer-spin-button,
.year-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.year-picker {
  text-align: center;
  font-weight: 600;
}

.year-picker::-webkit-outer-spin-button,
.year-picker::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.filter-group { display: flex; align-items: center; gap: 0.5rem; }

.search-input, .filter-select {
  padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px;
  font-size: 0.875rem; background: white;
}

.search-input { min-width: 200px; }
.filter-select { min-width: 160px; }

.type-badge {
  display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}

.type-sgkemployeerate { background: #cce5ff; color: #004085; }
.type-sgkemployerrate { background: #b8daff; color: #004085; }
.type-incometaxbracket { background: #fff3cd; color: #856404; }
.type-minimumwage { background: #d4edda; color: #155724; }
.type-stamptax { background: #f8d7da; color: #721c24; }
.type-unemploymentemployee { background: #e2d5f1; color: #5e4b8b; }
.type-unemploymentemployer { background: #d5e2f1; color: #4b5e8b; }

.value-display { font-weight: 600; font-family: 'Consolas', monospace; }

.status-badge {
  display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}

.status-active { background: #d4edda; color: #155724; }
.status-inactive { background: #f8d7da; color: #721c24; }

.action-btn {
  padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px;
  cursor: pointer; font-size: 1rem; transition: all 0.2s; margin: 0 0.125rem;
}

.action-btn:hover { transform: scale(1.1); }
.action-btn.edit:hover { background: #e7f1ff; }
.action-btn.delete:hover { background: #f8d7da; }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
  justify-content: center; z-index: 10000;
}

.modal-container {
  background: white; border-radius: 12px; width: 90%; max-width: 600px;
  max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef;
}

.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }

.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }

.form-control {
  width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6;
  border-radius: 6px; font-size: 0.95rem;
}

.input-with-suffix {
  display: flex;
  align-items: center;
  position: relative;
}

.input-with-suffix .form-control {
  padding-right: 2.5rem;
}

.input-suffix {
  position: absolute;
  right: 0.875rem;
  color: #6c757d;
  font-weight: 600;
  font-size: 0.9rem;
  pointer-events: none;
}

.currency-input, .percentage-input {
  font-family: 'Consolas', monospace;
  font-weight: 600;
}

.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.checkbox-label input { width: 18px; height: 18px; }

.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding: 1rem 1.5rem; border-top: 1px solid #e9ecef;
}

.btn {
  padding: 0.625rem 1.25rem; border: none; border-radius: 6px;
  font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
}

.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }
.btn-outline { background: transparent; border: 1px solid #dee2e6; color: #495057; }
.btn-outline:hover { background: #f8f9fa; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
