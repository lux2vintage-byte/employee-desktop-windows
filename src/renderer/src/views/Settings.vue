<template>
  <div class="settings-page">
    <div class="page-header">
      <h2>🏢 Şirket Bilgileri</h2>
    </div>

    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="tab-content">
      <!-- Genel Bilgiler -->
      <div v-if="activeTab === 'general'" class="tab-panel">
        <form @submit.prevent="saveGeneral" class="settings-form">
          <div class="form-grid">
            <div class="form-group">
              <label>Şirket Adı *</label>
              <input v-model="forms.general.name" type="text" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Kısa Ad</label>
              <input v-model="forms.general.shortName" type="text" class="form-control">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Kaydediliyor...' : '💾 Kaydet' }}
            </button>
          </div>
        </form>
      </div>

      <!-- İletişim Bilgileri -->
      <div v-if="activeTab === 'contact'" class="tab-panel">
        <form @submit.prevent="saveContact" class="settings-form">
          <div class="form-group full-width">
            <label>Adres</label>
            <textarea v-model="forms.contact.address" rows="3" class="form-control"></textarea>
          </div>
          <div class="form-grid three-cols">
            <div class="form-group">
              <label>Telefon 1</label>
              <input v-model="forms.contact.phone" type="text" class="form-control">
            </div>
            <div class="form-group">
              <label>Telefon 2</label>
              <input v-model="forms.contact.phone2" type="text" class="form-control">
            </div>
            <div class="form-group">
              <label>Telefon 3</label>
              <input v-model="forms.contact.phone3" type="text" class="form-control">
            </div>
          </div>
          <div class="form-group" style="max-width: 400px;">
            <label>E-posta</label>
            <input v-model="forms.contact.email" type="email" class="form-control">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Kaydediliyor...' : '💾 Kaydet' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Vergi Bilgileri -->
      <div v-if="activeTab === 'tax'" class="tab-panel">
        <form @submit.prevent="saveTax" class="settings-form">
          <div class="form-grid">
            <div class="form-group">
              <label>Vergi Dairesi</label>
              <input v-model="forms.tax.taxOffice" type="text" class="form-control">
            </div>
            <div class="form-group">
              <label>Vergi Numarası</label>
              <input v-model="forms.tax.taxNumber" type="text" class="form-control">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Kaydediliyor...' : '💾 Kaydet' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Banka Bilgileri -->
      <div v-if="activeTab === 'bank'" class="tab-panel">
        <form @submit.prevent="saveBank" class="settings-form">
          <div class="bank-grid">
            <div class="bank-card">
              <h3>🏦 Banka 1</h3>
              <div class="form-group">
                <label>Banka Adı</label>
                <input v-model="forms.bank.bank1Name" type="text" class="form-control">
              </div>
              <div class="form-group">
                <label>Hesap Sahibi</label>
                <input v-model="forms.bank.bank1AccountHolder" type="text" class="form-control">
              </div>
              <div class="form-group">
                <label>IBAN</label>
                <input v-model="forms.bank.bank1IBAN" type="text" class="form-control" placeholder="TR00 0000 0000 0000 0000 0000 00">
              </div>
            </div>
            <div class="bank-card">
              <h3>🏦 Banka 2</h3>
              <div class="form-group">
                <label>Banka Adı</label>
                <input v-model="forms.bank.bank2Name" type="text" class="form-control">
              </div>
              <div class="form-group">
                <label>Hesap Sahibi</label>
                <input v-model="forms.bank.bank2AccountHolder" type="text" class="form-control">
              </div>
              <div class="form-group">
                <label>IBAN</label>
                <input v-model="forms.bank.bank2IBAN" type="text" class="form-control" placeholder="TR00 0000 0000 0000 0000 0000 00">
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Kaydediliyor...' : '💾 Kaydet' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Logo ve Favicon -->
      <div v-if="activeTab === 'logo'" class="tab-panel">
        <form @submit.prevent="saveLogo" class="settings-form">
          <div class="logo-grid">
            <div class="logo-card">
              <h3>🖼️ Şirket Logosu</h3>
              <p class="card-desc">Önerilen boyut: 200x60 piksel</p>
              <div class="upload-area" @click="triggerLogoUpload" @dragover.prevent @drop.prevent="handleLogoDrop">
                <input ref="logoInput" type="file" accept="image/*" @change="handleLogoChange" style="display: none">
                <div v-if="logoPreview" class="preview-box">
                  <img :src="logoPreview" alt="Logo" class="logo-preview">
                  <button type="button" @click.stop="removeLogo" class="btn-remove">✕</button>
                </div>
                <div v-else class="upload-placeholder">
                  <span class="upload-icon">📤</span>
                  <span>Tıklayın veya sürükleyin</span>
                  <small>PNG, JPG, SVG - Max 2MB</small>
                </div>
              </div>
            </div>
            <div class="logo-card">
              <h3>⭐ Favicon</h3>
              <p class="card-desc">Önerilen boyut: 32x32 piksel</p>
              <div class="upload-area small" @click="triggerFaviconUpload" @dragover.prevent @drop.prevent="handleFaviconDrop">
                <input ref="faviconInput" type="file" accept="image/*" @change="handleFaviconChange" style="display: none">
                <div v-if="faviconPreview" class="preview-box">
                  <img :src="faviconPreview" alt="Favicon" class="favicon-preview">
                  <button type="button" @click.stop="removeFavicon" class="btn-remove">✕</button>
                </div>
                <div v-else class="upload-placeholder">
                  <span class="upload-icon">📤</span>
                  <span>Favicon yükleyin</span>
                  <small>ICO, PNG - Max 500KB</small>
                </div>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Kaydediliyor...' : '💾 Kaydet' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '../composables/useToast'

