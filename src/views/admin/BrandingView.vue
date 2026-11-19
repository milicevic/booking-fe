<script setup lang="ts">
import BlockedCustomers from '@/components/admin/BlockedCustomers.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import ConfirmationModePicker from '@/components/admin/ConfirmationModePicker.vue'
import SettingsSite from '@/components/admin/SettingsSite.vue'
import { tenantApi } from '@/api/tenant'
import type { CustomerContact } from '@/api/tenant'
import { adminApi } from '@/api/admin'
import type { ConfirmationMode } from '@/api/admin'
import { useTenantStore } from '@/stores/tenant'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '@/lib/apiError'
import { CURRENCIES } from '@/lib/price'
import { DEFAULT_PRIMARY_COLOR } from '@/lib/color'
import { BUSINESS_TYPES } from '@/lib/onboarding'
import type { BusinessType } from '@/lib/onboarding'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'

const { t } = useI18n()
const tenantStore = useTenantStore()
const auth = useAuthStore()

// Boje ponuđene u dizajnu; ostale se biraju preko „Druga boja“
const COLORS = [
  { value: '#4f46e5', key: 'indigo' },
  { value: '#0f766e', key: 'green' },
  { value: '#be185d', key: 'pink' },
  { value: '#b45309', key: 'orange' },
]
const THEMES = ['minimal', 'modern', 'classic'] as const
const CONTACTS: CustomerContact[] = ['phone', 'both', 'email_or_phone', 'email']
// Rok za pomeranje bira vlasnik slobodno (backend: 0–720 h); podrazumevano 6 h
const DEFAULT_CUTOFF_HOURS = 6
const MAX_CUTOFF_HOURS = 720

const form = ref({
  app_name: '',
  primary_color: DEFAULT_PRIMARY_COLOR,
  theme: 'minimal',
  currency: 'RSD',
  locale: 'sr',
  business_type: 'salon' as BusinessType,
  confirmation_mode: 'owner' as ConfirmationMode,
  customer_contact: 'phone' as CustomerContact,
  calendar_invites: true,
  max_active_bookings_per_customer: 3,
  max_daily_bookings_per_customer: 5,
  pending_expiry_hours: 12,
  reschedule_cutoff_hours: DEFAULT_CUTOFF_HOURS,
})

const logoUrl = ref<string | null>(null)
const saving = ref(false)
const saved = ref(false)
const error = ref('')
const uploadingLogo = ref(false)

// Config firme stiže asinhrono (App.vue), pa se forma popunjava kad bude učitan
watch(() => tenantStore.config, fill, { immediate: true })

function fill() {
  const config = tenantStore.config
  const profile = auth.client?.client_profile
  if (config) {
    form.value.app_name = config.app_name ?? ''
    form.value.primary_color = config.primary_color ?? DEFAULT_PRIMARY_COLOR
    form.value.theme = config.theme ?? 'minimal'
    form.value.currency = config.currency ?? 'RSD'
    form.value.locale = config.locale ?? 'sr'
    form.value.business_type = config.business_type ?? 'salon'
    logoUrl.value = config.logo_url
  }
  form.value.confirmation_mode = profile?.confirmation_mode ?? (profile?.auto_confirm_bookings ? 'auto' : 'owner')
  form.value.customer_contact = profile?.customer_contact ?? config?.customer_contact ?? 'phone'
  form.value.calendar_invites = profile?.calendar_invites ?? config?.calendar_invites ?? true
  form.value.max_active_bookings_per_customer = profile?.max_active_bookings_per_customer ?? 3
  form.value.max_daily_bookings_per_customer = profile?.max_daily_bookings_per_customer ?? 5
  form.value.pending_expiry_hours = profile?.pending_expiry_hours ?? 12
  form.value.reschedule_cutoff_hours = profile?.reschedule_cutoff_hours ?? config?.reschedule_cutoff_hours ?? DEFAULT_CUTOFF_HOURS
}

