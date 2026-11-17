<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Booking } from '@/api/booking'

const props = defineProps<{ status: Booking['status'] }>()
const { t } = useI18n()

// Boje statusa iz dizajna: žuto čeka, zeleno potvrđeno, sivo otkazano/odbijeno
const classes: Record<Booking['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  rejected: 'bg-gray-100 text-gray-600',
}

const label = computed(() => t(`bookingsView.status.${props.status}`))
</script>

<template>
  <span class="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[13px] font-semibold" :class="classes[status]">
    {{ label }}
  </span>
</template>
