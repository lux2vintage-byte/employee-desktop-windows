<template>
  <div class="leave-rights-page">
    <PageHeader 
      title="İzin Hakları Tanımlama" 
      description="İzin türleri ve hak edişleri yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni İzin Türü
        </button>
      </template>
    </PageHeader>

    <div class="stats-grid">
      <StatCard icon="📋" :value="leaveTypes.length" label="İzin Türü" color="primary" />
      <StatCard icon="💰" :value="paidCount" label="Ücretli İzin" color="success" />
      <StatCard icon="📝" :value="unpaidCount" label="Ücretsiz İzin" color="warning" />
      <StatCard icon="📅" :value="totalDays" label="Toplam Gün Limiti" color="info" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <input v-model="searchTerm" type="text" placeholder="İzin türü ara..." class="search-input" />
        <button class="btn btn-outline btn-sm" @click="seedDefaults" :disabled="loading">
          🔄 Varsayılanları Yükle
        </button>
      </template>
    </ActionToolbar>

    <DataTable :columns="columns" :data="filteredLeaveTypes" :loading="loading" :show-actions="true"
      :show-pagination="true" :current-page="pagination.page" :total-pages="pagination.totalPages"
      :total="pagination.total" empty-text="İzin türü bulunmuyor" @page-change="handlePageChange">
      <template #cell-name="{ row }">
        <div class="leave-type-cell">
          <span class="leave-icon">{{ getLeaveIcon(row.name) }}</span>
          <span class="leave-name">{{ row.name }}</span>
        </div>
      </template>
      <template #cell-isPaid="{ value }">
        <span :class="['paid-badge', value ? 'paid' : 'unpaid']">
          {{ value ? '💰 Ücretli' : '📝 Ücretsiz' }}
        </span>
      </template>
      <template #cell-deductsFromAnnual="{ value }">
        <span :class="['deduct-badge', value ? 'yes' : 'no']">
          {{ value ? '✅ Evet' : '❌ Hayır' }}
        </span>
      </template>
      <template #cell-limitDays="{ value }">
        <span v-if="value" class="limit-badge">{{ value }} gün</span>
        <span v-else class="limit-badge unlimited">Sınırsız</span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn edit" @click.stop="openEditModal(row)" title="Düzenle">✏️</button>
        <button class="action-btn delete" @click.stop="deleteLeaveType(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Yıllık İzin Hak Ediş Tablosu -->
    <div class="entitlement-section">
      <h3>📅 Yıllık İzin Hak Ediş Tablosu</h3>
      <p class="section-desc">Kıdem yılına göre yıllık izin gün sayıları (4857 sayılı İş Kanunu)</p>
      <div class="entitlement-table">
        <div class="entitlement-row header">
          <span class="col-seniority">Kıdem Süresi</span>
          <span class="col-days">İzin Günü</span>
          <span class="col-note">Açıklama</span>
        </div>
        <div v-for="item in entitlementTable" :key="item.years" class="entitlement-row">
          <span class="col-seniority">{{ item.label }}</span>
          <span class="col-days">{{ item.days }} gün</span>
          <span class="col-note">{{ item.note }}</span>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ isEditing ? 'İzin Türü Düzenle' : 'Yeni İzin Türü' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveLeaveType" class="modal-body">
              <div class="form-group">
                <label>İzin Türü Adı *</label>
                <input v-model="form.name" type="text" required class="form-control" placeholder="Örn: Yıllık İzin" />
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Ücretli mi?</label>
                  <div class="toggle-group">
                    <label class="toggle-option" :class="{ active: form.isPaid }">
                      <input type="radio" v-model="form.isPaid" :value="true" />
                      <span>💰 Ücretli</span>
                    </label>
                    <label class="toggle-option" :class="{ active: !form.isPaid }">
                      <input type="radio" v-model="form.isPaid" :value="false" />
                      <span>📝 Ücretsiz</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>Yıllık İzinden Düşülsün mü?</label>
                  <div class="toggle-group">
                    <label class="toggle-option" :class="{ active: form.deductsFromAnnual }">
                      <input type="radio" v-model="form.deductsFromAnnual" :value="true" />
                      <span>✅ Evet</span>
                    </label>
                    <label class="toggle-option" :class="{ active: !form.deductsFromAnnual }">
                      <input type="radio" v-model="form.deductsFromAnnual" :value="false" />
                      <span>❌ Hayır</span>
                    </label>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Yıllık Gün Limiti</label>
                <input v-model.number="form.limitDays" type="number" min="0" class="form-control" placeholder="Boş bırakılırsa sınırsız" />
                <span class="form-hint">Boş bırakılırsa sınırsız olarak kabul edilir</span>
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
import StatCard from '@/components/StatCard.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { success, error } = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const searchTerm = ref('')
const leaveTypes = ref<any[]>([])
const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })

