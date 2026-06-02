<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { tenantApi } from '@/api/tenant'

const router = useRouter()

const THEMES = [
  { value: 'minimal', label: 'Minimalno', desc: 'Čist, moderan izgled' },
  { value: 'modern', label: 'Moderno', desc: 'Dinamičan, savremeni stil' },
  { value: 'classic', label: 'Klasično', desc: 'Tradicionalan, proveran dizajn' },
]

const form = reactive({
  name: '',
  email: '',
  password: '',
  primary_color: '#4f46e5',
  secondary_color: '#818cf8',
  theme: 'minimal',
})

const error = ref('')
const loading = ref(false)
const success = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await tenantApi.register(form)
    success.value = true
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'Greška pri registraciji'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">

      <!-- Logo / branding -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Kreiranje naloga</h1>
        <p class="text-sm text-gray-500 mt-1">Počnite sa 7 dana besplatno</p>
      </div>

      <!-- Success -->
      <div v-if="success" class="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900">Nalog kreiran!</h2>
        <p class="text-sm text-gray-500">
          Poslali smo vam email sa uputstvima za prijavu.<br />
          Trial period traje 7 dana.
        </p>
        <button
          @click="router.push({ name: 'login' })"
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          Prijavi se
        </button>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

        <!-- Ime firme -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Ime firme / brenda *</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="npr. Frizerski salon Ana"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Email *</label>
          <input
            v-model="form.email"
            type="email"
            required
            placeholder="vas@email.com"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Password -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Lozinka *</label>
          <input
            v-model="form.password"
            type="password"
            required
            minlength="8"
            placeholder="Minimum 8 karaktera"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Boje -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Boje brenda</label>
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block text-[11px] text-gray-400 mb-1">Primarna</label>
              <div class="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                <input
                  v-model="form.primary_color"
                  type="color"
                  class="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <span class="text-xs text-gray-500 font-mono">{{ form.primary_color }}</span>
              </div>
            </div>
            <div class="flex-1">
              <label class="block text-[11px] text-gray-400 mb-1">Sekundarna</label>
              <div class="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                <input
                  v-model="form.secondary_color"
                  type="color"
                  class="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <span class="text-xs text-gray-500 font-mono">{{ form.secondary_color }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tema -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-2">Tema</label>
          <div class="space-y-2">
            <label
              v-for="t in THEMES"
              :key="t.value"
              class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
              :class="form.theme === t.value
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="form.theme" type="radio" :value="t.value" class="text-indigo-600" />
              <div>
                <p class="text-sm font-medium text-gray-900">{{ t.label }}</p>
                <p class="text-xs text-gray-400">{{ t.desc }}</p>
              </div>
            </label>
          </div>
        </div>

        <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-xl transition-colors"
        >
          {{ loading ? 'Kreiranje...' : 'Kreiraj besplatan nalog' }}
        </button>

        <p class="text-center text-xs text-gray-400">
          Već imate nalog?
          <router-link :to="{ name: 'login' }" class="text-indigo-600 hover:text-indigo-800">
            Prijavite se
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>
