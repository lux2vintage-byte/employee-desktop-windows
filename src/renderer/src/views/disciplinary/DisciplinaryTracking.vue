<template>
  <div class="disciplinary-tracking-page">
    <PageHeader 
      title="Disiplin Takip Listesi" 
      description="Personel bazlı disiplin geçmişini takip edin ve analiz edin"
    />

    <div class="stats-grid">
      <StatCard icon="👥" :value="stats.employeesWithRecords" label="Kayıtlı Personel" color="primary" />
      <StatCard icon="📊" :value="stats.avgRecordsPerEmployee.toFixed(1)" label="Ort. Kayıt/Personel" color="info" />
      <StatCard icon="⚠️" :value="stats.highRiskCount" label="Yüksek Riskli" color="danger" />
      <StatCard icon="📅" :value="stats.thisMonthCount" label="Bu Ay" color="warning" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <input v-model="searchTerm" type="text" placeholder="Personel ara..." class="search-input" />
        <select v-model="filterRisk" @change="applyFilters" class="filter-select">
          <option value="">Tüm Risk Seviyeleri</option>
          <option value="high">🔴 Yüksek Risk</option>
          <option value="medium">🟡 Orta Risk</option>
          <option value="low">🟢 Düşük Risk</option>
        </select>
      </template>
    </ActionToolbar>

    <div v-if="loading" class="loading-state">Yükleniyor...</div>

    <div v-else-if="filteredEmployees.length === 0" class="empty-state">
      <span>📋</span>
      <p>Disiplin kaydı bulunan personel yok</p>
    </div>

    <div v-else class="tracking-grid">
      <div v-for="emp in filteredEmployees" :key="emp.id" class="tracking-card" :class="`risk-${emp.riskLevel}`">
        <div class="card-header">
          <div class="employee-info">
            <div class="employee-avatar">{{ emp.firstName?.charAt(0) }}{{ emp.lastName?.charAt(0) }}</div>
            <div class="employee-details">
              <span class="employee-name">{{ emp.firstName }} {{ emp.lastName }}</span>
              <span class="employee-code">{{ emp.employeeCode }}</span>
            </div>
          </div>
          <div class="risk-indicator" :class="`risk-${emp.riskLevel}`">
            {{ getRiskLabel(emp.riskLevel) }}
          </div>
        </div>
        <div class="card-stats">
          <div class="stat-item">
            <span class="stat-value">{{ emp.totalRecords }}</span>
            <span class="stat-label">Toplam Kayıt</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ emp.warningCount }}</span>
            <span class="stat-label">Uyarı</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ emp.deductionCount }}</span>
            <span class="stat-label">Kesinti</span>
          </div>
        </div>

        <div class="card-violations">
          <h4>İhlal Dağılımı</h4>
          <div class="violation-bars">
            <div v-for="(count, type) in emp.violationBreakdown" :key="type" class="violation-bar-item">
              <span class="bar-label">{{ type }}</span>
              <div class="bar-container">
                <div class="bar-fill" :style="{ width: (count / emp.totalRecords * 100) + '%' }"></div>
              </div>
              <span class="bar-count">{{ count }}</span>
            </div>
          </div>
        </div>

        <div class="card-timeline" v-if="emp.recentRecords.length > 0">
          <h4>Son Kayıtlar</h4>
          <div class="timeline">
            <div v-for="record in emp.recentRecords" :key="record.id" class="timeline-item">
              <div class="timeline-dot" :class="`action-${getActionClass(record.actionTaken)}`"></div>
              <div class="timeline-content">
                <span class="timeline-date">{{ formatDate(record.incidentDate) }}</span>
                <span class="timeline-action">{{ record.actionTaken }}</span>
                <span class="timeline-violation">{{ record.violationType }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <button class="btn btn-sm btn-outline" @click="viewAllRecords(emp)">
            📋 Tüm Kayıtları Gör
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showRecordsModal" class="modal-overlay" @click.self="closeRecordsModal">
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h3>{{ selectedEmployee?.firstName }} {{ selectedEmployee?.lastName }} - Disiplin Kayıtları</h3>
              <button class="close-btn" @click="closeRecordsModal">✕</button>
            </div>
            <div class="modal-body">
              <div v-if="employeeRecords.length === 0" class="empty-state-sm">Kayıt bulunamadı</div>
              <div v-else class="records-list">
                <div v-for="record in employeeRecords" :key="record.id" class="record-item">
                  <div class="record-date">{{ formatDate(record.incidentDate) }}</div>
                  <div class="record-details">
                    <span :class="['violation-badge', `violation-${getViolationClass(record.violationType)}`]">{{ record.violationType }}</span>
                    <span :class="['action-badge', `action-${getActionClass(record.actionTaken)}`]">{{ record.actionTaken }}</span>
                  </div>
                  <div class="record-defense" v-if="record.defense">
                    <strong>Savunma:</strong> {{ record.defense }}
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

const { success, error } = useToast()

const loading = ref(false)
const showRecordsModal = ref(false)
const allRecords = ref<any[]>([])
const employeeRecords = ref<any[]>([])
const selectedEmployee = ref<any>(null)
const searchTerm = ref('')
const filterRisk = ref('')

const stats = reactive({ employeesWithRecords: 0, avgRecordsPerEmployee: 0, highRiskCount: 0, thisMonthCount: 0 })

const employeeSummaries = computed(() => {
  const summaryMap = new Map<number, any>()
  
  allRecords.value.forEach(record => {
    const empId = record.employeeId
    if (!summaryMap.has(empId)) {
      summaryMap.set(empId, {
        id: empId,
        firstName: record.employee?.firstName,
        lastName: record.employee?.lastName,
        employeeCode: record.employee?.employeeCode,
        totalRecords: 0,
        warningCount: 0,
        deductionCount: 0,
        violationBreakdown: {} as Record<string, number>,
        recentRecords: [] as any[],
        riskLevel: 'low'
      })
    }
    
    const summary = summaryMap.get(empId)!
    summary.totalRecords++
    
    if (record.actionTaken === 'Sözlü Uyarı' || record.actionTaken === 'Yazılı Uyarı') {
      summary.warningCount++
    }
    if (record.actionTaken === 'Maaş Kesintisi') {
      summary.deductionCount++
    }
    
    const vType = record.violationType || 'Diğer'
    summary.violationBreakdown[vType] = (summary.violationBreakdown[vType] || 0) + 1
    
    if (summary.recentRecords.length < 3) {
      summary.recentRecords.push(record)
    }
  })
  
  // Risk seviyesi hesapla
  summaryMap.forEach(summary => {
    if (summary.totalRecords >= 5 || summary.deductionCount >= 2) {
      summary.riskLevel = 'high'
    } else if (summary.totalRecords >= 3 || summary.deductionCount >= 1) {
      summary.riskLevel = 'medium'
    } else {
      summary.riskLevel = 'low'
    }
  })
  
  return Array.from(summaryMap.values()).sort((a, b) => b.totalRecords - a.totalRecords)
})

const filteredEmployees = computed(() => {
  let result = employeeSummaries.value
  
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(e => 
      e.firstName?.toLowerCase().includes(term) ||
      e.lastName?.toLowerCase().includes(term) ||
      e.employeeCode?.toLowerCase().includes(term)
    )
  }
  
  if (filterRisk.value) {
    result = result.filter(e => e.riskLevel === filterRisk.value)
  }
  
  return result
})

