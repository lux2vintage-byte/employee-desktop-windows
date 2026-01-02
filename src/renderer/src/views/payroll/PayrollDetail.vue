<template>
  <div class="payroll-detail-page">
    <PageHeader 
      :title="`Bordro Detayı - ${payroll?.employee?.firstName || ''} ${payroll?.employee?.lastName || ''}`"
      :description="`${getMonthName(payroll?.periodMonth)} ${payroll?.periodYear} Dönemi`"
    >
      <template #actions>
        <button class="btn btn-secondary" @click="$router.back()">
          ← Geri
        </button>
        <button 
          v-if="!payroll?.isFinalized" 
          class="btn btn-success" 
          @click="finalizePayroll"
        >
          ✓ Kesinleştir
        </button>
        <button class="btn btn-primary" @click="exportPdf">
          📄 PDF İndir
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <span>Yükleniyor...</span>
    </div>

    <template v-else-if="payroll">
      <!-- Durum Bilgisi -->
      <div v-if="payroll.isFinalized" class="status-banner success">
        <span class="status-icon">✓</span>
        <span>Bu bordro kesinleştirilmiştir. Değişiklik yapılamaz.</span>
      </div>
      <div v-else class="status-banner warning">
        <span class="status-icon">⏳</span>
        <span>Bu bordro henüz kesinleştirilmemiştir. Düzenleme yapabilirsiniz.</span>
      </div>

      <!-- Personel ve Özet Bilgileri -->
      <div class="detail-grid">
        <!-- Personel Kartı -->
        <div class="detail-card">
          <div class="card-header">
            <span class="card-icon">👤</span>
            <h3>Personel Bilgileri</h3>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="info-label">Ad Soyad</span>
              <span class="info-value">{{ payroll.employee?.firstName }} {{ payroll.employee?.lastName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Sicil No</span>
              <span class="info-value">{{ payroll.employee?.employeeCode }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Dönem</span>
              <span class="info-value period">{{ getMonthName(payroll.periodMonth) }} {{ payroll.periodYear }}</span>
            </div>
          </div>
        </div>

        <!-- Maaş Özeti Kartı -->
        <div class="detail-card summary-card">
          <div class="card-header">
            <span class="card-icon">💰</span>
            <h3>Maaş Özeti</h3>
          </div>
          <div class="card-body">
            <div class="summary-row">
              <span class="summary-label">Brüt Maaş</span>
              <span class="summary-value">{{ formatCurrency(payroll.baseSalary) }}</span>
            </div>
            <div class="summary-row positive">
              <span class="summary-label">Toplam Eklemeler</span>
              <span class="summary-value">+{{ formatCurrency(payroll.totalAdditions) }}</span>
            </div>
            <div class="summary-row negative">
              <span class="summary-label">Toplam Kesintiler</span>
              <span class="summary-value">-{{ formatCurrency(payroll.totalDeductions) }}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-row total">
              <span class="summary-label">Net Maaş</span>
              <span class="summary-value">{{ formatCurrency(payroll.netSalary) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bordro Kalemleri -->
      <div class="items-section">
        <div class="section-header">
          <h3>Bordro Kalemleri</h3>
          <button 
            v-if="!payroll.isFinalized" 
            class="btn btn-sm btn-primary" 
            @click="openAddItemModal"
          >
            ➕ Kalem Ekle
          </button>
        </div>

        <!-- Gelirler -->
        <div class="items-group">
          <h4 class="group-title income">
            <span class="group-icon">📈</span>
            Gelirler / Eklemeler
          </h4>
          <div v-if="incomeItems.length === 0" class="empty-items">
            Ekleme kalemi bulunmuyor
          </div>
          <div v-else class="items-list">
            <div v-for="item in incomeItems" :key="item.id" class="item-row">
              <div class="item-info">
                <span class="item-category">{{ getCategoryLabel(item.category) }}</span>
                <span v-if="item.description" class="item-description">{{ item.description }}</span>
              </div>
              <div class="item-actions">
                <span class="item-amount positive">+{{ formatCurrency(item.amount) }}</span>
                <button 
                  v-if="!payroll.isFinalized" 
                  class="action-btn delete" 
                  @click="removeItem(item)"
                  title="Sil"
                >🗑️</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Kesintiler -->
        <div class="items-group">
          <h4 class="group-title deduction">
            <span class="group-icon">📉</span>
            Kesintiler
          </h4>
          <div v-if="deductionItems.length === 0" class="empty-items">
            Kesinti kalemi bulunmuyor
          </div>
          <div v-else class="items-list">
            <div v-for="item in deductionItems" :key="item.id" class="item-row">
              <div class="item-info">
                <span class="item-category">{{ getCategoryLabel(item.category) }}</span>
                <span v-if="item.description" class="item-description">{{ item.description }}</span>
              </div>
              <div class="item-actions">
                <span class="item-amount negative">-{{ formatCurrency(item.amount) }}</span>
                <button 
                  v-if="!payroll.isFinalized" 
                  class="action-btn delete" 
                  @click="removeItem(item)"
                  title="Sil"
                >🗑️</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Kalem Ekleme Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddItemModal" class="modal-overlay" @click.self="closeAddItemModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Bordro Kalemi Ekle</h3>
              <button class="close-btn" @click="closeAddItemModal">✕</button>
            </div>
            <form @submit.prevent="addItem" class="modal-body">
              <div class="form-group">
                <label>Kalem Türü *</label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input type="radio" v-model="itemForm.type" value="Income" />
                    <span class="radio-text income">📈 Gelir / Ekleme</span>
                  </label>
                  <label class="radio-label">
                    <input type="radio" v-model="itemForm.type" value="Deduction" />
                    <span class="radio-text deduction">📉 Kesinti</span>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Kategori *</label>
                <select v-model="itemForm.category" required class="form-control">
                  <option value="">Kategori Seçin</option>
                  <template v-if="itemForm.type === 'Income'">
                    <option value="Overtime">Fazla Mesai</option>
                    <option value="Bonus">Prim / İkramiye</option>
                    <option value="Transport">Yol Yardımı</option>
                    <option value="Food">Yemek Yardımı</option>
                    <option value="Other">Diğer</option>
                  </template>
                  <template v-else>
                    <option value="Tax">Vergi</option>
                    <option value="Insurance">Sigorta</option>
                    <option value="Advance">Avans Kesintisi</option>
                    <option value="Absence">Devamsızlık</option>
                    <option value="Other">Diğer</option>
                  </template>
                </select>
              </div>
              <div class="form-group">
                <label>Tutar (₺) *</label>
                <input 
                  v-model.number="itemForm.amount" 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  required 
                  class="form-control"
                  placeholder="0.00"
                />
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <input 
                  v-model="itemForm.description" 
                  type="text" 
                  class="form-control"
                  placeholder="Opsiyonel açıklama..."
                />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeAddItemModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? 'Ekleniyor...' : 'Ekle' }}
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
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const route = useRoute()
const router = useRouter()
const { success, error } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(true)
const saving = ref(false)
const showAddItemModal = ref(false)
const payroll = ref<any>(null)

const itemForm = reactive({
  type: 'Income',
  category: '',
  amount: 0,
  description: ''
})

// Computed
const incomeItems = computed(() => {
  return (payroll.value?.items || []).filter((item: any) => item.type === 'Income')
})

const deductionItems = computed(() => {
  return (payroll.value?.items || []).filter((item: any) => item.type === 'Deduction')
})

// Aylar
const months = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' }
]

// Kategori etiketleri
const categoryLabels: Record<string, string> = {
  Overtime: 'Fazla Mesai',
  Bonus: 'Prim / İkramiye',
  Transport: 'Yol Yardımı',
  Food: 'Yemek Yardımı',
  Tax: 'Vergi',
  Insurance: 'Sigorta',
  Advance: 'Avans Kesintisi',
  Absence: 'Devamsızlık',
  Other: 'Diğer'
}

// Methods
const loadPayroll = async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const result = await window.electronAPI.payroll.getById(id)
    
    if (result.success) {
      payroll.value = result.data
    } else {
      error(result.errors?.[0] || 'Bordro yüklenemedi')
      router.back()
    }
  } catch (err) {
    error('Bordro yüklenirken hata oluştu')
    router.back()
  } finally {
    loading.value = false
  }
}

