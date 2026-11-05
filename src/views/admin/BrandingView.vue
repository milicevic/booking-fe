<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import TenantLogo from '@/components/TenantLogo.vue'
import { tenantApi } from '@/api/tenant'
import { useTenantStore } from '@/stores/tenant'
import { apiErrorMessage } from '@/lib/apiError'
import { CURRENCIES } from '@/lib/price'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import { DEFAULT_PRIMARY_COLOR } from '@/lib/color'

const { t } = useI18n()
const tenantStore = useTenantStore()

const form = ref({
  app_name: '',
  primary_color: DEFAULT_PRIMARY_COLOR,
  secondary_color: '#818cf8',
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
    form.value.primary_color = config.primary_color ?? DEFAULT_PRIMARY_COLOR
    form.value.secondary_color = config.secondary_color ?? '#818cf8'
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
      <h1 class="text-xl font-semibold">{{ t('branding.title') }}</h1>
    </div>

    <div class="space-y-6 max-w-lg">

      <!-- App name -->
      <Card>
        <CardContent class="grid gap-2">
          <Label for="branding-app-name" class="text-sm text-foreground">{{ t('branding.appName') }}</Label>
          <Input id="branding-app-name" v-model="form.app_name" type="text" />
        </CardContent>
      </Card>

      <!-- Colors -->
      <Card>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <Label for="branding-primary-color" class="text-sm text-foreground">{{ t('branding.primaryColor') }}</Label>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">{{ form.primary_color }}</span>
              <input
                id="branding-primary-color"
                v-model="form.primary_color"
                type="color"
                class="w-9 h-9 rounded-md cursor-pointer border"
              />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <Label for="branding-secondary-color" class="text-sm text-foreground">{{ t('branding.secondaryColor') }}</Label>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">{{ form.secondary_color }}</span>
              <input
                id="branding-secondary-color"
                v-model="form.secondary_color"
                type="color"
                class="w-9 h-9 rounded-md cursor-pointer border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Theme -->
      <Card>
        <CardContent>
          <p class="text-sm font-medium mb-3">{{ t('branding.theme') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              v-for="theme in themes"
              :key="theme"
              class="flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              :class="form.theme === theme
                ? 'border-primary bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted'"
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
        </CardContent>
      </Card>

      <!-- Valuta i jezik obaveštenja -->
      <Card>
        <CardContent class="space-y-4">
          <div class="grid gap-2">
            <Label for="branding-currency" class="text-sm text-foreground">{{ t('branding.currency') }}</Label>
            <NativeSelect id="branding-currency" v-model="form.currency">
              <NativeSelectOption v-for="currency in CURRENCIES" :key="currency" :value="currency">{{ currency }}</NativeSelectOption>
            </NativeSelect>
            <p class="text-xs text-muted-foreground">{{ t('branding.currencyHint') }}</p>
          </div>
          <div class="grid gap-2">
            <Label for="branding-locale" class="text-sm text-foreground">{{ t('branding.locale') }}</Label>
            <NativeSelect id="branding-locale" v-model="form.locale">
              <NativeSelectOption value="sr">Srpski</NativeSelectOption>
              <NativeSelectOption value="en">English</NativeSelectOption>
            </NativeSelect>
            <p class="text-xs text-muted-foreground">{{ t('branding.localeHint') }}</p>
          </div>
        </CardContent>
      </Card>

      <!-- Save button -->
      <Button class="w-full" :disabled="saving" @click="handleSave">
        {{ saving ? t('branding.saving') : saveStatus === 'saved' ? t('branding.saved') : t('branding.save') }}
      </Button>
      <p v-if="saveStatus === 'error'" class="text-destructive text-sm text-center">{{ saveError }}</p>

      <!-- Logo -->
      <Card>
        <CardContent>
          <p class="text-sm font-medium mb-3">{{ t('branding.logo') }}</p>

          <div v-if="logoUrl" class="mb-4 flex flex-wrap items-end gap-6">
            <img :src="logoUrl" alt="logo" class="h-16 w-auto max-w-[200px] object-contain rounded border p-1" />
            <div>
              <p class="text-xs text-muted-foreground mb-1.5">{{ t('branding.logoPreview') }}</p>
              <div class="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2">
                <TenantLogo :src="logoUrl" :size="32" />
                <span class="font-semibold">{{ form.app_name || tenantStore.appName }}</span>
              </div>
            </div>
          </div>

          <p class="text-xs text-muted-foreground mb-3">{{ t('branding.logoHint') }}</p>

          <label class="inline-block cursor-pointer">
            <span
              :class="cn(buttonVariants({ variant: 'outline' }), uploadingLogo && 'opacity-50 pointer-events-none')"
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

          <p v-if="uploadError" class="mt-2 text-destructive text-sm">{{ uploadError }}</p>
        </CardContent>
      </Card>

    </div>
  </AdminLayout>
</template>
