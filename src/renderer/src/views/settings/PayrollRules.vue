<template>
  <div class="payroll-rules-page">
    <PageHeader 
      title="Bordro Hesaplama Kuralları" 
      description="Bordro sütunlarında kullanılacak parametreleri ve hesaplama formüllerini yönetin"
    >
      <template #actions>
        <button class="btn btn-outline" @click="seedDefaults" :disabled="seeding">
          {{ seeding ? '⏳ Oluşturuluyor...' : '🔄 Varsayılanları Oluştur' }}
        </button>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Kural
        </button>
      </template>
    </PageHeader>

    <!-- İstatistik Kartları -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📥</div>
        <div class="stat-content">
          <span class="stat-value">{{ incomeRules.length }}</span>
          <span class="stat-label">Gelir Kuralı</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📤</div>
        <div class="stat-content">
          <span class="stat-value">{{ deductionRules.length }}</span>
          <span class="stat-label">Kesinti Kuralı</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <span class="stat-value">{{ activeRules.length }}</span>
          <span class="stat-label">Aktif Kural</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔒</div>
        <div class="stat-content">
          <span class="stat-value">{{ systemRules.length }}</span>
          <span class="stat-label">Sistem Kuralı</span>
        </div>
      </div>
    </div>

    <!-- Sekme Yapısı -->
    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'deduction' }" 
        @click="activeTab = 'deduction'"
      >
        📤 Kesinti Kuralları
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'income' }" 
        @click="activeTab = 'income'"
      >
        📥 Gelir Kuralları
      </button>
    </div>

    <!-- Kural Listesi -->
    <div class="rules-list">
      <div v-if="loading" class="loading-state">
        <span>⏳ Yükleniyor...</span>
      </div>
      <div v-else-if="filteredRules.length === 0" class="empty-state">
        <span>📭 Henüz kural tanımlanmamış</span>
        <button class="btn btn-primary btn-sm" @click="seedDefaults">Varsayılanları Oluştur</button>
      </div>
      <div v-else class="rules-grid">
        <div 
          v-for="rule in filteredRules" 
          :key="rule.id" 
          class="rule-card"
          :class="{ inactive: !rule.isActive, system: rule.isSystem }"
        >
          <div class="rule-header">
            <div class="rule-title">
              <span class="rule-icon">{{ rule.columnType === 'income' ? '📥' : '📤' }}</span>
              <span>{{ rule.columnName }}</span>
              <span v-if="rule.isSystem" class="system-badge" title="Sistem kuralı">🔒</span>
            </div>
            <div class="rule-actions">
              <button class="action-btn edit" @click="openEditModal(rule)" title="Düzenle">✏️</button>
              <button 
                class="action-btn delete" 
                @click="deleteRule(rule)" 
                title="Sil"
                :disabled="rule.isSystem"
              >🗑️</button>
            </div>
          </div>
          <div class="rule-body">
            <div class="rule-info">
              <span class="rule-code">{{ rule.columnCode }}</span>
              <span class="rule-category" :class="'cat-' + (rule.category || 'other').toLowerCase()">
                {{ getCategoryLabel(rule.category) }}
              </span>
            </div>
            <div class="rule-formula">
              <label>Formül:</label>
              <code>{{ rule.formula }}</code>
            </div>
            <div class="rule-params">
              <label>Parametreler:</label>
              <div class="param-tags">
                <span 
                  v-for="param in parseParams(rule.parameterTypes)" 
                  :key="param" 
                  class="param-tag"
                >
                  {{ param }}
                </span>
                <span v-if="parseParams(rule.parameterTypes).length === 0" class="param-tag empty">
                  Parametre yok
                </span>
              </div>
            </div>
          </div>
          <div class="rule-footer">
            <span :class="['status-badge', rule.isActive ? 'active' : 'inactive']">
              {{ rule.isActive ? '✓ Aktif' : '✗ Pasif' }}
            </span>
            <span class="formula-type">{{ getFormulaTypeLabel(rule.formulaType || 'simple') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Kural Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Kural Düzenle' : 'Yeni Kural' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveRule" class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Sütun Kodu *</label>
                  <input 
                    v-model="form.columnCode" 
                    type="text" 
                    required 
                    class="form-control" 
                    placeholder="sgk_employee"
                    pattern="[a-z_]+"
                    :disabled="isEditing && form.isSystem"
                  />
                  <small class="form-hint">Sadece küçük harf ve alt çizgi</small>
                </div>
                <div class="form-group">
                  <label>Sütun Adı *</label>
                  <input 
                    v-model="form.columnName" 
                    type="text" 
                    required 
                    class="form-control" 
                    placeholder="SGK İşçi Payı"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Sütun Tipi *</label>
                  <select v-model="form.columnType" required class="form-control">
                    <option value="info">📋 Bilgi (Sıra No, Sicil, İsim vb.)</option>
                    <option value="income">📈 Gelir</option>
                    <option value="deduction">📉 Kesinti</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Kategori</label>
                  <select v-model="form.category" class="form-control">
                    <option value="">Seçin</option>
                    <option value="Tax">Vergi</option>
                    <option value="Insurance">Sigorta</option>
                    <option value="Overtime">Fazla Mesai</option>
                    <option value="Allowance">Ödenek</option>
                    <option value="Advance">Avans</option>
                    <option value="Other">Diğer</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Formül Tipi *</label>
                  <select v-model="form.formulaType" required class="form-control">
                    <option value="simple">Basit (oran hesaplama)</option>
                    <option value="bracket">Dilimli (vergi dilimleri)</option>
                    <option value="custom">Özel (sabit değer/fonksiyon)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Sıralama</label>
                  <input 
                    v-model.number="form.sortOrder" 
                    type="number" 
                    class="form-control" 
                    placeholder="1"
                  />
                </div>
              </div>
              <div class="form-group">
                <label>Kullanılacak Parametreler</label>
                <div class="param-selector">
                  <div 
                    v-for="pType in parameterTypes" 
                    :key="pType.code" 
                    class="param-checkbox"
                  >
                    <input 
                      type="checkbox" 
                      :id="'param-' + pType.code"
                      :value="pType.code"
                      v-model="form.parameterTypes"
                    />
                    <label :for="'param-' + pType.code">{{ pType.name }}</label>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>Hesaplama Formülü *</label>
                <div class="formula-editor">
                  <textarea 
                    v-model="form.formula" 
                    required 
                    class="form-control formula-input" 
                    rows="3"
                    placeholder="base * (rate / 100)"
                  ></textarea>
                  <div class="formula-help">
                    <details>
                      <summary>📖 Kullanılabilir Değişkenler</summary>
                      <div class="variable-list">
                        <div class="variable-group">
                          <strong>Temel:</strong>
                          <code>base</code> (brüt maaş), 
                          <code>gross</code> (brüt toplam), 
                          <code>net</code> (net maaş)
                        </div>
                        <div class="variable-group">
                          <strong>Süre:</strong>
                          <code>dailyWage</code> (günlük), 
                          <code>hourlyWage</code> (saatlik), 
                          <code>hours</code> (saat)
                        </div>
                        <div class="variable-group">
                          <strong>Vergi:</strong>
                          <code>taxBase</code> (matrah), 
                          <code>cumulativeBase</code> (kümülatif), 
                          <code>brackets</code> (dilimler)
                        </div>
                        <div class="variable-group">
                          <strong>Parametre:</strong>
                          <code>rate</code> (oran %), 
                          <code>amount</code> (tutar), 
                          <code>multiplier</code> (çarpan)
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea 
                  v-model="form.description" 
                  class="form-control" 
                  rows="2" 
                  placeholder="Bu kuralın açıklaması..."
                ></textarea>
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
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { PayrollColumnMapping, ParameterType } from '@/types/electron'

const { success, error } = useToast()
const { confirm } = useConfirm()

// State
const loading = ref(false)
const saving = ref(false)
const seeding = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const rules = ref<PayrollColumnMapping[]>([])
const parameterTypes = ref<ParameterType[]>([])
const activeTab = ref<'income' | 'deduction'>('deduction')

const form = reactive({
  id: null as number | null,
  columnCode: '',
  columnName: '',
  columnType: 'deduction' as 'income' | 'deduction' | 'info',
  category: '',
  parameterTypes: [] as string[],
  formula: '',
  formulaType: 'simple' as 'simple' | 'bracket' | 'custom',
  sortOrder: 0,
  isActive: true,
  isSystem: false,
  description: ''
})

// Computed
const incomeRules = computed(() => rules.value.filter(r => r.columnType === 'income'))
const deductionRules = computed(() => rules.value.filter(r => r.columnType === 'deduction'))
const activeRules = computed(() => rules.value.filter(r => r.isActive))
const systemRules = computed(() => rules.value.filter(r => r.isSystem))

const filteredRules = computed(() => {
  return rules.value
    .filter(r => r.columnType === activeTab.value)
    .sort((a, b) => a.sortOrder - b.sortOrder)
})

// Methods
const loadRules = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.payrollColumnMapping.getAll({})
    if (result.success) {
      rules.value = result.data || []
    }
  } catch (_) {
    error('Kurallar yüklenemedi')
  } finally {
    loading.value = false
  }
}

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

