<template>
  <div class="data-table-container">
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th 
              v-for="column in columns" 
              :key="column.key"
              :style="{ width: column.width }"
              :class="{ sortable: column.sortable }"
              @click="column.sortable && handleSort(column.key)"
            >
              {{ column.label }}
              <span v-if="column.sortable && sortKey === column.key" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th v-if="showActions" class="actions-column">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length + (showActions ? 1 : 0)" class="loading-cell">
              <div class="loading-spinner"></div>
              <span>Yükleniyor...</span>
            </td>
          </tr>
          <tr v-else-if="!data || data.length === 0">
            <td :colspan="columns.length + (showActions ? 1 : 0)" class="empty-cell">
              {{ emptyText }}
            </td>
          </tr>
          <tr 
            v-else
            v-for="(row, index) in data" 
            :key="row.id || index"
            @click="$emit('row-click', row)"
            :class="{ clickable: rowClickable }"
          >
            <td v-for="column in columns" :key="column.key">
              <slot :name="`cell-${column.key}`" :row="row" :value="getNestedValue(row, column.key)">
                {{ formatValue(getNestedValue(row, column.key), column.format) }}
              </slot>
            </td>
            <td v-if="showActions" class="actions-cell">
              <slot name="actions" :row="row">
                <button 
                  v-if="showView"
                  class="action-btn view" 
                  @click.stop="$emit('view', row)"
                  title="Görüntüle"
                >
                  👁️
                </button>
                <button 
                  v-if="showEdit"
                  class="action-btn edit" 
                  @click.stop="$emit('edit', row)"
                  title="Düzenle"
                >
                  ✏️
                </button>
                <button 
                  v-if="showDelete"
                  class="action-btn delete" 
                  @click.stop="$emit('delete', row)"
                  title="Sil"
                >
                  🗑️
                </button>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Pagination -->
    <div v-if="showPagination && (totalPages || 0) > 1" class="pagination">
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="$emit('page-change', (currentPage || 1) - 1)"
      >
        ‹ Önceki
      </button>
      <span class="page-info">
        Sayfa {{ currentPage }} / {{ totalPages }} (Toplam: {{ total }})
      </span>
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="$emit('page-change', (currentPage || 1) + 1)"
      >
        Sonraki ›
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface TableColumn {
  key: string
  label: string
  width?: string
  sortable?: boolean
  format?: 'date' | 'datetime' | 'currency' | 'number'
}

const props = defineProps<{
  columns: TableColumn[]
  data: any[]
  loading?: boolean
  emptyText?: string
  showActions?: boolean
  showView?: boolean
  showEdit?: boolean
  showDelete?: boolean
  showPagination?: boolean
  currentPage?: number
  totalPages?: number
  total?: number
  rowClickable?: boolean
}>()

const emit = defineEmits<{
  'row-click': [row: any]
  'view': [row: any]
  'edit': [row: any]
  'delete': [row: any]
  'sort': [key: string, order: 'asc' | 'desc']
  'page-change': [page: number]
}>()

const sortKey = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')

const handleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  emit('sort', sortKey.value, sortOrder.value)
}

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

const formatValue = (value: any, format?: string) => {
  if (value === null || value === undefined) return '-'
  
  switch (format) {
    case 'date':
      return new Date(value).toLocaleDateString('tr-TR')
    case 'datetime':
      return new Date(value).toLocaleString('tr-TR')
    case 'currency':
      return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value)
    case 'number':
      return new Intl.NumberFormat('tr-TR').format(value)
    default:
      return value
  }
}
</script>

<style scoped>
.data-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.875rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable:hover {
  background: #e9ecef;
}

.sort-icon {
  margin-left: 0.25rem;
  font-size: 0.75rem;
}

.data-table tbody tr {
  transition: background-color 0.15s;
}

.data-table tbody tr:hover {
  background: #f8f9fa;
}

.data-table tbody tr.clickable {
  cursor: pointer;
}

.actions-column {
  width: 120px;
  text-align: center;
}

.actions-cell {
  text-align: center;
  white-space: nowrap;
}

.action-btn {
  padding: 0.375rem 0.5rem;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  margin: 0 0.125rem;
}

.action-btn:hover {
  background: #e9ecef;
  transform: scale(1.1);
}

.action-btn.delete:hover {
  background: #fee2e2;
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 3rem 1rem;
  color: #6c757d;
}

.loading-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e9ecef;
  border-top-color: #0466c8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid #e9ecef;
}

.page-btn {
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #495057;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #ced4da;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #6c757d;
  font-size: 0.875rem;
}
</style>
