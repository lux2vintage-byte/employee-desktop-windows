<template>
  <div class="employee-detail-page">
    <PageHeader 
      :title="employee ? `${employee.firstName} ${employee.lastName}` : 'Personel Detay'" 
      :description="employee?.employeeCode || ''"
    >
      <template #actions>
        <button class="btn btn-secondary" @click="goBack">
          ← Geri
        </button>
        <router-link :to="`/employees/${employee?.id}/edit`" class="btn btn-primary">
          ✏️ Düzenle
        </router-link>
      </template>
    </PageHeader>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <span>Yükleniyor...</span>
    </div>

    <div v-else-if="employee" class="detail-content">
      <!-- Profil Kartı -->
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-photo">
            <img v-if="employee.photoUrl" :src="employee.photoUrl" :alt="employee.firstName" />
            <div v-else class="photo-placeholder">
              {{ employee.firstName?.charAt(0) }}{{ employee.lastName?.charAt(0) }}
            </div>
          </div>
          <div class="profile-info">
            <h2 class="profile-name">{{ employee.firstName }} {{ employee.lastName }}</h2>
            <p class="profile-position">{{ employee.position?.title || '-' }}</p>
            <p class="profile-department">{{ employee.department?.name || '-' }}</p>
            <span :class="['status-badge', `status-${employee.status?.toLowerCase()}`]">
              {{ getStatusLabel(employee.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Sekmeler -->
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>

      <!-- Sekme İçerikleri -->
      <div class="tab-content">
        <!-- Temel Bilgiler -->
        <div v-if="activeTab === 'basic'" class="info-grid">
          <div class="info-card">
            <h4>📋 Kişisel Bilgiler</h4>
            <div class="info-row">
              <span class="info-label">Sicil No</span>
              <span class="info-value code">{{ employee.employeeCode }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">TC Kimlik No</span>
              <span class="info-value">{{ maskedIdentity }}</span>
              <button class="btn-reveal" @click="toggleIdentity">
                {{ showIdentity ? '🙈' : '👁️' }}
              </button>
            </div>
            <div class="info-row">
              <span class="info-label">Ad Soyad</span>
              <span class="info-value">{{ employee.firstName }} {{ employee.lastName }}</span>
            </div>
          </div>

          <div class="info-card">
            <h4>📞 İletişim Bilgileri</h4>
            <div class="info-row">
              <span class="info-label">İş E-Postası</span>
              <span class="info-value">{{ employee.emailWork || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Kişisel E-Posta</span>
              <span class="info-value">{{ employee.emailPersonal || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Telefon</span>
              <span class="info-value">{{ employee.phonePrimary || '-' }}</span>
            </div>
          </div>

          <div class="info-card">
            <h4>🏢 Organizasyonel Bilgiler</h4>
            <div class="info-row">
              <span class="info-label">Departman</span>
              <span class="info-value">{{ employee.department?.name || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Pozisyon</span>
              <span class="info-value">{{ employee.position?.title || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Yönetici</span>
              <span class="info-value">
                {{ employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '-' }}
              </span>
            </div>
          </div>

          <div class="info-card">
            <h4>💼 İş Bilgileri</h4>
            <div class="info-row">
              <span class="info-label">İşe Giriş Tarihi</span>
              <span class="info-value">{{ formatDate(employee.hireDate) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Kıdem</span>
              <span class="info-value">{{ calculateSeniority(employee.hireDate) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Sözleşme Tipi</span>
              <span class="info-value">{{ employee.contractType }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Durum</span>
              <span :class="['status-badge', `status-${employee.status?.toLowerCase()}`]">
                {{ getStatusLabel(employee.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Detay Bilgiler -->
        <div v-if="activeTab === 'details'" class="info-grid">
          <div class="info-card full-width">
            <div class="section-header">
              <h4>📝 Detay Bilgiler</h4>
              <button class="btn btn-sm btn-outline-primary" @click="openDetailsModal">
                ✏️ Düzenle
              </button>
            </div>
            <div v-if="details" class="details-grid">
              <div class="info-row">
                <span class="info-label">Doğum Tarihi</span>
                <span class="info-value">{{ details.birthDate ? formatDate(details.birthDate) : '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Kan Grubu</span>
                <span class="info-value">{{ details.bloodGroup || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Cinsiyet</span>
                <span class="info-value">{{ details.gender || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Medeni Durum</span>
                <span class="info-value">{{ details.maritalStatus || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Eğitim Durumu</span>
                <span class="info-value">{{ details.educationLevel || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Askerlik Durumu</span>
                <span class="info-value">{{ details.militaryStatus || '-' }}</span>
              </div>
              <div class="info-row full-width">
                <span class="info-label">Ev Adresi</span>
                <span class="info-value">{{ details.addressHome || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Acil Durum Kişisi</span>
                <span class="info-value">{{ details.emergencyContactName || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Acil Durum Telefonu</span>
                <span class="info-value">{{ details.emergencyContactPhone || '-' }}</span>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>Detay bilgisi henüz girilmemiş</p>
              <button class="btn btn-sm btn-primary" @click="openDetailsModal">
                ➕ Detay Bilgisi Ekle
              </button>
            </div>
          </div>
        </div>

        <!-- Belgeler -->
        <div v-if="activeTab === 'documents'" class="documents-section">
          <div class="section-header">
            <h4>📁 Belgeler</h4>
            <button class="btn btn-sm btn-primary" @click="openDocumentModal">
              ➕ Belge Yükle
            </button>
          </div>
          <div v-if="documents.length > 0" class="documents-grid">
            <div v-for="doc in documents" :key="doc.id" class="document-card">
              <div class="document-icon">📄</div>
              <div class="document-info">
                <span class="document-type">{{ doc.documentType }}</span>
                <span class="document-date">{{ formatDate(doc.uploadDate) }}</span>
              </div>
              <div class="document-actions">
                <button class="btn-icon" title="İndir">⬇️</button>
                <button class="btn-icon delete" @click="deleteDocument(doc.id)" title="Sil">🗑️</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>Henüz belge yüklenmemiş</p>
          </div>
        </div>

        <!-- Astlar -->
        <div v-if="activeTab === 'subordinates'" class="subordinates-section">
          <h4>👥 Astlar ({{ subordinates.length }})</h4>
          <div v-if="subordinates.length > 0" class="subordinates-grid">
            <div v-for="sub in subordinates" :key="sub.id" class="subordinate-card" @click="viewEmployee(sub.id)">
              <div class="subordinate-avatar">
                {{ sub.firstName?.charAt(0) }}{{ sub.lastName?.charAt(0) }}
              </div>
              <div class="subordinate-info">
                <span class="subordinate-name">{{ sub.firstName }} {{ sub.lastName }}</span>
                <span class="subordinate-code">{{ sub.employeeCode }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>Bu personelin astı bulunmuyor</p>
          </div>
        </div>
      </div>
    </div>
    <!-- Detay Düzenleme Modalı -->
    <div v-if="showDetailsModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Personel Detaylarını Düzenle</h3>
          <button class="close-btn" @click="closeDetailsModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Doğum Tarihi</label>
            <input v-model="detailsForm.birthDate" type="date" class="form-control" />
          </div>
          <div class="form-group">
            <label>Kan Grubu</label>
            <select v-model="detailsForm.bloodGroup" class="form-control">
              <option value="">Seçiniz</option>
              <option v-for="bg in bloodGroups" :key="bg" :value="bg">{{ bg }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Cinsiyet</label>
            <select v-model="detailsForm.gender" class="form-control">
              <option value="">Seçiniz</option>
              <option v-for="g in genders" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Medeni Durum</label>
            <select v-model="detailsForm.maritalStatus" class="form-control">
              <option value="">Seçiniz</option>
              <option v-for="ms in maritalStatuses" :key="ms" :value="ms">{{ ms }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Eğitim Durumu</label>
            <input v-model="detailsForm.educationLevel" type="text" class="form-control" placeholder="Örn: Lisans" />
          </div>
          <div class="form-group">
            <label>Askerlik Durumu</label>
            <select v-model="detailsForm.militaryStatus" class="form-control">
              <option value="">Seçiniz</option>
              <option v-for="ms in militaryStatuses" :key="ms" :value="ms">{{ ms }}</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label>Ev Adresi</label>
            <textarea v-model="detailsForm.addressHome" class="form-control" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Acil Durum Kişisi</label>
            <input v-model="detailsForm.emergencyContactName" type="text" class="form-control" />
          </div>
          <div class="form-group">
            <label>Acil Durum Telefonu</label>
            <input v-model="detailsForm.emergencyContactPhone" type="text" class="form-control" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeDetailsModal">İptal</button>
          <button class="btn btn-primary" @click="saveDetails" :disabled="savingDetails">
            {{ savingDetails ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Belge Yükleme Modalı -->
    <div v-if="showDocumentModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Yeni Belge Yükle</h3>
          <button class="close-btn" @click="closeDocumentModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Belge Tipi</label>
            <select v-model="documentForm.documentType" class="form-control">
              <option v-for="dt in documentTypes" :key="dt" :value="dt">{{ dt }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Açıklama</label>
            <input v-model="documentForm.description" type="text" class="form-control" />
          </div>
          <div class="form-group full-width">
            <label>Dosya Seç</label>
            <input type="file" @change="handleFileSelect" class="form-control" />
            <small v-if="documentForm.filePath" class="text-success">
              Seçilen dosya: {{ documentForm.fileName }}
            </small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeDocumentModal">İptal</button>
          <button class="btn btn-primary" @click="saveDocument" :disabled="savingDocument">
            {{ savingDocument ? 'Yükleniyor...' : 'Yükle' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const { showToast } = useToast()

// State
const loading = ref(true)
const employee = ref<any>(null)
const details = ref<any>(null)
const documents = ref<any[]>([])
const subordinates = ref<any[]>([])
const activeTab = ref('basic')
const showIdentity = ref(false)
const decryptedIdentity = ref('')

const tabs = [
  { id: 'basic', label: 'Temel Bilgiler', icon: '📋' },
  { id: 'details', label: 'Detay Bilgiler', icon: '📝' },
  { id: 'documents', label: 'Belgeler', icon: '📁' },
  { id: 'subordinates', label: 'Astlar', icon: '👥' }
]

// Computed
const maskedIdentity = computed(() => {
  if (showIdentity.value && decryptedIdentity.value) {
    return decryptedIdentity.value
  }
  return '***********'
})

// Methods
const loadEmployee = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.employee.getById(Number(route.params.id))
    if (result.success && result.data) {
      employee.value = result.data
    } else {
      showToast('Personel bulunamadı', 'error')
      router.push('/employees')
    }
  } catch (error) {
    showToast('Personel yüklenirken hata oluştu', 'error')
    router.push('/employees')
  } finally {
    loading.value = false
  }
}

const loadDetails = async () => {
  try {
    const result = await window.electronAPI.employeeDetails.getByEmployeeId(Number(route.params.id))
    if (result.success) {
      details.value = result.data
    }
  } catch (error) {
    console.error('Detaylar yüklenemedi:', error)
  }
}

const loadDocuments = async () => {
  try {
    const result = await window.electronAPI.employeeDocuments.getByEmployeeId(Number(route.params.id))
    if (result.success) {
      documents.value = result.data || []
    }
  } catch (error) {
    console.error('Belgeler yüklenemedi:', error)
  }
}

const loadSubordinates = async () => {
  try {
    const result = await window.electronAPI.employee.getByManager(Number(route.params.id))
    if (result.success) {
      subordinates.value = result.data || []
    }
  } catch (error) {
    console.error('Astlar yüklenemedi:', error)
  }
}

const toggleIdentity = async () => {
  if (!showIdentity.value && !decryptedIdentity.value) {
    try {
      const result = await window.electronAPI.employee.getByIdDecrypted(Number(route.params.id))
      if (result.success && result.data) {
        decryptedIdentity.value = result.data.decryptedIdentityNumber || ''
      }
    } catch (error) {
      showToast('TC Kimlik No gösterilemedi', 'error')
      return
    }
  }
  showIdentity.value = !showIdentity.value
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'Active': 'Aktif',
    'Passive': 'Pasif',
    'OnLeave': 'İzinli',
    'Terminated': 'Ayrıldı'
  }
  return labels[status] || status
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR')
}

const calculateSeniority = (hireDate: string) => {
  if (!hireDate) return '-'
  const start = new Date(hireDate)
  const now = new Date()
  const years = now.getFullYear() - start.getFullYear()
  const months = now.getMonth() - start.getMonth()
  
  if (years > 0) {
    return `${years} yıl ${months > 0 ? months + ' ay' : ''}`
  }
  return `${months} ay`
}

const viewEmployee = (id: number) => {
  router.push(`/employees/${id}`)
}

// Seçenekler
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-']
const genders = ['Erkek', 'Kadın', 'Diğer']
const maritalStatuses = ['Bekar', 'Evli', 'Boşanmış', 'Dul']
const militaryStatuses = ['Yapıldı', 'Muaf', 'Tecilli']
const documentTypes = ['Sözleşme', 'Kimlik Fotokopisi', 'Diploma', 'Sağlık Raporu', 'Diğer']

// Modal State
const showDetailsModal = ref(false)
const showDocumentModal = ref(false)
const savingDetails = ref(false)
const savingDocument = ref(false)
const deletingDocument = ref(false)

// Forms
const detailsForm = ref<any>({
  birthDate: '',
  bloodGroup: '',
  gender: '',
  maritalStatus: '',
  educationLevel: '',
  militaryStatus: '',
  addressHome: '',
  emergencyContactName: '',
  emergencyContactPhone: ''
})

const documentForm = ref({
  documentType: '',
  description: '',
  filePath: '',
  fileName: '' // Frontend'de göstermek için
})

// Methods
const openDetailsModal = () => {
  // Mevcut detaylar varsa formu doldur
  if (details.value) {
    detailsForm.value = {
      ...details.value,
      birthDate: details.value.birthDate ? new Date(details.value.birthDate).toISOString().split('T')[0] : ''
    }
  } else {
    // Yoksa boşalt
    detailsForm.value = {
      birthDate: '',
      bloodGroup: '',
      gender: '',
      maritalStatus: '',
      educationLevel: '',
      militaryStatus: '',
      addressHome: '',
      emergencyContactName: '',
      emergencyContactPhone: ''
    }
  }
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
}

const saveDetails = async () => {
  savingDetails.value = true
  try {
    const data = { ...detailsForm.value }
    // Boş tarih kontrolü
    if (!data.birthDate) delete data.birthDate
    else data.birthDate = new Date(data.birthDate)

    let result
    if (details.value) {
      result = await window.electronAPI.employeeDetails.update(Number(route.params.id), data)
    } else {
      result = await window.electronAPI.employeeDetails.create(Number(route.params.id), data)
    }
    
    if (result.success) {
      showToast('Detay bilgileri kaydedildi', 'success')
      details.value = result.data
      closeDetailsModal()
    } else {
      showToast(result.errors?.[0] || 'Kaydedilemedi', 'error')
    }
  } catch (error) {
    showToast('Bir hata oluştu', 'error')
  } finally {
    savingDetails.value = false
  }
}

const openDocumentModal = () => {
  documentForm.value = {
    documentType: 'Diğer',
    description: '',
    filePath: '',
    fileName: ''
  }
  showDocumentModal.value = true
}

const closeDocumentModal = () => {
  showDocumentModal.value = false
}

const handleFileSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0] as any
  if (file) {
    documentForm.value.fileName = file.name
    // Electron ortamında dosya yolu
    documentForm.value.filePath = file.path
  }
}

const saveDocument = async () => {
  if (!documentForm.value.filePath) {
    showToast('Lütfen bir dosya seçin', 'warning')
    return
  }

  savingDocument.value = true
  try {
    const data = {
      employeeId: Number(route.params.id),
      documentType: documentForm.value.documentType,
      title: documentForm.value.fileName, // Başlık olarak dosya adını kullanıyoruz varsayılan
      filePath: documentForm.value.filePath,
      description: documentForm.value.description
    }

    const result = await window.electronAPI.employeeDocuments.upload(Number(route.params.id), data)
    
    if (result.success) {
      showToast('Belge yüklendi', 'success')
      closeDocumentModal()
      await loadDocuments()
    } else {
      showToast(result.errors?.[0] || 'Yüklenemedi', 'error')
    }
  } catch (error) {
    showToast('Bir hata oluştu', 'error')
  } finally {
    savingDocument.value = false
  }
}

const deleteDocument = async (id: number) => {
  if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return

  try {
    const result = await window.electronAPI.employeeDocuments.delete(id)
    if (result.success) {
      showToast('Belge silindi', 'success')
      await loadDocuments()
    } else {
      showToast('Silinemedi', 'error')
    }
  } catch (error) {
    showToast('Hata oluştu', 'error')
  }
}

const fileUrl = (path: string) => {
  // Yerel dosya yolunu göstermek için (güvenlik kısıtlamaları olabilir, backend üzerinden okunmalı normalde)
  // Şimdilik sadece ikon gösteriyoruz, indirme işlemi backend üzerinden yapılmalı.
  return '#'
}

const goBack = () => {
  router.back()
}

// Lifecycle
onMounted(async () => {
  await loadEmployee()
  await Promise.all([
    loadDetails(),
    loadDocuments(),
    loadSubordinates()
  ])
})
</script>

<style scoped>
.employee-detail-page {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #6c757d;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e9ecef;
  border-top-color: #0466c8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.profile-photo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.profile-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  color: #2c3e50;
}

.profile-info {
  flex: 1;
}

.profile-name {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
}

.profile-position {
  margin: 0;
  font-size: 1rem;
  color: #495057;
}

.profile-department {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.9rem;
  color: #6c757d;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 1.5rem;
}

.tab-btn {
  padding: 0.75rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: #6c757d;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #2c3e50;
  background: #f8f9fa;
}

.tab-btn.active {
  color: #0466c8;
  border-bottom-color: #0466c8;
  font-weight: 600;
}

.tab-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.info-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.25rem;
}

.info-card.full-width {
  grid-column: 1 / -1;
}

.info-card h4 {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.875rem;
  color: #6c757d;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #2c3e50;
}

.info-value.code {
  font-family: 'Consolas', monospace;
  background: #e7f1ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: #0466c8;
}

.btn-reveal {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  margin-left: 0.5rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0;
}

.details-grid .info-row.full-width {
  grid-column: 1 / -1;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-active { background: #d4edda; color: #155724; }
.status-passive { background: #f8d7da; color: #721c24; }
.status-onleave { background: #fff3cd; color: #856404; }
.status-terminated { background: #e9ecef; color: #495057; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h4 {
  margin: 0;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.document-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.document-icon {
  font-size: 1.5rem;
}

.document-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.document-type {
  font-weight: 500;
  color: #2c3e50;
}

.document-date {
  font-size: 0.8rem;
  color: #6c757d;
}

.document-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #e9ecef;
}

.btn-icon.delete:hover {
  background: #fee2e2;
}

.subordinates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.subordinate-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.subordinate-card:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.subordinate-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #2c3e50;
}

.subordinate-info {
  display: flex;
  flex-direction: column;
}

.subordinate-name {
  font-weight: 500;
  color: #2c3e50;
}

.subordinate-code {
  font-size: 0.8rem;
  color: #6c757d;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
}

.empty-state p {
  margin: 0 0 1rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
}

.btn-primary {
  background: #198754;
  color: white;
}

.btn-primary:hover {
  background: #157347;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

/* Modal Stilleri */
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
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
}

.form-control {
  padding: 0.625rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #0466c8;
}

.btn-outline-primary {
  background: white;
  color: #0466c8;
  border: 1px solid #0466c8;
}

.btn-outline-primary:hover {
  background: #f0f7ff;
}

.text-success {
  color: #198754;
  font-size: 0.85rem;
}</style>
