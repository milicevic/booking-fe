<script setup lang="ts">
import type { Booking } from '@/api/booking'
import BookingStatusBadge from './BookingStatusBadge.vue'

/** Kratak red rezervacije u listama na Pregledu (vreme, kupac, usluga · radnik, status). */
defineProps<{ booking: Booking; when: string }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-gray-100 py-2.5">
    <span class="w-[52px] flex-none font-semibold">{{ when }}</span>
    <div class="flex min-w-0 flex-[1_1_140px] flex-col leading-snug">
      <span class="text-[15px] font-medium">{{ booking.customer_name }}</span>
      <span class="text-[13px] text-gray-600">{{ booking.service?.name ?? '—' }} · {{ booking.slot.worker.name }}</span>
    </div>
    <BookingStatusBadge :status="booking.status" />
    <slot />
  </div>
</template>
