<template>
  <div class="personnel-distribution-page">
    <PageHeader 
      title="Personel Dağılım Raporu" 
      description="Departman, yaş, cinsiyet ve diğer kriterlere göre personel dağılımı"
    />

    <div class="stats-grid">
      <StatCard icon="👥" :value="data.totalEmployees" label="Toplam Personel" color="primary" />
      <StatCard icon="🏢" :value="data.byDepartment?.length || 0" label="Departman" color="info" />
      <StatCard icon="📊" :value="data.byContractType?.length || 0" label="Sözleşme Türü" color="success" />
      <StatCard icon="🎓" :value="data.byEducation?.length || 0" label="Eğitim Seviyesi" color="warning" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <button class="btn btn-outline btn-sm" @click="loadData" :disabled="loading">
          🔄 Yenile
        </button>
      </template>
    </ActionToolbar>

    <div class="charts-grid" v-if="!loading">
      <!-- Departman Dağılımı -->
      <div class="chart-card">
        <h3>🏢 Departman Dağılımı</h3>
        <div class="chart-container">
          <div class="bar-chart">
            <div v-for="item in data.byDepartment" :key="item.departmentId" class="bar-item">
              <div class="bar-label">{{ item.departmentName }}</div>
              <div class="bar-wrapper">
                <div class="bar" :style="{ width: getBarWidth(item.count, maxDeptCount) + '%' }">
                  <span class="bar-value">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cinsiyet Dağılımı -->
      <div class="chart-card">
        <h3>👫 Cinsiyet Dağılımı</h3>
        <div class="chart-container">
          <div class="pie-chart-wrapper">
            <div class="pie-legend">
              <div v-for="(item, index) in data.byGender" :key="item.gender" class="legend-item">
                <span class="legend-color" :style="{ background: pieColors[index % pieColors.length] }"></span>
                <span class="legend-label">{{ item.gender }}</span>
                <span class="legend-value">{{ item.count }} ({{ getPercentage(item.count, data.totalEmployees) }}%)</span>
              </div>
            </div>
            <div class="pie-visual">
              <svg viewBox="0 0 100 100" class="pie-svg">
                <circle v-for="(item, index) in genderPieData" :key="index"
                  :r="25" cx="50" cy="50" fill="transparent"
                  :stroke="pieColors[index % pieColors.length]"
                  stroke-width="50"
                  :stroke-dasharray="item.dashArray"
                  :stroke-dashoffset="item.dashOffset"
                  :transform="`rotate(-90 50 50)`"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Yaş Dağılımı -->
      <div class="chart-card">
        <h3>📅 Yaş Grupları</h3>
        <div class="chart-container">
          <div class="bar-chart horizontal">
            <div v-for="item in data.byAge" :key="item.ageGroup" class="bar-item">
              <div class="bar-label">{{ item.ageGroup }}</div>
              <div class="bar-wrapper">
                <div class="bar age-bar" :style="{ width: getBarWidth(item.count, maxAgeCount) + '%' }">
                  <span class="bar-value">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sözleşme Türü Dağılımı -->
      <div class="chart-card">
        <h3>📄 Sözleşme Türü</h3>
        <div class="chart-container">
          <div class="donut-chart-wrapper">
            <div class="donut-items">
              <div v-for="(item, index) in data.byContractType" :key="item.contractType" class="donut-item">
                <span class="donut-color" :style="{ background: contractColors[index % contractColors.length] }"></span>
                <span class="donut-label">{{ item.contractType }}</span>
                <span class="donut-value">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Eğitim Seviyesi Dağılımı -->
      <div class="chart-card">
        <h3>🎓 Eğitim Seviyesi</h3>
        <div class="chart-container">
          <div class="bar-chart">
            <div v-for="item in data.byEducation" :key="item.educationLevel" class="bar-item">
              <div class="bar-label">{{ item.educationLevel }}</div>
              <div class="bar-wrapper">
                <div class="bar edu-bar" :style="{ width: getBarWidth(item.count, maxEduCount) + '%' }">
                  <span class="bar-value">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kıdem Dağılımı -->
      <div class="chart-card">
        <h3>⏳ Kıdem Yılı</h3>
        <div class="chart-container">
          <div class="bar-chart">
            <div v-for="item in data.bySeniority" :key="item.seniority" class="bar-item">
              <div class="bar-label">{{ item.seniority }}</div>
              <div class="bar-wrapper">
                <div class="bar seniority-bar" :style="{ width: getBarWidth(item.count, maxSeniorityCount) + '%' }">
                  <span class="bar-value">{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <span class="loading-spinner">⏳</span>
      <p>Veriler yükleniyor...</p>
    </div>
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

const data = reactive({
  totalEmployees: 0,
  byDepartment: [] as any[],
  byGender: [] as any[],
  byAge: [] as any[],
  byContractType: [] as any[],
  byEducation: [] as any[],
  bySeniority: [] as any[]
})

const pieColors = ['#0466c8', '#a9dbb8', '#ffc107', '#dc3545', '#6c757d', '#17a2b8']
const contractColors = ['#198754', '#0d6efd', '#ffc107', '#dc3545']

const maxDeptCount = computed(() => Math.max(...data.byDepartment.map(d => d.count), 1))
const maxAgeCount = computed(() => Math.max(...data.byAge.map(d => d.count), 1))
const maxEduCount = computed(() => Math.max(...data.byEducation.map(d => d.count), 1))
const maxSeniorityCount = computed(() => Math.max(...data.bySeniority.map(d => d.count), 1))

const genderPieData = computed(() => {
  const total = data.totalEmployees || 1
  let offset = 0
  return data.byGender.map(item => {
    const percentage = (item.count / total) * 100
    const circumference = 2 * Math.PI * 25
    const dashArray = `${(percentage / 100) * circumference} ${circumference}`
    const dashOffset = -offset * (circumference / 100)
    offset += percentage
    return { dashArray, dashOffset }
  })
})

const loadData = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.report.getEmployeeDistribution()
    if (result.success && result.data) {
      Object.assign(data, result.data)
    }
  } catch (err) {
    error('Veriler yüklenemedi')
  } finally {
    loading.value = false
  }
}