async function save() {
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    const { app_name, primary_color, theme, currency, locale, business_type, ...settings } = form.value
    await tenantApi.updateBranding({ app_name, primary_color, theme, currency, locale, business_type })
    const cutoff = Math.round(Number(settings.reschedule_cutoff_hours))
    const count = (value: unknown, max: number) => Math.min(Math.max(Math.round(Number(value)) || 0, 0), max)
    const { data } = await adminApi.updateSettings({
      ...settings,
      max_active_bookings_per_customer: count(settings.max_active_bookings_per_customer, 100),
      max_daily_bookings_per_customer: count(settings.max_daily_bookings_per_customer, 100),
      pending_expiry_hours: count(settings.pending_expiry_hours, MAX_CUTOFF_HOURS),
      reschedule_cutoff_hours: Number.isFinite(cutoff) ? Math.min(Math.max(cutoff, 0), MAX_CUTOFF_HOURS) : DEFAULT_CUTOFF_HOURS,
    })
    auth.client = data
    await tenantStore.fetchConfig()
    saved.value = true
  } catch (e) {
    error.value = apiErrorMessage(e, t('branding.saveError'))
  } finally {
    saving.value = false
  }
}

async function uploadLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  error.value = ''
  uploadingLogo.value = true
  try {
    logoUrl.value = (await tenantApi.uploadLogo(file)).data.logo_url
    await tenantStore.fetchConfig()
  } catch (e) {
    error.value = apiErrorMessage(e, t('branding.uploadError'))
  } finally {
    uploadingLogo.value = false
    input.value = ''
  }
}
</script>