const form = reactive({
  id: null as number | null,
  name: '',
  isPaid: true,
  deductsFromAnnual: false,
  limitDays: null as number | null
})

const columns: TableColumn[] = [
  { key: 'name', label: 'İzin Türü', sortable: true },
  { key: 'isPaid', label: 'Ücret Durumu', width: '130px' },
  { key: 'deductsFromAnnual', label: 'Yıllıktan Düşer', width: '130px' },
  { key: 'limitDays', label: 'Gün Limiti', width: '120px' }
]

const entitlementTable = [
  { years: 1, label: '1-5 yıl arası', days: 14, note: 'Temel hak ediş' },
  { years: 5, label: '5-15 yıl arası', days: 20, note: '5 yılı dolduranlara' },
  { years: 15, label: '15 yıl ve üzeri', days: 26, note: '15 yılı dolduranlara' },
  { years: 18, label: '18 yaş altı', days: 20, note: '18 yaşından küçük çalışanlar' }
]

const filteredLeaveTypes = computed(() => {
  if (!searchTerm.value) return leaveTypes.value
  const term = searchTerm.value.toLowerCase()
  return leaveTypes.value.filter(lt => lt.name.toLowerCase().includes(term))
})

const paidCount = computed(() => leaveTypes.value.filter(lt => lt.isPaid).length)
const unpaidCount = computed(() => leaveTypes.value.filter(lt => !lt.isPaid).length)
const totalDays = computed(() => leaveTypes.value.reduce((sum, lt) => sum + (lt.limitDays || 0), 0))

const loadLeaveTypes = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.leaveType.getAll({ page: pagination.page, limit: pagination.limit })
    if (result.success) {
      leaveTypes.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
    }
  } catch (err) {
    error('İzin türleri yüklenemedi')
  } finally {
    loading.value = false
  }
}

const getLeaveIcon = (name: string) => {
  const icons: Record<string, string> = {
    'Yıllık İzin': '🏖️', 'Hastalık İzni': '🏥', 'Mazeret İzni': '📋',
    'Evlilik İzni': '💒', 'Doğum İzni': '👶', 'Babalık İzni': '👨‍👧',
    'Ölüm İzni': '🕯️', 'Ücretsiz İzin': '📝', 'Askerlik İzni': '🎖️'
  }
  return icons[name] || '📅'
}

const openCreateModal = () => {
  isEditing.value = false
  form.id = null
  form.name = ''
  form.isPaid = true
  form.deductsFromAnnual = false
  form.limitDays = null
  showModal.value = true
}

