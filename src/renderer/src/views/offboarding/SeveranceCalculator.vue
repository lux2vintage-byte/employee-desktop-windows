<template>
  <div class="severance-calculator-page">
    <PageHeader 
      title="Kıdem / İhbar Tazminatı Hesaplama" 
      description="Personel ayrılık tazminatlarını hesaplayın"
    />

    <div class="calculator-container">
      <div class="calculator-form">
        <h3>📊 Tazminat Hesaplama</h3>
        
        <div class="form-section">
          <h4>Personel Bilgileri</h4>
          <div class="form-group">
            <label>Personel Seçin</label>
            <select v-model="selectedEmployeeId" @change="loadEmployeeData" class="form-control">
              <option value="">Personel Seçin</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
              </option>
            </select>
          </div>
          
          <div v-if="selectedEmployee" class="employee-summary">
            <div class="summary-item">
              <span class="label">İşe Giriş Tarihi:</span>
              <span class="value">{{ formatDate(selectedEmployee.hireDate) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Çalışma Süresi:</span>
              <span class="value highlight">{{ workingYears }} yıl {{ workingMonths }} ay {{ workingDays }} gün</span>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>Hesaplama Parametreleri</h4>
          <div class="form-row">
            <div class="form-group">
              <label>İşten Ayrılış Tarihi *</label>
              <input v-model="form.exitDate" type="date" class="form-control" @change="calculateWorkingPeriod" />
            </div>
            <div class="form-group">
              <label>Brüt Maaş (₺) *</label>
              <input v-model.number="form.grossSalary" type="number" min="0" step="0.01" class="form-control" placeholder="0.00" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Ayrılış Nedeni *</label>
              <select v-model="form.exitReason" class="form-control">
                <option value="">Seçin</option>
                <option value="resignation">İstifa (Kendi isteği)</option>
                <option value="termination">İşten Çıkarılma</option>
                <option value="retirement">Emeklilik</option>
                <option value="military">Askerlik</option>
                <option value="death">Vefat</option>
                <option value="contract_end">Sözleşme Bitimi</option>
              </select>
            </div>
            <div class="form-group">
              <label>Kıdem Tazminatı Tavanı (₺)</label>
              <input v-model.number="form.severanceCeiling" type="number" min="0" step="0.01" class="form-control" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>Ek Bilgiler</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Kullanılmayan İzin Günü</label>
              <input v-model.number="form.unusedLeaveDays" type="number" min="0" class="form-control" />
            </div>
            <div class="form-group">
              <label>Ödenmemiş Avans (₺)</label>
              <input v-model.number="form.unpaidAdvance" type="number" min="0" step="0.01" class="form-control" />
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.includeNotice" />
              İhbar Tazminatı Dahil Et
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary btn-lg" @click="calculateSeverance" :disabled="!canCalculate">
            🧮 Hesapla
          </button>
          <button class="btn btn-secondary" @click="resetForm">
            🔄 Sıfırla
          </button>
        </div>
      </div>

      <div class="calculator-result" v-if="result">
        <h3>📋 Hesaplama Sonucu</h3>
        
        <div class="result-card">
          <div class="result-header">
            <span class="result-title">Toplam Tazminat</span>
            <span class="result-total">{{ formatCurrency(result.total) }}</span>
          </div>
          
          <div class="result-breakdown">
            <div class="breakdown-item" v-if="result.severance > 0">
              <span class="item-label">Kıdem Tazminatı</span>
              <span class="item-value">{{ formatCurrency(result.severance) }}</span>
            </div>
            <div class="breakdown-item" v-if="result.notice > 0">
              <span class="item-label">İhbar Tazminatı</span>
              <span class="item-value">{{ formatCurrency(result.notice) }}</span>
            </div>
            <div class="breakdown-item" v-if="result.leavePayout > 0">
              <span class="item-label">İzin Ücreti</span>
              <span class="item-value">{{ formatCurrency(result.leavePayout) }}</span>
            </div>
            <div class="breakdown-item deduction" v-if="result.advanceDeduction > 0">
              <span class="item-label">Avans Kesintisi</span>
              <span class="item-value">-{{ formatCurrency(result.advanceDeduction) }}</span>
            </div>
          </div>

          <div class="result-details">
            <h4>Hesaplama Detayları</h4>
            <div class="detail-row">
              <span>Çalışma Süresi:</span>
              <span>{{ result.workingPeriod }}</span>
            </div>
            <div class="detail-row">
              <span>Kıdem Yılı:</span>
              <span>{{ result.severanceYears }} yıl</span>
            </div>
            <div class="detail-row" v-if="result.noticeDays > 0">
              <span>İhbar Süresi:</span>
              <span>{{ result.noticeDays }} gün</span>
            </div>
            <div class="detail-row">
              <span>Günlük Ücret:</span>
              <span>{{ formatCurrency(result.dailyWage) }}</span>
            </div>
          </div>

          <div class="result-note" v-if="result.note">
            <span class="note-icon">ℹ️</span>
            <span>{{ result.note }}</span>
          </div>
        </div>

        <div class="result-actions">
          <button class="btn btn-outline" @click="printResult">🖨️ Yazdır</button>
          <button class="btn btn-outline" @click="exportPdf">📄 PDF</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useToast } from '@/composables/useToast'

const { success } = useToast()

const employees = ref<any[]>([])
const selectedEmployeeId = ref('')
const selectedEmployee = ref<any>(null)
const result = ref<any>(null)

const form = reactive({
  exitDate: new Date().toISOString().split('T')[0],
  grossSalary: 0,
  exitReason: '',
  severanceCeiling: 35058.58, // 2024 tavanı
  unusedLeaveDays: 0,
  unpaidAdvance: 0,
  includeNotice: true
})

const workingYears = ref(0)
const workingMonths = ref(0)
const workingDays = ref(0)

const canCalculate = computed(() => {
  return selectedEmployee.value && form.exitDate && form.grossSalary > 0 && form.exitReason
})

const loadEmployees = async () => {
  try {
    const res = await window.electronAPI.employee.getAll({ limit: 500 })
    if (res.success) employees.value = res.data || []
  } catch (err) { /* ignore */ }
}

const loadEmployeeData = async () => {
  if (!selectedEmployeeId.value) { selectedEmployee.value = null; return }
  try {
    const res = await window.electronAPI.employee.getById(Number(selectedEmployeeId.value))
    if (res.success && res.data) {
      selectedEmployee.value = res.data
      // Maaş bilgisini yükle
      const salaryRes = await window.electronAPI.salary.getCurrent(Number(selectedEmployeeId.value))
      if (salaryRes.success && salaryRes.data && salaryRes.data.amount) form.grossSalary = salaryRes.data.amount
      // İzin bakiyesini yükle
      const year = new Date().getFullYear()
      const leaveRes = await window.electronAPI.leaveBalance.get(Number(selectedEmployeeId.value), year)
      if (leaveRes.success && leaveRes.data && typeof leaveRes.data.remainingDays === 'number') form.unusedLeaveDays = leaveRes.data.remainingDays
      calculateWorkingPeriod()
    }
  } catch (err) { /* ignore */ }
}

const calculateWorkingPeriod = () => {
  if (!selectedEmployee.value || !form.exitDate) return
  const hireDate = new Date(selectedEmployee.value.hireDate)
  const exitDate = new Date(form.exitDate)
  
  let years = exitDate.getFullYear() - hireDate.getFullYear()
  let months = exitDate.getMonth() - hireDate.getMonth()
  let days = exitDate.getDate() - hireDate.getDate()
  
  if (days < 0) { months--; days += 30 }
  if (months < 0) { years--; months += 12 }
  
  workingYears.value = years
  workingMonths.value = months
  workingDays.value = days
}

const calculateSeverance = () => {
  if (!canCalculate.value) return
  
  const totalDays = workingYears.value * 365 + workingMonths.value * 30 + workingDays.value
  const totalYears = totalDays / 365
  const dailyWage = form.grossSalary / 30
  
  // Kıdem tazminatı hesaplama
  let severance = 0
  let severanceNote = ''
  
  // Kıdem tazminatı hak eden durumlar
  const severanceEligible = ['termination', 'retirement', 'military', 'death'].includes(form.exitReason)
  
  if (severanceEligible && totalYears >= 1) {
    const yearlyAmount = Math.min(form.grossSalary, form.severanceCeiling)
    severance = yearlyAmount * totalYears
    severanceNote = 'Kıdem tazminatı hesaplandı.'
  } else if (form.exitReason === 'resignation') {
    severanceNote = 'İstifa durumunda kıdem tazminatı ödenmez.'
  } else if (totalYears < 1) {
    severanceNote = '1 yıldan az çalışma süresinde kıdem tazminatı ödenmez.'
  }
  
  // İhbar tazminatı hesaplama
  let notice = 0
  let noticeDays = 0
  
  if (form.includeNotice && form.exitReason === 'termination') {
    if (totalDays < 180) noticeDays = 14
    else if (totalDays < 540) noticeDays = 28
    else if (totalDays < 1080) noticeDays = 42
    else noticeDays = 56
    
    notice = dailyWage * noticeDays
  }
  
  // İzin ücreti
  const leavePayout = form.unusedLeaveDays * dailyWage
  
  // Toplam
  const total = severance + notice + leavePayout - form.unpaidAdvance
  
  result.value = {
    severance,
    notice,
    leavePayout,
    advanceDeduction: form.unpaidAdvance,
    total: Math.max(0, total),
    workingPeriod: `${workingYears.value} yıl ${workingMonths.value} ay ${workingDays.value} gün`,
    severanceYears: totalYears.toFixed(2),
    noticeDays,
    dailyWage,
    note: severanceNote
  }
}

const resetForm = () => {
  selectedEmployeeId.value = ''
  selectedEmployee.value = null
  form.exitDate = new Date().toISOString().split('T')[0]
  form.grossSalary = 0
  form.exitReason = ''
  form.unusedLeaveDays = 0
  form.unpaidAdvance = 0
  form.includeNotice = true
  result.value = null
  workingYears.value = 0
  workingMonths.value = 0
  workingDays.value = 0
}

const printResult = () => window.print()
const exportPdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('tr-TR') : '-'
const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount)

