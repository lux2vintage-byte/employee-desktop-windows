<template>
  <div class="payment-history-page">
    <PageHeader 
      title="Ödeme Geçmişi" 
      description="Banka ve nakit ödemelerin takibi"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Ödeme Kaydı
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <StatCard icon="💳" :value="stats.totalPayments" label="Toplam Ödeme" color="primary" />
      <StatCard icon="🏦" :value="formatCurrency(stats.totalBankAmount)" label="Banka Ödemeleri" color="success" />
      <StatCard icon="💵" :value="formatCurrency(stats.totalCashAmount)" label="Nakit Ödemeler" color="info" />
      <StatCard icon="📅" :value="stats.thisMonthCount" label="Bu Ay" color="warning" />
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
          <select v-model="filterEmployee" @change="loadPayments" class="filter-select">
            <option value="">Tüm Personeller</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.firstName }} {{ emp.lastName }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filterType" @change="loadPayments" class="filter-select">
            <option value="">Tüm Tipler</option>
            <option value="Salary">Maaş</option>
            <option value="Advance">Avans</option>
            <option value="Bonus">Prim/İkramiye</option>
            <option value="Other">Diğer</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filterMethod" @change="loadPayments" class="filter-select">
            <option value="">Tüm Yöntemler</option>
            <option value="Bank">Banka</option>
            <option value="Cash">Nakit</option>
            <option value="Check">Çek</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filterYear" @change="loadPayments" class="filter-select">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </template>
    </ActionToolbar>

    <!-- Ödeme Tablosu -->
    <DataTable
      :columns="columns"
      :data="payments"
      :loading="loading"
      :show-actions="true"
      :show-pagination="true"
      :current-page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      empty-text="Ödeme kaydı bulunmuyor"
      @page-change="handlePageChange"
    >
      <template #cell-employee="{ row }">
        <div class="employee-cell">
          <div class="employee-avatar">
            {{ row.employee?.firstName?.charAt(0) }}{{ row.employee?.lastName?.charAt(0) }}
          </div>
          <div class="employee-info">
            <span class="employee-name">{{ row.employee?.firstName }} {{ row.employee?.lastName }}</span>
            <span class="employee-code">{{ row.employee?.employeeCode }}</span>
          </div>
        </div>
      </template>
      <template #cell-paymentType="{ value }">
        <span :class="['type-badge', `type-${value.toLowerCase()}`]">
          {{ getTypeLabel(value) }}
        </span>
      </template>
      <template #cell-paymentMethod="{ value }">
        <span :class="['method-badge', `method-${value.toLowerCase()}`]">
          {{ getMethodLabel(value) }}
        </span>
      </template>
      <template #cell-amount="{ value }">
        <span class="amount-value">{{ formatCurrency(value) }}</span>
      </template>
      <template #cell-paymentDate="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #cell-status="{ value }">
        <span :class="['status-badge', `status-${value.toLowerCase()}`]">
          {{ value === 'Completed' ? '✓ Tamamlandı' : value === 'Cancelled' ? '✗ İptal' : value }}
        </span>
      </template>
      <template #actions="{ row }">
        <button class="action-btn view" @click.stop="viewPayment(row)" title="Detay">👁️</button>
        <button v-if="row.status !== 'Cancelled'" class="action-btn cancel" @click.stop="cancelPayment(row)" title="İptal Et">❌</button>
        <button class="action-btn delete" @click.stop="deletePayment(row)" title="Sil">🗑️</button>
      </template>
    </DataTable>

    <!-- Ödeme Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Ödeme Düzenle' : 'Yeni Ödeme Kaydı' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="savePayment" class="modal-body">
              <div class="form-group">
                <label>Personel *</label>
                <select v-model="form.employeeId" required class="form-control">
                  <option value="">Personel Seçin</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
                  </option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Ödeme Tipi *</label>
                  <select v-model="form.paymentType" required class="form-control">
                    <option value="">Seçin</option>
                    <option value="Salary">Maaş</option>
                    <option value="Advance">Avans</option>
                    <option value="Bonus">Prim/İkramiye</option>
                    <option value="Other">Diğer</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Ödeme Yöntemi *</label>
                  <select v-model="form.paymentMethod" required class="form-control">
                    <option value="">Seçin</option>
                    <option value="Bank">Banka</option>
                    <option value="Cash">Nakit</option>
                    <option value="Check">Çek</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Tutar (₺) *</label>
                  <input v-model.number="form.amount" type="number" step="0.01" required class="form-control" />
                </div>
                <div class="form-group">
                  <label>Ödeme Tarihi *</label>
                  <input v-model="form.paymentDate" type="date" required class="form-control" />
                </div>
              </div>
              <div v-if="form.paymentMethod === 'Bank'" class="bank-details">
                <div class="form-row">
                  <div class="form-group">
                    <label>Banka Adı</label>
                    <input v-model="form.bankName" type="text" class="form-control" placeholder="Örn: Ziraat Bankası" />
                  </div>
                  <div class="form-group">
                    <label>Referans No</label>
                    <input v-model="form.referenceNo" type="text" class="form-control" placeholder="İşlem referans numarası" />
                  </div>
                </div>
                <div class="form-group">
                  <label>IBAN</label>
                  <input v-model="form.iban" type="text" class="form-control" placeholder="TR00 0000 0000 0000 0000 0000 00" />
                </div>
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea v-model="form.description" class="form-control" rows="2" placeholder="Ödeme açıklaması..."></textarea>
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

    <!-- Detay Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Ödeme Detayı</h3>
              <button class="close-btn" @click="closeDetailModal">✕</button>
            </div>
            <div class="modal-body" v-if="selectedPayment">
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Personel</label>
                  <span>{{ selectedPayment.employee?.firstName }} {{ selectedPayment.employee?.lastName }}</span>
                </div>
                <div class="detail-item">
                  <label>Ödeme Tipi</label>
                  <span>{{ getTypeLabel(selectedPayment.paymentType) }}</span>
                </div>
                <div class="detail-item">
                  <label>Ödeme Yöntemi</label>
                  <span>{{ getMethodLabel(selectedPayment.paymentMethod) }}</span>
                </div>
                <div class="detail-item">
                  <label>Tutar</label>
                  <span class="amount-value">{{ formatCurrency(selectedPayment.amount) }}</span>
                </div>
                <div class="detail-item">
                  <label>Ödeme Tarihi</label>
                  <span>{{ formatDate(selectedPayment.paymentDate) }}</span>
                </div>
                <div class="detail-item">
                  <label>Durum</label>
                  <span>{{ selectedPayment.status }}</span>
                </div>
                <div v-if="selectedPayment.bankName" class="detail-item">
                  <label>Banka</label>
                  <span>{{ selectedPayment.bankName }}</span>
                </div>
                <div v-if="selectedPayment.iban" class="detail-item full-width">
                  <label>IBAN</label>
                  <span>{{ selectedPayment.iban }}</span>
                </div>
                <div v-if="selectedPayment.referenceNo" class="detail-item">
                  <label>Referans No</label>
                  <span>{{ selectedPayment.referenceNo }}</span>
                </div>
                <div v-if="selectedPayment.description" class="detail-item full-width">
                  <label>Açıklama</label>
                  <span>{{ selectedPayment.description }}</span>
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
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { success, error } = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const showDetailModal = ref(false)
const isEditing = ref(false)
const payments = ref<any[]>([])
const employees = ref<any[]>([])
const selectedPayment = ref<any>(null)
const filterEmployee = ref('')
const filterType = ref('')
const filterMethod = ref('')
const filterYear = ref(new Date().getFullYear())

const form = reactive({
  id: null as number | null,
  employeeId: '',
  paymentType: '',
  paymentMethod: '',
  amount: 0,
  paymentDate: new Date().toISOString().split('T')[0],
  bankName: '',
  iban: '',
  referenceNo: '',
  description: ''
})

const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 })

