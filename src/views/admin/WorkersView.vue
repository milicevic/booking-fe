<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { adminApi } from '@/api/admin'
import type { Worker } from '@/api/admin'

const workers = ref<Worker[]>([])
const loading = ref(true)
const showForm = ref(false)
const submitting = ref(false)
const error = ref('')

const form = ref({
  name: '',
  email: '',
  phone: '',
})

onMounted(async () => {
  await fetchWorkers()
})

async function fetchWorkers() {
  loading.value = true
  try {
    const { data } = await adminApi.getWorkers()
    workers.value = data
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!form.value.name) {
    error.value = 'Unesite ime radnika'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await adminApi.createWorker(form.value)
    form.value = { name: '', email: '', phone: '' }
    showForm.value = false
    await fetchWorkers()
  } catch {
    error.value = 'Greška pri dodavanju radnika'
  } finally {
    submitting.value = false
  }
}

async function handleDelete(worker: Worker) {
  if (!confirm(`Obrisati radnika ${worker.name}?`)) return
  await adminApi.deleteWorker(worker.id)
  await fetchWorkers()
}
</script>

<template>
  <AdminLayout>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-gray-900">Radnici</h1>
      <button
        @click="showForm = !showForm"
        class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + Dodaj
      </button>
    </div>

    <!-- Forma za dodavanje -->
    <div v-if="showForm" class="bg-white rounded-xl border border-gray-100 p-5 mb-6">
      <h2 class="text-sm font-medium text-gray-700 mb-4">Novi radnik</h2>
      <div class="space-y-3">
        <input
          v-model="form.name"
          type="text"
          placeholder="Ime i prezime *"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          v-model="form.email"
          type="email"
          placeholder="Email (opciono)"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          v-model="form.phone"
          type="tel"
          placeholder="Telefon (opciono)"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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

    <!-- Lista radnika -->
    <div v-if="loading" class="text-gray-400 text-sm">Učitavanje...</div>

    <div v-else class="space-y-2">
      <div
        v-for="worker in workers"
        :key="worker.id"
        class="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-sm">
            {{ worker.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900">{{ worker.name }}</p>
            <p class="text-xs text-gray-400">{{ worker.email ?? worker.worker_profile?.phone ?? '—' }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="handleDelete(worker)"
            class="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div v-if="workers.length === 0" class="text-center py-8 text-gray-400 text-sm">
        Nema radnika — dodajte prvog
      </div>
    </div>
  </AdminLayout>
</template>