const toast = useToast()
const activeTab = ref('general')
const saving = ref(false)

const tabs = [
  { id: 'general', label: 'Genel Bilgiler' },
  { id: 'contact', label: 'İletişim' },
  { id: 'tax', label: 'Vergi Bilgileri' },
  { id: 'bank', label: 'Banka Bilgileri' },
  { id: 'logo', label: 'Logo & Favicon' }
]

const forms = ref({
  general: { name: '', shortName: '' },
  contact: { address: '', phone: '', phone2: '', phone3: '', email: '' },
  tax: { taxOffice: '', taxNumber: '' },
  bank: { bank1Name: '', bank1AccountHolder: '', bank1IBAN: '', bank2Name: '', bank2AccountHolder: '', bank2IBAN: '' },
  logo: { logo: null as string | null, favicon: null as string | null }
})

const logoInput = ref<HTMLInputElement | null>(null)
const faviconInput = ref<HTMLInputElement | null>(null)
const logoPreview = ref<string | null>(null)
const faviconPreview = ref<string | null>(null)

onMounted(() => loadCompanyInfo())

const loadCompanyInfo = async () => {
  try {
    if (window.electronAPI?.companyInfo) {
      const result = await window.electronAPI.companyInfo.get()
      if (result.success && result.data) populateForms(result.data)
    }
  } catch (error) {
    console.error('Şirket bilgisi yükleme hatası:', error)
  }
}

const populateForms = (data: any) => {
  forms.value.general = { name: data.name || '', shortName: data.shortName || '' }
  forms.value.contact = { address: data.address || '', phone: data.phone || '', phone2: data.phone2 || '', phone3: data.phone3 || '', email: data.email || '' }
  forms.value.tax = { taxOffice: data.taxOffice || '', taxNumber: data.taxNumber || '' }
  forms.value.bank = { bank1Name: data.bank1Name || '', bank1AccountHolder: data.bank1AccountHolder || '', bank1IBAN: data.bank1IBAN || '', bank2Name: data.bank2Name || '', bank2AccountHolder: data.bank2AccountHolder || '', bank2IBAN: data.bank2IBAN || '' }
  if (data.logo) { logoPreview.value = data.logo; forms.value.logo.logo = data.logo }
  if (data.favicon) { faviconPreview.value = data.favicon; forms.value.logo.favicon = data.favicon }
}

const triggerLogoUpload = () => logoInput.value?.click()
const triggerFaviconUpload = () => faviconInput.value?.click()

const handleLogoChange = (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) processLogo(f) }
const handleLogoDrop = (e: DragEvent) => { const f = e.dataTransfer?.files?.[0]; if (f?.type.startsWith('image/')) processLogo(f) }
const handleFaviconChange = (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) processFavicon(f) }
const handleFaviconDrop = (e: DragEvent) => { const f = e.dataTransfer?.files?.[0]; if (f?.type.startsWith('image/')) processFavicon(f) }

const processLogo = (file: File) => {
  if (file.size > 2 * 1024 * 1024) { toast.error('Logo 2MB\'dan küçük olmalı'); return }
  const reader = new FileReader()
  reader.onload = (e) => { logoPreview.value = e.target?.result as string; forms.value.logo.logo = e.target?.result as string }
  reader.readAsDataURL(file)
}

const processFavicon = (file: File) => {
  if (file.size > 500 * 1024) { toast.error('Favicon 500KB\'dan küçük olmalı'); return }
  const reader = new FileReader()
  reader.onload = (e) => { faviconPreview.value = e.target?.result as string; forms.value.logo.favicon = e.target?.result as string }
  reader.readAsDataURL(file)
}

const removeLogo = () => { logoPreview.value = null; forms.value.logo.logo = null; if (logoInput.value) logoInput.value.value = '' }
const removeFavicon = () => { faviconPreview.value = null; forms.value.logo.favicon = null; if (faviconInput.value) faviconInput.value.value = '' }

const saveGeneral = async () => {
  saving.value = true
  try {
    if (window.electronAPI?.companyInfo) {
      const data = { ...forms.value.general }
      const result = await window.electronAPI.companyInfo.updateGeneral(data)
      if (result.success) toast.success('Genel bilgiler kaydedildi')
      else toast.error(result.errors?.join(', ') || 'Kayıt başarısız')
    }
  } catch (e: any) { toast.error(e.message || 'Beklenmeyen bir hata oluştu') }
  finally { saving.value = false }
}

