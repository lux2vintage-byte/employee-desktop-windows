<template>
  <div class="users">
    <div class="users-header">
      <h2>👥 Kullanıcı Yönetimi</h2>
      <button @click="showCreateModal = true" class="btn btn-primary">➕ Yeni Kullanıcı</button>
    </div>

    <!-- Arama ve Filtreler -->
    <div class="filters">
      <div class="form-group">
        <input 
          v-model="searchQuery" 
          @input="searchUsers"
          type="text" 
          placeholder="Kullanıcı ara..."
          class="search-input"
        >
      </div>
      <div class="form-group">
        <select v-model="verifiedFilter" @change="searchUsers">
          <option value="">Tüm Kullanıcılar</option>
          <option value="true">Doğrulanmış</option>
          <option value="false">Doğrulanmamış</option>
        </select>
      </div>
    </div>

    <!-- Kullanıcı Listesi -->
    <div class="users-table">
      <table class="table">
        <thead>
          <tr>
            <th>Ad Soyad</th>
            <th>E-posta</th>
            <th>Telefon</th>
            <th>Rol</th>
            <th>Durum</th>
            <th>Kayıt Tarihi</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.name }} {{ user.lastname }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.phone || '-' }}</td>
            <td>
              <span :class="['role-badge', user.role.toLowerCase()]">
                {{ user.role === 'ADMIN' ? 'Admin' : 'Kullanıcı' }}
              </span>
            </td>
            <td>
              <span :class="['status-badge', user.isVerified ? 'verified' : 'unverified']">
                {{ user.isVerified ? 'Doğrulanmış' : 'Beklemede' }}
              </span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td class="actions">
              <button @click="editUser(user)" class="btn-icon edit">✏️</button>
              <button @click="deleteUser(user.id)" class="btn-icon delete">🗑️</button>
            </td>
          </tr>
          <tr v-if="users.length === 0 && !loading">
            <td colspan="7" class="empty-row">Kullanıcı bulunamadı</td>
          </tr>
          <tr v-if="loading">
            <td colspan="7" class="loading-row">Yükleniyor...</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sayfalama -->
    <div class="pagination" v-if="totalPages > 1">
      <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1" class="btn btn-page">
        Önceki
      </button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages" class="btn btn-page">
        Sonraki
      </button>
    </div>

    <!-- Kullanıcı Oluşturma Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal">
        <div class="modal-header">
          <h3>Yeni Kullanıcı Oluştur</h3>
          <button @click="closeCreateModal" class="close-btn">×</button>
        </div>
        <form @submit.prevent="createUser" class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Ad *</label>
              <input v-model="createForm.name" type="text" required minlength="3">
            </div>
            <div class="form-group">
              <label>Soyad *</label>
              <input v-model="createForm.lastname" type="text" required minlength="3">
            </div>
          </div>
          <div class="form-group">
            <label>E-posta *</label>
            <input v-model="createForm.email" type="email" required>
          </div>
          <div class="form-group">
            <label>Şifre *</label>
            <input v-model="createForm.password" type="password" required minlength="6">
            <small>En az 6 karakter</small>
          </div>
          <div class="form-group">
            <label>Telefon</label>
            <input v-model="createForm.phone" type="text">
          </div>
          <div class="form-group">
            <label>Rol</label>
            <select v-model="createForm.role">
              <option value="USER">Kullanıcı</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeCreateModal" class="btn btn-secondary">İptal</button>
            <button type="submit" class="btn btn-success" :disabled="saving">
              {{ saving ? 'Oluşturuluyor...' : 'Oluştur' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Düzenleme Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal">
        <div class="modal-header">
          <h3>Kullanıcı Düzenle</h3>
          <button @click="closeEditModal" class="close-btn">×</button>
        </div>
        <form @submit.prevent="saveUser" class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Ad *</label>
              <input v-model="editForm.name" type="text" required minlength="3">
            </div>
            <div class="form-group">
              <label>Soyad *</label>
              <input v-model="editForm.lastname" type="text" required minlength="3">
            </div>
          </div>
          <div class="form-group">
            <label>E-posta *</label>
            <input v-model="editForm.email" type="email" required>
          </div>
          <div class="form-group">
            <label>Şifre (Değiştirmek için doldurun)</label>
            <input v-model="editForm.password" type="password" minlength="6">
          </div>
          <div class="form-group">
            <label>Telefon</label>
            <input v-model="editForm.phone" type="text">
          </div>
          <div class="form-group">
            <label>Rol</label>
            <select v-model="editForm.role">
              <option value="USER">Kullanıcı</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeEditModal" class="btn btn-secondary">İptal</button>
            <button type="submit" class="btn btn-success" :disabled="saving">
              {{ saving ? 'Kaydediliyor...' : 'Güncelle' }}
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
import { useConfirm } from '../composables/useConfirm'

const toast = useToast()
const { confirm: showConfirm } = useConfirm()

const users = ref<any[]>([])
const searchQuery = ref('')
const verifiedFilter = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const loading = ref(false)
const saving = ref(false)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingUserId = ref<number | null>(null)

const createForm = ref({
  name: '',
  lastname: '',
  email: '',
  password: '',
  phone: '',
  role: 'USER'
})

const editForm = ref({
  name: '',
  lastname: '',
  email: '',
  password: '',
  phone: '',
  role: 'USER'
})

onMounted(() => {
  loadUsers()
})

const loadUsers = async () => {
  loading.value = true
  try {
    if (window.electronAPI?.user) {
      const options = {
        search: searchQuery.value,
        isVerified: verifiedFilter.value,
        page: currentPage.value,
        limit: 25
      }
      const result = await window.electronAPI.user.getAll(options)
      if (result.success) {
        users.value = result.data || []
        totalPages.value = result.pagination?.totalPages || 1
      }
    }
  } catch (error) {
    console.error('Kullanıcı yükleme hatası:', error)
  } finally {
    loading.value = false
  }
}

const searchUsers = () => {
  currentPage.value = 1
  loadUsers()
}

const changePage = (page: number) => {
  currentPage.value = page
  loadUsers()
}

const createUser = async () => {
  saving.value = true
  try {
    if (window.electronAPI?.user) {
      const result = await window.electronAPI.user.create(createForm.value)
      if (result.success) {
        toast.success('Kullanıcı başarıyla oluşturuldu')
        closeCreateModal()
        await loadUsers()
      } else {
        toast.error(result.errors?.[0] || 'Kullanıcı oluşturulamadı')
      }
    }
  } catch (error) {
    console.error('Kullanıcı oluşturma hatası:', error)
    toast.error('Kullanıcı oluşturulurken bir hata oluştu')
  } finally {
    saving.value = false
  }
}

const editUser = (user: any) => {
  editingUserId.value = user.id
  editForm.value = {
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    password: '',
    phone: user.phone || '',
    role: user.role
  }
  showEditModal.value = true
}

const saveUser = async () => {
  if (!editingUserId.value) return
  
  saving.value = true
  try {
    if (window.electronAPI?.user) {
      const updateData: any = {
        name: editForm.value.name,
        lastname: editForm.value.lastname,
        email: editForm.value.email,
        phone: editForm.value.phone,
        role: editForm.value.role
      }
      
      if (editForm.value.password) {
        updateData.password = editForm.value.password
      }
      
      const result = await window.electronAPI.user.update(editingUserId.value, updateData)
      if (result.success) {
        toast.success('Kullanıcı başarıyla güncellendi')
        closeEditModal()
        await loadUsers()
      } else {
        toast.error(result.errors?.[0] || 'Kullanıcı güncellenemedi')
      }
    }
  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error)
    toast.error('Kullanıcı güncellenirken bir hata oluştu')
  } finally {
    saving.value = false
  }
}

const deleteUser = async (id: number) => {
  const confirmed = await showConfirm({
    title: 'Kullanıcıyı Sil',
    message: 'Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
    confirmText: 'Sil',
    cancelText: 'İptal',
    type: 'danger'
  })
  
  if (!confirmed) return
  
  try {
    if (window.electronAPI?.user) {
      const result = await window.electronAPI.user.delete(id)
      if (result.success) {
        toast.success('Kullanıcı başarıyla silindi')
        await loadUsers()
      } else {
        toast.error(result.errors?.[0] || 'Kullanıcı silinemedi')
      }
    }
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error)
    toast.error('Kullanıcı silinirken bir hata oluştu')
  }
}

