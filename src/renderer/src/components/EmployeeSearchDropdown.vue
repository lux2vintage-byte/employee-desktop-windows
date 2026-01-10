<template>
  <div class="employee-search-dropdown" ref="dropdownContainer">
    <div class="search-input-wrapper">
      <input
        ref="searchInput"
        v-model="searchTerm"
        type="text"
        class="search-input"
        :placeholder="placeholder"
        @focus="handleFocus"
        @input="handleInput"
        @keydown.down.prevent="navigateDown"
        @keydown.up.prevent="navigateUp"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.esc="closeDropdown"
      />
      <span class="search-icon">🔍</span>
      <button v-if="modelValue" class="clear-btn" @click="clearSelection" type="button">✕</button>
    </div>

    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="showDropdown && filteredEmployees.length > 0"
          class="dropdown-menu"
          :style="dropdownStyle"
          @mousedown.prevent
        >
          <div class="dropdown-scroll">
            <div
              v-for="(emp, index) in filteredEmployees"
              :key="emp.id"
              class="dropdown-item"
              :class="{ highlighted: index === highlightedIndex, selected: modelValue?.id === emp.id }"
              @click="selectEmployee(emp)"
              @mouseenter="highlightedIndex = index"
            >
              <div v-if="emp.photoUrl" class="employee-avatar">
                <img :src="emp.photoUrl" :alt="emp.firstName" />
              </div>
              <div v-else class="employee-avatar-placeholder">
                {{ emp.firstName?.charAt(0) }}{{ emp.lastName?.charAt(0) }}
              </div>
              <div class="employee-info">
                <span class="employee-name">{{ emp.firstName }} {{ emp.lastName }}</span>
                <div class="employee-meta">
                  <span class="employee-code">{{ emp.employeeCode }}</span>
                  <span v-if="emp.department" class="employee-dept">{{ emp.department.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

interface Employee {
  id: number
  firstName: string
  lastName: string
  employeeCode: string
  department?: {
    id: number
    name: string
  }
  position?: {
    id: number
    title: string
  }
  photoUrl?: string | null
  hireDate: Date
}

const props = defineProps<{
  modelValue: Employee | null
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Employee | null): void
  (e: 'select', employee: Employee): void
}>()

const dropdownContainer = ref<HTMLElement>()
const searchInput = ref<HTMLInputElement>()
const searchTerm = ref('')
const showDropdown = ref(false)
const employees = ref<Employee[]>([])
const loading = ref(false)
const highlightedIndex = ref(0)
const dropdownStyle = ref({})

// Personel listesini yükle
const loadEmployees = async () => {
  loading.value = true
  try {
    const result = await window.electronAPI.employee.getAll({ limit: 1000, status: 'Active' })
    if (result.success) {
      employees.value = (result.data || []).map(emp => ({
        ...emp,
        photoUrl: emp.photoUrl || undefined,
        hireDate: new Date(emp.hireDate)
      }))
    }
  } catch (error) {
    console.error('Personeller yüklenemedi:', error)
  } finally {
    loading.value = false
  }
}

// Filtrelenmiş personeller
const filteredEmployees = computed(() => {
  if (!searchTerm.value.trim()) {
    return employees.value.slice(0, 50) // İlk 50 personel
  }

  const term = searchTerm.value.toLowerCase().trim()
  return employees.value
    .filter(emp => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
      const code = emp.employeeCode.toLowerCase()
      return fullName.includes(term) || code.includes(term)
    })
    .slice(0, 50)
})

// Dropdown pozisyonunu hesapla
const calculateDropdownPosition = () => {
  if (!dropdownContainer.value) return

  const rect = dropdownContainer.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top

  const dropdownHeight = 300 // Max height
  const shouldShowAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow

  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: '300px',
    ...(shouldShowAbove
      ? { bottom: `${viewportHeight - rect.top}px` }
      : { top: `${rect.bottom}px` })
  }
}

const handleFocus = () => {
  showDropdown.value = true
  highlightedIndex.value = 0
  calculateDropdownPosition()
}

const handleInput = () => {
  showDropdown.value = true
  highlightedIndex.value = 0
  calculateDropdownPosition()
}

const selectEmployee = (employee: Employee) => {
  emit('update:modelValue', employee)
  emit('select', employee)
  searchTerm.value = `${employee.firstName} ${employee.lastName}`
  closeDropdown()
}

const clearSelection = () => {
  emit('update:modelValue', null)
  searchTerm.value = ''
  searchInput.value?.focus()
}

const closeDropdown = () => {
  showDropdown.value = false
}

const navigateDown = () => {
  if (highlightedIndex.value < filteredEmployees.value.length - 1) {
    highlightedIndex.value++
  }
}

const navigateUp = () => {
  if (highlightedIndex.value > 0) {
    highlightedIndex.value--
  }
}

const selectHighlighted = () => {
  const employee = filteredEmployees.value[highlightedIndex.value]
  if (employee) {
    selectEmployee(employee)
  }
}

// Click outside to close
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

// Seçili personel değiştiğinde input'u güncelle
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      searchTerm.value = `${newVal.firstName} ${newVal.lastName}`
    } else {
      searchTerm.value = ''
    }
  },
  { immediate: true }
)

onMounted(() => {
  loadEmployees()
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', calculateDropdownPosition, true)
  window.addEventListener('resize', calculateDropdownPosition)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', calculateDropdownPosition, true)
  window.removeEventListener('resize', calculateDropdownPosition)
})
</script>

<style scoped>
.employee-search-dropdown {
  position: relative;
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.625rem 2.5rem 0.625rem 2.5rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #0466c8;
  box-shadow: 0 0 0 3px rgba(4, 102, 200, 0.1);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: #6c757d;
  pointer-events: none;
}

.clear-btn {
  position: absolute;
  right: 0.5rem;
  background: #e9ecef;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6c757d;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #dee2e6;
  color: #495057;
}

.dropdown-menu {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  overflow: hidden;
}

.dropdown-scroll {
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.15s;
  border-bottom: 1px solid #f8f9fa;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover,
.dropdown-item.highlighted {
  background-color: #f8f9fa;
}

.dropdown-item.selected {
  background-color: #e7f1ff;
}

.employee-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
}

.employee-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.employee-avatar-placeholder {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a9dbb8, #8fcca0);
  color: #2c3e50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.employee-info {
  flex: 1;
  min-width: 0;
}

.employee-name {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.employee-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
}

.employee-code {
  color: #0466c8;
  font-weight: 500;
  font-family: 'Consolas', monospace;
}

.employee-dept {
  color: #6c757d;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Scrollbar */
.dropdown-scroll::-webkit-scrollbar {
  width: 6px;
}

.dropdown-scroll::-webkit-scrollbar-track {
  background: #f8f9fa;
}

.dropdown-scroll::-webkit-scrollbar-thumb {
  background: #dee2e6;
  border-radius: 3px;
}

.dropdown-scroll::-webkit-scrollbar-thumb:hover {
  background: #ced4da;
}
</style>
