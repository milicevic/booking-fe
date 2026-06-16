<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { tenantApi } from '@/api/tenant'

const { t } = useI18n()
const router = useRouter()

const THEMES = computed(() => [
  { value: 'minimal', label: t('auth.themes.minimal.label'), desc: t('auth.themes.minimal.desc') },
  { value: 'modern', label: t('auth.themes.modern.label'), desc: t('auth.themes.modern.desc') },
  { value: 'classic', label: t('auth.themes.classic.label'), desc: t('auth.themes.classic.desc') },
])

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
    error.value = e.response?.data?.message ?? t('auth.registerError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">

      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">{{ t('auth.registerTitle') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('auth.registerSubtitle') }}</p>
      </div>

      <!-- Success -->
      <div v-if="success" class="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900">{{ t('auth.successTitle') }}</h2>
        <p class="text-sm text-gray-500">{{ t('auth.successMsg') }}</p>
        <button
          @click="router.push({ name: 'login' })"
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {{ t('auth.goToLogin') }}
        </button>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('auth.businessName') }} *</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="npr. Frizerski salon Ana"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('auth.email') }} *</label>
          <input
            v-model="form.email"
            type="email"
            required
            placeholder="vas@email.com"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('auth.password') }} *</label>
          <input
            v-model="form.password"
            type="password"
            required
            minlength="8"
            :placeholder="t('auth.minPassword')"
            class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('auth.brandColors') }}</label>
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block text-[11px] text-gray-400 mb-1">{{ t('auth.primaryColor') }}</label>
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
              <label class="block text-[11px] text-gray-400 mb-1">{{ t('auth.secondaryColor') }}</label>
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

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-2">{{ t('auth.theme') }}</label>
          <div class="space-y-2">
            <label
              v-for="theme in THEMES"
              :key="theme.value"
              class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
              :class="form.theme === theme.value
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'"
            >
              <input v-model="form.theme" type="radio" :value="theme.value" class="text-indigo-600" />
              <div>
                <p class="text-sm font-medium text-gray-900">{{ theme.label }}</p>
                <p class="text-xs text-gray-400">{{ theme.desc }}</p>
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
          {{ loading ? t('auth.creating') : t('auth.createBtn') }}
        </button>

        <p class="text-center text-xs text-gray-400">
          {{ t('auth.alreadyHaveAccount') }}
          <router-link :to="{ name: 'login' }" class="text-indigo-600 hover:text-indigo-800">
            {{ t('auth.loginBtn') }}
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>