const openCreateModal = () => {
  isEditing.value = false
  resetForm()
  form.columnType = activeTab.value
  showModal.value = true
}

const openEditModal = (rule: PayrollColumnMapping) => {
  isEditing.value = true
  Object.assign(form, {
    id: rule.id,
    columnCode: rule.columnCode,
    columnName: rule.columnName,
    columnType: rule.columnType,
    category: rule.category || '',
    parameterTypes: parseParams(rule.parameterTypes),
    formula: rule.formula,
    formulaType: rule.formulaType || 'simple',
    sortOrder: rule.sortOrder || 0,
    isActive: rule.isActive,
    isSystem: rule.isSystem,
    description: rule.description || ''
  })
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
  form.columnType = 'deduction'
  form.category = ''
  form.parameterTypes = []
  form.formula = ''
  form.formulaType = 'simple'
  form.sortOrder = 0
  form.isActive = true
  form.isSystem = false
  form.description = ''
}

const saveRule = async () => {
  saving.value = true
  try {
    const data = {
      columnCode: form.columnCode,
      columnName: form.columnName,
      columnType: form.columnType,
      category: form.category || null,
      parameterTypes: form.parameterTypes,
      formula: form.formula,
      formulaType: form.formulaType,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      description: form.description || null
    }
    
    const result = isEditing.value
      ? await window.electronAPI.payrollColumnMapping.update(form.id!, data)
      : await window.electronAPI.payrollColumnMapping.create(data)
    
    if (result.success) {
      success(isEditing.value ? 'Kural güncellendi' : 'Kural oluşturuldu')
      closeModal()
      await loadRules()
    } else {
      error(result.errors?.[0] || 'İşlem başarısız')
    }
  } catch (_) {
    error('Kaydetme sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const deleteRule = async (rule: PayrollColumnMapping) => {
  if (rule.isSystem) {
    error('Sistem kuralları silinemez')
    return
  }
  
  const confirmed = await confirm({
    title: 'Kural Sil',
    message: `"${rule.columnName}" kuralını silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    type: 'danger'
  })
  
  if (confirmed) {
    try {
      const result = await window.electronAPI.payrollColumnMapping.delete(rule.id)
      if (result.success) {
        success('Kural silindi')
        await loadRules()
      } else {
        error(result.errors?.[0] || 'Silme başarısız')
      }
    } catch (_) {
      error('Silme sırasında hata oluştu')
    }
  }
}

const seedDefaults = async () => {
  const confirmed = await confirm({
    title: 'Varsayılan Kurallar',
    message: 'Varsayılan bordro hesaplama kuralları oluşturulsun mu?',
    confirmText: 'Oluştur',
    type: 'info'
  })
  
  if (confirmed) {
    seeding.value = true
    try {
      const result = await window.electronAPI.payrollColumnMapping.seedDefaults()
      if (result.success) {
        success(`${result.data?.length || 0} kural oluşturuldu`)
        await loadRules()
      } else {
        error(result.errors?.[0] || 'Oluşturma başarısız')
      }
    } catch (_) {
      error('Oluşturma sırasında hata oluştu')
    } finally {
      seeding.value = false
    }
  }
}

const parseParams = (json: string): string[] => {
  try {
    return JSON.parse(json) || []
  } catch {
    return []
  }
}

const getCategoryLabel = (category: string | null) => {
  const labels: Record<string, string> = {
    Tax: 'Vergi',
    Insurance: 'Sigorta',
    Overtime: 'Fazla Mesai',
    Allowance: 'Ödenek',
    Advance: 'Avans',
    Other: 'Diğer'
  }
  return labels[category || ''] || category || 'Belirsiz'
}

const getFormulaTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    simple: 'Basit',
    bracket: 'Dilimli',
    custom: 'Özel'
  }
  return labels[type] || type
}

onMounted(() => {
  loadRules()
  loadParameterTypes()
})
</script>

<style scoped>
.payroll-rules-page { max-width: 1400px; margin: 0 auto; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-icon { font-size: 2rem; }
.stat-content { display: flex; flex-direction: column; }
.stat-value { font-size: 1.5rem; font-weight: 700; color: #2c3e50; }
.stat-label { font-size: 0.85rem; color: #6c757d; }

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 0;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover { color: #2c3e50; }
.tab.active { color: #0466c8; border-bottom-color: #0466c8; }

.rules-list { min-height: 300px; }

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: #6c757d;
  font-size: 1.1rem;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.rule-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.2s;
}

.rule-card:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12); }
.rule-card.inactive { opacity: 0.6; }
.rule-card.system { border-left: 4px solid #0466c8; }

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.rule-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.rule-icon { font-size: 1.25rem; }
.system-badge { font-size: 0.8rem; }

.rule-actions { display: flex; gap: 0.25rem; }

.action-btn {
  padding: 0.375rem 0.5rem;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.action-btn:hover { transform: scale(1.1); }
.action-btn.edit:hover { background: #e7f1ff; }
.action-btn.delete:hover { background: #f8d7da; }
.action-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.rule-body { padding: 1rem 1.25rem; }

.rule-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.rule-code {
  font-family: 'Consolas', monospace;
  font-size: 0.8rem;
  color: #6c757d;
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.rule-category {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.cat-tax { background: #fff3cd; color: #856404; }
.cat-insurance { background: #cce5ff; color: #004085; }
.cat-overtime { background: #d4edda; color: #155724; }
.cat-allowance { background: #e2d5f1; color: #5e4b8b; }
.cat-advance { background: #f8d7da; color: #721c24; }
.cat-other { background: #e9ecef; color: #495057; }

.rule-formula, .rule-params {
  margin-bottom: 0.75rem;
}

.rule-formula label, .rule-params label {
  display: block;
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.rule-formula code {
  display: block;
  font-family: 'Consolas', monospace;
  font-size: 0.85rem;
  color: #e83e8c;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  word-break: break-all;
}

.param-tags { display: flex; flex-wrap: wrap; gap: 0.25rem; }

.param-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  background: #e7f1ff;
  color: #0466c8;
  border-radius: 12px;
}

.param-tag.empty { background: #e9ecef; color: #6c757d; }

.rule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.status-badge.active { background: #d4edda; color: #155724; }
.status-badge.inactive { background: #f8d7da; color: #721c24; }

.formula-type {
  font-size: 0.75rem;
  color: #6c757d;
}

/* Modal Stilleri */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
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
  max-width: 700px;
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

.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }

.form-control {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.95rem;
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6c757d;
}

.param-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.param-checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.param-checkbox input { width: 16px; height: 16px; }
.param-checkbox label { cursor: pointer; white-space: nowrap; }

.formula-editor { position: relative; }

.formula-input {
  font-family: 'Consolas', monospace;
  font-size: 0.9rem;
}

.formula-help {
  margin-top: 0.5rem;
}

.formula-help details {
  font-size: 0.85rem;
}

.formula-help summary {
  cursor: pointer;
  color: #0466c8;
  font-weight: 500;
}

.variable-list {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.variable-group {
  margin-bottom: 0.5rem;
}

.variable-group:last-child { margin-bottom: 0; }

.variable-group code {
  font-size: 0.8rem;
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  margin: 0 0.1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input { width: 18px; height: 18px; }

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
