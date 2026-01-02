<template>
  <div class="module-settings-page">
    <PageHeader 
      title="Genel Modül Ayarları" 
      description="Uygulama modüllerinin genel ayarlarını yapılandırın"
    >
      <template #actions>
        <button class="btn btn-outline" @click="resetToDefaults" :disabled="saving">
          🔄 Varsayılanlara Dön
        </button>
        <button class="btn btn-primary" @click="saveAllSettings" :disabled="saving">
          {{ saving ? 'Kaydediliyor...' : '💾 Tümünü Kaydet' }}
        </button>
      </template>
    </PageHeader>

    <div class="stats-grid">
      <StatCard icon="⚙️" :value="settingGroups.length" label="Ayar Grubu" color="primary" />
      <StatCard icon="🔧" :value="totalSettings" label="Toplam Ayar" color="info" />
      <StatCard icon="✅" :value="configuredCount" label="Yapılandırılmış" color="success" />
      <StatCard icon="📅" :value="lastUpdated" label="Son Güncelleme" color="warning" />
    </div>

    <div class="settings-container" v-if="!loading">
      <!-- Personel Modülü Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <span class="card-icon">👥</span>
          <div class="card-title">
            <h3>Personel Modülü</h3>
            <p>Personel yönetimi ile ilgili genel ayarlar</p>
          </div>
        </div>
        <div class="card-body">
          <div class="setting-item">
            <div class="setting-info">
              <label>Otomatik Personel Kodu</label>
              <span class="setting-desc">Yeni personel eklendiğinde otomatik kod oluştur</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.employee.autoGenerateCode" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Personel Kodu Formatı</label>
              <span class="setting-desc">Örn: EMP-{YYYY}-{0000}</span>
            </div>
            <div class="setting-control">
              <input type="text" v-model="settings.employee.codeFormat" class="form-control" placeholder="EMP-{YYYY}-{0000}" />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Deneme Süresi (Gün)</label>
              <span class="setting-desc">Varsayılan deneme süresi</span>
            </div>
            <div class="setting-control">
              <input type="number" v-model.number="settings.employee.probationDays" class="form-control" min="0" max="365" />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Fotoğraf Zorunlu</label>
              <span class="setting-desc">Personel kaydında fotoğraf zorunlu olsun</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.employee.photoRequired" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- İzin Modülü Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <span class="card-icon">🏖️</span>
          <div class="card-title">
            <h3>İzin Modülü</h3>
            <p>İzin yönetimi ile ilgili genel ayarlar</p>
          </div>
        </div>
        <div class="card-body">
          <div class="setting-item">
            <div class="setting-info">
              <label>Otomatik Onay</label>
              <span class="setting-desc">Belirli gün altındaki izinler otomatik onaylansın</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.leave.autoApprove" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Otomatik Onay Limiti (Gün)</label>
              <span class="setting-desc">Bu gün sayısına kadar otomatik onay</span>
            </div>
            <div class="setting-control">
              <input type="number" v-model.number="settings.leave.autoApproveLimit" class="form-control" min="0" max="30" :disabled="!settings.leave.autoApprove" />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Minimum Talep Süresi (Gün)</label>
              <span class="setting-desc">İzin talebinin kaç gün önceden yapılması gerektiği</span>
            </div>
            <div class="setting-control">
              <input type="number" v-model.number="settings.leave.minRequestDays" class="form-control" min="0" max="30" />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Yıllık İzin Devri</label>
              <span class="setting-desc">Kullanılmayan izinler sonraki yıla devredilsin</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.leave.carryForward" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Maksimum Devir (Gün)</label>
              <span class="setting-desc">Sonraki yıla devredilebilecek maksimum gün</span>
            </div>
            <div class="setting-control">
              <input type="number" v-model.number="settings.leave.maxCarryForward" class="form-control" min="0" max="30" :disabled="!settings.leave.carryForward" />
            </div>
          </div>
        </div>
      </div>

      <!-- Bordro Modülü Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <span class="card-icon">💰</span>
          <div class="card-title">
            <h3>Bordro Modülü</h3>
            <p>Bordro ve maaş hesaplama ayarları</p>
          </div>
        </div>
        <div class="card-body">
          <div class="setting-item">
            <div class="setting-info">
              <label>Maaş Ödeme Günü</label>
              <span class="setting-desc">Her ayın kaçında maaş ödenecek</span>
            </div>
            <div class="setting-control">
              <input type="number" v-model.number="settings.payroll.payDay" class="form-control" min="1" max="31" />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Otomatik Bordro Oluşturma</label>
              <span class="setting-desc">Her ay otomatik bordro oluştur</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.payroll.autoGenerate" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Avans Limiti (%)</label>
              <span class="setting-desc">Maaşın yüzde kaçına kadar avans verilebilir</span>
            </div>
            <div class="setting-control">
              <input type="number" v-model.number="settings.payroll.advanceLimit" class="form-control" min="0" max="100" />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Fazla Mesai Çarpanı</label>
              <span class="setting-desc">Normal saat ücretinin kaç katı</span>
            </div>
            <div class="setting-control">
              <input type="number" v-model.number="settings.payroll.overtimeMultiplier" class="form-control" min="1" max="3" step="0.1" />
            </div>
          </div>
        </div>
      </div>

      <!-- Performans Modülü Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <span class="card-icon">📈</span>
          <div class="card-title">
            <h3>Performans Modülü</h3>
            <p>Performans değerlendirme ayarları</p>
          </div>
        </div>
        <div class="card-body">
          <div class="setting-item">
            <div class="setting-info">
              <label>Değerlendirme Periyodu</label>
              <span class="setting-desc">Performans değerlendirme sıklığı</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.performance.period" class="form-control">
                <option value="monthly">Aylık</option>
                <option value="quarterly">3 Aylık</option>
                <option value="biannual">6 Aylık</option>
                <option value="annual">Yıllık</option>
              </select>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Öz Değerlendirme</label>
              <span class="setting-desc">Personelin kendini değerlendirmesine izin ver</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.performance.selfEvaluation" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Minimum Puan</label>
              <span class="setting-desc">Değerlendirme minimum puanı</span>
            </div>
            <div class="setting-control">
              <input type="number" v-model.number="settings.performance.minScore" class="form-control" min="0" max="100" />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Maksimum Puan</label>
              <span class="setting-desc">Değerlendirme maksimum puanı</span>
            </div>
            <div class="setting-control">
              <input type="number" v-model.number="settings.performance.maxScore" class="form-control" min="0" max="100" />
            </div>
          </div>
        </div>
      </div>

      <!-- Bildirim Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <span class="card-icon">🔔</span>
          <div class="card-title">
            <h3>Bildirim Ayarları</h3>
            <p>E-posta ve sistem bildirimleri</p>
          </div>
        </div>
        <div class="card-body">
          <div class="setting-item">
            <div class="setting-info">
              <label>E-posta Bildirimleri</label>
              <span class="setting-desc">Önemli olaylarda e-posta gönder</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.notifications.emailEnabled" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>İzin Onay Bildirimi</label>
              <span class="setting-desc">İzin onaylandığında bildirim gönder</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.notifications.leaveApproval" :disabled="!settings.notifications.emailEnabled" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Bordro Bildirimi</label>
              <span class="setting-desc">Bordro hazırlandığında bildirim gönder</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.notifications.payrollReady" :disabled="!settings.notifications.emailEnabled" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Doğum Günü Hatırlatması</label>
              <span class="setting-desc">Personel doğum günlerinde hatırlatma</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.notifications.birthdayReminder" :disabled="!settings.notifications.emailEnabled" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Sistem Ayarları -->
      <div class="settings-card">
        <div class="card-header">
          <span class="card-icon">🖥️</span>
          <div class="card-title">
            <h3>Sistem Ayarları</h3>
            <p>Genel uygulama ayarları</p>
          </div>
        </div>
        <div class="card-body">
          <div class="setting-item">
            <div class="setting-info">
              <label>Dil</label>
              <span class="setting-desc">Uygulama dili</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.system.language" class="form-control">
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Tarih Formatı</label>
              <span class="setting-desc">Tarihlerin gösterim formatı</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.system.dateFormat" class="form-control">
                <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Para Birimi</label>
              <span class="setting-desc">Varsayılan para birimi</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.system.currency" class="form-control">
                <option value="TRY">₺ Türk Lirası</option>
                <option value="USD">$ Amerikan Doları</option>
                <option value="EUR">€ Euro</option>
              </select>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Otomatik Yedekleme</label>
              <span class="setting-desc">Veritabanını otomatik yedekle</span>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input type="checkbox" v-model="settings.system.autoBackup" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>Yedekleme Sıklığı</label>
              <span class="setting-desc">Otomatik yedekleme periyodu</span>
            </div>
            <div class="setting-control">
              <select v-model="settings.system.backupFrequency" class="form-control" :disabled="!settings.system.autoBackup">
                <option value="daily">Günlük</option>
                <option value="weekly">Haftalık</option>
                <option value="monthly">Aylık</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading-state">
      <span class="loading-spinner">⏳</span>
      <p>Ayarlar yükleniyor...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { success, error } = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const saving = ref(false)

