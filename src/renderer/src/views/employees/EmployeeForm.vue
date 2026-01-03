<template>
  <div class="employee-form-page">
    <PageHeader 
      :title="isEdit ? 'Personel Düzenle' : 'Yeni Personel Ekle'" 
      :description="isEdit ? 'Personel bilgilerini güncelleyin' : 'Yeni personel kaydı oluşturun'"
    >
      <template #actions>
        <button class="btn btn-secondary" @click="goBack">
          ← Geri
        </button>
      </template>
    </PageHeader>

    <form @submit.prevent="handleSubmit" class="employee-form">
      <!-- Temel Bilgiler -->
      <div class="form-section">
        <h3 class="section-title">📋 Temel Bilgiler</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label required">Sicil No</label>
            <div class="input-with-button">
              <input 
                v-model="form.employeeCode" 
                type="text" 
                class="form-control"
                :disabled="isEdit"
                placeholder="Otomatik oluşturulacak"
              />
              <button 
                v-if="!isEdit"
                type="button" 
                class="btn-generate"
                @click="generateCode"
                :disabled="generatingCode"
              >
                {{ generatingCode ? '...' : '🔄' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label required">TC Kimlik No</label>
            <input 
              v-model="form.identityNumber" 
              type="text" 
              class="form-control"
              maxlength="11"
              placeholder="11 haneli TC Kimlik No"
            />
            <span v-if="errors.identityNumber" class="form-error">{{ errors.identityNumber }}</span>
          </div>

          <div class="form-group">
            <label class="form-label required">Ad</label>
            <input 
              v-model="form.firstName" 
              type="text" 
              class="form-control"
              placeholder="Personel adı"
            />
            <span v-if="errors.firstName" class="form-error">{{ errors.firstName }}</span>
          </div>

          <div class="form-group">
            <label class="form-label required">Soyad</label>
            <input 
              v-model="form.lastName" 
              type="text" 
              class="form-control"
              placeholder="Personel soyadı"
            />
            <span v-if="errors.lastName" class="form-error">{{ errors.lastName }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">Doğum Tarihi</label>
            <input 
              v-model="form.birthDate" 
              type="date" 
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Cinsiyet</label>
            <select v-model="form.gender" class="form-control">
              <option value="">Seçiniz</option>
              <option value="Erkek">Erkek</option>
              <option value="Kadın">Kadın</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Eğitim Durumu</label>
            <select v-model="form.educationLevel" class="form-control">
              <option value="">Seçiniz</option>
              <option value="Yok">Yok</option>
              <option value="İlköğretim">İlköğretim</option>
              <option value="Lise">Lise</option>
              <option value="Ön Lisans">Ön Lisans</option>
              <option value="Lisans">Lisans</option>
              <option value="Yüksek Lisans">Yüksek Lisans</option>
              <option value="Doktora">Doktora</option>
            </select>
          </div>
        </div>
      </div>

      <!-- İletişim Bilgileri -->
      <div class="form-section">
        <h3 class="section-title">📞 İletişim Bilgileri</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">İş E-Postası</label>
            <input 
              v-model="form.emailWork" 
              type="email" 
              class="form-control"
              placeholder="is@sirket.com"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Kişisel E-Posta</label>
            <input 
              v-model="form.emailPersonal" 
              type="email" 
              class="form-control"
              placeholder="kisisel@email.com"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Telefon</label>
            <input 
              v-model="form.phonePrimary" 
              type="tel" 
              class="form-control"
              placeholder="05XX XXX XX XX"
            />
          </div>
        </div>
      </div>

      <!-- Organizasyonel Bilgiler -->
      <div class="form-section">
        <h3 class="section-title">🏢 Organizasyonel Bilgiler</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label required">Departman</label>
            <select v-model="form.departmentId" class="form-control" @change="loadPositions">
              <option value="">Departman Seçin</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.name }}
              </option>
            </select>
            <span v-if="errors.departmentId" class="form-error">{{ errors.departmentId }}</span>
          </div>

          <div class="form-group">
            <label class="form-label required">Pozisyon</label>
            <select v-model="form.positionId" class="form-control" :disabled="!form.departmentId">
              <option value="">Pozisyon Seçin</option>
              <option v-for="pos in positions" :key="pos.id" :value="pos.id">
                {{ pos.title }}
              </option>
            </select>
            <span v-if="errors.positionId" class="form-error">{{ errors.positionId }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">Yönetici</label>
            <select v-model="form.managerId" class="form-control">
              <option value="">Yönetici Seçin (Opsiyonel)</option>
              <option v-for="emp in managers" :key="emp.id" :value="emp.id">
                {{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeCode }})
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- İş Bilgileri -->
      <div class="form-section">
        <h3 class="section-title">💼 İş Bilgileri</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label required">İşe Giriş Tarihi</label>
            <input 
              v-model="form.hireDate" 
              type="date" 
              class="form-control"
            />
            <span v-if="errors.hireDate" class="form-error">{{ errors.hireDate }}</span>
          </div>

          <div class="form-group">
            <label class="form-label required">Sözleşme Tipi</label>
            <select v-model="form.contractType" class="form-control">
              <option value="">Sözleşme Tipi Seçin</option>
              <option value="Süresiz">Süresiz</option>
              <option value="Süreli">Süreli</option>
              <option value="Stajyer">Stajyer</option>
              <option value="Freelance">Freelance</option>
            </select>
            <span v-if="errors.contractType" class="form-error">{{ errors.contractType }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">Durum</label>
            <select v-model="form.status" class="form-control">
              <option value="Active">Aktif</option>
              <option value="Passive">Pasif</option>
              <option value="OnLeave">İzinli</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Fotoğraf -->
      <div class="form-section">
        <h3 class="section-title">📷 Fotoğraf</h3>
        <div class="photo-upload-area">
          <div v-if="form.photoUrl" class="photo-preview">
            <img :src="form.photoUrl" alt="Personel Fotoğrafı" />
            <button type="button" class="btn-remove-photo" @click="removePhoto">✕</button>
          </div>
          <div v-else class="photo-placeholder" @click="triggerPhotoUpload">
            <span class="placeholder-icon">📷</span>
            <span class="placeholder-text">Fotoğraf Yükle</span>
            <span class="placeholder-hint">Tıklayın veya sürükleyin</span>
          </div>
          <input 
            ref="photoInput"
            type="file" 
            accept="image/*"
            class="hidden-input"
            @change="handlePhotoUpload"
          />
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="goBack">
          İptal
        </button>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Kaydediliyor...' : (isEdit ? 'Güncelle' : 'Kaydet') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const { showToast } = useToast()

// State
const isEdit = computed(() => !!route.params.id)
const saving = ref(false)
const generatingCode = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)

const departments = ref<any[]>([])
const positions = ref<any[]>([])
const managers = ref<any[]>([])

const form = reactive({
  employeeCode: '',
  identityNumber: '',
  firstName: '',
  lastName: '',
  emailWork: '',
  emailPersonal: '',
  phonePrimary: '',
  departmentId: '',
  positionId: '',
  managerId: '',
  hireDate: '',
  contractType: '',
  status: 'Active',
  photoUrl: '',
  birthDate: '',
  gender: '',
  educationLevel: ''
})

const errors = reactive<Record<string, string>>({})

// Methods
const loadDepartments = async () => {
  try {
    const result = await window.electronAPI.department.getAll({ limit: 100 })
    if (result.success) {
      departments.value = result.data
    }
  } catch (error) {
    console.error('Departmanlar yüklenemedi:', error)
  }
}

const loadPositions = async () => {
  if (!form.departmentId) {
    positions.value = []
    form.positionId = ''
    return
  }
  
  try {
    const result = await window.electronAPI.position.getByDepartment(Number(form.departmentId))
    if (result.success) {
      positions.value = result.data || []
    }
  } catch (error) {
    console.error('Pozisyonlar yüklenemedi:', error)
  }
}

const loadManagers = async () => {
  try {
    const result = await window.electronAPI.employee.getAll({ status: 'Active', limit: 100 })
    if (result.success) {
      // Düzenleme modunda kendisini listeden çıkar
      if (isEdit.value) {
        managers.value = result.data.filter((e: any) => e.id !== Number(route.params.id))
      } else {
        managers.value = result.data
      }
    }
  } catch (error) {
    console.error('Yöneticiler yüklenemedi:', error)
  }
}

const loadEmployee = async () => {
  if (!isEdit.value) return
  
  try {
    const result = await window.electronAPI.employee.getByIdDecrypted(Number(route.params.id))
    if (result.success && result.data) {
      const emp = result.data as any
      form.employeeCode = emp.employeeCode
      form.identityNumber = emp.decryptedIdentityNumber || ''
      form.firstName = emp.firstName
      form.lastName = emp.lastName
      form.emailWork = emp.emailWork || ''
      form.emailPersonal = emp.emailPersonal || ''
      form.phonePrimary = emp.phonePrimary || ''
      form.departmentId = emp.departmentId?.toString() || ''
      form.positionId = emp.positionId?.toString() || ''
      form.managerId = emp.managerId?.toString() || ''
      form.hireDate = emp.hireDate ? emp.hireDate.split('T')[0] || '' : ''
      form.contractType = emp.contractType
      form.status = emp.status
      form.photoUrl = emp.photoUrl || ''
      
      if (emp.details) {
        form.birthDate = emp.details.birthDate ? emp.details.birthDate.split('T')[0] : ''
        form.gender = emp.details.gender || ''
        form.educationLevel = emp.details.educationLevel || ''
      }
      
      // Pozisyonları yükle
      if (form.departmentId) {
        await loadPositions()
      }
    } else {
      showToast('Personel bulunamadı', 'error')
      router.push('/employees')
    }
  } catch (error) {
    showToast('Personel yüklenirken hata oluştu', 'error')
    router.push('/employees')
  }
}

const generateCode = async () => {
  generatingCode.value = true
  try {
    const result = await window.electronAPI.employee.generateCode()
    if (result.success) {
      if (result.data) form.employeeCode = result.data.employeeCode
    }
  } catch (error) {
    showToast('Sicil no oluşturulamadı', 'error')
  } finally {
    generatingCode.value = false
  }
}

const validate = (): boolean => {
  // Reset errors
  Object.keys(errors).forEach(key => errors[key] = '')
  
  let isValid = true

  if (!form.firstName.trim()) {
    errors.firstName = 'Ad zorunludur'
    isValid = false
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Soyad zorunludur'
    isValid = false
  }

  if (!form.identityNumber) {
    errors.identityNumber = 'TC Kimlik No zorunludur'
    isValid = false
  } else if (form.identityNumber.length !== 11 || !/^\d+$/.test(form.identityNumber)) {
    errors.identityNumber = 'TC Kimlik No 11 haneli olmalıdır'
    isValid = false
  }

  if (!form.departmentId) {
    errors.departmentId = 'Departman zorunludur'
    isValid = false
  }

  if (!form.positionId) {
    errors.positionId = 'Pozisyon zorunludur'
    isValid = false
  }

  if (!form.hireDate) {
    errors.hireDate = 'İşe giriş tarihi zorunludur'
    isValid = false
  }

  if (!form.contractType) {
    errors.contractType = 'Sözleşme tipi zorunludur'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validate()) return

  saving.value = true
  try {
    const data = {
      employeeCode: form.employeeCode || undefined,
      identityNumber: form.identityNumber,
      firstName: form.firstName,
      lastName: form.lastName,
      emailWork: form.emailWork || null,
      emailPersonal: form.emailPersonal || null,
      phonePrimary: form.phonePrimary || null,
      departmentId: Number(form.departmentId),
      positionId: Number(form.positionId),
      managerId: form.managerId ? Number(form.managerId) : null,
      hireDate: form.hireDate,
      contractType: form.contractType,
      status: form.status,
      photoUrl: form.photoUrl || null,
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      educationLevel: form.educationLevel || null
    }

    let result
    if (isEdit.value) {
      result = await window.electronAPI.employee.update(Number(route.params.id), data)
    } else {
      result = await window.electronAPI.employee.create(data)
    }

    if (result.success) {
      showToast(isEdit.value ? 'Personel güncellendi' : 'Personel oluşturuldu', 'success')
      router.push('/employees')
    } else {
      showToast(result.errors?.[0] || 'İşlem başarısız', 'error')
    }
  } catch (error) {
    showToast('Bir hata oluştu', 'error')
  } finally {
    saving.value = false
  }
}

const triggerPhotoUpload = () => {
  photoInput.value?.click()
}

const handlePhotoUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      form.photoUrl = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const removePhoto = () => {
  form.photoUrl = ''
}

const goBack = () => {
  router.back()
}

// Lifecycle
onMounted(async () => {
  await loadDepartments()
  await loadManagers()
  
  if (isEdit.value) {
    await loadEmployee()
  } else {
    await generateCode()
  }
})

// Watch departmentId for position loading
watch(() => form.departmentId, () => {
  if (!isEdit.value) {
    loadPositions()
  }
})
</script>

<style scoped>
.employee-form-page {
  max-width: 900px;
  margin: 0 auto;
}

.employee-form {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.form-section {
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-title {
  margin: 0 0 1.25rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #495057;
}

.form-label.required::after {
  content: ' *';
  color: #dc3545;
}

.form-control {
  padding: 0.625rem 0.875rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #0466c8;
  box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1);
}

.form-control:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.form-error {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #dc3545;
}

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.input-with-button .form-control {
  flex: 1;
}

.btn-generate {
  padding: 0.625rem 0.875rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-generate:hover:not(:disabled) {
  background: #e9ecef;
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.photo-upload-area {
  max-width: 200px;
}

.photo-preview {
  position: relative;
  width: 150px;
  height: 150px;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.btn-remove-photo {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.75rem;
}

.photo-placeholder {
  width: 150px;
  height: 150px;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.photo-placeholder:hover {
  border-color: #0466c8;
  background: #f8faff;
}

.placeholder-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.placeholder-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #495057;
}

.placeholder-hint {
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.hidden-input {
  display: none;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #198754;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #157347;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}
</style>