onMounted(async () => { await loadEmployees() })
</script>

<style scoped>
.severance-calculator-page { max-width: 1200px; margin: 0 auto; }

.calculator-container { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
@media (max-width: 1024px) { .calculator-container { grid-template-columns: 1fr; } }

.calculator-form { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.calculator-form h3 { margin: 0 0 1.5rem; color: #2c3e50; font-size: 1.25rem; }

.form-section { margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #e9ecef; }
.form-section:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.form-section h4 { margin: 0 0 1rem; color: #495057; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.95rem; }

.employee-summary { background: #f8f9fa; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
.summary-item { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
.summary-item:last-child { margin-bottom: 0; }
.summary-item .label { color: #6c757d; }
.summary-item .value { font-weight: 600; color: #2c3e50; }
.summary-item .value.highlight { color: #0466c8; }

.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.checkbox-label input { cursor: pointer; }

.form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
.btn { padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-lg { padding: 0.875rem 2rem; font-size: 1rem; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-primary:disabled { background: #adb5bd; cursor: not-allowed; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }
.btn-outline { background: white; border: 1px solid #dee2e6; color: #495057; }
.btn-outline:hover { background: #f8f9fa; }

.calculator-result { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.calculator-result h3 { margin: 0 0 1.5rem; color: #2c3e50; font-size: 1.25rem; }

.result-card { background: linear-gradient(135deg, #a9dbb8, #8fcca0); border-radius: 12px; padding: 1.5rem; color: #2c3e50; }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(0, 0, 0, 0.1); }
.result-title { font-size: 1rem; font-weight: 600; }
.result-total { font-size: 2rem; font-weight: 700; }

.result-breakdown { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
.breakdown-item { display: flex; justify-content: space-between; padding: 0.5rem 0; }
.breakdown-item.deduction .item-value { color: #dc3545; }
.item-label { font-weight: 500; }
.item-value { font-weight: 600; }

.result-details { background: rgba(255, 255, 255, 0.5); border-radius: 8px; padding: 1rem; }
.result-details h4 { margin: 0 0 0.75rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
.detail-row { display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.9rem; }

.result-note { display: flex; align-items: flex-start; gap: 0.5rem; margin-top: 1rem; padding: 0.75rem; background: rgba(255, 255, 255, 0.7); border-radius: 6px; font-size: 0.85rem; }
.note-icon { font-size: 1rem; }

.result-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
</style>
