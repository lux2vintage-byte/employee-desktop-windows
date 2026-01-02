<template>
  <div class="role-permissions-page">
    <PageHeader 
      title="Rol ve Yetki Tanımları" 
      description="Kullanıcı rolleri ve erişim yetkilerini yönetin"
    >
      <template #actions>
        <button class="btn btn-primary" @click="openCreateModal">
          ➕ Yeni Rol
        </button>
      </template>
    </PageHeader>

    <div class="stats-grid">
      <StatCard icon="🔐" :value="roles.length" label="Toplam Rol" color="primary" />
      <StatCard icon="👥" :value="totalUsers" label="Toplam Kullanıcı" color="info" />
      <StatCard icon="✅" :value="activeRoles" label="Aktif Rol" color="success" />
      <StatCard icon="🛡️" :value="totalPermissions" label="Yetki Sayısı" color="warning" />
    </div>

    <ActionToolbar :show-print="true" :show-pdf="true" :show-excel-export="true"
      @print="handlePrint" @pdf="handlePdf" @excel-export="handleExcelExport">
      <template #left>
        <input v-model="searchTerm" type="text" placeholder="Rol ara..." class="search-input" />
      </template>
    </ActionToolbar>

    <div class="roles-grid">
      <div v-for="role in filteredRoles" :key="role.id" class="role-card" :class="{ 'system-role': role.isSystem }">
        <div class="role-header">
          <div class="role-info">
            <span class="role-icon">{{ getRoleIcon(role.name) }}</span>
            <div class="role-details">
              <h3>{{ role.name }}</h3>
              <span class="role-description">{{ role.description }}</span>
            </div>
          </div>
          <div class="role-actions" v-if="!role.isSystem">
            <button class="action-btn edit" @click="openEditModal(role)" title="Düzenle">✏️</button>
            <button class="action-btn delete" @click="deleteRole(role)" title="Sil">🗑️</button>
          </div>
          <span v-else class="system-badge">Sistem</span>
        </div>

        <div class="role-stats">
          <div class="stat-item">
            <span class="stat-value">{{ role.userCount || 0 }}</span>
            <span class="stat-label">Kullanıcı</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ role.permissions?.length || 0 }}</span>
            <span class="stat-label">Yetki</span>
          </div>
        </div>

        <div class="permissions-section">
          <h4>Yetkiler</h4>
          <div class="permissions-grid">
            <div v-for="module in permissionModules" :key="module.key" class="permission-module">
              <div class="module-header">
                <span class="module-icon">{{ module.icon }}</span>
                <span class="module-name">{{ module.name }}</span>
              </div>
              <div class="module-permissions">
                <span 
                  v-for="perm in module.permissions" 
                  :key="perm.key"
                  :class="['permission-badge', { active: hasPermission(role, module.key, perm.key) }]"
                  :title="perm.name"
                >
                  {{ perm.short }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredRoles.length === 0" class="empty-state">
        <span class="empty-icon">🔐</span>
        <p>Rol bulunamadı</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h3>{{ isEditing ? 'Rol Düzenle' : 'Yeni Rol Oluştur' }}</h3>
              <button class="close-btn" @click="closeModal">✕</button>
            </div>
            <form @submit.prevent="saveRole" class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Rol Adı *</label>
                  <input v-model="form.name" type="text" required class="form-control" placeholder="Örn: Yönetici" />
                </div>
                <div class="form-group">
                  <label>Açıklama</label>
                  <input v-model="form.description" type="text" class="form-control" placeholder="Rol açıklaması" />
                </div>
              </div>

              <div class="permissions-editor">
                <h4>Yetki Tanımları</h4>
                <div class="modules-list">
                  <div v-for="module in permissionModules" :key="module.key" class="module-editor">
                    <div class="module-editor-header">
                      <label class="checkbox-label">
                        <input type="checkbox" :checked="isModuleFullySelected(module.key)" @change="toggleModule(module.key)" />
                        <span class="module-icon">{{ module.icon }}</span>
                        <span>{{ module.name }}</span>
                      </label>
                    </div>
                    <div class="module-editor-permissions">
                      <label v-for="perm in module.permissions" :key="perm.key" class="permission-checkbox">
                        <input type="checkbox" :checked="formHasPermission(module.key, perm.key)" @change="togglePermission(module.key, perm.key)" />
                        <span>{{ perm.name }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeModal">İptal</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
                </button>
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
import { useConfirm } from '@/composables/useConfirm'

const { success, error } = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const searchTerm = ref('')

const roles = ref<any[]>([
  { id: 1, name: 'Admin', description: 'Tam yetkili sistem yöneticisi', isSystem: true, userCount: 1, permissions: ['*'] },
  { id: 2, name: 'İK Yöneticisi', description: 'İnsan kaynakları yönetimi', isSystem: false, userCount: 2, permissions: ['employees.*', 'leave.*', 'attendance.*', 'reports.read'] },
  { id: 3, name: 'Muhasebe', description: 'Bordro ve finans işlemleri', isSystem: false, userCount: 3, permissions: ['payroll.*', 'salary.*', 'reports.read'] },
  { id: 4, name: 'Departman Yöneticisi', description: 'Departman bazlı yetki', isSystem: false, userCount: 5, permissions: ['employees.read', 'leave.approve', 'attendance.read'] },
  { id: 5, name: 'Kullanıcı', description: 'Temel kullanıcı yetkileri', isSystem: true, userCount: 15, permissions: ['profile.read', 'profile.update'] }
])

const form = reactive({
  id: null as number | null,
  name: '',
  description: '',
  permissions: [] as string[]
})

const permissionModules = [
  {
    key: 'employees',
    name: 'Personel',
    icon: '👥',
    permissions: [
      { key: 'read', name: 'Görüntüleme', short: 'G' },
      { key: 'create', name: 'Oluşturma', short: 'O' },
      { key: 'update', name: 'Güncelleme', short: 'Gn' },
      { key: 'delete', name: 'Silme', short: 'S' }
    ]
  },
  {
    key: 'leave',
    name: 'İzin Yönetimi',
    icon: '🏖️',
    permissions: [
      { key: 'read', name: 'Görüntüleme', short: 'G' },
      { key: 'create', name: 'Talep Oluşturma', short: 'O' },
      { key: 'approve', name: 'Onaylama', short: 'On' },
      { key: 'delete', name: 'Silme', short: 'S' }
    ]
  },
  {
    key: 'attendance',
    name: 'Devamlılık',
    icon: '⏰',
    permissions: [
      { key: 'read', name: 'Görüntüleme', short: 'G' },
      { key: 'create', name: 'Kayıt Oluşturma', short: 'O' },
      { key: 'update', name: 'Güncelleme', short: 'Gn' }
    ]
  },
  {
    key: 'payroll',
    name: 'Bordro',
    icon: '💰',
    permissions: [
      { key: 'read', name: 'Görüntüleme', short: 'G' },
      { key: 'create', name: 'Oluşturma', short: 'O' },
      { key: 'finalize', name: 'Kesinleştirme', short: 'K' }
    ]
  },
  {
    key: 'reports',
    name: 'Raporlar',
    icon: '📊',
    permissions: [
      { key: 'read', name: 'Görüntüleme', short: 'G' },
      { key: 'export', name: 'Dışa Aktarma', short: 'D' }
    ]
  },
  {
    key: 'settings',
    name: 'Ayarlar',
    icon: '⚙️',
    permissions: [
      { key: 'read', name: 'Görüntüleme', short: 'G' },
      { key: 'update', name: 'Güncelleme', short: 'Gn' }
    ]
  }
]

const filteredRoles = computed(() => {
  if (!searchTerm.value) return roles.value
  const term = searchTerm.value.toLowerCase()
  return roles.value.filter(r => 
    r.name.toLowerCase().includes(term) || 
    r.description?.toLowerCase().includes(term)
  )
})

const totalUsers = computed(() => roles.value.reduce((sum, r) => sum + (r.userCount || 0), 0))
const activeRoles = computed(() => roles.value.filter(r => !r.isSystem).length)
const totalPermissions = computed(() => permissionModules.reduce((sum, m) => sum + m.permissions.length, 0))

const getRoleIcon = (name: string) => {
  const icons: Record<string, string> = {
    'Admin': '👑', 'İK Yöneticisi': '👔', 'Muhasebe': '💼',
    'Departman Yöneticisi': '🏢', 'Kullanıcı': '👤'
  }
  return icons[name] || '🔐'
}

const hasPermission = (role: any, moduleKey: string, permKey: string) => {
  if (!role.permissions) return false
  if (role.permissions.includes('*')) return true
  if (role.permissions.includes(`${moduleKey}.*`)) return true
  return role.permissions.includes(`${moduleKey}.${permKey}`)
}

const formHasPermission = (moduleKey: string, permKey: string) => {
  if (form.permissions.includes('*')) return true
  if (form.permissions.includes(`${moduleKey}.*`)) return true
  return form.permissions.includes(`${moduleKey}.${permKey}`)
}

const isModuleFullySelected = (moduleKey: string) => {
  const module = permissionModules.find(m => m.key === moduleKey)
  if (!module) return false
  return module.permissions.every(p => formHasPermission(moduleKey, p.key))
}

const toggleModule = (moduleKey: string) => {
  const module = permissionModules.find(m => m.key === moduleKey)
  if (!module) return
  
  const isFullySelected = isModuleFullySelected(moduleKey)
  
  // Remove all permissions for this module
  form.permissions = form.permissions.filter(p => !p.startsWith(`${moduleKey}.`) && p !== `${moduleKey}.*`)
  
  if (!isFullySelected) {
    // Add all permissions
    form.permissions.push(`${moduleKey}.*`)
  }
}

const togglePermission = (moduleKey: string, permKey: string) => {
  const fullKey = `${moduleKey}.${permKey}`
  const moduleWildcard = `${moduleKey}.*`
  
  // Remove module wildcard if exists
  const wildcardIndex = form.permissions.indexOf(moduleWildcard)
  if (wildcardIndex > -1) {
    form.permissions.splice(wildcardIndex, 1)
    // Add all individual permissions except the one being toggled
    const module = permissionModules.find(m => m.key === moduleKey)
    if (module) {
      module.permissions.forEach(p => {
        if (p.key !== permKey) {
          form.permissions.push(`${moduleKey}.${p.key}`)
        }
      })
    }
    return
  }
  
  const index = form.permissions.indexOf(fullKey)
  if (index > -1) {
    form.permissions.splice(index, 1)
  } else {
    form.permissions.push(fullKey)
  }
}

const openCreateModal = () => {
  isEditing.value = false
  form.id = null
  form.name = ''
  form.description = ''
  form.permissions = []
  showModal.value = true
}

const openEditModal = (role: any) => {
  isEditing.value = true
  form.id = role.id
  form.name = role.name
  form.description = role.description || ''
  form.permissions = [...(role.permissions || [])]
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveRole = async () => {
  if (!form.name.trim()) {
    error('Rol adı zorunludur')
    return
  }
  
  saving.value = true
  try {
    // Simulated save - in real app, call API
    if (isEditing.value) {
      const index = roles.value.findIndex(r => r.id === form.id)
      if (index > -1) {
        roles.value[index] = {
          ...roles.value[index],
          name: form.name,
          description: form.description,
          permissions: [...form.permissions]
        }
      }
      success('Rol güncellendi')
    } else {
      roles.value.push({
        id: Date.now(),
        name: form.name,
        description: form.description,
        isSystem: false,
        userCount: 0,
        permissions: [...form.permissions]
      })
      success('Rol oluşturuldu')
    }
    closeModal()
  } catch (err) {
    error('Kaydetme sırasında hata oluştu')
  } finally {
    saving.value = false
  }
}

const deleteRole = async (role: any) => {
  if (role.isSystem) {
    error('Sistem rolleri silinemez')
    return
  }
  
  const confirmed = await confirm({
    title: 'Rol Sil',
    message: `"${role.name}" rolünü silmek istediğinize emin misiniz?`,
    confirmText: 'Sil',
    type: 'danger'
  })
  
  if (confirmed) {
    roles.value = roles.value.filter(r => r.id !== role.id)
    success('Rol silindi')
  }
}

const handlePrint = () => window.print()
const handlePdf = () => success('PDF oluşturma özelliği yakında eklenecek')
const handleExcelExport = () => success('Excel export özelliği yakında eklenecek')

onMounted(() => {
  // Load roles from API if needed
})
</script>

<style scoped>
.role-permissions-page { max-width: 1400px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.search-input { padding: 0.5rem 0.75rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.875rem; background: white; min-width: 200px; }

.roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; }
@media (max-width: 768px) { .roles-grid { grid-template-columns: 1fr; } }

.role-card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); transition: all 0.2s; }
.role-card:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12); }
.role-card.system-role { border-left: 4px solid #0466c8; }

.role-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.role-info { display: flex; gap: 0.75rem; }
.role-icon { font-size: 2rem; }
.role-details h3 { margin: 0; font-size: 1.1rem; color: #2c3e50; }
.role-description { font-size: 0.85rem; color: #6c757d; }
.role-actions { display: flex; gap: 0.25rem; }
.action-btn { padding: 0.375rem 0.5rem; background: none; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; transition: all 0.2s; }
.action-btn.edit:hover { background: #fff3cd; }
.action-btn.delete:hover { background: #f8d7da; }
.system-badge { padding: 0.25rem 0.75rem; background: #cce5ff; color: #004085; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }

.role-stats { display: flex; gap: 2rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e9ecef; }
.stat-item { display: flex; flex-direction: column; }
.stat-value { font-size: 1.5rem; font-weight: 700; color: #0466c8; }
.stat-label { font-size: 0.75rem; color: #6c757d; }

.permissions-section h4 { margin: 0 0 0.75rem; font-size: 0.85rem; color: #495057; text-transform: uppercase; letter-spacing: 0.5px; }
.permissions-grid { display: flex; flex-direction: column; gap: 0.5rem; }
.permission-module { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: #f8f9fa; border-radius: 6px; }
.module-header { display: flex; align-items: center; gap: 0.375rem; min-width: 120px; }
.module-icon { font-size: 1rem; }
.module-name { font-size: 0.8rem; color: #495057; }
.module-permissions { display: flex; gap: 0.25rem; }
.permission-badge { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-size: 0.65rem; font-weight: 600; background: #e9ecef; color: #adb5bd; }
.permission-badge.active { background: #d4edda; color: #155724; }

.empty-state { grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 12px; }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
.empty-state p { color: #6c757d; margin: 0; }

/* Modal Styles */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-container { background: white; border-radius: 12px; width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); }
.modal-container.modal-lg { max-width: 800px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e9ecef; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #2c3e50; }
.close-btn { background: none; border: none; font-size: 1.5rem; color: #6c757d; cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #495057; }
.form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #dee2e6; border-radius: 6px; font-size: 0.95rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #e9ecef; margin-top: 1rem; }
.btn { padding: 0.625rem 1.25rem; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #0466c8; color: white; }
.btn-primary:hover { background: #0353a4; }
.btn-primary:disabled { background: #adb5bd; cursor: not-allowed; }
.btn-secondary { background: #e9ecef; color: #495057; }
.btn-secondary:hover { background: #dee2e6; }

.permissions-editor { margin-top: 1.5rem; }
.permissions-editor h4 { margin: 0 0 1rem; font-size: 1rem; color: #2c3e50; }
.modules-list { display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto; }
.module-editor { background: #f8f9fa; border-radius: 8px; padding: 1rem; }
.module-editor-header { margin-bottom: 0.75rem; }
.module-editor-header .checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600; color: #2c3e50; }
.module-editor-permissions { display: flex; flex-wrap: wrap; gap: 0.75rem; padding-left: 1.5rem; }
.permission-checkbox { display: flex; align-items: center; gap: 0.375rem; cursor: pointer; font-size: 0.85rem; color: #495057; }
.permission-checkbox input { cursor: pointer; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
