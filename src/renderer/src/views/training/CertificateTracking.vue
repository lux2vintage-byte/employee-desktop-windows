<template>
  <div class="certificate-tracking-page">
    <PageHeader 
      title="Sertifika Takibi" 
      description="Personel sertifikalarını görüntüleyin ve yönetin"
    />

    <div class="stats-grid">
      <StatCard icon="📜" :value="stats.totalCertificates" label="Toplam Sertifika" color="primary" />
      <StatCard icon="👥" :value="stats.employeesWithCert" label="Sertifikalı Personel" color="success" />
      <StatCard icon="🏆" :value="stats.topCategory" label="En Çok Sertifika" color="info" />
      <StatCard icon="📅" :value="stats.thisMonth" label="Bu Ay Alınan" color="warning" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <input v-model="searchTerm" type="text" placeholder="Personel veya eğitim ara..." class="search-input" />
        <select v-model="filterCategory" @change="loadCertificates" class="filter-select">
          <option value="">Tüm Kategoriler</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </template>
    </ActionToolbar>

    <div v-if="loading" class="loading-state">
      <span>Yükleniyor...</span>
    </div>

    <div v-else-if="filteredCertificates.length === 0" class="empty-state">
      <span>📜</span>
      <p>Henüz sertifika kaydı bulunmuyor</p>
    </div>

    <div v-else class="certificates-grid">
      <div v-for="cert in filteredCertificates" :key="cert.id" class="certificate-card">
        <div class="cert-header">
          <div class="cert-icon">🏅</div>
          <div class="cert-badge" v-if="cert.training?.category">{{ cert.training.category }}</div>
        </div>
        <div class="cert-body">
          <h4 class="cert-title">{{ cert.training?.title }}</h4>
          <p class="cert-provider" v-if="cert.training?.provider">{{ cert.training.provider }}</p>
          <div class="cert-employee">
            <div class="employee-avatar">{{ cert.employee?.firstName?.charAt(0) }}{{ cert.employee?.lastName?.charAt(0) }}</div>
            <div class="employee-details">
              <span class="employee-name">{{ cert.employee?.firstName }} {{ cert.employee?.lastName }}</span>
              <span class="employee-code">{{ cert.employee?.employeeCode }}</span>
            </div>
          </div>
        </div>
        <div class="cert-footer">
          <div class="cert-date">
            <span class="date-icon">📅</span>
            <span>{{ formatDate(cert.completionDate) }}</span>
          </div>
          <div class="cert-duration">
            <span class="duration-icon">🕐</span>
            <span>{{ cert.training?.durationHours }} saat</span>
          </div>
          <a v-if="cert.certificateUrl" :href="cert.certificateUrl" target="_blank" class="cert-link">
            📄 Görüntüle
          </a>
          <button v-else class="btn-add-cert" @click="addCertificateUrl(cert)">
            ➕ URL Ekle
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container">
            <div class="modal-header">
              <h3>Sertifika URL Ekle</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveCertificateUrl" class="modal-body">
              <div class="form-group">
                <label>Sertifika URL / Dosya Yolu</label>
                <input v-model="certUrl" type="text" class="form-control" placeholder="https://... veya dosya yolu" />
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">Kaydet</button>
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
import { useToast } from '@/composables/useToast'

const { success, error } = useToast()

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const certificates = ref<any[]>([])
const categories = ref<string[]>([])
const searchTerm = ref('')
const filterCategory = ref('')
const selectedCert = ref<any>(null)
const certUrl = ref('')

const stats = reactive({ totalCertificates: 0, employeesWithCert: 0, topCategory: '-', thisMonth: 0 })

const filteredCertificates = computed(() => {
  let result = certificates.value
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(c => 
      c.employee?.firstName?.toLowerCase().includes(term) ||
      c.employee?.lastName?.toLowerCase().includes(term) ||
      c.training?.title?.toLowerCase().includes(term)
    )
  }
  if (filterCategory.value) {
    result = result.filter(c => c.training?.category === filterCategory.value)
  }
  return result
})

