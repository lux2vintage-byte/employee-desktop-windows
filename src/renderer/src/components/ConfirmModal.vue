<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="confirm-overlay" @click.self="handleCancel">
        <div class="confirm-modal">
          <div class="confirm-header">
            <span class="confirm-icon" :class="iconClass">{{ icon }}</span>
          </div>
          <div class="confirm-body">
            <h3>{{ title }}</h3>
            <p>{{ message }}</p>
          </div>
          <div class="confirm-footer">
            <button class="btn btn-cancel" @click="handleCancel">
              {{ cancelText }}
            </button>
            <button :class="['btn', confirmClass]" @click="handleConfirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfirm } from '../composables/useConfirm'

const { state, handleConfirm, handleCancel } = useConfirm()

const isOpen = computed(() => state.isOpen)
const title = computed(() => state.title)
const message = computed(() => state.message)
const confirmText = computed(() => state.confirmText)
const cancelText = computed(() => state.cancelText)
const type = computed(() => state.type)

const icon = computed(() => {
  switch (type.value) {
    case 'danger': return '⚠'
    case 'warning': return '!'
    case 'info': return '?'
    default: return '?'
  }
})

const iconClass = computed(() => `icon-${type.value}`)

const confirmClass = computed(() => {
  switch (type.value) {
    case 'danger': return 'btn-danger'
    case 'warning': return 'btn-warning'
    default: return 'btn-primary'
  }
})
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.confirm-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.confirm-header {
  padding: 24px 24px 0;
  text-align: center;
}

.confirm-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  font-size: 1.8rem;
  font-weight: bold;
}

.icon-danger {
  background: #ffeaea;
  color: #dc3545;
}

.icon-warning {
  background: #fff8e6;
  color: #ffc107;
}

.icon-info {
  background: #e8f4fd;
  color: #0466c8;
}

.confirm-body {
  padding: 20px 24px;
  text-align: center;
}

.confirm-body h3 {
  margin: 0 0 8px;
  font-size: 1.25rem;
  color: #2c3e50;
}

.confirm-body p {
  margin: 0;
  color: #6c757d;
  font-size: 0.95rem;
  line-height: 1.5;
}

.confirm-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  justify-content: center;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.btn-cancel {
  background: #e9ecef;
  color: #495057;
}

.btn-cancel:hover {
  background: #dee2e6;
}

.btn-primary {
  background: #0466c8;
  color: white;
}

.btn-primary:hover {
  background: #0353a4;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background: #e0a800;
}

/* Animasyonlar */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .confirm-modal,
.modal-leave-active .confirm-modal {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .confirm-modal,
.modal-leave-to .confirm-modal {
  transform: scale(0.9);
}
</style>
