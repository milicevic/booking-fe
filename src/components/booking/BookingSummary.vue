<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

defineProps<{
  worker: string
  service: string
  duration: string
  when: string
  /** id forme koju dugme šalje */
  formId: string
  canSubmit: boolean
  submitting: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <aside class="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-card p-6 shadow-xs lg:sticky lg:top-6" data-testid="booking-summary">
    <h2 class="text-lg font-semibold">{{ t('booking.summary.title') }}</h2>
    <dl class="flex flex-col gap-3 text-sm">
      <div class="flex justify-between gap-4">
        <dt class="text-gray-600">{{ t('booking.summary.worker') }}</dt>
        <dd class="text-right font-medium">{{ worker || '—' }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-gray-600">{{ t('booking.summary.service') }}</dt>
        <dd class="text-right font-medium">{{ service || '—' }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-gray-600">{{ t('booking.summary.duration') }}</dt>
        <dd class="text-right font-medium">{{ duration || '—' }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-gray-600">{{ t('booking.summary.when') }}</dt>
        <dd class="text-right font-medium first-letter:uppercase">{{ when || t('booking.summary.pickTime') }}</dd>
      </div>
    </dl>
    <Button type="submit" size="lg" :form="formId" :disabled="!canSubmit || submitting">
      {{ submitting ? t('booking.confirming') : t('booking.confirm') }}
    </Button>
    <p class="text-[13px] text-gray-600">{{ t('booking.summary.note') }}</p>
  </aside>
</template>
