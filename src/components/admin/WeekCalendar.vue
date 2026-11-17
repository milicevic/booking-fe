<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { BlockKind, WeekBlock, WeekDay } from '@/lib/weekCalendar'

defineProps<{ days: WeekDay[]; selectedKey: string | null; today: string; locale: string }>()
const emit = defineEmits<{ select: [block: WeekBlock] }>()

const { t } = useI18n()

const kindClass: Record<BlockKind, string> = {
  free: 'border-dashed bg-card hover:border-primary/60',
  taken: 'bg-muted text-muted-foreground',
  pending: 'border-yellow-300 bg-yellow-100 text-yellow-900',
  confirmed: 'border-green-300 bg-green-100 text-green-900',
}

function dayLabel(date: string, locale: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })
}

function label(block: WeekBlock) {
  return block.booking
    ? `${block.start}–${block.end} ${block.booking.customer_name}, ${t(`calendar.kind.${block.kind}`)}`
    : `${block.start}–${block.end}, ${t(`calendar.kind.${block.kind}`)}`
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border bg-card p-3" role="group" :aria-label="t('calendar.weekLabel')">
    <div class="grid min-w-[44rem] grid-cols-7 gap-2">
      <section v-for="day in days" :key="day.date" class="min-w-0 space-y-1.5" data-testid="calendar-day">
        <h3
          class="py-1 text-center text-sm capitalize"
          :class="day.date === today ? 'font-bold text-primary' : 'font-semibold'"
        >
          {{ dayLabel(day.date, locale) }}
        </h3>
        <button
          v-for="block in day.blocks"
          :key="block.key"
          type="button"
          data-testid="calendar-block"
          :aria-label="label(block)"
          :aria-pressed="selectedKey === block.key"
          class="flex min-h-11 w-full flex-col items-start rounded-lg border px-2 py-1 text-left text-xs transition-shadow"
          :class="[kindClass[block.kind], selectedKey === block.key ? 'ring-2 ring-primary' : '']"
          @click="emit('select', block)"
        >
          <span class="font-semibold">{{ block.start }}–{{ block.end }}</span>
          <span v-if="block.booking" class="w-full truncate">{{ block.booking.customer_name }}</span>
        </button>
        <p v-if="day.blocks.length === 0" class="py-3 text-center text-xs text-muted-foreground">—</p>
      </section>
    </div>
  </div>
</template>
