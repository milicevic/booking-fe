<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { tenantApi } from '@/api/tenant'
import { useTenantStore } from '@/stores/tenant'
import { apiErrorMessage } from '@/lib/apiError'
import { tenantUrl } from '@/lib/domain'

/** Adresa i domen + pretplata (sekcije na dnu Podešavanja). */
const { t, locale } = useI18n()
const tenant = useTenantStore()

const domain = ref('')
const sending = ref(false)
const message = ref('')
const error = ref('')

const siteHost = computed(() => (tenant.config?.subdomain ? tenantUrl(tenant.config.subdomain).replace(/^https?:\/\//, '') : ''))
const status = computed(() => tenant.config?.subscription_status ?? 'trialing')
const pendingDeploy = computed(() => status.value === 'pending_deploy')

const statusClass = computed(() => {
  if (status.value === 'active') return 'bg-green-100 text-green-800'
  if (status.value === 'expired' || status.value === 'canceled') return 'bg-red-100 text-red-800'
  return 'bg-amber-100 text-amber-800'
})

const endsAt = computed(() => {
  const date = status.value === 'trialing' ? tenant.config?.trial_ends_at : tenant.config?.subscription_ends_at
  if (!date) return ''
  const day = new Date(date).toLocaleDateString(locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US', { day: 'numeric', month: 'long' })
  if (status.value === 'trialing' && tenant.trialDaysLeft === 0) return t('settings.plan.trialExpired')
  return status.value === 'trialing' && tenant.trialDaysLeft !== null
    ? t('settings.plan.trialEnds', { date: day, n: tenant.trialDaysLeft }, tenant.trialDaysLeft)
    : t('settings.plan.endsOn', { date: day })
})

async function requestDomain() {
  if (!domain.value.trim()) return
  sending.value = true
  error.value = ''
  message.value = ''
  try {
    await tenantApi.requestDeploy({ custom_domain: domain.value.trim() })
    await tenant.fetchConfig()
    message.value = t('settings.site.requested')
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-4 rounded-xl border border-gray-100 bg-card p-6">
    <h2 class="text-lg font-semibold">{{ t('settings.site.title') }}</h2>
    <div class="flex flex-col gap-0.5">
      <span class="text-sm text-gray-600">{{ t('settings.site.subdomain') }}</span>
      <span class="font-semibold break-all">{{ siteHost }}</span>
    </div>
    <form class="flex flex-wrap items-end gap-3" @submit.prevent="requestDomain">
      <div class="grid min-w-0 flex-[1_1_240px] gap-1">
        <Label for="custom-domain">{{ t('settings.site.domain') }}</Label>
        <Input id="custom-domain" v-model="domain" type="text" :placeholder="t('settings.site.domainPlaceholder')" />
      </div>
      <Button type="submit" variant="outline" class="min-h-11" :disabled="!domain.trim() || sending">
        {{ t('settings.site.request') }}
      </Button>
    </form>
    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <p v-if="message" class="text-sm font-medium text-green-800" role="status">{{ message }}</p>
    <p class="text-sm text-gray-600">
      {{ t('settings.site.status') }}
      <span class="font-semibold text-foreground">{{ pendingDeploy ? t('settings.site.pending') : t('settings.site.live') }}</span>
    </p>
  </section>

  <section class="flex flex-col gap-2 rounded-xl border border-gray-100 bg-card p-6">
    <h2 class="text-lg font-semibold">{{ t('settings.plan.title') }}</h2>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span class="rounded-full px-2.5 py-1 font-semibold" :class="statusClass">{{ t(`settings.plan.status.${status}`) }}</span>
      <span v-if="endsAt" class="text-gray-600">{{ endsAt }}</span>
    </div>
    <p class="text-[13px] text-gray-600">{{ t('settings.plan.note') }}</p>
  </section>
</template>
