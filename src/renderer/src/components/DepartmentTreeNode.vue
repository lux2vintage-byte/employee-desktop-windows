<template>
  <div class="tree-node">
    <div class="node-content" :class="{ expanded: isExpanded }">
      <button 
        v-if="hasChildren" 
        class="expand-btn"
        @click="toggleExpand"
      >
        {{ isExpanded ? '▼' : '▶' }}
      </button>
      <span v-else class="expand-placeholder"></span>
      
      <div class="node-info">
        <span class="node-icon">🏢</span>
        <span class="node-name">{{ department.name }}</span>
        <span v-if="department.costCenterCode" class="node-code">
          {{ department.costCenterCode }}
        </span>
        <span v-if="department._count?.employees" class="node-count">
          👥 {{ department._count.employees }}
        </span>
      </div>

      <div class="node-actions">
        <button class="action-btn" @click="$emit('add-child', department.id)" title="Alt Departman Ekle">
          ➕
        </button>
        <button class="action-btn" @click="$emit('edit', department)" title="Düzenle">
          ✏️
        </button>
        <button class="action-btn delete" @click="$emit('delete', department)" title="Sil">
          🗑️
        </button>
      </div>
    </div>

    <Transition name="expand">
      <div v-if="isExpanded && hasChildren" class="children">
        <DepartmentTreeNode
          v-for="child in department.children"
          :key="child.id"
          :department="child"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @add-child="$emit('add-child', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Department {
  id: number
  name: string
  costCenterCode?: string
  children?: Department[]
  _count?: {
    employees: number
    childDepartments: number
  }
}

const props = defineProps<{
  department: Department
}>()

defineEmits<{
  edit: [department: Department]
  delete: [department: Department]
  'add-child': [parentId: number]
}>()

const isExpanded = ref(true)

const hasChildren = computed(() => {
  return props.department.children && props.department.children.length > 0
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.tree-node {
  margin-left: 0;
}

.children {
  margin-left: 1.5rem;
  border-left: 2px solid #e9ecef;
  padding-left: 0.5rem;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
}

.node-content:hover {
  background: #e9ecef;
}

.expand-btn {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: #dee2e6;
  color: #2c3e50;
}

.expand-placeholder {
  width: 24px;
  height: 24px;
}

.node-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.node-icon {
  font-size: 1.25rem;
}

.node-name {
  font-weight: 600;
  color: #2c3e50;
}

.node-code {
  font-family: 'Consolas', monospace;
  font-size: 0.75rem;
  background: #e7f1ff;
  color: #0466c8;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.node-count {
  font-size: 0.8rem;
  color: #6c757d;
  background: white;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
}

.node-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.node-content:hover .node-actions {
  opacity: 1;
}

.action-btn {
  width: 32px;
  height: 32px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #e9ecef;
  border-color: #ced4da;
}

.action-btn.delete:hover {
  background: #fee2e2;
  border-color: #fecaca;
}

/* Expand Animation */
.expand-enter-active, .expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to, .expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
