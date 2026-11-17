<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { blockRows, gridRange, rowLabel } from '@/lib/weekCalendar'
import type { BlockKind, WeekBlock, WeekDay } from '@/lib/weekCalendar'

const props = defineProps<{ days: WeekDay[]; selectedKey: string | null; today: string; locale: string }>()
const emit = defineEmits<{ select: [block: WeekBlock] }>()

const { t } = useI18n()

const kindClass: Record<BlockKind, string> = {
  free: 'border-dashed border-border bg-card hover:border-primary/60',
  taken: 'border-border bg-muted text-muted-foreground',
  pending: 'border-yellow-300 bg-yellow-100 text-yellow-900',
  confirmed: 'border-green-300 bg-green-100 text-green-900',
}
const legend: { kind: BlockKind; swatch: string }[] = [
  { kind: 'free', swatch: 'border-dashed border-muted-foreground bg-card' },
  { kind: 'pending', swatch: 'border-yellow-300 bg-yellow-100' },
  { kind: 'confirmed', swatch: 'border-green-300 bg-green-100' },
  { kind: 'taken', swatch: 'border-border bg-muted' },
]

const range = computed(() => gridRange(props.days))
const rowIndexes = computed(() => Array.from({ length: range.value.rows }, (_, i) => i))

const gridStyle = computed(() => ({
  gridTemplateColumns: '3rem repeat(7, minmax(5rem, 1fr))',
  gridTemplateRows: `1.75rem repeat(${range.value.rows}, 2.5rem)`,
}))

function dayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(props.locale, { weekday: 'short', day: 'numeric' })
}

function blockStyle(block: WeekBlock, dayIndex: number) {
  const { row, span } = blockRows(block, range.value.start)
  return { gridColumn: dayIndex + 2, gridRow: `${row + 2} / span ${span}` }
}

function label(block: WeekBlock) {
  const who = block.booking ? ` ${block.booking.customer_name},` : ''
  return `${block.start}–${block.end}${who} ${t(`calendar.kind.${block.kind}`)}`
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="range.rows === 0" class="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
      {{ t('calendar.noSlots') }}
    </p>

    <div v-else class="overflow-x-auto rounded-xl border bg-card p-4" role="group" :aria-label="t('calendar.weekLabel')">
      <div class="grid min-w-[44rem] gap-1" :style="gridStyle">
        <h3
          v-for="(day, i) in days"
          :key="day.date"
          class="flex items-center justify-center text-sm capitalize"
          :class="day.date === today ? 'font-bold text-primary' : 'font-semibold'"
          :style="{ gridColumn: i + 2, gridRow: 1 }"
          data-testid="calendar-day"
        >
          {{ dayLabel(day.date) }}
        </h3>

        <span
          v-for="r in rowIndexes"
          :key="`t${r}`"
          class="flex items-center text-xs text-muted-foreground"
          :style="{ gridColumn: 1, gridRow: r + 2 }"
        >
          {{ rowLabel(range.start, r) }}
        </span>

        <template v-for="(day, i) in days" :key="`bg${day.date}`">
          <div
            v-for="r in rowIndexes"
            :key="`${day.date}-${r}`"
            class="rounded-lg border border-transparent bg-muted/40"
            aria-hidden="true"
            :style="{ gridColumn: i + 2, gridRow: r + 2 }"
          />
        </template>

        <template v-for="(day, i) in days" :key="`blocks${day.date}`">
          <button
            v-for="block in day.blocks"
            :key="block.key"
            type="button"
            data-testid="calendar-block"
            :aria-label="label(block)"
            :aria-pressed="selectedKey === block.key"
            class="flex min-w-0 flex-col items-start justify-start overflow-hidden rounded-lg border px-1.5 py-1 text-left text-xs font-medium"
            :class="[kindClass[block.kind], selectedKey === block.key ? 'ring-2 ring-primary' : '']"
            :style="blockStyle(block, i)"
            @click="emit('select', block)"
          >
            <template v-if="block.booking">
              <span class="w-full truncate">{{ block.booking.customer_name.split(' ')[0] }}</span>
              <span v-if="block.booking.service" class="w-full truncate font-normal opacity-80">{{ block.booking.service.name }}</span>
            </template>
          </button>
        </template>
      </div>
    </div>

    <ul class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground" data-testid="calendar-legend">
      <li v-for="l in legend" :key="l.kind" class="flex items-center gap-1.5">
        <span class="size-3.5 rounded border" :class="l.swatch" aria-hidden="true" />
        {{ t(`calendar.kind.${l.kind}`) }}
      </li>
    </ul>
  </div>
</template>
