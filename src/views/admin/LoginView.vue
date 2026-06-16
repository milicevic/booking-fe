<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch {
    error.value = t('auth.loginError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">

      <h1 class="text-2xl font-semibold text-gray-900 mb-1">{{ t('auth.loginTitle') }}</h1>
      <p class="text-gray-500 text-sm mb-8">{{ t('auth.loginSubtitle') }}</p>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('auth.email') }}</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="firma@example.com"
            class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('auth.password') }}</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
        >
          {{ loading ? t('auth.loggingIn') : t('auth.loginBtn') }}
        </button>
      </form>

      <p class="text-center text-xs text-gray-400 mt-6">
        {{ t('auth.noAccount') }}
        <router-link :to="{ name: 'register' }" class="text-indigo-600 hover:text-indigo-800">
          {{ t('auth.registerLink') }}
        </router-link>
      </p>
    </div>
  </div>
</template>