const settings = reactive({
  employee: {
    autoGenerateCode: true,
    codeFormat: 'EMP-{YYYY}-{0000}',
    probationDays: 60,
    photoRequired: false
  },
  leave: {
    autoApprove: false,
    autoApproveLimit: 1,
    minRequestDays: 3,
    carryForward: true,
    maxCarryForward: 5
  },
  payroll: {
    payDay: 1,
    autoGenerate: false,
    advanceLimit: 50,
    overtimeMultiplier: 1.5
  },
  performance: {
    period: 'quarterly',
    selfEvaluation: true,
    minScore: 0,
    maxScore: 100
  },
  notifications: {
    emailEnabled: true,
    leaveApproval: true,
    payrollReady: true,
    birthdayReminder: true
  },
  system: {
    language: 'tr',
    dateFormat: 'DD.MM.YYYY',
    currency: 'TRY',
    autoBackup: true,
    backupFrequency: 'daily'
  }
})

const settingGroups = computed(() => [
  { key: 'employee', name: 'Personel' },
  { key: 'leave', name: 'İzin' },
  { key: 'payroll', name: 'Bordro' },
  { key: 'performance', name: 'Performans' },
  { key: 'notifications', name: 'Bildirimler' },
  { key: 'system', name: 'Sistem' }
])