const loadRecords = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.disciplinary.getAll({ limit: 1000 })
    if (result.success) {
      allRecords.value = result.data || []
      updateStats()
    }
  } catch (err) { error('Kayıtlar yüklenemedi') }
  finally { loading.value = false }
}

const updateStats = () => {
  const summaries = employeeSummaries.value
  stats.employeesWithRecords = summaries.length
  stats.avgRecordsPerEmployee = summaries.length > 0 
    ? summaries.reduce((sum, e) => sum + e.totalRecords, 0) / summaries.length 
    : 0
  stats.highRiskCount = summaries.filter(e => e.riskLevel === 'high').length
  
  const now = new Date()
  stats.thisMonthCount = allRecords.value.filter(r => {
    const date = new Date(r.incidentDate)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length
}

const viewAllRecords = async (emp: any) => {
  selectedEmployee.value = emp
  try {
    const result = await window.electronAPI.disciplinary.getByEmployee(emp.id)
    if (result.success) {
      employeeRecords.value = result.data || []
    }
  } catch (err) { error('Kayıtlar yüklenemedi') }
  showRecordsModal.value = true
}

const closeRecordsModal = () => {
  showRecordsModal.value = false
  selectedEmployee.value = null
  employeeRecords.value = []
}

const applyFilters = () => { /* computed handles filtering */ }
const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

const getRiskLabel = (level: string) => {
  const labels: Record<string, string> = { high: '🔴 Yüksek', medium: '🟡 Orta', low: '🟢 Düşük' }
  return labels[level] || level
}

const getViolationClass = (type: string) => {
  const map: Record<string, string> = { 'İşe Geç Kalma': 'late', 'İş Güvenliği İhlali': 'safety', 'Devamsızlık': 'absence', 'Görev İhmali': 'neglect', 'Diğer': 'other' }
  return map[type] || 'other'
}

const getActionClass = (action: string) => {
  const map: Record<string, string> = { 'Sözlü Uyarı': 'verbal', 'Yazılı Uyarı': 'written', 'Tutanak': 'record', 'Maaş Kesintisi': 'deduction', 'İşten Çıkarma': 'termination' }
  return map[action] || 'other'
}

const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('tr-TR') : '-'

onMounted(async () => { await loadRecords() })
</script>

<style scoped>
.disciplinary-tracking-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-input, .filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; }
.search-input { min-width: 200px; }
.filter-select { min-width: 160px; }

.loading-state, .empty-state { text-align: center; padding: 3rem; color: #6c757d; }
.empty-state span { font-size: 4rem; display: block; margin-bottom: 1rem; }
.empty-state-sm { text-align: center; padding: 2rem; color: #6c757d; }

.tracking-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem; }

.tracking-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden; border-left: 4px solid #dee2e6; }
.tracking-card.risk-high { border-left-color: #dc3545; }
.tracking-card.risk-medium { border-left-color: #ffc107; }
.tracking-card.risk-low { border-left-color: #28a745; }

.card-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: #f8f9fa; }
.employee-info { display: flex; align-items: center; gap: 0.75rem; }
.employee-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #a9dbb8, #8fcca0); color: #2c3e50; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; }
.employee-details { display: flex; flex-direction: column; }
.employee-name { font-weight: 600; color: #2c3e50; }
.employee-code { font-size: 0.75rem; color: #6c757d; }

.risk-indicator { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.risk-indicator.risk-high { background: #f8d7da; color: #721c24; }
.risk-indicator.risk-medium { background: #fff3cd; color: #856404; }
.risk-indicator.risk-low { background: #d4edda; color: #155724; }

.card-stats { display: flex; justify-content: space-around; padding: 1rem; border-bottom: 1px solid #e9ecef; }
.stat-item { text-align: center; }
.stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #2c3e50; }
.stat-label { font-size: 0.75rem; color: #6c757d; }

.card-violations { padding: 1rem 1.25rem; }
.card-violations h4 { margin: 0 0 0.75rem; font-size: 0.85rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
.violation-bars { display: flex; flex-direction: column; gap: 0.5rem; }
.violation-bar-item { display: flex; align-items: center; gap: 0.5rem; }
.bar-label { font-size: 0.8rem; color: #495057; min-width: 100px; }
.bar-container { flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #a9dbb8, #8fcca0); border-radius: 4px; }
.bar-count { font-size: 0.8rem; font-weight: 600; color: #2c3e50; min-width: 20px; text-align: right; }

.card-timeline { padding: 1rem 1.25rem; border-top: 1px solid #e9ecef; }
.card-timeline h4 { margin: 0 0 0.75rem; font-size: 0.85rem; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
.timeline { display: flex; flex-direction: column; gap: 0.5rem; }
.timeline-item { display: flex; align-items: flex-start; gap: 0.75rem; }
.timeline-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
.timeline-dot.action-verbal { background: #28a745; }
.timeline-dot.action-written { background: #ffc107; }
.timeline-dot.action-record { background: #17a2b8; }
.timeline-dot.action-deduction { background: #dc3545; }
.timeline-dot.action-termination { background: #343a40; }
.timeline-content { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.8rem; }
.timeline-date { color: #6c757d; }
.timeline-action { font-weight: 600; color: #2c3e50; }
.timeline-violation { color: #495057; }

.card-footer { padding: 1rem 1.25rem; border-top: 1px solid #e9ecef; }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; }
.btn-outline { background: white; border: 1px solid #dee2e6; color: #495057; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.btn-outline:hover { background: #f8f9fa; border-color: #adb5bd; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-container { background: white; border-radius: 12px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
.modal-container.modal-lg { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }

.records-list { display: flex; flex-direction: column; gap: 1rem; }
.record-item { padding: 1rem; background: #f8f9fa; border-radius: 8px; }
.record-date { font-weight: 600; color: #2c3e50; margin-bottom: 0.5rem; }
.record-details { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
.record-defense { font-size: 0.85rem; color: #6c757d; padding-top: 0.5rem; border-top: 1px solid #e9ecef; }

.violation-badge, .action-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
.violation-late { background: #fff3cd; color: #856404; }
.violation-safety { background: #f8d7da; color: #721c24; }
.violation-absence { background: #cce5ff; color: #004085; }
.violation-neglect { background: #e2e3e5; color: #383d41; }
.violation-other { background: #f8f9fa; color: #495057; }
.action-verbal { background: #d4edda; color: #155724; }
.action-written { background: #fff3cd; color: #856404; }
.action-record { background: #cce5ff; color: #004085; }
.action-deduction { background: #f8d7da; color: #721c24; }
.action-termination { background: #721c24; color: white; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
