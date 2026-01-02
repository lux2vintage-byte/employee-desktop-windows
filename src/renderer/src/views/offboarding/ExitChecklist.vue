<template>
  <div class="exit-checklist-page">
    <PageHeader 
      title="Çıkış İşlemleri Kontrol Listesi" 
      description="Personel ayrılık süreçlerini takip edin ve yönetin"
    />

    <div class="stats-grid">
      <StatCard icon="📋" :value="stats.total" label="Toplam Çıkış" color="primary" />
      <StatCard icon="⏳" :value="stats.inProgress" label="Devam Eden" color="warning" />
      <StatCard icon="✅" :value="stats.completed" label="Tamamlanan" color="success" />
      <StatCard icon="📊" :value="stats.completionRate + '%'" label="Tamamlanma Oranı" color="info" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <input v-model="searchTerm" type="text" placeholder="Personel ara..." class="search-input" />
        <select v-model="filterStatus" @change="loadResignations" class="filter-select">
          <option value="">Tüm Durumlar</option>
          <option value="Approved">Onaylanmış</option>
          <option value="Completed">Tamamlanmış</option>
        </select>
      </template>
    </ActionToolbar>

    <div class="checklist-grid">
      <div v-for="resignation in filteredResignations" :key="resignation.id" class="checklist-card">
        <div class="card-header">
          <div class="employee-info">
            <div class="avatar">{{ resignation.employee?.firstName?.charAt(0) }}{{ resignation.employee?.lastName?.charAt(0) }}</div>
            <div class="details">
              <h4>{{ resignation.employee?.firstName }} {{ resignation.employee?.lastName }}</h4>
              <span class="code">{{ resignation.employee?.employeeCode }}</span>
            </div>
          </div>
          <span :class="['status-badge', `status-${resignation.status.toLowerCase()}`]">
            {{ getStatusLabel(resignation.status) }}
          </span>
        </div>

        <div class="card-info">
          <div class="info-item">
            <span class="label">Son Çalışma Günü</span>
            <span class="value">{{ resignation.lastWorkingDay ? formatDate(resignation.lastWorkingDay) : 'Belirlenmedi' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Ayrılma Nedeni</span>
            <span :class="['reason-badge', `reason-${getReasonClass(resignation.reasonCategory)}`]">
              {{ resignation.reasonCategory }}
            </span>
          </div>
        </div>

        <div class="checklist-section">
          <h5>Çıkış Kontrol Listesi</h5>
          <div class="checklist-items">
            <div 
              v-for="(item, index) in getChecklistItems(resignation)" 
              :key="index" 
              class="checklist-item"
              :class="{ completed: item.completed }"
              @click="toggleChecklistItem(resignation, index)"
            >
              <span class="checkbox">{{ item.completed ? '✅' : '⬜' }}</span>
              <span class="item-text">{{ item.label }}</span>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: getProgress(resignation) + '%' }"></div>
          </div>
          <span class="progress-text">{{ getProgress(resignation) }}% Tamamlandı</span>
        </div>

        <div class="card-actions">
          <button class="btn btn-sm btn-outline" @click="viewDetails(resignation)">
            👁️ Detay
          </button>
          <button 
            v-if="resignation.status === 'Approved' && getProgress(resignation) === 100" 
            class="btn btn-sm btn-success" 
            @click="completeResignation(resignation)"
          >
            🏁 Tamamla
          </button>
        </div>
      </div>

      <div v-if="filteredResignations.length === 0 && !loading" class="empty-state">
        <span class="empty-icon">📋</span>
        <p>Çıkış işlemi bekleyen personel bulunmuyor</p>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h3>Çıkış İşlemleri Detayı</h3>
              <button class="close-btn" @click="closeDetailModal">✕</button>
            </div>
            <div class="modal-body" v-if="selectedResignation">
              <div class="detail-section">
                <div class="employee-header">
                  <div class="avatar-lg">
                    {{ selectedResignation.employee?.firstName?.charAt(0) }}{{ selectedResignation.employee?.lastName?.charAt(0) }}
                  </div>
                  <div class="employee-details">
                    <h4>{{ selectedResignation.employee?.firstName }} {{ selectedResignation.employee?.lastName }}</h4>
                    <span>{{ selectedResignation.employee?.employeeCode }}</span>
                    <span class="department" v-if="selectedResignation.employee?.department">
                      {{ selectedResignation.employee.department.name }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Talep Tarihi</span>
                  <span class="value">{{ formatDate(selectedResignation.requestDate) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Son Çalışma Günü</span>
                  <span class="value">{{ selectedResignation.lastWorkingDay ? formatDate(selectedResignation.lastWorkingDay) : 'Belirlenmedi' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Ayrılma Nedeni</span>
                  <span class="value">{{ selectedResignation.reasonCategory }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Durum</span>
                  <span :class="['status-badge', `status-${selectedResignation.status.toLowerCase()}`]">
                    {{ getStatusLabel(selectedResignation.status) }}
                  </span>
                </div>
              </div>

              <div class="checklist-detail">
                <h4>📋 Kontrol Listesi</h4>
                <div class="checklist-items-detail">
                  <div 
                    v-for="(item, index) in getChecklistItems(selectedResignation)" 
                    :key="index" 
                    class="checklist-item-detail"
                    :class="{ completed: item.completed }"
                  >
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        :checked="item.completed" 
                        @change="toggleChecklistItem(selectedResignation, index)"
                      />
                      <span class="checkmark"></span>
                      <span class="item-text">{{ item.label }}</span>
                    </label>
                    <span class="item-category">{{ item.category }}</span>
                  </div>
                </div>
              </div>

              <div class="settlement-section" v-if="settlement">
                <h4>💰 Tazminat Özeti</h4>
                <div class="settlement-grid">
                  <div class="settlement-item">
                    <span class="label">Kıdem Tazminatı</span>
                    <span class="value">{{ formatCurrency(settlement.severancePay || 0) }}</span>
                  </div>
                  <div class="settlement-item">
                    <span class="label">İhbar Tazminatı</span>
                    <span class="value">{{ formatCurrency(settlement.noticePay || 0) }}</span>
                  </div>
                  <div class="settlement-item">
                    <span class="label">İzin Ücreti</span>
                    <span class="value">{{ formatCurrency(settlement.unusedLeavePay || 0) }}</span>
                  </div>
                  <div class="settlement-item total">
                    <span class="label">Toplam</span>
                    <span class="value">{{ formatCurrency(settlement.totalAmount || 0) }}</span>
                  </div>
                </div>
              </div>
            </div>
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
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { success, error } = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const resignations = ref<any[]>([])
const selectedResignation = ref<any>(null)
const settlement = ref<any>(null)
const showDetailModal = ref(false)
const searchTerm = ref('')
const filterStatus = ref('')

const stats = reactive({
  total: 0,
  inProgress: 0,
  completed: 0,
  completionRate: 0
})

// Checklist state stored per resignation
const checklistStates = ref<Record<number, boolean[]>>({})

const defaultChecklistItems = [
  { label: 'Zimmetli malzemelerin teslim alınması', category: 'Malzeme', completed: false },
  { label: 'Şirket kartı/anahtarlarının teslim alınması', category: 'Güvenlik', completed: false },
  { label: 'E-posta ve sistem erişimlerinin kapatılması', category: 'IT', completed: false },
  { label: 'Bilgisayar ve ekipmanların teslim alınması', category: 'IT', completed: false },
  { label: 'Çıkış mülakatının yapılması', category: 'İK', completed: false },
  { label: 'İzin bakiyesinin hesaplanması', category: 'İK', completed: false },
  { label: 'Kıdem/ihbar tazminatının hesaplanması', category: 'Finans', completed: false },
  { label: 'Son maaş bordrosunun hazırlanması', category: 'Finans', completed: false },
  { label: 'SGK çıkış bildiriminin yapılması', category: 'Yasal', completed: false },
  { label: 'İşten ayrılış belgesinin hazırlanması', category: 'Yasal', completed: false },
  { label: 'Referans mektubunun hazırlanması', category: 'İK', completed: false },
  { label: 'Personel dosyasının arşivlenmesi', category: 'İK', completed: false }
]

const filteredResignations = computed(() => {
  let result = resignations.value.filter(r => r.status === 'Approved' || r.status === 'Completed')
  
  if (filterStatus.value) {
    result = result.filter(r => r.status === filterStatus.value)
  }
  
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(r => 
      r.employee?.firstName?.toLowerCase().includes(term) ||
      r.employee?.lastName?.toLowerCase().includes(term) ||
      r.employee?.employeeCode?.toLowerCase().includes(term)
    )
  }
  
  return result
})

const loadResignations = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.offboarding.getAllResignations({ limit: 100 })
    if (result.success) {
      resignations.value = result.data || []
      // Initialize checklist states
      resignations.value.forEach(r => {
        if (!checklistStates.value[r.id]) {
          checklistStates.value[r.id] = defaultChecklistItems.map(() => r.status === 'Completed')
        }
      })
      updateStats()
    }
  } catch (err) {
    error('Veriler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const updateStats = () => {
  const approved = resignations.value.filter(r => r.status === 'Approved' || r.status === 'Completed')
  stats.total = approved.length
  stats.inProgress = approved.filter(r => r.status === 'Approved').length
  stats.completed = approved.filter(r => r.status === 'Completed').length
  stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
}

const getChecklistItems = (resignation: any) => {
  const states = checklistStates.value[resignation.id] || defaultChecklistItems.map(() => false)
  return defaultChecklistItems.map((item, index) => ({
    ...item,
    completed: states[index]
  }))
}

const toggleChecklistItem = (resignation: any, index: number) => {
  if (resignation.status === 'Completed') return
  
  if (!checklistStates.value[resignation.id]) {
    checklistStates.value[resignation.id] = defaultChecklistItems.map(() => false)
  }
  checklistStates.value[resignation.id][index] = !checklistStates.value[resignation.id][index]
}

const getProgress = (resignation: any) => {
  const states = checklistStates.value[resignation.id] || []
  if (states.length === 0) return resignation.status === 'Completed' ? 100 : 0
  const completed = states.filter(s => s).length
  return Math.round((completed / defaultChecklistItems.length) * 100)
}

const viewDetails = async (resignation: any) => {
  selectedResignation.value = resignation
  settlement.value = null
  
  try {
    const result = await window.electronAPI.offboarding.calculateFinalSettlement(resignation.id)
    if (result.success) {
      settlement.value = result.data
    }
  } catch (err) {
    // Settlement calculation may fail, that's ok
  }
  
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedResignation.value = null
  settlement.value = null
}

const completeResignation = async (resignation: any) => {
  const confirmed = await confirm({
    title: 'Çıkış İşlemini Tamamla',
    message: `${resignation.employee?.firstName} ${resignation.employee?.lastName} için çıkış işlemini tamamlamak istiyor musunuz? Personel durumu "Terminated" olarak güncellenecektir.`,
    confirmText: 'Tamamla',
    type: 'warning'
  })
  
  if (confirmed) {
    try {
      const result = await window.electronAPI.offboarding.completeResignation(resignation.id)
      if (result.success) {
        success('Çıkış işlemi tamamlandı')
        await loadResignations()
      } else {
        error(result.errors?.[0] || 'İşlem başarısız')
      }
    } catch (err) {
      error('Tamamlama sırasında hata oluştu')
    }
  }
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    Pending: '⏳ Bekliyor',
    Approved: '✅ Onaylandı',
    Completed: '🏁 Tamamlandı'
  }
  return labels[status] || status
}

const getReasonClass = (reason: string) => {
  const map: Record<string, string> = {
    'İstifa': 'resign',
    'Emeklilik': 'retire',
    'Çıkarılma': 'terminate',
    'Sözleşme Bitimi': 'contract'
  }
  return map[reason] || 'other'
}

const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('tr-TR') : '-'
const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)

onMounted(async () => {
  await loadResignations()
})
</script>

<style scoped>
.exit-checklist-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-input, .filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; }
.search-input { min-width: 180px; }
.filter-select { min-width: 130px; }

.checklist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem; }

.checklist-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); transition: all 0.2s; }
.checklist-card:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12); transform: translateY(-2px); }