const getBarWidth = (value: number, max: number) => Math.round((value / max) * 100)
const getPercentage = (value: number, total: number) => total > 0 ? Math.round((value / total) * 100) : 0

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

onMounted(() => loadData())
</script>

<style scoped>
.personnel-distribution-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }

.charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
@media (max-width: 1024px) { .charts-grid { grid-template-columns: 1fr; } }

.chart-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.chart-card h3 { margin: 0 0 1rem; font-size: 1rem; color: #2c3e50; }
.chart-container { min-height: 200px; }

.bar-chart { display: flex; flex-direction: column; gap: 0.75rem; }
.bar-item { display: flex; align-items: center; gap: 1rem; }
.bar-label { min-width: 120px; font-size: 0.85rem; color: #495057; text-align: right; }
.bar-wrapper { flex: 1; background: #e9ecef; border-radius: 4px; height: 28px; overflow: hidden; }
.bar { height: 100%; background: linear-gradient(90deg, #a9dbb8, #8fcca0); border-radius: 4px; display: flex; align-items: center; justify-content: flex-end; padding-right: 0.5rem; min-width: 30px; transition: width 0.5s ease; }
.bar-value { font-size: 0.75rem; font-weight: 600; color: #2c3e50; }
.bar.age-bar { background: linear-gradient(90deg, #0466c8, #0353a4); }
.bar.age-bar .bar-value { color: white; }
.bar.edu-bar { background: linear-gradient(90deg, #ffc107, #e0a800); }
.bar.seniority-bar { background: linear-gradient(90deg, #198754, #157347); }
.bar.seniority-bar .bar-value { color: white; }

.pie-chart-wrapper { display: flex; align-items: center; gap: 2rem; }
.pie-legend { flex: 1; }
.legend-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.legend-color { width: 16px; height: 16px; border-radius: 4px; }
.legend-label { flex: 1; font-size: 0.85rem; color: #495057; }
.legend-value { font-size: 0.85rem; font-weight: 600; color: #2c3e50; }
.pie-visual { width: 120px; height: 120px; }
.pie-svg { width: 100%; height: 100%; }

.donut-chart-wrapper { }
.donut-items { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.donut-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; }
.donut-color { width: 12px; height: 12px; border-radius: 50%; }
.donut-label { flex: 1; font-size: 0.85rem; color: #495057; }
.donut-value { font-size: 1rem; font-weight: 700; color: #2c3e50; }

.loading-state { text-align: center; padding: 3rem; }
.loading-spinner { font-size: 2rem; display: block; margin-bottom: 1rem; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-outline { background: white; border: 1px solid #dee2e6; color: #495057; }
.btn-outline:hover { background: #f8f9fa; }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8rem; }
</style>