const stats = reactive({
  totalPayments: 0,
  totalBankAmount: 0,
  totalCashAmount: 0,
  thisMonthCount: 0
})

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

const columns: TableColumn[] = [
  { key: 'employee', label: 'Personel', sortable: true },
  { key: 'paymentType', label: 'Tip', width: '120px' },
  { key: 'paymentMethod', label: 'Yöntem', width: '100px' },
  { key: 'amount', label: 'Tutar', width: '130px' },
  { key: 'paymentDate', label: 'Tarih', width: '110px' },
  { key: 'status', label: 'Durum', width: '120px' }
]

const loadPayments = async () => {
  loading.value = true
  try {
    const options: any = { page: pagination.page, limit: pagination.limit, year: filterYear.value }
    if (filterEmployee.value) options.employeeId = Number(filterEmployee.value)
    if (filterType.value) options.paymentType = filterType.value
    if (filterMethod.value) options.paymentMethod = filterMethod.value
    
    const result = await window.electronAPI.paymentHistory.getAll(options)
    if (result.success) {
      payments.value = result.data || []
      pagination.total = result.total || 0
      pagination.totalPages = result.totalPages || 1
      updateStats()
    }
  } catch (err) {
    error('Ödemeler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const loadEmployees = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 500, status: 'Active' })
    if (result.success) employees.value = result.data || []
  } catch (err) { /* ignore */ }
}

const updateStats = () => {
  stats.totalPayments = payments.value.length
  stats.totalBankAmount = payments.value.filter(p => p.paymentMethod === 'Bank' && p.status !== 'Cancelled').reduce((sum, p) => sum + p.amount, 0)
  stats.totalCashAmount = payments.value.filter(p => p.paymentMethod === 'Cash' && p.status !== 'Cancelled').reduce((sum, p) => sum + p.amount, 0)
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  stats.thisMonthCount = payments.value.filter(p => {
    const d = new Date(p.paymentDate)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }).length
}

const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.id = null
  form.employeeId = ''
  form.paymentType = ''
  form.paymentMethod = ''
  form.amount = 0
  form.paymentDate = new Date().toISOString().split('T')[0]
  form.bankName = ''
  form.iban = ''
  form.referenceNo = ''
  form.description = ''
}

