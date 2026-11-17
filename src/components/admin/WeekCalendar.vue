<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CellKind, GridCell, WeekGrid } from '@/lib/weekCalendar'

defineProps<{ grid: WeekGrid; selectedKey: string | null; today: string; locale: string }>()
const emit = defineEmits<{ select: [cell: GridCell] }>()

const { t } = useI18n()

// Boje iz dizajna: slobodno isprekidano, žuto čeka, zeleno potvrđeno, šrafirano blokirano
const kindClass: Record<CellKind, string> = {
  free: 'border border-dashed border-gray-300 bg-card text-gray-600 hover:border-primary/60',
  blocked: 'border border-gray-300 text-gray-700 bg-[repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6_6px,#e5e7eb_6px,#e5e7eb_12px)]',
  pending: 'border border-amber-300 bg-amber-100 text-amber-800',
  confirmed: 'border border-green-300 bg-green-100 text-green-800',
  taken: 'border border-gray-200 bg-gray-100 text-gray-600',
  // bg-gray-50 menja tema „modern“, pa ovde ide fiksna nijansa
  off: 'border border-gray-100 bg-[#f3f4f6] text-gray-500',
}

function dayLabel(date: string, locale: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })
}

function longDay(date: string, locale: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

function text(cell: GridCell) {
  if (cell.booking && cell.first) {
    const first = cell.booking.customer_name.split(' ')[0]
    return cell.booking.service ? `${first} · ${cell.booking.service.name}` : first
  }
  if (cell.kind === 'blocked' && cell.first) return t('calendar.kind.blocked')
  return ''
}

function aria(date: string, cell: GridCell, locale: string) {
  const who = cell.booking ? ` ${cell.booking.customer_name},` : ''
  return `${longDay(date, locale)} ${cell.time},${who} ${t(`calendar.kind.${cell.kind}`)}`
}
</script>

<template>
  <section
    class="min-w-0 overflow-x-auto rounded-xl border border-gray-100 bg-card p-4"
    :aria-label="t('calendar.weekLabel')"
  >
    <p v-if="grid.times.length === 0" class="py-8 text-center text-sm text-gray-600">{{ t('calendar.noSlotsWeek') }}</p>

    <div v-else class="flex min-w-[540px] gap-1.5">
      <div class="flex w-11 flex-none flex-col gap-1">
        <div class="h-7" />
        <div v-for="time in grid.times" :key="time" class="flex h-10 items-center text-xs text-gray-600">{{ time }}</div>
      </div>

      <div v-for="day in grid.days" :key="day.date" class="flex min-w-[64px] flex-1 flex-col gap-1" data-testid="calendar-day">
        <h3
          class="flex h-7 items-center justify-center text-[13px] capitalize"
          :class="day.date === today ? 'font-bold text-primary' : 'font-semibold text-gray-700'"
        >
          {{ dayLabel(day.date, locale) }}
        </h3>
        <button
          v-for="cell in day.cells"
          :key="`${day.date}-${cell.time}`"
          type="button"
          data-testid="calendar-cell"
          :disabled="cell.kind === 'off'"
          :aria-label="aria(day.date, cell, locale)"
          :aria-pressed="selectedKey === cell.key"
          class="h-10 w-full truncate rounded-lg px-1.5 text-left text-xs font-medium transition-shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
          :class="[kindClass[cell.kind], selectedKey === cell.key && 'ring-2 ring-primary']"
          @click="emit('select', cell)"
        >
          {{ text(cell) }}
        </button>
      </div>
    </div>
  </section>
</template>
