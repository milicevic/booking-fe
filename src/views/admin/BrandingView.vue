<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import TenantLogo from '@/components/TenantLogo.vue'
import { tenantApi } from '@/api/tenant'
import { useTenantStore } from '@/stores/tenant'
import { apiErrorMessage } from '@/lib/apiError'
import { CURRENCIES } from '@/lib/price'

const { t } = useI18n()
const tenantStore = useTenantStore()

const form = ref({
  app_name: '',
  primary_color: '#000000',
  secondary_color: '#000000',
  theme: 'minimal',
  currency: 'RSD',
  locale: 'sr',
})

const logoUrl = ref<string | null>(null)
const saving = ref(false)
const saveStatus = ref<'idle' | 'saved' | 'error'>('idle')
const saveError = ref('')
const uploadingLogo = ref(false)
const uploadError = ref('')

onMounted(() => {
  const config = tenantStore.config
  if (config) {
    form.value.app_name = config.app_name ?? ''
    form.value.primary_color = config.primary_color ?? '#000000'
    form.value.secondary_color = config.secondary_color ?? '#000000'
    form.value.theme = config.theme ?? 'minimal'
    form.value.currency = config.currency ?? 'RSD'
    form.value.locale = config.locale ?? 'sr'
    logoUrl.value = config.logo_url
  }
})

async function handleSave() {
  saving.value = true
  saveStatus.value = 'idle'
  try {
    await tenantApi.updateBranding({
      app_name: form.value.app_name,
      primary_color: form.value.primary_color,
      secondary_color: form.value.secondary_color,
      theme: form.value.theme,
      currency: form.value.currency,
      locale: form.value.locale,
    })
    await tenantStore.fetchConfig()
    saveStatus.value = 'saved'
    setTimeout(() => { saveStatus.value = 'idle' }, 2500)
  } catch (e) {
    saveError.value = apiErrorMessage(e, t('branding.saveError'))
    saveStatus.value = 'error'
  } finally {
    saving.value = false
  }
}

async function handleLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadError.value = ''
  uploadingLogo.value = true
  try {
    const { data } = await tenantApi.uploadLogo(file)
    logoUrl.value = data.logo_url
    await tenantStore.fetchConfig()
  } catch (e) {
    uploadError.value = apiErrorMessage(e, t('branding.uploadError'))
  } finally {
    uploadingLogo.value = false
    input.value = ''
  }
}

const themes = ['minimal', 'modern', 'classic'] as const
</script>

<template>
  <AdminLayout>
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-gray-900">{{ t('branding.title') }}</h1>
    </div>

    <div class="space-y-6 max-w-lg">

      <!-- App name -->
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('branding.appName') }}
        </label>
        <input
          v-model="form.app_name"
          type="text"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <!-- Colors -->
      <div class="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">{{ t('branding.primaryColor') }}</label>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">{{ form.primary_color }}</span>
            <input
              v-model="form.primary_color"
              type="color"
              class="w-9 h-9 rounded cursor-pointer border border-gray-200"
            />
          </div>
        </div>
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">{{ t('branding.secondaryColor') }}</label>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">{{ form.secondary_color }}</span>
            <input
              v-model="form.secondary_color"
              type="color"
              class="w-9 h-9 rounded cursor-pointer border border-gray-200"
            />
          </div>
        </div>
      </div>

      <!-- Theme -->
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <p class="text-sm font-medium text-gray-700 mb-3">{{ t('branding.theme') }}</p>
        <div class="flex gap-3">
          <label
            v-for="theme in themes"
            :key="theme"
            class="flex-1 flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-colors"
            :class="form.theme === theme
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          >
            <input
              v-model="form.theme"
              type="radio"
              :value="theme"
              class="sr-only"
            />
            {{ t(`auth.themes.${theme}.label`) }}
          </label>
        </div>
      </div>

      <!-- Valuta i jezik obaveštenja -->
      <div class="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div>
          <label for="branding-currency" class="block text-sm font-medium text-gray-700 mb-2">{{ t('branding.currency') }}</label>
          <select
            id="branding-currency"
            v-model="form.currency"
            class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="currency in CURRENCIES" :key="currency" :value="currency">{{ currency }}</option>
          </select>
          <p class="text-xs text-gray-400 mt-1.5">{{ t('branding.currencyHint') }}</p>
        </div>
        <div>
          <label for="branding-locale" class="block text-sm font-medium text-gray-700 mb-2">{{ t('branding.locale') }}</label>
          <select
            id="branding-locale"
            v-model="form.locale"
            class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="sr">Srpski</option>
            <option value="en">English</option>
          </select>
          <p class="text-xs text-gray-400 mt-1.5">{{ t('branding.localeHint') }}</p>
        </div>
      </div>

      <!-- Save button -->
      <button
        @click="handleSave"
        :disabled="saving"
        class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        {{ saving ? t('branding.saving') : saveStatus === 'saved' ? t('branding.saved') : t('branding.save') }}
      </button>
      <p v-if="saveStatus === 'error'" class="text-red-500 text-sm text-center">{{ saveError }}</p>

      <!-- Logo -->
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <p class="text-sm font-medium text-gray-700 mb-3">{{ t('branding.logo') }}</p>

        <div v-if="logoUrl" class="mb-4 flex flex-wrap items-end gap-6">
          <img :src="logoUrl" alt="logo" class="h-16 w-auto max-w-[200px] object-contain rounded border border-gray-100 p-1" />
          <div>
            <p class="text-xs text-gray-400 mb-1.5">{{ t('branding.logoPreview') }}</p>
            <div class="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
              <TenantLogo :src="logoUrl" :size="32" />
              <span class="font-semibold text-gray-900">{{ form.app_name || tenantStore.appName }}</span>
            </div>
          </div>
        </div>

        <p class="text-xs text-gray-400 mb-3">{{ t('branding.logoHint') }}</p>

        <label class="inline-block cursor-pointer">
          <span
            class="inline-block bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            :class="{ 'opacity-50 pointer-events-none': uploadingLogo }"
          >
            {{ uploadingLogo ? t('common.loading') : t('branding.uploadLogo') }}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="sr-only"
            :disabled="uploadingLogo"
            @change="handleLogoUpload"
          />
        </label>

        <p v-if="uploadError" class="mt-2 text-red-500 text-sm">{{ uploadError }}</p>
      </div>

    </div>
  </AdminLayout>
</template>
