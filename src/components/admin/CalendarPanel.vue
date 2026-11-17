<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WeekBlock } from '@/lib/weekCalendar'

defineProps<{ block: WeekBlock | null; canModerate: boolean; busy: boolean; locale: string }>()
const emit = defineEmits<{ confirm: []; reject: []; cancel: []; removeSlot: [] }>()

const { t } = useI18n()

function longDate(date: string, locale: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}
</script>

<template>
  <aside class="space-y-4 rounded-xl border bg-card p-5" aria-live="polite">
    <h2 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ t('calendar.panel.title') }}</h2>

    <p v-if="!block" class="text-sm text-muted-foreground">{{ t('calendar.panel.empty') }}</p>

    <template v-else>
      <div class="space-y-0.5">
        <p class="text-xs capitalize text-muted-foreground">{{ longDate(block.slot.date, locale) }}</p>
        <p class="text-base font-semibold">{{ block.start }}–{{ block.end }}</p>
        <p class="text-sm text-muted-foreground">{{ block.slot.worker.name }}</p>
      </div>

      <template v-if="block.booking">
        <div class="space-y-0.5 text-sm">
          <p class="font-semibold">{{ block.booking.customer_name }}</p>
          <p v-if="block.booking.customer_phone" class="text-muted-foreground">{{ block.booking.customer_phone }}</p>
          <p v-if="block.booking.customer_email" class="break-all text-muted-foreground">{{ block.booking.customer_email }}</p>
          <p v-if="block.booking.service">
            {{ block.booking.service.name }} · {{ t('onboarding.services.minutes', { n: block.booking.service.duration_minutes }) }}
          </p>
          <p v-if="block.booking.note" class="text-muted-foreground">{{ block.booking.note }}</p>
        </div>
        <Badge :class="block.kind === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
          {{ t(`calendar.kind.${block.kind}`) }}
        </Badge>

        <div v-if="block.kind === 'pending' && canModerate" class="flex gap-2">
          <Button class="flex-1" :disabled="busy" @click="emit('confirm')">{{ t('common.confirm') }}</Button>
          <Button variant="outline" class="flex-1" :disabled="busy" @click="emit('reject')">{{ t('calendar.panel.reject') }}</Button>
        </div>
        <p v-else-if="block.kind === 'pending'" class="text-xs text-muted-foreground">{{ t('calendar.panel.ownerConfirms') }}</p>

        <Button variant="destructive" class="w-full" :disabled="busy" @click="emit('cancel')">{{ t('bookingsView.cancelBtn') }}</Button>
      </template>

      <template v-else>
        <Badge :class="block.kind === 'free' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'">
          {{ t(`calendar.kind.${block.kind}`) }}
        </Badge>
        <Button v-if="block.kind === 'free'" variant="outline" class="w-full" :disabled="busy" @click="emit('removeSlot')">
          {{ t('calendar.panel.removeSlot') }}
        </Button>
      </template>
    </template>
  </aside>
</template>