const openAddItemModal = () => {
  itemForm.type = 'Income'
  itemForm.category = ''
  itemForm.amount = 0
  itemForm.description = ''
  showAddItemModal.value = true
}

const closeAddItemModal = () => {
  showAddItemModal.value = false
}

const addItem = async () => {
  if (!itemForm.category || !itemForm.amount) return

  saving.value = true
  try {
    const result = await window.electronAPI.payroll.addItem(payroll.value.id, {
      type: itemForm.type,
      category: itemForm.category,
      amount: itemForm.amount,
      description: itemForm.description || undefined
    })

    if (result.success) {
      success('Kalem başarıyla eklendi')
      closeAddItemModal()
      await loadPayroll()
    } else {
      error(result.errors?.[0] || 'Kalem eklenemedi')
    }
  } catch (err) {
    error('Kalem eklenirken hata oluştu')
  } finally {
    saving.value = false
  }
}

const removeItem = async (item: any) => {
  const confirmed = await confirm({
    title: 'Kalemi Sil',
    message: `"${getCategoryLabel(item.category)}" kalemini silmek istiyor musunuz?`,
    confirmText: 'Sil',
    type: 'danger'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.payroll.removeItem(item.id)
      if (result.success) {
        success('Kalem silindi')
        await loadPayroll()
      } else {
        error(result.errors?.[0] || 'Kalem silinemedi')
      }
    } catch (err) {
      error('Kalem silinirken hata oluştu')
    }
  }
}

