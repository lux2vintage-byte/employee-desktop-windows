<template>
  <div class="reactivity-test">
    <h3>Reaktivite Test Bileşeni</h3>
    <div class="counter-section">
      <p>Sayaç: {{ counter }}</p>
      <button @click="increment">Artır</button>
      <button @click="decrement">Azalt</button>
      <button @click="reset">Sıfırla</button>
    </div>
    
    <div class="text-section">
      <p>Metin: {{ text }}</p>
      <input v-model="text" placeholder="Metin girin" />
    </div>
    
    <div class="computed-section">
      <p>Çift Sayaç: {{ doubleCounter }}</p>
      <p>Metin Uzunluğu: {{ textLength }}</p>
    </div>
    
    <div class="array-section">
      <p>Liste: {{ items.join(', ') }}</p>
      <button @click="addItem">Öğe Ekle</button>
      <button @click="removeItem">Öğe Sil</button>
    </div>
    
    <div class="object-section">
      <p>Kullanıcı: {{ user.name }} ({{ user.age }} yaşında)</p>
      <button @click="updateUser">Kullanıcı Güncelle</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

// Reactive state
const counter = ref(0)
const text = ref('')
const items = ref<string[]>([])
const user = reactive({
  name: 'Test Kullanıcı',
  age: 25
})

// Computed properties
const doubleCounter = computed(() => counter.value * 2)
const textLength = computed(() => text.value.length)

// Methods
const increment = () => {
  counter.value++
}

const decrement = () => {
  counter.value--
}

const reset = () => {
  counter.value = 0
}

const addItem = () => {
  items.value.push(`Öğe ${items.value.length + 1}`)
}

const removeItem = () => {
  if (items.value.length > 0) {
    items.value.pop()
  }
}

const updateUser = () => {
  user.name = `Güncellenmiş Kullanıcı ${Math.floor(Math.random() * 100)}`
  user.age = Math.floor(Math.random() * 50) + 20
}

// Expose for testing
defineExpose({
  counter,
  text,
  items,
  user,
  doubleCounter,
  textLength,
  increment,
  decrement,
  reset,
  addItem,
  removeItem,
  updateUser
})
</script>

<style scoped>
.reactivity-test {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 1rem 0;
}

.reactivity-test > div {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-left: 3px solid #3498db;
  background: #f8f9fa;
}

button {
  margin: 0 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #2980b9;
}

input {
  margin-left: 0.5rem;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>