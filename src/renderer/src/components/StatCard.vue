<template>
  <div class="stat-card" :class="[`stat-${color}`]">
    <div class="stat-icon">{{ icon }}</div>
    <div class="stat-content">
      <span class="stat-value">{{ value }}</span>
      <span class="stat-label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  value: string | number
  label: string
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}>()
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #0466c8;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.stat-primary { border-left-color: #0466c8; }
.stat-success { border-left-color: #198754; }
.stat-warning { border-left-color: #ffc107; }
.stat-danger { border-left-color: #dc3545; }
.stat-info { border-left-color: #0dcaf0; }

.stat-icon {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 10px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.85rem;
  color: #6c757d;
  margin-top: 0.25rem;
}
</style>