const finalizePayroll = async () => {
  const confirmed = await confirm({
    title: 'Bordroyu Kesinleştir',
    message: 'Bu bordroyu kesinleştirmek istiyor musunuz? Bu işlem geri alınamaz ve bordro üzerinde değişiklik yapılamaz.',
    confirmText: 'Kesinleştir',
    type: 'warning'
  })

  if (confirmed) {
    try {
      const result = await window.electronAPI.payroll.finalize(payroll.value.id)
      if (result.success) {
        success('Bordro kesinleştirildi')
        await loadPayroll()
      } else {
        error(result.errors?.[0] || 'Kesinleştirme başarısız')
      }
    } catch (err) {
      error('Kesinleştirme sırasında hata oluştu')
    }
  }
}

const exportPdf = () => {
  success('PDF export özelliği yakında eklenecek')
}

// Helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0)
}

const getMonthName = (month: number) => {
  return months.find(m => m.value === month)?.label || ''
}

const getCategoryLabel = (category: string) => {
  return categoryLabels[category] || category
}

// Lifecycle
onMounted(() => {
  loadPayroll()
})
</script>

<style scoped>
.payroll-detail-page {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: #6c757d;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e9ecef;
  border-top-color: #0466c8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.status-banner.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-banner.warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
}

.status-icon {
  font-size: 1.25rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.detail-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.card-icon {
  font-size: 1.5rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
}

.card-body {
  padding: 1.25rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f3f4;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #6c757d;
  font-size: 0.9rem;
}

.info-value {
  font-weight: 600;
  color: #2c3e50;
}

.info-value.period {
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}

.summary-card .card-body {
  padding: 1rem 1.25rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
}

.summary-label {
  color: #495057;
  font-size: 0.95rem;
}

.summary-value {
  font-weight: 600;
  font-family: 'Consolas', monospace;
  font-size: 1rem;
}

.summary-row.positive .summary-value {
  color: #198754;
}

.summary-row.negative .summary-value {
  color: #dc3545;
}

.summary-divider {
  height: 1px;
  background: #e9ecef;
  margin: 0.5rem 0;
}

.summary-row.total {
  padding-top: 1rem;
}

.summary-row.total .summary-label {
  font-weight: 600;
  color: #2c3e50;
}

.summary-row.total .summary-value {
  font-size: 1.25rem;
  color: #0466c8;
}

.items-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.items-group {
  margin-bottom: 1.5rem;
}

.items-group:last-child {
  margin-bottom: 0;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid;
  font-size: 0.95rem;
}

.group-title.income {
  border-color: #198754;
  color: #198754;
}

.group-title.deduction {
  border-color: #dc3545;
  color: #dc3545;
}

.group-icon {
  font-size: 1.1rem;
}

.empty-items {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 0.9rem;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background 0.2s;
}

.item-row:hover {
  background: #e9ecef;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-category {
  font-weight: 600;
  color: #2c3e50;
}

.item-description {
  font-size: 0.8rem;
  color: #6c757d;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-amount {
  font-weight: 700;
  font-family: 'Consolas', monospace;
  font-size: 1rem;
}

.item-amount.positive {
  color: #198754;
}

.item-amount.negative {
  color: #dc3545;
}

.action-btn {
  padding: 0.375rem 0.5rem;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.action-btn.delete:hover {
  background: #f8d7da;
  transform: scale(1.1);
}

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
  max-width: 480px;
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
  margin-bottom: 1.25rem;
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

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.75rem 1rem;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  transition: all 0.2s;
  flex: 1;
}

.radio-label:has(input:checked) {
  border-color: #0466c8;
  background: #e7f1ff;
}

.radio-label input {
  display: none;
}

.radio-text {
  font-weight: 500;
}

.radio-text.income {
  color: #198754;
}

.radio-text.deduction {
  color: #dc3545;
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

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.btn-primary {
  background: #0466c8;
  color: white;
}

.btn-primary:hover {
  background: #0353a4;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-success {
  background: #198754;
  color: white;
}

.btn-success:hover {
  background: #157347;
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
}

.btn-secondary:hover {
  background: #dee2e6;
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>
