<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Booking } from '@/api/booking'
import { Button } from '@/components/ui/button'
import BookingStatusBadge from './BookingStatusBadge.vue'

const props = defineProps<{
  booking: Booking
  /** Vlasnik potvrđuje i odbija termine koji čekaju. */
  canModerate: boolean
  /** Vlasnik može da blokira kupca (telefon i email) */
  canBlock?: boolean
  busy?: boolean
}>()

const emit = defineEmits<{ confirm: []; reject: []; cancel: []; block: [] }>()
const { t, locale } = useI18n()

const jsLocale = computed(() => (locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US'))
const day = computed(() =>
  new Date(props.booking.slot.date.slice(0, 10) + 'T00:00:00').toLocaleDateString(jsLocale.value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }),
)
const inactive = computed(() => props.booking.status === 'cancelled' || props.booking.status === 'rejected')
</script>

<template>
  <article class="flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl border border-gray-100 bg-card px-5 py-3.5 shadow-xs">
    <div class="flex w-[110px] flex-none flex-col leading-tight">
      <span class="text-[13px] text-gray-600 capitalize">{{ day }}</span>
      <span class="text-lg font-semibold" :class="inactive && 'text-gray-500 line-through'">{{ booking.start_time.slice(0, 5) }}</span>
    </div>
    <div class="flex min-w-0 flex-[1_1_180px] flex-col leading-snug">
      <span class="text-[15px] font-semibold break-words" :class="inactive && 'text-gray-500 line-through'">{{ booking.customer_name }}</span>
      <span class="text-[13px] text-gray-600 break-all">{{ booking.customer_phone ?? booking.customer_email ?? '—' }}</span>
    </div>
    <div class="flex min-w-0 flex-[1_1_160px] flex-col leading-snug">
      <span class="text-[15px] font-medium">{{ booking.service?.name ?? '—' }}</span>
      <span class="text-[13px] text-gray-600">
        <template v-if="booking.service">{{ t('onboarding.services.minutes', { n: booking.service.duration_minutes }) }} · </template>{{ booking.slot.worker.name }}
      </span>
      <span v-if="booking.note" class="text-[13px] italic text-gray-600">{{ booking.note }}</span>
    </div>
    <BookingStatusBadge :status="booking.status" />
    <div class="flex flex-none justify-end gap-2 sm:min-w-[158px]">
      <template v-if="booking.status === 'pending' && canModerate">
        <Button :disabled="busy" @click="emit('confirm')">{{ t('common.confirm') }}</Button>
        <Button variant="outline" :disabled="busy" @click="emit('reject')">{{ t('calendar.panel.reject') }}</Button>
      </template>
      <Button v-else-if="!inactive" variant="outline" :disabled="busy" @click="emit('cancel')">
        {{ t('bookingsView.cancelShort') }}
      </Button>
      <Button
        v-if="canBlock && (booking.customer_phone || booking.customer_email)"
        variant="ghost"
        class="text-gray-600 hover:text-destructive"
        :disabled="busy"
        :aria-label="t('bookingsView.blockAria', { name: booking.customer_name })"
        @click="emit('block')"
      >
        {{ t('bookingsView.block') }}
      </Button>
    </div>
  </article>
</template>
