<template>
  <div class="email-settings">
    <div class="header">
      <h1>📧 E-Posta Ayarları</h1>
      <button @click="openAddModal" class="btn btn-primary">
        <span class="icon">➕</span> Yeni Yapılandırma Ekle
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Yükleniyor...</p>
    </div>

    <div v-else-if="configs.length > 0" class="configs-grid">
      <div v-for="config in configs" :key="config.id" class="config-card" :class="{ active: config.isActive }">
        <div class="config-header">
          <div class="config-title">
            <h3>{{ config.fromName }}</h3>
            <span v-if="config.isActive" class="badge badge-success">Aktif</span>
            <span v-else class="badge badge-secondary">Pasif</span>
          </div>
          <div class="config-actions">
            <button @click="openEditModal(config)" class="btn-icon" title="Düzenle">✏️</button>
            <button v-if="!config.isActive" @click="handleSetActive(config.id)" class="btn-icon" title="Aktif Yap">✅</button>
            <button v-if="!config.isActive" @click="handleDelete(config.id)" class="btn-icon btn-danger" title="Sil">🗑️</button>
          </div>
        </div>
        <div class="config-details">
          <div class="detail-row"><span class="label">SMTP:</span><span class="value">{{ config.host }}:{{ config.port }}</span></div>
          <div class="detail-row"><span class="label">Kullanıcı:</span><span class="value">{{ config.user }}</span></div>
          <div class="detail-row"><span class="label">Gönderici:</span><span class="value">{{ config.fromAddress }}</span></div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">📧</div>
      <h3>Henüz email yapılandırması yok</h3>
      <p>E-posta gönderebilmek için SMTP ayarlarını yapılandırın</p>
      <button @click="openAddModal" class="btn btn-primary">İlk Yapılandırmayı Ekle</button>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingId ? 'Yapılandırmayı Düzenle' : 'Yeni Yapılandırma' }}</h2>
          <button @click="closeModal" class="btn-close">✖</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSave">
            <div class="form-section">
              <h4>Gönderici Bilgileri</h4>
              <div class="form-group">
                <label>Gönderici Adı *</label>
                <input v-model="form.fromName" type="text" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Gönderici E-posta *</label>
                <input v-model="form.fromAddress" type="email" class="form-control" required />
              </div>
            </div>
            <div class="form-section">
              <h4>SMTP Sunucu Ayarları</h4>
              <div class="form-row">
                <div class="form-group">
                  <label>SMTP Sunucu *</label>
                  <input v-model="form.host" type="text" class="form-control" required />
                </div>
                <div class="form-group">
                  <label>Port *</label>
                  <input v-model.number="form.port" type="number" class="form-control" required />
                </div>
              </div>
              <div class="form-group">
                <label class="checkbox-label"><input v-model="form.secure" type="checkbox" /> SSL/TLS Kullan</label>
              </div>
            </div>
            <div class="form-section">
              <h4>Kimlik Bilgileri</h4>
              <div class="form-group">
                <label>Kullanıcı Adı *</label>
                <input v-model="form.user" type="text" class="form-control" required />
              </div>
              <div class="form-group">
                <label>Şifre {{ editingId ? '' : '*' }}</label>
                <div class="password-input">
                  <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="form-control" :required="!editingId" />
                  <button type="button" class="btn-eye" @click="showPassword = !showPassword">{{ showPassword ? '🙈' : '👁️' }}</button>
                </div>
                <small v-if="editingId" class="form-hint">Değiştirmek istemiyorsanız boş bırakın</small>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" @click="closeModal" class="btn btn-secondary">İptal</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '../composables/useToast'

const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const configs = ref<any[]>([])
const showModal = ref(false)
const showPassword = ref(false)
const editingId = ref<number | null>(null)

const form = ref({ host: '', port: 587, secure: false, user: '', password: '', fromName: '', fromAddress: '' })

onMounted(() => loadConfigs())

async function loadConfigs() {
  loading.value = true
  try {
    const result = await window.electronAPI.emailConfig.getAll()
    if (result.success) configs.value = result.data || []
    else toast.error(result.errors?.join(', ') || 'Yüklenemedi')
  } catch (e: any) { toast.error(e.message) }
  finally { loading.value = false }
}