const totalSettings = computed(() => {
  return Object.values(settings).reduce((sum, group) => sum + Object.keys(group).length, 0)
})

const configuredCount = computed(() => totalSettings.value)
const lastUpdated = computed(() => new Date().toLocaleDateString('tr-TR'))

const loadSettings = async () => {
  loading.value = true
  try {
    // Load settings from backend
    const groups = ['employee', 'leave', 'payroll', 'performance', 'notifications', 'system']
    
    for (const group of groups) {
      const result = await window.electronAPI.settings.getByGroup(group)
      if (result?.success && result.data) {
        for (const setting of result.data) {
          const key = setting.key.replace(`${group}.`, '')
          if (settings[group as keyof typeof settings] && key in settings[group as keyof typeof settings]) {
            const groupSettings = settings[group as keyof typeof settings] as Record<string, any>
            // Parse value based on type
            if (typeof groupSettings[key] === 'boolean') {
              groupSettings[key] = setting.value === 'true'
            } else if (typeof groupSettings[key] === 'number') {
              groupSettings[key] = parseFloat(setting.value)
            } else {
              groupSettings[key] = setting.value
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Settings load error:', err)
  } finally {
    loading.value = false
  }
}

const saveAllSettings = async () => {
  saving.value = true
  try {
    let savedCount = 0
    let errorCount = 0
    
    for (const [group, groupSettings] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(groupSettings)) {
        const fullKey = `${group}.${key}`
        try {
          const result = await window.electronAPI.settings.set(fullKey, String(value), group)
          if (result?.success) {
            savedCount++
          } else {
            console.error(`Failed to save ${fullKey}:`, result?.errors)
            errorCount++
          }
        } catch (err) {
          console.error(`Error saving ${fullKey}:`, err)
          errorCount++
        }
      }
    }
    
    if (errorCount === 0) {
      success(`${savedCount} ayar başarıyla kaydedildi`)
    } else {
      error(`${errorCount} ayar kaydedilemedi, ${savedCount} ayar kaydedildi`)
    }
  } catch (err) {
    console.error('Settings save error:', err)
    error('Ayarlar kaydedilirken hata oluştu')
  } finally {
    saving.value = false
  }
}

const resetToDefaults = async () => {
  const confirmed = await confirm({
    title: 'Varsayılanlara Dön',
    message: 'Tüm ayarları varsayılan değerlere döndürmek istediğinize emin misiniz?',
    confirmText: 'Evet, Sıfırla',
    type: 'warning'
  })
  
  if (confirmed) {
    // Reset to defaults
    settings.employee = { autoGenerateCode: true, codeFormat: 'EMP-{YYYY}-{0000}', probationDays: 60, photoRequired: false }
    settings.leave = { autoApprove: false, autoApproveLimit: 1, minRequestDays: 3, carryForward: true, maxCarryForward: 5 }
    settings.payroll = { payDay: 1, autoGenerate: false, advanceLimit: 50, overtimeMultiplier: 1.5 }
    settings.performance = { period: 'quarterly', selfEvaluation: true, minScore: 0, maxScore: 100 }
    settings.notifications = { emailEnabled: true, leaveApproval: true, payrollReady: true, birthdayReminder: true }
    settings.system = { language: 'tr', dateFormat: 'DD.MM.YYYY', currency: 'TRY', autoBackup: true, backupFrequency: 'daily' }
    
    await saveAllSettings()
    success('Ayarlar varsayılanlara döndürüldü')
  }
}

onMounted(() => loadSettings())
</script>

<style scoped>
.module-settings-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }

.settings-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 1.5rem; }
@media (max-width: 768px) { .settings-container { grid-template-columns: 1fr; } }

.settings-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden; }
.card-header { display: flex; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-bottom: 1px solid #e9ecef; }
.card-icon { font-size: 2rem; }
.card-title h3 { margin: 0; font-size: 1.1rem; color: #2c3e50; }
.card-title p { margin: 0.25rem 0 0; font-size: 0.85rem; color: #6c757d; }
.card-body { padding: 1rem 1.5rem; }

.setting-item { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 0; border-bottom: 1px solid #f1f3f4; }
.setting-item:last-child { border-bottom: none; }
.setting-info { flex: 1; }
.setting-info label { display: block; font-weight: 600; color: #2c3e50; font-size: 0.9rem; }
.setting-desc { font-size: 0.8rem; color: #6c757d; }
.setting-control { min-width: 150px; text-align: right; }
.setting-control .form-control { width: 150px; padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.9rem; }
.setting-control select.form-control { cursor: pointer; }

/* Switch Toggle */
.switch { position: relative; display: inline-block; width: 50px; height: 26px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: 0.3s; border-radius: 26px; }
.slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; }
input:checked + .slider { background-color: #198754; }
input:checked + .slider:before { transform: translateX(24px); }
input:disabled + .slider { opacity: 0.5; cursor: not-allowed; }

.loading-state { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; }
.loading-spinner { font-size: 3rem; display: block; margin-bottom: 1rem; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.loading-state p { color: #6c757d; margin: 0; }

.btn { padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-primary:disabled { background: #adb5bd; cursor: not-allowed; }
.btn-outline { background: white; border: 1px solid #dee2e6; color: #495057; }
.btn-outline:hover { background: #f8f9fa; }
.btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