const closeCreateModal = () => {
  showCreateModal.value = false
  createForm.value = {
    name: '',
    lastname: '',
    email: '',
    password: '',
    phone: '',
    role: 'USER'
  }
}

const closeEditModal = () => {
  showEditModal.value = false
  editingUserId.value = null
  editForm.value = {
    name: '',
    lastname: '',
    email: '',
    password: '',
    phone: '',
    role: 'USER'
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('tr-TR')
}
</script>

<style scoped>
.users {
  width: 100%;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.users-header h2 {
  margin: 0;
  color: #2c3e50;
}

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-input {
  min-width: 300px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.filters select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.users-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
}

.table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.table tbody tr:hover {
  background: #f8f9fa;
}

.empty-row,
.loading-row {
  text-align: center;
  color: #6c757d;
  padding: 2rem !important;
}

.role-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.role-badge.admin {
  background-color: #dc3545;
  color: white;
}

.role-badge.user {
  background-color: #0466c8;
  color: white;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.status-badge.verified {
  background-color: #198754;
  color: white;
}

.status-badge.unverified {
  background-color: #ffc107;
  color: #212529;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.3s;
  font-size: 1.1rem;
}

.btn-icon:hover {
  background-color: #e9ecef;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
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

.btn-success {
  background: #198754;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #157347;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-page {
  background: white;
  border: 1px solid #ddd;
  color: #333;
}

.btn-page:hover:not(:disabled) {
  background: #f8f9fa;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #ecf0f1;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
}

.modal-body {
  padding: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #0466c8;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6c757d;
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #ecf0f1;
}
</style>