<template>
  <AdminLayout :title="t('settings.title')">
    <div class="flex max-w-3xl flex-col gap-5">
      <!-- Izgled -->
      <section class="flex flex-col gap-5 rounded-xl border border-gray-100 bg-card p-6">
        <h2 class="text-lg font-semibold">{{ t('settings.look') }}</h2>
        <div class="grid gap-1.5">
          <Label for="branding-app-name">{{ t('branding.appName') }}</Label>
          <Input id="branding-app-name" v-model="form.app_name" type="text" />
        </div>
        <div class="grid gap-1.5">
          <Label for="branding-business-type">{{ t('onboarding.business.type') }}</Label>
          <NativeSelect id="branding-business-type" v-model="form.business_type">
            <NativeSelectOption v-for="b in BUSINESS_TYPES" :key="b" :value="b">{{ t(`onboarding.types.${b}`) }}</NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <img v-if="logoUrl" :src="logoUrl" alt="" class="size-14 flex-none rounded-xl border border-gray-100 object-contain p-1" />
          <span
            v-else
            aria-hidden="true"
            class="flex size-14 flex-none items-center justify-center rounded-xl text-2xl font-semibold text-white"
            :style="{ backgroundColor: form.primary_color }"
          >{{ (form.app_name || tenantStore.appName).charAt(0).toUpperCase() }}</span>
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium text-gray-700">{{ t('branding.logo') }}</span>
            <label class="cursor-pointer self-start">
              <span :class="cn(buttonVariants({ variant: 'outline', size: 'sm' }), uploadingLogo && 'pointer-events-none opacity-50')">
                {{ uploadingLogo ? t('common.loading') : t('branding.uploadLogo') }}
              </span>
              <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" :disabled="uploadingLogo" @change="uploadLogo" />
            </label>
            <span class="text-[13px] text-gray-600">{{ t('branding.logoHint') }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-gray-700">{{ t('settings.color') }}</span>
          <div class="flex flex-wrap items-center gap-3">
            <button
              v-for="c in COLORS"
              :key="c.value"
              type="button"
              class="size-11 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              :class="form.primary_color === c.value && 'ring-2 ring-foreground ring-offset-2'"
              :style="{ backgroundColor: c.value }"
              :aria-pressed="form.primary_color === c.value"
              :aria-label="t(`onboarding.colors.${c.key}`)"
              @click="form.primary_color = c.value"
            />
            <label class="flex items-center gap-2 text-sm text-gray-700">
              <input v-model="form.primary_color" type="color" class="size-11 cursor-pointer rounded-full border" />
              {{ t('settings.customColor') }}
            </label>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-gray-700">{{ t('settings.pageLook') }}</span>
          <div class="flex flex-wrap gap-2" role="group" :aria-label="t('settings.pageLook')">
            <button
              v-for="theme in THEMES"
              :key="theme"
              type="button"
              :aria-pressed="form.theme === theme"
              class="min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              :class="form.theme === theme ? 'border-primary bg-accent font-semibold' : 'border-gray-200 bg-card text-gray-700 hover:border-gray-400'"
              @click="form.theme = theme"
            >
              {{ t(`auth.themes.${theme}.label`) }}
            </button>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="grid gap-1.5">
            <Label for="branding-currency">{{ t('branding.currency') }}</Label>
            <NativeSelect id="branding-currency" v-model="form.currency">
              <NativeSelectOption v-for="currency in CURRENCIES" :key="currency" :value="currency">{{ currency }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="grid gap-1.5">
            <Label for="branding-locale">{{ t('branding.locale') }}</Label>
            <NativeSelect id="branding-locale" v-model="form.locale">
              <NativeSelectOption value="sr">Srpski</NativeSelectOption>
              <NativeSelectOption value="en">English</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </section>

      <!-- Potvrda termina -->
      <section class="flex flex-col gap-4 rounded-xl border border-gray-100 bg-card p-6">
        <h2 class="text-lg font-semibold">{{ t('settings.confirm.title') }}</h2>
        <ConfirmationModePicker v-model="form.confirmation_mode" />
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="grid gap-1.5">
            <Label for="customer-contact">{{ t('dashboard.customerContact.label') }}</Label>
            <NativeSelect id="customer-contact" v-model="form.customer_contact">
              <NativeSelectOption v-for="option in CONTACTS" :key="option" :value="option">{{ t(`dashboard.customerContact.${option}`) }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="grid gap-1.5">
            <Label for="reschedule-cutoff">{{ t('settings.cutoff') }}</Label>
            <div class="flex items-center gap-2">
              <Input
                id="reschedule-cutoff"
                v-model.number="form.reschedule_cutoff_hours"
                type="number"
                inputmode="numeric"
                min="0"
                :max="MAX_CUTOFF_HOURS"
                class="w-28"
                aria-describedby="reschedule-cutoff-hint"
              />
              <span class="text-sm text-gray-600">{{ t('settings.cutoffUnit') }}</span>
            </div>
            <p id="reschedule-cutoff-hint" class="text-[13px] text-gray-600">
              {{ Number(form.reschedule_cutoff_hours) === 0 ? t('settings.cutoffAny') : t('settings.cutoffHint', { n: form.reschedule_cutoff_hours }) }}
            </p>
          </div>
        </div>
        <label class="flex items-start gap-3 text-sm">
          <Checkbox id="calendar-invites" v-model="form.calendar_invites" class="mt-0.5" />
          <span class="flex flex-col gap-0.5">
            <span class="font-medium">{{ t('settings.calendarInvites') }}</span>
            <span class="text-[13px] text-gray-600">{{ t('settings.calendarInvitesHint') }}</span>
          </span>
        </label>
      </section>

      <!-- Zaštita od zauzimanja termina -->
      <section class="flex flex-col gap-4 rounded-xl border border-gray-100 bg-card p-6">
        <div class="flex flex-col gap-1">
          <h2 class="text-lg font-semibold">{{ t('settings.abuse.title') }}</h2>
          <p class="text-sm text-gray-600">{{ t('settings.abuse.text') }}</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="grid content-start gap-1.5">
            <Label for="max-active">{{ t('settings.abuse.maxActive') }}</Label>
            <Input id="max-active" v-model.number="form.max_active_bookings_per_customer" type="number" inputmode="numeric" min="0" max="100" class="w-28" />
          </div>
          <div class="grid content-start gap-1.5">
            <Label for="max-daily">{{ t('settings.abuse.maxDaily') }}</Label>
            <Input id="max-daily" v-model.number="form.max_daily_bookings_per_customer" type="number" inputmode="numeric" min="0" max="100" class="w-28" />
          </div>
          <div class="grid content-start gap-1.5">
            <Label for="pending-expiry">{{ t('settings.abuse.pendingExpiry') }}</Label>
            <div class="flex items-center gap-2">
              <Input id="pending-expiry" v-model.number="form.pending_expiry_hours" type="number" inputmode="numeric" min="0" :max="MAX_CUTOFF_HOURS" class="w-28" />
              <span class="text-sm text-gray-600">{{ t('settings.abuse.hours') }}</span>
            </div>
          </div>
        </div>
        <p class="text-[13px] text-gray-600">{{ t('settings.abuse.zeroHint') }}</p>
        <BlockedCustomers />
      </section>

      <SettingsSite />

      <div class="flex flex-wrap items-center gap-3">
        <Button size="lg" :disabled="saving" @click="save">{{ saving ? t('branding.saving') : t('settings.save') }}</Button>
        <span v-if="saved" role="status" class="text-sm font-medium text-green-800">{{ t('settings.saved') }}</span>
        <span v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</span>
      </div>
    </div>
  </AdminLayout>
</template>
