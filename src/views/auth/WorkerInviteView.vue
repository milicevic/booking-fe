<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { tenantApi } from '@/api/tenant'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const token = route.params.token as string

const form = reactive({
  name: '',
  password: '',
})

const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await tenantApi.acceptInvite(token, form)
    // Auto-login radnika
    auth.setSession(data.token as string, data.client as any)
    router.push({ name: 'dashboard' })
  } catch (e: any) {
    error.value = e.response?.data?.message ?? 'Link je nevažeći ili je istekao'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">

      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Prihvati pozivnicu</h1>
        <p class="text-sm text-gray-500 mt-1">Podesite vaš radni nalog</p>
      </div>

      <form @submit.prevent="handleSubmit" class="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Vaše ime *</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Ime i prezime"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

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

        <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-xl transition-colors"
        >
          {{ loading ? 'Aktivacija...' : 'Aktiviraj nalog' }}
        </button>
      </form>
    </div>
  </div>
</template>