function openAddModal() {
  editingId.value = null
  form.value = { host: '', port: 587, secure: false, user: '', password: '', fromName: '', fromAddress: '' }
  showPassword.value = false
  showModal.value = true
}

async function openEditModal(config: any) {
  editingId.value = config.id
  form.value = { host: config.host, port: config.port, secure: config.secure, user: config.user, password: '', fromName: config.fromName, fromAddress: config.fromAddress }
  showPassword.value = false
  showModal.value = true
  
  // Şifreyi decrypt edilmiş olarak getir
  try {
    const result = await window.electronAPI.emailConfig.getPassword(config.id)
    if (result.success && result.data?.password) {
      form.value.password = result.data.password
    }
  } catch (e) {
    // Şifre getirilemezse boş bırak
  }
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

async function handleSave() {
  saving.value = true
  try {
    const data: any = { ...form.value }
    if (editingId.value && !data.password) delete data.password
    
    const result = editingId.value 
      ? await window.electronAPI.emailConfig.update(editingId.value, data)
      : await window.electronAPI.emailConfig.create(data)
    
    if (result.success) {
      toast.success(editingId.value ? 'Güncellendi' : 'Oluşturuldu')
      closeModal()
      await loadConfigs()
    } else {
      toast.error(result.errors?.join(', ') || 'Hata oluştu')
    }
  } catch (e: any) { toast.error(e.message) }
  finally { saving.value = false }
}

async function handleSetActive(id: number) {
  try {
    const result = await window.electronAPI.emailConfig.setActive(id)
    if (result.success) { toast.success('Aktif edildi'); await loadConfigs() }
    else toast.error(result.errors?.join(', ') || 'Hata')
  } catch (e: any) { toast.error(e.message) }
}

async function handleDelete(id: number) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return
  try {
    const result = await window.electronAPI.emailConfig.delete(id)
    if (result.success) { toast.success('Silindi'); await loadConfigs() }
    else toast.error(result.errors?.join(', ') || 'Hata')
  } catch (e: any) { toast.error(e.message) }
}
</script>

<style scoped>
.email-settings { padding: 1rem; max-width: 1200px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header h1 { margin: 0; color: #2c3e50; }
.loading { text-align: center; padding: 4rem; }
.spinner { width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #0466c8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.configs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
.config-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid transparent; }
.config-card.active { border-color: #198754; }
.config-header { display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e9ecef; }
.config-title h3 { margin: 0 0 0.5rem; color: #2c3e50; }
.badge { padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
.badge-success { background: #d4edda; color: #155724; }
.badge-secondary { background: #e9ecef; color: #6c757d; }
.config-actions { display: flex; gap: 0.5rem; }
.btn-icon { background: none; border: none; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; border-radius: 4px; }
.btn-icon:hover { background: #f8f9fa; }
.config-details { display: flex; flex-direction: column; gap: 0.5rem; }
.detail-row { display: flex; justify-content: space-between; }
.detail-row .label { color: #6c757d; font-size: 0.875rem; }
.detail-row .value { color: #2c3e50; font-size: 0.875rem; font-family: monospace; }
.empty-state { text-align: center; padding: 4rem 2rem; }
.empty-icon { font-size: 5rem; margin-bottom: 1rem; }
.empty-state h3 { color: #2c3e50; margin-bottom: 0.5rem; }
.empty-state p { color: #6c757d; margin-bottom: 2rem; }
.btn { padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover:not(:disabled) { background: #0353a4; }
.btn-secondary { background: #6c757d; color: white; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h2 { margin: 0; color: #2c3e50; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6c757d; }
.modal-body { padding: 1.5rem; }
.form-section { margin-bottom: 1.5rem; }
.form-section h4 { color: #2c3e50; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e9ecef; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; color: #495057; font-weight: 500; }
.form-control { width: 100%; padding: 0.75rem; border: 1px solid #ced4da; border-radius: 6px; font-size: 1rem; box-sizing: border-box; }
.form-control:focus { outline: none; border-color: #0466c8; }
.form-row { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.password-input { position: relative; display: flex; }
.password-input .form-control { padding-right: 3rem; }
.btn-eye { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.25rem; cursor: pointer; padding: 0.25rem; }
.form-hint { display: block; margin-top: 0.25rem; font-size: 0.8rem; color: #6c757d; }
.form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e9ecef; }
</style>