.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e9ecef; }
.employee-info { display: flex; align-items: center; gap: 0.75rem; }
.avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; }
.details h4 { margin: 0; font-size: 1rem; color: #2c3e50; }
.details .code { font-size: 0.8rem; color: #6c757d; }

.status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.status-pending { background: #fff3cd; color: #856404; }
.status-approved { background: #d4edda; color: #155724; }
.status-completed { background: #cce5ff; color: #004085; }

.card-info { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
.info-item { display: flex; flex-direction: column; gap: 0.25rem; }
.info-item .label { font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
.info-item .value { font-weight: 500; color: #2c3e50; }

.reason-badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
.reason-resign { background: #fff3cd; color: #856404; }
.reason-retire { background: #d4edda; color: #155724; }
.reason-terminate { background: #f8d7da; color: #721c24; }
.reason-contract { background: #cce5ff; color: #004085; }

.checklist-section { margin-bottom: 1rem; }
.checklist-section h5 { margin: 0 0 0.75rem; font-size: 0.85rem; color: #495057; }

.checklist-items { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; max-height: 180px; overflow-y: auto; }
.checklist-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.5rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; color: #495057; }
.checklist-item:hover { background: #f8f9fa; }
.checklist-item.completed { color: #198754; }
.checklist-item.completed .item-text { text-decoration: line-through; opacity: 0.7; }
.checkbox { font-size: 1rem; }

.progress-bar { height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #a9dbb8, #8fcca0); border-radius: 3px; transition: width 0.3s ease; }
.progress-text { font-size: 0.75rem; color: #6c757d; }

.card-actions { display: flex; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #e9ecef; }
.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; }
.btn-outline { background: white; border: 1px solid #dee2e6; color: #495057; }
.btn-outline:hover { background: #f8f9fa; }
.btn-success { background: #198754; color: white; }
.btn-success:hover { background: #157347; }

.empty-state { grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 12px; }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
.empty-state p { color: #6c757d; margin: 0; }

/* Modal Styles */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-container { background: white; border-radius: 12px; width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
.modal-container.modal-lg { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }

.detail-section { margin-bottom: 1.5rem; }
.employee-header { display: flex; align-items: center; gap: 1rem; }
.avatar-lg { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.25rem; }
.employee-details h4 { margin: 0; color: #2c3e50; }
.employee-details span { display: block; font-size: 0.85rem; color: #6c757d; }
.employee-details .department { color: #0466c8; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
.detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
.detail-item .label { font-size: 0.75rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
.detail-item .value { font-weight: 500; color: #2c3e50; }

.checklist-detail { margin-bottom: 1.5rem; }
.checklist-detail h4 { margin: 0 0 1rem; color: #2c3e50; font-size: 1rem; }
.checklist-items-detail { display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto; }
.checklist-item-detail { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: #f8f9fa; border-radius: 6px; }
.checklist-item-detail.completed { background: #d4edda; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; flex: 1; }
.checkbox-label input { cursor: pointer; }
.item-category { font-size: 0.7rem; color: #6c757d; background: white; padding: 0.2rem 0.5rem; border-radius: 4px; }

.settlement-section { background: linear-gradient(135deg, #a9dbb8, #8fcca0); border-radius: 8px; padding: 1rem; }
.settlement-section h4 { margin: 0 0 1rem; color: #2c3e50; font-size: 1rem; }
.settlement-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.settlement-item { display: flex; justify-content: space-between; padding: 0.5rem; background: rgba(255, 255, 255, 0.5); border-radius: 4px; }
.settlement-item.total { grid-column: 1 / -1; background: rgba(255, 255, 255, 0.8); font-weight: 600; }
.settlement-item .label { color: #495057; }
.settlement-item .value { color: #2c3e50; font-weight: 600; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
