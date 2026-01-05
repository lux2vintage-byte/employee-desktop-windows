<template>
  <div id="app">
    <Toast />
    <ConfirmModal />
    <nav class="navbar">
      <div class="navbar-brand">
        <img v-if="companyLogo" :src="companyLogo" alt="Logo" class="brand-logo" />
        <h1>{{ companyShortName || 'Personel Yönetimi' }}</h1>
      </div>
      
      <div class="navbar-menu">
        <button 
          v-for="menu in menus" 
          :key="menu.id"
          class="nav-item"
          @click="openSidebar(menu)"
        >
          <span class="nav-icon">{{ menu.icon }}</span>
          <span class="nav-label">{{ menu.label }}</span>
        </button>
      </div>

      <div class="navbar-actions">
        <button @click="minimizeApp" class="btn-control" title="Küçült">−</button>
        <button @click="maximizeApp" class="btn-control" title="Büyüt">□</button>
        <button @click="exitApp" class="btn-control btn-exit" title="Çıkış">⏻</button>
      </div>
    </nav>

    <Sidebar 
      :is-open="sidebarOpen" 
      :active-menu="activeMenu"
      @close="closeSidebar"
    />

    <main class="main-content">
      <RouterView />
    </main>

    <footer class="app-footer">
      <span>Personel Yönetimi v{{ appVersion }}</span>
      <span v-if="databaseStore.isConnected" class="status-ok">✓ Veritabanı bağlı</span>
      <span v-else class="status-error">✗ Veritabanı bağlantısı yok</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAppStore } from './stores/app'
import { useDatabaseStore } from './stores/database'
import { useConfirm } from './composables/useConfirm'
import Sidebar from './components/Sidebar.vue'
import Toast from './components/Toast.vue'
import ConfirmModal from './components/ConfirmModal.vue'

const appStore = useAppStore()
const databaseStore = useDatabaseStore()
const { confirm } = useConfirm()
const appVersion = ref('1.0.0')
const companyLogo = ref<string | null>(null)
const companyShortName = ref<string | null>(null)

// Sidebar state
const sidebarOpen = ref(false)
const activeMenu = ref<any>(null)

// Menü yapısı - Gruplandırılmış
const menus = ref([
  {
    id: 'organization',
    label: 'Organizasyon',
    icon: '🏛️',
    items: [
      { path: '/departments', label: 'Departmanlar', icon: '🏢' },
      { path: '/positions', label: 'Pozisyonlar / Unvanlar', icon: '💼' }
    ]
  },
  {
    id: 'personnel',
    label: 'Personel',
    icon: '👥',
    items: [
      { path: '/employees', label: 'Personel Listesi', icon: '📋', divider: 'Personel Kartları' },
      { path: '/employees/new', label: 'Yeni Personel Ekle', icon: '➕' },
      { path: '/employees/archive', label: 'Personel Arşiv', icon: '📁' },
      { path: '/hiring-requests', label: 'İşe Alım Talepleri', icon: '🎯', divider: 'İşe Alım' },
      { path: '/onboarding', label: 'Oryantasyon Listesi', icon: '🎓' },
      { path: '/offboarding/requests', label: 'İşten Ayrılma Talepleri', icon: '🚪', divider: 'İşten Ayrılma' },
      { path: '/offboarding/severance', label: 'Kıdem/İhbar Hesaplama', icon: '🧮' },
      { path: '/offboarding/checklist', label: 'Çıkış Kontrol Listesi', icon: '✅' }
    ]
  },
  {
    id: 'time',
    label: 'Zaman',
    icon: '⏰',
    items: [
      { path: '/attendance', label: 'Günlük Giriş-Çıkış', icon: '🕐', divider: 'Devamlılık' },
      { path: '/attendance/monthly', label: 'Puantaj (Aylık)', icon: '📊' },
      { path: '/overtime', label: 'Fazla Mesai Kayıtları', icon: '⏱️' },
      { path: '/attendance/lateness-report', label: 'Geç Kalma / Erken Çıkma', icon: '⚠️' },
      { path: '/leave-requests', label: 'İzin Talepleri', icon: '📋', divider: 'İzin Yönetimi' },
      { path: '/leave-types', label: 'İzin Türleri', icon: '📑' },
      { path: '/day-types', label: 'Gün Türleri', icon: '📆' },
      { path: '/leave-balances', label: 'İzin Bakiyeleri', icon: '📊' }
    ]
  },
  {
    id: 'finance',
    label: 'Finans',
    icon: '💰',
    items: [
      { path: '/payroll/generate', label: 'Aylık Bordro Hazırlama', icon: '📝', divider: 'Bordro İşlemleri' },
      { path: '/payroll/list', label: 'Bordro Listesi', icon: '📋' },
      { path: '/payroll/bonuses', label: 'Prim / İkramiye', icon: '🎁' },
      { path: '/advances', label: 'Avans Talepleri', icon: '💵', divider: 'Ödemeler' },
      { path: '/salary/payments', label: 'Ödeme Geçmişi', icon: '💸' },
      { path: '/salary/allowances', label: 'Ek Ödemeler / Kesintiler', icon: '📊' }
    ]
  },
  {
    id: 'development',
    label: 'Gelişim',
    icon: '📈',
    items: [
      { path: '/performance/reviews', label: 'Değerlendirme Formları', icon: '📝', divider: 'Performans' },
      { path: '/performance/calendar', label: 'Değerlendirme Takvimi', icon: '📅' },
      { path: '/training/requests', label: 'Eğitim Talepleri', icon: '📚', divider: 'Eğitim' },
      { path: '/training/list', label: 'Verilen Eğitimler', icon: '🎓' },
      { path: '/training/certificates', label: 'Sertifika Takibi', icon: '🏅' },
      { path: '/disciplinary/records', label: 'Uyarı / Ceza Kayıtları', icon: '⚠️', divider: 'Disiplin' },
      { path: '/disciplinary/tracking', label: 'Disiplin Takip Listesi', icon: '📋' }
    ]
  },
  {
    id: 'reports',
    label: 'Raporlar',
    icon: '📊',
    items: [
      { path: '/reports/personnel', label: 'Personel Dağılım Raporu', icon: '👥' },
      { path: '/reports/cost', label: 'Personel Maliyet Raporu', icon: '💵' },
      { path: '/reports/turnover', label: 'Turnover Raporu', icon: '🔄' },
      { path: '/reports/leave', label: 'İzin Kullanım Raporu', icon: '🏖️' },
      { path: '/reports/payroll', label: 'Bordro Özet Raporu', icon: '📋' },
      { path: '/reports/sgk', label: 'SGK / İşkur Raporları', icon: '🏛️' },
      { path: '/performance/reports', label: 'Performans Raporları', icon: '📈' }
    ]
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    icon: '⚙️',
    items: [
      { path: '/settings', label: 'Şirket Bilgileri', icon: '🏢', divider: 'Genel' },
      { path: '/email-settings', label: 'E-Posta Ayarları', icon: '📧' },
      { path: '/users', label: 'Kullanıcılar', icon: '👤' },
      { path: '/settings/roles', label: 'Rol ve Yetki Tanımları', icon: '🔐', divider: 'Tanımlamalar' },
      { path: '/settings/leave-rights', label: 'İzin Hakları Tanımlama', icon: '📋' },
      { path: '/salary/parameters', label: 'Bordro Parametreleri', icon: '⚙️' },
      { path: '/settings/modules', label: 'Genel Modül Ayarları', icon: '🔧' }
    ]
  }
])

