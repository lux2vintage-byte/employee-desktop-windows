<template>
  <div class="hiring-request-page">
    <PageHeader 
      title="İşe Alım Talepleri" 
      description="Departmanlardan gelen işe alım taleplerini yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Talep
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Talep" color="primary" />
      <StatCard icon="⏳" :value="stats.pending" label="Bekleyen" color="warning" />
      <StatCard icon="✅" :value="stats.approved" label="Onaylanan" color="success" />
      <StatCard icon="🔄" :value="stats.inProgress" label="Devam Eden" color="info" />
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
          <input v-model="searchTerm" type="text" placeholder="Talep ara..." @input="handleSearch" />
          <span class="search-icon">🔍</span>
        </div>
        <select v-model="filterStatus" class="filter-select" @change="loadData">
          <option value="">Tüm Durumlar</option>
          <option value="Pending">Bekleyen</option>
          <option value="Approved">Onaylanan</option>
          <option value="Rejected">Reddedilen</option>
          <option value="InProgress">Devam Eden</option>
          <option value="Completed">Tamamlanan</option>
          <option value="Cancelled">İptal</option>
        </select>
      </template>
    </ActionToolbar>

    <!-- Veri Tablosu -->
    <DataTable
      :columns="columns"
      :data="filteredData"
      :loading="loading"
      :show-actions="true"
      :show-edit="true"
      :show-delete="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Henüz işe alım talebi bulunmuyor"
      @edit="openEditModal"
      @delete="confirmDelete"
      @page-change="handlePageChange"
    >
      <template #cell-requestCode="{ value }">
        <span class="code-badge">{{ value }}</span>
      </template>
      <template #cell-department.name="{ value }">
        <span class="dept-badge">{{ value }}</span>
      </template>
      <template #cell-position.title="{ value }">
        <span>{{ value }}</span>
      </template>
      <template #cell-priority="{ value }">
        <span :class="['priority-badge', `priority-${value?.toLowerCase()}`]">{{ getPriorityLabel(value) }}</span>
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${value?.toLowerCase()}`]">{{ getStatusLabel(value) }}</span>
      </template>
      <template #cell-quantity="{ value }">
        <span class="quantity-badge">{{ value }} kişi</span>
      </template>
      <template #cell-requestDate="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #extra-actions="{ row }">
        <button v-if="row.status === 'Pending'" class="btn-icon btn-approve" @click="handleApprove(row)" title="Onayla">✓</button>
        <button v-if="row.status === 'Pending'" class="btn-icon btn-reject" @click="handleReject(row)" title="Reddet">✗</button>
        <button v-if="row.status === 'Approved'" class="btn-icon btn-start" @click="handleStart(row)" title="Başlat">▶</button>
        <button v-if="row.status === 'InProgress'" class="btn-icon btn-complete" @click="handleComplete(row)" title="Tamamla">✔</button>
      </template>
    </DataTable>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal modal-lg">
            <div class="modal-header">
              <h2>{{ modalMode === 'create' ? 'Yeni İşe Alım Talebi' : 'Talep Düzenle' }}</h2>
              <button class="btn-close" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="handleSubmit" class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label required">Departman</label>
                  <select v-model="form.departmentId" class="form-control" @change="loadPositions">
                    <option :value="null">Seçin</option>
                    <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label required">Pozisyon</label>
                  <select v-model="form.positionId" class="form-control">
                    <option :value="null">Seçin</option>
                    <option v-for="pos in positions" :key="pos.id" :value="pos.id">{{ pos.title }}</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label required">Kişi Sayısı</label>
                  <input v-model.number="form.quantity" type="number" min="1" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label required">Öncelik</label>
                  <select v-model="form.priority" class="form-control">
                    <option value="Düşük">Düşük</option>
                    <option value="Normal">Normal</option>
                    <option value="Yüksek">Yüksek</option>
                    <option value="Acil">Acil</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label required">Çalışma Türü</label>
                  <select v-model="form.employmentType" class="form-control">
                    <option value="Tam Zamanlı">Tam Zamanlı</option>
                    <option value="Yarı Zamanlı">Yarı Zamanlı</option>
                    <option value="Stajyer">Stajyer</option>
                    <option value="Sözleşmeli">Sözleşmeli</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Hedef Tarih</label>
                  <input v-model="form.targetDate" type="date" class="form-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Min. Maaş</label>
                  <input v-model.number="form.salaryRangeMin" type="number" class="form-control" placeholder="₺" />
                </div>
                <div class="form-group">
                  <label class="form-label">Max. Maaş</label>
                  <input v-model.number="form.salaryRangeMax" type="number" class="form-control" placeholder="₺" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">İş Gereksinimleri</label>
                <textarea v-model="form.requirements" class="form-control" rows="3" placeholder="Aranan nitelikler..."></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Açıklama</label>
                <textarea v-model="form.description" class="form-control" rows="2" placeholder="Ek bilgiler..."></textarea>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
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

const loading = ref(false)
const saving = ref(false)
const data = ref<any[]>([])
const departments = ref<any[]>([])
const positions = ref<any[]>([])
const searchTerm = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)

const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })
const stats = reactive({ total: 0, pending: 0, approved: 0, inProgress: 0, completed: 0 })

const form = reactive({
  departmentId: null as number | null,
  positionId: null as number | null,
  quantity: 1,
  priority: 'Normal',
  employmentType: 'Tam Zamanlı',
  salaryRangeMin: null as number | null,
  salaryRangeMax: null as number | null,
  requirements: '',
  description: '',
  targetDate: ''
})

const columns: TableColumn[] = [
  { key: 'requestCode', label: 'Talep No', width: '120px' },
  { key: 'department.name', label: 'Departman' },
  { key: 'position.title', label: 'Pozisyon' },
  { key: 'quantity', label: 'Kişi', width: '80px' },
  { key: 'priority', label: 'Öncelik', width: '100px' },
  { key: 'status', label: 'Durum', width: '120px' },
  { key: 'requestDate', label: 'Talep Tarihi', width: '120px' }
]

const filteredData = computed(() => {
  if (!searchTerm.value) return data.value
  const term = searchTerm.value.toLowerCase()
  return data.value.filter(d => 
    d.requestCode?.toLowerCase().includes(term) ||
    d.department?.name?.toLowerCase().includes(term) ||
    d.position?.title?.toLowerCase().includes(term)
  )
})

const loadData = async () => {
  loading.value = true
  try {
    const options: any = { page: pagination.page, limit: pagination.limit }
    const result = await window.electronAPI.hiringRequest.getAll(options)
    if (result.success) {
      data.value = filterStatus.value ? result.data.filter((d: any) => d.status === filterStatus.value) : result.data
      pagination.total = result.total
      pagination.totalPages = result.totalPages
    }
  } catch (error) {
    showToast('Veriler yüklenemedi', 'error')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const result = await window.electronAPI.hiringRequest.getStats()
    if (result.success) Object.assign(stats, result.data)
  } catch (error) { /* ignore */ }
}

const loadDepartments = async () => {
  try {
    const result = await window.electronAPI.department.getAll({ limit: 500 })
    if (result.success) departments.value = result.data
  } catch (error) { /* ignore */ }
}

const loadPositions = async () => {
  positions.value = []
  if (!form.departmentId) return
  try {
    const result = await window.electronAPI.position.getByDepartment(form.departmentId)
    if (result.success) positions.value = result.data || []
  } catch (error) { /* ignore */ }
}

const getPriorityLabel = (p: string) => ({ 'Düşük': 'Düşük', 'Normal': 'Normal', 'Yüksek': 'Yüksek', 'Acil': 'Acil' }[p] || p)
const getStatusLabel = (s: string) => ({ 'Pending': 'Bekliyor', 'Approved': 'Onaylandı', 'Rejected': 'Reddedildi', 'InProgress': 'Devam Ediyor', 'Completed': 'Tamamlandı', 'Cancelled': 'İptal' }[s] || s)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('tr-TR') : '-'

const handleSearch = () => {}
const handlePageChange = (page: number) => { pagination.page = page; loadData() }
const handlePrint = () => window.print()
const handlePdf = () => showToast('PDF özelliği yakında', 'info')
const handleExcelExport = () => showToast('Excel özelliği yakında', 'info')

const openCreateModal = () => {
  modalMode.value = 'create'
  editingId.value = null
  resetForm()
  showModal.value = true
}

const openEditModal = (row: any) => {
  modalMode.value = 'edit'
  editingId.value = row.id
  form.departmentId = row.departmentId
  form.positionId = row.positionId
  form.quantity = row.quantity
  form.priority = row.priority
  form.employmentType = row.employmentType
  form.salaryRangeMin = row.salaryRangeMin
  form.salaryRangeMax = row.salaryRangeMax
  form.requirements = row.requirements || ''
  form.description = row.description || ''
  form.targetDate = row.targetDate ? row.targetDate.split('T')[0] : ''
  loadPositions()
  showModal.value = true
}

const closeModal = () => { showModal.value = false; resetForm() }

const resetForm = () => {
  form.departmentId = null
  form.positionId = null
  form.quantity = 1
  form.priority = 'Normal'
  form.employmentType = 'Tam Zamanlı'
  form.salaryRangeMin = null
  form.salaryRangeMax = null
  form.requirements = ''
  form.description = ''
  form.targetDate = ''
  positions.value = []
}

const handleSubmit = async () => {
  if (!form.departmentId || !form.positionId) {
    showToast('Departman ve pozisyon seçimi zorunludur', 'error')
    return
  }
  saving.value = true
  try {
    const payload = {
      ...form,
      requestedBy: 1,
      targetDate: form.targetDate ? new Date(form.targetDate) : null
    }
    const result = modalMode.value === 'create'
      ? await window.electronAPI.hiringRequest.create(payload)
      : await window.electronAPI.hiringRequest.update(editingId.value!, payload)
    if (result.success) {
      showToast(modalMode.value === 'create' ? 'Talep oluşturuldu' : 'Talep güncellendi', 'success')
      closeModal()
      await loadData()
      await loadStats()
    } else {
      showToast(result.errors?.[0] || 'İşlem başarısız', 'error')
    }
  } catch (error) {
    showToast('Bir hata oluştu', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (row: any) => {
  const confirmed = await confirm({ title: 'Talep Sil', message: `"${row.requestCode}" talebini silmek istediğinize emin misiniz?`, confirmText: 'Sil', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.hiringRequest.delete(row.id)
      if (result.success) { showToast('Talep silindi', 'success'); await loadData(); await loadStats() }
      else showToast(result.errors?.[0] || 'Silinemedi', 'error')
    } catch (error) { showToast('Hata oluştu', 'error') }
  }
}

const handleApprove = async (row: any) => {
  const confirmed = await confirm({ title: 'Talebi Onayla', message: `"${row.requestCode}" talebini onaylamak istiyor musunuz?`, confirmText: 'Onayla', type: 'success' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.hiringRequest.approve(row.id, 1)
      if (result.success) { showToast('Talep onaylandı', 'success'); await loadData(); await loadStats() }
      else showToast(result.errors?.[0] || 'Onaylanamadı', 'error')
    } catch (error) { showToast('Hata oluştu', 'error') }
  }
}

const handleReject = async (row: any) => {
  const confirmed = await confirm({ title: 'Talebi Reddet', message: `"${row.requestCode}" talebini reddetmek istiyor musunuz?`, confirmText: 'Reddet', type: 'danger' })
  if (confirmed) {
    try {
      const result = await window.electronAPI.hiringRequest.reject(row.id, 1)
      if (result.success) { showToast('Talep reddedildi', 'success'); await loadData(); await loadStats() }
      else showToast(result.errors?.[0] || 'Reddedilemedi', 'error')
    } catch (error) { showToast('Hata oluştu', 'error') }
  }
}

const handleStart = async (row: any) => {
  try {
    const result = await window.electronAPI.hiringRequest.start(row.id)
    if (result.success) { showToast('Süreç başlatıldı', 'success'); await loadData(); await loadStats() }
    else showToast(result.errors?.[0] || 'Başlatılamadı', 'error')
  } catch (error) { showToast('Hata oluştu', 'error') }
}

const handleComplete = async (row: any) => {
  try {
    const result = await window.electronAPI.hiringRequest.complete(row.id)
    if (result.success) { showToast('Talep tamamlandı', 'success'); await loadData(); await loadStats() }
    else showToast(result.errors?.[0] || 'Tamamlanamadı', 'error')
  } catch (error) { showToast('Hata oluştu', 'error') }
}

onMounted(async () => {
  await Promise.all([loadData(), loadStats(), loadDepartments()])
})
</script>

<style scoped>
.hiring-request-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-box { position: relative; display: flex; align-items: center; }
.search-box input { padding: 0.5rem 0.75rem 0.5rem 2.25rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; width: 250px; }
.search-box input:focus { outline: none; border-color: #0466c8; box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1); }
.search-icon { position: absolute; left: 0.75rem; color: #6c757d; }
.filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; }
.code-badge { font-family: 'Consolas', monospace; background: #e7f1ff; color: #0466c8; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
.dept-badge { background: #f8f9fa; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }
.quantity-badge { background: #e9ecef; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
.priority-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.priority-düşük { background: #d4edda; color: #155724; }
.priority-normal { background: #e7f1ff; color: #0466c8; }
.priority-yüksek { background: #fff3cd; color: #856404; }
.priority-acil { background: #f8d7da; color: #721c24; }
.status-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.status-pending { background: #fff3cd; color: #856404; }
.status-approved { background: #d4edda; color: #155724; }
.status-rejected { background: #f8d7da; color: #721c24; }
.status-inprogress { background: #cce5ff; color: #004085; }
.status-completed { background: #d1e7dd; color: #0f5132; }
.status-cancelled { background: #e9ecef; color: #495057; }
.btn-icon { width: 28px; height: 28px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-left: 4px; }
.btn-approve { background: #d4edda; color: #155724; }
.btn-approve:hover { background: #c3e6cb; }
.btn-reject { background: #f8d7da; color: #721c24; }
.btn-reject:hover { background: #f5c6cb; }
.btn-start { background: #cce5ff; color: #004085; }
.btn-start:hover { background: #b8daff; }
.btn-complete { background: #d1e7dd; color: #0f5132; }
.btn-complete:hover { background: #badbcc; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal-lg { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h2 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.btn-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #6c757d; }
.modal-body { padding: 1.5rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #495057; }
.form-label.required::after { content: ' *'; color: #dc3545; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.9rem; }
.form-control:focus { outline: none; border-color: #0466c8; box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1); }
textarea.form-control { resize: vertical; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e9ecef; }
.btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #198754; color: white; }
.btn-primary:hover:not(:disabled) { background: #157347; }
.btn-secondary { background: #6c757d; color: white; }
.btn-secondary:hover:not(:disabled) { background: #5a6268; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
