<template>
  <div class="action-toolbar">
    <div class="toolbar-left">
      <slot name="left"></slot>
    </div>
    <div class="toolbar-right">
      <button 
        v-if="showPrint" 
        class="toolbar-btn" 
        @click="$emit('print')"
        title="Yazdır"
      >
        🖨️ Yazdır
      </button>
      <button 
        v-if="showPdf" 
        class="toolbar-btn" 
        @click="$emit('pdf')"
        title="PDF Oluştur"
      >
        📄 PDF
      </button>
      <button 
        v-if="showExcelExport" 
        class="toolbar-btn" 
        @click="$emit('excel-export')"
        title="Excel'e Aktar"
      >
        📊 Excel'e Aktar
      </button>
      <button 
        v-if="showExcelImport" 
        class="toolbar-btn" 
        @click="$emit('excel-import')"
        title="Excel'den Al"
      >
        📥 Excel'den Al
      </button>
      <slot name="right"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showPrint?: boolean
  showPdf?: boolean
  showExcelExport?: boolean
  showExcelImport?: boolean
}>()

defineEmits<{
  print: []
  pdf: []
  'excel-export': []
  'excel-import': []
}>()
</script>

<style scoped>
.action-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  margin-bottom: 1rem;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.875rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #495057;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #e9ecef;
  border-color: #ced4da;
  color: #2c3e50;
}

.toolbar-btn:active {
  transform: scale(0.98);
}
</style>