const loadCertificates = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.training.getAllEmployeeTrainings({ status: 'Completed', limit: 500 })
    if (result.success) {
      certificates.value = result.data || []
      updateStats()
    }
  } catch (err) { error('Sertifikalar yüklenemedi') }
  finally { loading.value = false }
}

const loadCategories = async () => {
  try {
    const result = await window.electronAPI.training.getCategories()
    if (result.success) categories.value = result.data || []
  } catch (err) { /* ignore */ }
}

const updateStats = () => {
  stats.totalCertificates = certificates.value.length
  const uniqueEmployees = new Set(certificates.value.map(c => c.employeeId))
  stats.employeesWithCert = uniqueEmployees.size
  
  // En çok sertifika olan kategori
  const categoryCounts: Record<string, number> = {}
  certificates.value.forEach(c => {
    const cat = c.training?.category || 'Diğer'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })
  const topCat = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]
  stats.topCategory = topCat ? topCat[0] : '-'
  
  // Bu ay alınan
  const now = new Date()
  const thisMonth = certificates.value.filter(c => {
    if (!c.completionDate) return false
    const date = new Date(c.completionDate)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  stats.thisMonth = thisMonth.length
}

const addCertificateUrl = (cert: any) => {
  selectedCert.value = cert
  certUrl.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedCert.value = null
}

const saveCertificateUrl = async () => {
  if (!selectedCert.value || !certUrl.value) return
  saving.value = true
  try {
    const result = await window.electronAPI.training.completeTraining(selectedCert.value.id, certUrl.value)
    if (result.success) {
      success('Sertifika URL eklendi')
      closeModal()
      await loadCertificates()
    } else { error(result.errors?.[0] || 'İşlem başarısız') }
  } catch (err) { error('İşlem sırasında hata oluştu') }
  finally { saving.value = false }
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('tr-TR') : '-'

onMounted(async () => { await loadCategories(); await loadCertificates() })
</script>

<style scoped>
.certificate-tracking-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-input, .filter-select { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; }
.search-input { min-width: 200px; }
.filter-select { min-width: 150px; }

.loading-state, .empty-state { text-align: center; padding: 3rem; color: #6c757d; }
.empty-state span { font-size: 4rem; display: block; margin-bottom: 1rem; }

.certificates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }

.certificate-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
.certificate-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12); }

.cert-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: linear-gradient(135deg, #a9dbb8, #8fcca0); }
.cert-icon { font-size: 2rem; }
.cert-badge { padding: 0.25rem 0.75rem; background: rgba(255, 255, 255, 0.9); border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: #2c3e50; }

.cert-body { padding: 1.25rem; }
.cert-title { margin: 0 0 0.5rem; font-size: 1.1rem; color: #2c3e50; }
.cert-provider { margin: 0 0 1rem; font-size: 0.85rem; color: #6c757d; }

.cert-employee { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; }
.employee-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem; }
.employee-details { display: flex; flex-direction: column; }
.employee-name { font-weight: 600; color: #2c3e50; }
.employee-code { font-size: 0.75rem; color: #6c757d; }

.cert-footer { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-top: 1px solid #e9ecef; background: #fafafa; }
.cert-date, .cert-duration { display: flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; color: #6c757d; }
.cert-link { margin-left: auto; color: #0466c8; text-decoration: none; font-weight: 500; font-size: 0.85rem; }
.cert-link:hover { text-decoration: underline; }
.btn-add-cert { margin-left: auto; padding: 0.375rem 0.75rem; background: #e7f1ff; color: #0466c8; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; }
.btn-add-cert:hover { background: #cce5ff; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-container { background: white; border-radius: 12px; width: 90%; max-width: 450px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.95rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #e9ecef; margin-top: 1rem; }
.btn { padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-secondary { background: #e9ecef; color: #495057; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
