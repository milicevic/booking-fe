<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import BookingStatusBadge from './BookingStatusBadge.vue'
import type { GridCell } from '@/lib/weekCalendar'

const props = defineProps<{
  cell: GridCell | null
  workerName: string
  /** Sme da potvrdi ili odbije rezervaciju koja čeka */
  canModerate: boolean
  /** Sme da blokira, oslobodi i ukloni termin */
  canEditSlots: boolean
  /** Sme da pomeri rezervaciju */
  canMove: boolean
  /** Vremena na koja se rezervacija može pomeriti: value je "slotId|HH:MM" */
  moveOptions: { value: string; label: string }[]
  busy: boolean
  locale: string
}>()

const emit = defineEmits<{
  confirm: []
  reject: []
  cancel: []
  block: []
  unblock: []
  removeSlot: []
  move: [value: string]
}>()

const { t } = useI18n()
const moveTo = ref('')

watch(() => props.cell?.key, () => (moveTo.value = ''))

function longDate(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(props.locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

function onMove(value: unknown) {
  moveTo.value = String(value ?? '')
  if (moveTo.value) emit('move', moveTo.value)
}
</script>

<template>
  <aside class="flex flex-col gap-3.5 rounded-xl border border-gray-100 bg-card p-5" aria-live="polite">
    <h2 class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">
      {{ t('calendar.panel.title') }}<template v-if="workerName"> · {{ workerName }}</template>
    </h2>

    <p v-if="!cell" class="text-sm text-gray-600">{{ t('calendar.panel.empty') }}</p>

    <!-- Rezervacija -->
    <template v-else-if="cell.booking">
      <div class="flex flex-col gap-0.5 leading-snug">
        <span class="text-[13px] text-gray-600 first-letter:uppercase">
          {{ longDate(cell.booking.slot.date) }} · {{ cell.booking.start_time.slice(0, 5) }}–{{ cell.booking.end_time.slice(0, 5) }}
        </span>
        <span class="text-[17px] font-semibold">{{ cell.booking.customer_name }}</span>
        <span v-if="cell.booking.customer_phone" class="text-sm text-gray-600">{{ cell.booking.customer_phone }}</span>
        <span v-if="cell.booking.customer_email" class="text-sm break-all text-gray-600">{{ cell.booking.customer_email }}</span>
        <span v-if="cell.booking.service" class="text-sm">
          {{ cell.booking.service.name }} · {{ t('onboarding.services.minutes', { n: cell.booking.service.duration_minutes }) }}
        </span>
        <span v-if="cell.booking.note" class="text-sm text-gray-600 italic">{{ cell.booking.note }}</span>
      </div>
      <BookingStatusBadge :status="cell.booking.status" class="self-start" />

      <template v-if="cell.booking.status === 'pending'">
        <div v-if="canModerate" class="flex gap-2">
          <Button class="flex-1" :disabled="busy" @click="emit('confirm')">{{ t('common.confirm') }}</Button>
          <Button variant="outline" class="flex-1" :disabled="busy" @click="emit('reject')">{{ t('calendar.panel.reject') }}</Button>
        </div>
        <p v-else class="text-[13px] text-gray-600">{{ t('calendar.panel.ownerConfirms') }}</p>
      </template>

      <div v-if="canMove" class="flex flex-col gap-1.5">
        <Label for="move-booking">{{ t('calendar.panel.moveTo') }}</Label>
        <NativeSelect id="move-booking" :model-value="moveTo" :disabled="busy" @update:model-value="onMove">
          <NativeSelectOption value="">{{ moveOptions.length ? t('calendar.panel.movePlaceholder') : t('calendar.panel.moveNone') }}</NativeSelectOption>
          <NativeSelectOption v-for="option in moveOptions" :key="option.value" :value="option.value">{{ option.label }}</NativeSelectOption>
        </NativeSelect>
        <span class="text-[13px] text-gray-600">{{ t('calendar.panel.moveHint') }}</span>
      </div>

      <Button
        variant="outline"
        class="border-red-300 text-red-800 hover:bg-red-50 hover:text-red-800"
        :disabled="busy"
        @click="emit('cancel')"
      >
        {{ t('bookingsView.cancelBtn') }}
      </Button>
    </template>

    <!-- Termin bez rezervacije -->
    <template v-else-if="cell.slot">
      <div class="flex flex-col leading-snug">
        <span class="text-base font-semibold first-letter:uppercase">
          {{ longDate(cell.slot.date) }} · {{ cell.slot.start_time.slice(0, 5) }}–{{ cell.slot.end_time.slice(0, 5) }}
        </span>
        <span class="text-sm text-gray-600">{{ t(`calendar.panel.state.${cell.kind}`) }}</span>
      </div>

      <template v-if="canEditSlots">
        <template v-if="cell.kind === 'free'">
          <Button variant="outline" :disabled="busy" @click="emit('block')">{{ t('calendar.panel.block') }}</Button>
          <span class="text-[13px] text-gray-600">{{ t('calendar.panel.blockHint') }}</span>
          <Button variant="ghost" class="text-gray-600" :disabled="busy" @click="emit('removeSlot')">{{ t('calendar.panel.removeSlot') }}</Button>
        </template>
        <Button v-else-if="cell.kind === 'blocked'" :disabled="busy" @click="emit('unblock')">{{ t('calendar.panel.unblock') }}</Button>
      </template>
    </template>
  </aside>
</template>
