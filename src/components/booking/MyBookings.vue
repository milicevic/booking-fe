<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Booking } from '@/api/booking'
import { loadMyBookings } from '@/lib/myBookings'
import { formatPrice } from '@/lib/price'
import { useTenantStore } from '@/stores/tenant'
import { Badge } from '@/components/ui/badge'

const { t, locale } = useI18n()
const tenant = useTenantStore()
const bookings = ref<Booking[]>([])

const jsLocale = computed(() => (locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US'))

function formatDate(date: string) {
  return new Date(date.slice(0, 10) + 'T00:00:00').toLocaleDateString(jsLocale.value, {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

onMounted(async () => {
  bookings.value = await loadMyBookings()
})
</script>

<template>
  <section v-if="bookings.length" class="mb-6" data-testid="my-bookings">
    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{{ t('booking.myBookings') }}</p>
    <div class="space-y-2">
      <router-link
        v-for="booking in bookings"
        :key="booking.token"
        :to="{ name: 'manage', params: { token: booking.token } }"
        class="flex items-center justify-between gap-4 bg-card rounded-xl border p-4 hover:border-primary/40 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium">
            {{ booking.slot.worker.name }}
            <span v-if="booking.service" class="font-normal text-muted-foreground">
              · {{ booking.service.name }}<template v-if="booking.service.price"> ({{ formatPrice(booking.service.price, locale, tenant.config?.currency) }})</template>
            </span>
          </p>
          <p class="text-sm text-muted-foreground capitalize">
            {{ formatDate(booking.slot.date) }} · {{ booking.start_time.slice(0, 5) }} — {{ booking.end_time.slice(0, 5) }}
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <Badge :class="booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">
            {{ booking.status === 'confirmed' ? t('booking.statusConfirmed') : t('booking.statusPending') }}
          </Badge>
          <span class="text-xs text-primary">{{ t('booking.manageLink') }}</span>
        </div>
      </router-link>
    </div>
  </section>
</template>
