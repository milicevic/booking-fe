<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import { apiErrorMessage } from '@/lib/apiError'

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
  } catch (e) {
    error.value = apiErrorMessage(e, t('auth.loginError'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout :title="t('auth.loginTitle')" :subtitle="t('auth.loginSubtitle')">
    <form @submit.prevent="handleLogin" class="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <div>
        <label for="login-email" class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('auth.email') }}</label>
        <input
          id="login-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          :placeholder="t('auth.emailPlaceholder')"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label for="login-password" class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('auth.password') }}</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          placeholder="••••••••"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-xl transition-colors"
      >
        {{ loading ? t('auth.loggingIn') : t('auth.loginBtn') }}
      </button>

      <p class="text-center text-xs text-gray-400">
        {{ t('auth.noAccount') }}
        <router-link :to="{ name: 'register' }" class="text-indigo-600 hover:text-indigo-800">
          {{ t('auth.registerLink') }}
        </router-link>
      </p>
    </form>
  </AuthLayout>
</template>