const openSidebar = (menu: any) => {
  activeMenu.value = menu
  sidebarOpen.value = true
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

const loadCompanyInfo = async () => {
  try {
    if (window.electronAPI?.companyInfo) {
      const result = await window.electronAPI.companyInfo.get()
      if (result.success && result.data) {
        companyLogo.value = result.data.logo || null
        companyShortName.value = result.data.shortName || null
      }
    }
  } catch (e) {
    // Sessizce devam et
  }
}

onMounted(async () => {
  try {
    await appStore.initializeApp()
    await databaseStore.checkConnection()
    await loadCompanyInfo()
    if (window.electronAPI) {
      appVersion.value = await window.electronAPI.getAppVersion()
    }
  } catch (error) {
    console.error('Uygulama başlatma hatası:', error)
  }
})

const minimizeApp = async () => {
  if (window.electronAPI) await window.electronAPI.minimizeApp()
}

const maximizeApp = async () => {
  if (window.electronAPI) await window.electronAPI.maximizeApp()
}

const exitApp = async () => {
  const confirmed = await confirm({
    title: 'Uygulamadan Çıkış',
    message: 'Uygulamadan çıkmak istediğinize emin misiniz?',
    confirmText: 'Çıkış Yap',
    cancelText: 'İptal',
    type: 'warning'
  })
  
  if (confirmed && window.electronAPI) {
    await window.electronAPI.closeApp()
  }
}
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  height: 65px;
  background-color: #a9dbb8;
  color: #2c3e50;
  -webkit-app-region: drag;
}

.navbar-brand h1 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: #2c3e50;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-logo {
  height: 48px;
  max-width: 180px;
  object-fit: contain;
}

.navbar-menu {
  display: flex;
  gap: 0.5rem;
  -webkit-app-region: no-drag;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.875rem;
  background: transparent;
  border: none;
  color: #2c3e50;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 0.9rem;
  font-weight: 600;
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #1a252f;
}

.nav-icon {
  font-size: 1.1rem;
}

.nav-label {
  font-weight: 600;
}

.navbar-actions {
  display: flex;
  gap: 0.25rem;
  -webkit-app-region: no-drag;
}

.btn-control {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #2c3e50;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  transition: background-color 0.2s;
}

.btn-control:hover {
  background: rgba(0, 0, 0, 0.1);
}

.btn-exit:hover {
  background: #dc3545;
}

.main-content {
  flex: 1;
  padding: 1.5rem 2rem;
  overflow-y: auto;
  background-color: #f8f9fa;
}

.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #e9ecef;
  color: #495057;
  font-size: 0.85rem;
  border-top: 1px solid #dee2e6;
}

.status-ok {
  color: #198754;
}

.status-error {
  color: #dc3545;
}
</style>
