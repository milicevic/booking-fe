<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Booking } from '@/api/booking'
import { useTenantStore } from '@/stores/tenant'
import { formatPrice } from '@/lib/price'

/** Kartica sa podacima rezervacije (radnik, usluga, datum, vreme), kao „Vaš termin“ u dizajnu. */
const props = defineProps<{ booking: Booking; showName?: boolean }>()

const { t, locale } = useI18n()
const tenant = useTenantStore()

const date = computed(() =>
  new Date(props.booking.slot.date.slice(0, 10) + 'T00:00:00').toLocaleDateString(locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)
</script>

<template>
  <dl class="flex w-full flex-col gap-3 rounded-2xl border border-gray-100 bg-card p-6 text-left text-sm shadow-xs">
    <div v-if="showName" class="flex justify-between gap-4">
      <dt class="text-gray-600">{{ t('manage.name') }}</dt>
      <dd class="text-right font-medium">{{ booking.customer_name }}</dd>
    </div>
    <div class="flex justify-between gap-4">
      <dt class="text-gray-600">{{ t('manage.worker') }}</dt>
      <dd class="text-right font-medium">{{ booking.slot.worker.name }}</dd>
    </div>
    <div v-if="booking.service" class="flex justify-between gap-4">
      <dt class="text-gray-600">{{ t('manage.service') }}</dt>
      <dd class="text-right font-medium">
        {{ booking.service.name }}<template v-if="booking.service.price"> · {{ formatPrice(booking.service.price, locale, tenant.config?.currency) }}</template>
      </dd>
    </div>
    <div class="flex justify-between gap-4">
      <dt class="text-gray-600">{{ t('manage.date') }}</dt>
      <dd class="text-right font-medium first-letter:uppercase">{{ date }}</dd>
    </div>
    <div class="flex justify-between gap-4">
      <dt class="text-gray-600">{{ t('manage.time') }}</dt>
      <dd class="text-right font-medium">{{ booking.start_time.slice(0, 5) }} — {{ booking.end_time.slice(0, 5) }}</dd>
    </div>
    <slot />
  </dl>
</template>
