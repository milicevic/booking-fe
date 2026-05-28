<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { adminApi } from '@/api/admin'
import type { Worker } from '@/api/admin'
import type { Slot } from '@/api/booking'

const slots = ref<Slot[]>([])
const workers = ref<Worker[]>([])
const loading = ref(true)
const showForm = ref(false)
const submitting = ref(false)
const error = ref('')

const form = ref({
  worker_id: '',
  date: '',
  start_time: '',
  end_time: '',
})

onMounted(async () => {
  await Promise.all([fetchSlots(), fetchWorkers()])
})

async function fetchSlots() {
  loading.value = true
  try {
    const { data } = await adminApi.getSlots()
    slots.value = data
  } finally {
    loading.value = false
  }
}

async function fetchWorkers() {
  const { data } = await adminApi.getWorkers()
  workers.value = data
}

async function handleCreate() {
  if (!form.value.worker_id || !form.value.date || !form.value.start_time || !form.value.end_time) {
    error.value = 'Sva polja su obavezna'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await adminApi.createSlot({
      worker_id: Number(form.value.worker_id),
      date: form.value.date,
      start_time: form.value.start_time,
      end_time: form.value.end_time,
    })
    form.value = { worker_id: '', date: '', start_time: '', end_time: '' }
    showForm.value = false
    await fetchSlots()
  } catch {
    error.value = 'Greška pri dodavanju termina'
  } finally {
    submitting.value = false
  }
}

async function handleDelete(slot: Slot) {
  if (!confirm('Obrisati termin?')) return
  await adminApi.deleteSlot(slot.id)
  await fetchSlots()
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('sr-RS', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
</script>

<template>
  <AdminLayout>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-gray-900">Termini</h1>
      <button
        @click="showForm = !showForm"
        class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + Dodaj
      </button>
    </div>

    <!-- Forma -->
    <div v-if="showForm" class="bg-white rounded-xl border border-gray-100 p-5 mb-6">
      <h2 class="text-sm font-medium text-gray-700 mb-4">Novi termin</h2>
      <div class="space-y-3">
        <select
          v-model="form.worker_id"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Odaberi radnika *</option>
          <option v-for="w in workers" :key="w.id" :value="w.id">
            {{ w.name }}
          </option>
        </select>
        <input
          v-model="form.date"
          type="date"
          :min="new Date().toISOString().slice(0, 10)"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Početak</label>
            <input
              v-model="form.start_time"
              type="time"
              class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">Kraj</label>
            <input
              v-model="form.end_time"
              type="time"
              class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
        <div class="flex gap-2">
          <button
            @click="handleCreate"
            :disabled="submitting"
            class="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {{ submitting ? 'Čuvanje...' : 'Sačuvaj' }}
          </button>
          <button
            @click="showForm = false"
            class="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Otkaži
          </button>
        </div>
      </div>
    </div>

    <!-- Lista termina -->
    <div v-if="loading" class="text-gray-400 text-sm">Učitavanje...</div>

    <div v-else class="space-y-2">
      <div
        v-for="slot in slots"
        :key="slot.id"
        class="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
      >
        <div>
          <p class="text-sm font-medium text-gray-900 capitalize">
            {{ formatDate(slot.date) }} ·
            {{ slot.start_time.slice(0, 5) }} — {{ slot.end_time.slice(0, 5) }}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">{{ slot.worker.name }}</p>
        </div>

        <div class="flex items-center gap-2">
          <span
            :class="slot.is_available
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'"
            class="text-xs font-medium px-2.5 py-1 rounded-full"
          >
            {{ slot.is_available ? 'Slobodan' : 'Zauzet' }}
          </span>
          <button
            v-if="slot.is_available"
            @click="handleDelete(slot)"
            class="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div v-if="slots.length === 0" class="text-center py-8 text-gray-400 text-sm">
        Nema termina — dodajte prvi
      </div>
    </div>
  </AdminLayout>
</template>
