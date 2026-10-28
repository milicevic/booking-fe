<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { tenantApi } from '@/api/tenant'
import { apiErrorMessage } from '@/lib/apiError'
import { tenantUrl } from '@/lib/domain'
import AuthLayout from '@/components/auth/AuthLayout.vue'

const { t } = useI18n()

const platformHost = import.meta.env.VITE_PLATFORM_HOST || 'slotres.click'

const form = reactive({
  app_name: '',
  name: '',
  email: '',
  password: '',
})

const error = ref('')
const loading = ref(false)
const success = ref(false)
const registeredSubdomain = ref('')

// Adresu računa backend, isto kao pri registraciji (uključujući sufiks kada je naziv zauzet)
const subdomain = ref('')
const subdomainLoading = ref(false)

watchDebounced(
  () => form.app_name.trim(),
  async (appName) => {
    if (!appName) {
      subdomain.value = ''
      return
    }
    subdomainLoading.value = true
    try {
      const { data } = await tenantApi.previewSubdomain(appName)
      if (appName === form.app_name.trim()) subdomain.value = data.subdomain
    } catch {
      subdomain.value = ''
    } finally {
      subdomainLoading.value = false
    }
  },
  { debounce: 300 },
)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await tenantApi.register(form)
    registeredSubdomain.value = data.tenant.subdomain
    success.value = true
  } catch (e) {
    error.value = apiErrorMessage(e, t('auth.registerError'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout :title="t('auth.registerTitle')" :subtitle="t('auth.registerSubtitle')">
    <!-- Success -->
    <div v-if="success" class="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
      <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-gray-900">{{ t('auth.successTitle') }}</h2>
      <p class="text-sm text-gray-500">{{ t('auth.successMsg') }}</p>
      <div class="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
        <p class="text-xs text-gray-500 mb-1">{{ t('auth.yourAddress') }}</p>
        <a
          :href="tenantUrl(registeredSubdomain)"
          data-testid="registered-address"
          class="text-sm font-semibold text-indigo-600 hover:text-indigo-800 break-all"
        >{{ tenantUrl(registeredSubdomain) }}</a>
      </div>
      <a
        :href="tenantUrl(registeredSubdomain, '/admin/login')"
        data-testid="go-to-login"
        class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
      >
        {{ t('auth.goToLogin') }}
      </a>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="handleSubmit" class="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

      <div>
        <label for="register-app-name" class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('auth.businessName') }} *</label>
        <input
          id="register-app-name"
          v-model="form.app_name"
          type="text"
          required
          maxlength="255"
          :placeholder="t('auth.businessNamePlaceholder')"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p class="text-[11px] text-gray-400 mt-1.5">{{ t('auth.businessNameHint') }}</p>
        <div class="mt-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5" aria-live="polite">
          <p class="text-[11px] text-gray-400 mb-0.5">{{ t('auth.addressLabel') }}</p>
          <p
            class="text-sm font-mono break-all transition-opacity"
            :class="subdomainLoading ? 'opacity-50' : ''"
            data-testid="address-preview"
          >
            <span class="text-gray-400">https://</span><span
              :class="subdomain ? 'text-indigo-600 font-semibold' : 'text-gray-300'"
            >{{ subdomain || t('auth.addressPlaceholder') }}</span><span class="text-gray-400">.{{ platformHost }}</span>
          </p>
        </div>
      </div>

      <div>
        <label for="register-name" class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('auth.yourName') }} *</label>
        <input
          id="register-name"
          v-model="form.name"
          type="text"
          required
          maxlength="255"
          :placeholder="t('auth.yourNamePlaceholder')"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('auth.email') }} *</label>
        <input
          v-model="form.email"
          type="email"
          required
          :placeholder="t('auth.emailPlaceholder')"
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

      <p class="text-xs text-gray-400">{{ t('auth.customizeLater') }}</p>

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
  </AuthLayout>
</template>
