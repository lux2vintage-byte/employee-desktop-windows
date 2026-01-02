<template>
  <div class="home">
    <div class="welcome-section">
      <h1>Hoş Geldiniz</h1>
      <p>Personel Yönetimi Sistemine hoş geldiniz</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <h3>{{ stats.userCount }}</h3>
          <p>Toplam Kullanıcı</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <h3>{{ stats.verifiedCount }}</h3>
          <p>Doğrulanmış</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <h3>{{ stats.pendingCount }}</h3>
          <p>Beklemede</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">🛡️</div>
        <div class="stat-content">
          <h3>{{ stats.adminCount }}</h3>
          <p>Admin</p>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <h2>Hızlı İşlemler</h2>
      <div class="actions-grid">
        <router-link to="/users/create" class="action-card">
          <span class="action-icon">➕</span>
          <span class="action-label">Yeni Kullanıcı</span>
        </router-link>
        <router-link to="/users" class="action-card">
          <span class="action-icon">📋</span>
          <span class="action-label">Kullanıcı Listesi</span>
        </router-link>
        <router-link to="/settings" class="action-card">
          <span class="action-icon">🏢</span>
          <span class="action-label">Şirket Bilgileri</span>
        </router-link>
        <router-link to="/email-settings" class="action-card">
          <span class="action-icon">📧</span>
          <span class="action-label">E-Posta Ayarları</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stats = ref({
  userCount: 0,
  verifiedCount: 0,
  pendingCount: 0,
  adminCount: 0
})

onMounted(() => {
  loadStats()
})

const loadStats = async () => {
  // TODO: API çağrısı
  // Mock data
  stats.value = {
    userCount: 12,
    verifiedCount: 8,
    pendingCount: 4,
    adminCount: 2
  }
}
</script>

<style scoped>
.home {
  padding: 1rem;
}

.welcome-section {
  margin-bottom: 2rem;
}

.welcome-section h1 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 2rem;
}

.welcome-section p {
  margin: 0;
  color: #6c757d;
  font-size: 1.1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 12px;
}

.stat-content h3 {
  margin: 0;
  font-size: 1.75rem;
  color: #2c3e50;
}

.stat-content p {
  margin: 0.25rem 0 0 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.quick-actions {
  margin-top: 2rem;
}

.quick-actions h2 {
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.action-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: #2c3e50;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  border: 2px solid transparent;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  border-color: #0466c8;
}

.action-icon {
  font-size: 2rem;
}

.action-label {
  font-weight: 500;
  text-align: center;
}
</style>