const openEditModal = (leaveType: any) => {
  isEditing.value = true
  form.id = leaveType.id
  form.name = leaveType.name
  form.isPaid = leaveType.isPaid
  form.deductsFromAnnual = leaveType.deductsFromAnnual
  form.limitDays = leaveType.limitDays
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveLeaveType = async () => {
  if (!form.name.trim()) {
    error('İzin türü adı zorunludur')
    return
  }
  
  saving.value = true
  try {
    const data = {
      name: form.name,
      isPaid: form.isPaid,
      deductsFromAnnual: form.deductsFromAnnual,
      limitDays: form.limitDays || null
    }
    
    const result = isEditing.value 
      ? await window.electronAPI.leaveType.update(form.id!, data)
      : await window.electronAPI.leaveType.create(data)
    
    if (result) {
      success(isEditing.value ? 'İzin türü güncellendi' : 'İzin türü oluşturuldu')
      closeModal()
      await loadLeaveTypes()
    } else {
      error('İşlem başarısız')
    }
  } catch (err) {
    error('Kaydetme sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const deleteLeaveType = async (leaveType: any) => {
  const confirmed = await confirm({
    title: 'İzin Türü Sil',
    message: `"${leaveType.name}" izin türünü silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    type: 'danger'
  })
  
  if (confirmed) {
    try {
      await window.electronAPI.leaveType.delete(leaveType.id)
      success('İzin türü silindi')
      await loadLeaveTypes()
    } catch (err) {
      error('Silme sırasında hata oluştu')
    }
  }
}

const seedDefaults = async () => {
  const confirmed = await confirm({
    title: 'Varsayılan İzin Türleri',
    message: 'Varsayılan izin türlerini yüklemek istiyor musunuz? Mevcut türler korunacaktır.',
    confirmText: 'Yükle',
    type: 'info'
  })
  
  if (confirmed) {
    loading.value = true
    try {
      const result = await window.electronAPI.leaveType.seedDefaults()
      if (result) {
        success('Varsayılan izin türleri yüklendi')
        await loadLeaveTypes()
      }
    } catch (err) {
      error('Yükleme sırasında hata oluştu')
    } finally {
      loading.value = false
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

onMounted(() => loadLeaveTypes())
</script>

<style scoped>
.leave-rights-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-input { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; min-width: 180px; }

.leave-type-cell { display: flex; align-items: center; gap: 0.5rem; }
.leave-icon { font-size: 1.25rem; }
.leave-name { font-weight: 600; color: #2c3e50; }

.paid-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.paid-badge.paid { background: #d4edda; color: #155724; }
.paid-badge.unpaid { background: #fff3cd; color: #856404; }

.deduct-badge { font-size: 0.85rem; }
.deduct-badge.yes { color: #198754; }
.deduct-badge.no { color: #6c757d; }

.limit-badge { display: inline-block; padding: 0.25rem 0.5rem; background: #e9ecef; border-radius: 4px; font-size: 0.85rem; font-weight: 600; color: #495057; }
.limit-badge.unlimited { background: #cce5ff; color: #004085; }

.action-btn { padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: all 0.2s; margin: 0 0.125rem; }
.action-btn:hover { transform: scale(1.1); }
.action-btn.edit:hover { background: #fff3cd; }
.action-btn.delete:hover { background: #f8d7da; }

.entitlement-section { margin-top: 2rem; background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.entitlement-section h3 { margin: 0 0 0.5rem; font-size: 1.1rem; color: #2c3e50; }
.section-desc { margin: 0 0 1rem; font-size: 0.85rem; color: #6c757d; }

.entitlement-table { border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; }
.entitlement-row { display: grid; grid-template-columns: 1fr 1fr 2fr; padding: 0.75rem 1rem; border-bottom: 1px solid #e9ecef; }
.entitlement-row:last-child { border-bottom: none; }
.entitlement-row.header { background: #f8f9fa; font-weight: 600; color: #495057; }
.col-seniority { color: #2c3e50; }
.col-days { font-weight: 700; color: #0466c8; }
.col-note { color: #6c757d; font-size: 0.9rem; }

/* Modal Styles */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-container { background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.95rem; }
.form-hint { font-size: 0.75rem; color: #6c757d; margin-top: 0.25rem; display: block; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #e9ecef; margin-top: 1rem; }

.toggle-group { display: flex; gap: 0.5rem; }
.toggle-option { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.toggle-option input { display: none; }
.toggle-option.active { background: #d4edda; border-color: #198754; }

.btn { padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-primary:disabled { background: #adb5bd; cursor: not-allowed; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }
.btn-outline { background: white; border: 1px solid #dee2e6; color: #495057; }
.btn-outline:hover { background: #f8f9fa; }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
