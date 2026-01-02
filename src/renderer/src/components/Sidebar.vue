<template>
  <transition name="sidebar-slide">
    <div v-if="isOpen" class="sidebar-overlay" @click="closeSidebar">
      <div class="sidebar" @click.stop>
        <div class="sidebar-header">
          <h3>{{ activeMenu?.label }}</h3>
          <button class="close-btn" @click="closeSidebar">✕</button>
        </div>
        <nav class="sidebar-menu">
          <template v-for="item in activeMenu?.items" :key="item.path">
            <div v-if="item.divider" class="sidebar-divider">
              <span>{{ item.divider }}</span>
            </div>
            <router-link
              :to="item.path"
              class="sidebar-item"
              @click="closeSidebar"
            >
              <span class="sidebar-icon">{{ item.icon }}</span>
              <span class="sidebar-label">{{ item.label }}</span>
            </router-link>
          </template>
        </nav>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
interface MenuItem {
  path: string;
  label: string;
  icon: string;
  divider?: string;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

defineProps<{
  isOpen: boolean;
  activeMenu: Menu | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const closeSidebar = () => {
  emit('close');
};
</script>

<style scoped>
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100%;
  background: linear-gradient(180deg, #a9dbb8 0%, #8fcca0 100%);
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.15);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #2c3e50;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  transition: transform 0.2s;
}

.close-btn:hover {
  transform: rotate(90deg);
}

.sidebar-menu {
  padding: 0.5rem 0;
}

.sidebar-divider {
  padding: 0.75rem 1.5rem 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.sidebar-divider:first-child {
  margin-top: 0;
  border-top: none;
}

.sidebar-divider span {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(44, 62, 80, 0.6);
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: 0.875rem 1.5rem;
  color: #2c3e50;
  text-decoration: none;
  transition: all 0.3s;
  border-left: 3px solid transparent;
}

.sidebar-item:hover {
  background: rgba(0, 0, 0, 0.1);
  border-left-color: #2c3e50;
  padding-left: 1.75rem;
}

.sidebar-item.router-link-active {
  background: rgba(0, 0, 0, 0.15);
  border-left-color: #2c3e50;
  color: #1a252f;
}

.sidebar-icon {
  font-size: 1.1rem;
  margin-right: 0.875rem;
  min-width: 22px;
  text-align: center;
}

.sidebar-label {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Animasyonlar */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: opacity 0.3s;
}

.sidebar-slide-enter-active .sidebar,
.sidebar-slide-leave-active .sidebar {
  transition: transform 0.3s;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  opacity: 0;
}

.sidebar-slide-enter-from .sidebar,
.sidebar-slide-leave-to .sidebar {
  transform: translateX(-100%);
}

/* Scrollbar */
.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}
</style>
