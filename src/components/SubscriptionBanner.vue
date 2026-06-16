<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTenantStore } from '@/stores/tenant'

const { t } = useI18n()
const tenant = useTenantStore()
</script>

<template>
  <div
    v-if="tenant.isExpired"
    class="bg-red-50 border-b border-red-200 px-4 py-2.5 text-center text-sm text-red-700"
  >
    {{ t('subscription.expired', { status: t('subscription.expiredStatus.' + (tenant.config?.subscription_status ?? 'expired')) }) }}
    {{ t('subscription.contactSupport') }}
  </div>

  <div
    v-else-if="tenant.isTrialing"
    class="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-sm text-amber-700"
  >
    <template v-if="tenant.trialDaysLeft > 0">
      {{ t('subscription.trialDays', { days: tenant.trialDaysLeft, label: tenant.trialDaysLeft === 1 ? t('subscription.trialDay') : t('subscription.trialDaysFew') }) }}
    </template>
    <template v-else>
      {{ t('subscription.trialExpired') }}
    </template>
  </div>

  <div
    v-else-if="tenant.config?.subscription_status === 'pending_deploy'"
    class="bg-blue-50 border-b border-blue-200 px-4 py-2.5 text-center text-sm text-blue-700"
  >
    {{ t('subscription.pendingDeploy') }}
  </div>
</template>