const saveContact = async () => {
  saving.value = true
  try {
    if (window.electronAPI?.companyInfo) {
      const data = { ...forms.value.contact }
      const result = await window.electronAPI.companyInfo.updateContact(data)
      if (result.success) toast.success('İletişim bilgileri kaydedildi')
      else toast.error(result.errors?.join(', ') || 'Kayıt başarısız')
    }
  } catch (e: any) { toast.error(e.message || 'Beklenmeyen bir hata oluştu') }
  finally { saving.value = false }
}

const saveTax = async () => {
  saving.value = true
  try {
    if (window.electronAPI?.companyInfo) {
      const data = { ...forms.value.tax }
      const result = await window.electronAPI.companyInfo.updateTax(data)
      if (result.success) toast.success('Vergi bilgileri kaydedildi')
      else toast.error(result.errors?.join(', ') || 'Kayıt başarısız')
    }
  } catch (e: any) { toast.error(e.message || 'Beklenmeyen bir hata oluştu') }
  finally { saving.value = false }
}

const saveBank = async () => {
  saving.value = true
  try {
    if (window.electronAPI?.companyInfo) {
      const data = { ...forms.value.bank }
      const result = await window.electronAPI.companyInfo.updateBank(data)
      if (result.success) toast.success('Banka bilgileri kaydedildi')
      else toast.error(result.errors?.join(', ') || 'Kayıt başarısız')
    }
  } catch (e: any) { toast.error(e.message || 'Beklenmeyen bir hata oluştu') }
  finally { saving.value = false }
}

const saveLogo = async () => {
  saving.value = true
  try {
    if (window.electronAPI?.companyInfo) {
      const data = { ...forms.value.logo }
      const result = await window.electronAPI.companyInfo.updateLogo(data)
      if (result.success) toast.success('Logo bilgileri kaydedildi')
      else toast.error(result.errors?.join(', ') || 'Kayıt başarısız')
    }
  } catch (e: any) { toast.error(e.message || 'Beklenmeyen bir hata oluştu') }
  finally { saving.value = false }
}
</script>

<style scoped>
.settings-page { max-width: 900px; margin: 0 auto; }
.page-header { margin-bottom: 1.5rem; }
.page-header h2 { margin: 0; color: #2c3e50; font-size: 1.5rem; }

.tabs { display: flex; gap: 0.5rem; border-bottom: 2px solid #dee2e6; margin-bottom: 1.5rem; flex-wrap: wrap; }
.tab-btn { padding: 0.75rem 1.25rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-size: 0.95rem; color: #6c757d; transition: all 0.2s; }
.tab-btn:hover { color: #2c3e50; background: #f8f9fa; }
.tab-btn.active { color: #0466c8; border-bottom-color: #0466c8; font-weight: 600; }

.tab-content { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
.form-grid.three-cols { grid-template-columns: repeat(3, 1fr); }
.form-group { margin-bottom: 1rem; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { display: block; margin-bottom: 0.4rem; font-weight: 500; color: #495057; font-size: 0.9rem; }
.form-control { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #ced4da; border-radius: 6px; font-size: 0.95rem; transition: border-color 0.2s, box-shadow 0.2s; }
.form-control:focus { outline: none; border-color: #0466c8; box-shadow: 0 0 0 3px rgba(4,102,200,0.1); }

.form-actions { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e9ecef; }
.btn { padding: 0.6rem 1.5rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem; font-weight: 500; transition: all 0.2s; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover:not(:disabled) { background: #0353a4; }

.bank-grid, .logo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; }
.bank-card, .logo-card { padding: 1.25rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; }
.bank-card h3, .logo-card h3 { margin: 0 0 1rem; font-size: 1rem; color: #495057; }
.card-desc { margin: -0.5rem 0 1rem; font-size: 0.85rem; color: #6c757d; }

.upload-area { border: 2px dashed #ced4da; border-radius: 8px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s; background: white; min-height: 120px; display: flex; align-items: center; justify-content: center; }
.upload-area:hover { border-color: #0466c8; background: #f8faff; }
.upload-area.small { min-height: 100px; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; color: #6c757d; }
.upload-icon { font-size: 1.8rem; }
.upload-placeholder small { font-size: 0.8rem; }
.preview-box { position: relative; }
.logo-preview { max-width: 180px; max-height: 60px; object-fit: contain; }
.favicon-preview { width: 48px; height: 48px; object-fit: contain; }
.btn-remove { position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; border-radius: 50%; background: #dc3545; color: white; border: none; cursor: pointer; font-size: 0.8rem; line-height: 1; }
.btn-remove:hover { background: #c82333; }

@media (max-width: 768px) {
  .form-grid, .form-grid.three-cols { grid-template-columns: 1fr; }
  .bank-grid, .logo-grid { grid-template-columns: 1fr; }
}
</style>