const savePayment = async () => {
  saving.value = true
  try {
    const data = { ...form, employeeId: Number(form.employeeId) }
    const result = await window.electronAPI.paymentHistory.create(data)
    if (result.success) {
      success('Ödeme kaydı oluşturuldu')
      closeModal()
      await loadPayments()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (err) {
    error('Kaydetme sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const viewPayment = (payment: any) => {
  selectedPayment.value = payment
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedPayment.value = null
}

const cancelPayment = async (payment: any) => {
  const confirmed = await confirm({
    title: 'Ödeme İptal',
    message: `Bu ödemeyi iptal etmek istediğinize emin misiniz?`,
    confirmText: 'İptal Et',
    type: 'warning'
  })
  if (confirmed) {
    try {
      const result = await window.electronAPI.paymentHistory.cancel(payment.id)
      if (result.success) {
        success('Ödeme iptal edildi')
        await loadPayments()
      } else {
        error(result.errors?.[0] || 'İptal başarısız')
      }
    } catch (err) {
      error('İptal sırasında hata oluştu')
    }
  }
}

const deletePayment = async (payment: any) => {
  const confirmed = await confirm({
    title: 'Ödeme Sil',
    message: `Bu ödeme kaydını silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    type: 'danger'
  })
  if (confirmed) {
    try {
      const result = await window.electronAPI.paymentHistory.delete(payment.id)
      if (result.success) {
        success('Ödeme kaydı silindi')
        await loadPayments()
      } else {
        error(result.errors?.[0] || 'Silme başarısız')
      }
    } catch (err) {
      error('Silme sırasında hata oluştu')
    }
  }
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadPayments()
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = { Salary: '💰 Maaş', Advance: '💵 Avans', Bonus: '🎁 Prim', Other: '📋 Diğer' }
  return labels[type] || type
}

const getMethodLabel = (method: string) => {
  const labels: Record<string, string> = { Bank: '🏦 Banka', Cash: '💵 Nakit', Check: '📄 Çek' }
  return labels[method] || method
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0)
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR')

onMounted(async () => {
  await loadEmployees()
  await loadPayments()
})
</script>

<style scoped>
.payment-history-page { max-width: 1400px; margin: 0 auto; }

.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem; margin-bottom: 1.5rem;
}

.filter-group { display: flex; align-items: center; gap: 0.5rem; }

.filter-select {
  padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px;
  font-size: 0.875rem; background: white; min-width: 140px;
}

.employee-cell { display: flex; align-items: center; gap: 0.75rem; }

.employee-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 0.75rem;
}

.employee-info { display: flex; flex-direction: column; }
.employee-name { font-weight: 600; color: #2c3e50; }
.employee-code { font-size: 0.75rem; color: #6c757d; }

.type-badge, .method-badge {
  display: inline-block; padding: 0.25rem 0.5rem; border-radius: 12px;
  font-size: 0.7rem; font-weight: 600;
}

.type-salary { background: #d4edda; color: #155724; }
.type-advance { background: #fff3cd; color: #856404; }
.type-bonus { background: #cce5ff; color: #004085; }
.type-other { background: #e9ecef; color: #495057; }

.method-bank { background: #cce5ff; color: #004085; }
.method-cash { background: #d4edda; color: #155724; }
.method-check { background: #f8d7da; color: #721c24; }

.amount-value { font-weight: 600; font-family: 'Consolas', monospace; color: #198754; }

.status-badge {
  display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600;
}

.status-completed { background: #d4edda; color: #155724; }
.status-cancelled { background: #f8d7da; color: #721c24; }

.action-btn {
  padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px;
  cursor: pointer; font-size: 1rem; transition: all 0.2s; margin: 0 0.125rem;
}

.action-btn:hover { transform: scale(1.1); }
.action-btn.view:hover { background: #e9ecef; }
.action-btn.cancel:hover { background: #fff3cd; }
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

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }

.form-control {
  width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6;
  border-radius: 6px; font-size: 0.95rem;
}

.bank-details {
  padding: 1rem; background: #f8f9fa; border-radius: 8px; margin-bottom: 1rem;
}

.detail-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
}

.detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
.detail-item.full-width { grid-column: 1 / -1; }
.detail-item label { font-size: 0.8rem; color: #6c757d; font-weight: 500; }
.detail-item span { font-size: 0.95rem; color: #2c3e50; }

.modal-footer {
  display: flex; justify-content: flex-end; gap: 0.75rem;
  padding: 1rem 1.5rem; border-top: 1px solid #e9ecef;
}

.btn {
  padding: 0.625rem 1.25rem; border: none; border-radius: 6px;
  font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
}

.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
