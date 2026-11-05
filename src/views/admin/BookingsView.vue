<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { adminApi } from '@/api/admin'
import { useAdminContextStore } from '@/stores/adminContext'
import type { Booking } from '@/api/booking'
import { formatPrice } from '@/lib/price'
import { useTenantStore } from '@/stores/tenant'

const { t, locale } = useI18n()
const tenantStore = useTenantStore()
const { confirm } = useConfirm()
const adminContext = useAdminContextStore()
const bookings = ref<Booking[]>([])
const loading = ref(true)
const filter = ref<'all' | 'confirmed' | 'pending' | 'cancelled'>('all')

onMounted(async () => {
  await fetchBookings()
})

async function fetchBookings() {
  loading.value = true
  try {
    const { data } = await adminApi.getBookings(adminContext.selectedClient?.id)
    bookings.value = data
  } finally {
    loading.value = false
  }
}

async function handleCancel(booking: Booking) {
  if (!await confirm(t('bookingsView.cancelConfirm', { name: booking.customer_name }))) return
  await adminApi.cancelBooking(booking.token)
  await fetchBookings()
}

function bookingStatusLabel(status: string) {
  if (status === 'confirmed') return t('bookingsView.statusActive')
  if (status === 'cancelled') return t('bookingsView.statusCancelled')
  return t('bookingsView.statusPending')
}

function bookingStatusClass(status: string) {
  if (status === 'confirmed') return 'bg-green-100 text-green-700'
  if (status === 'cancelled') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

const filtered = computed(() => {
  if (filter.value === 'all') return bookings.value
  return bookings.value.filter(b => b.status === filter.value)
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <AdminLayout>
    <h1 class="text-xl font-semibold mb-6">{{ t('bookingsView.title') }}</h1>

    <div class="flex flex-wrap gap-2 mb-6">
      <Button
        v-for="f in ['all', 'confirmed', 'pending', 'cancelled']"
        :key="f"
        :variant="filter === f ? 'default' : 'outline'"
        :aria-pressed="filter === f"
        @click="filter = f as any"
      >
        {{ f === 'all' ? t('bookingsView.filterAll') : f === 'confirmed' ? t('bookingsView.filterActive') : f === 'pending' ? t('bookingsView.filterPending') : t('bookingsView.filterCancelled') }}
      </Button>
    </div>

    <div v-if="loading" class="text-muted-foreground text-sm">{{ t('common.loading') }}</div>

    <div v-else class="space-y-2">
      <Card v-for="booking in filtered" :key="booking.id" size="sm">
        <CardContent>
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="min-w-0">
              <p class="text-sm font-medium break-words">{{ booking.customer_name }}</p>
              <p class="text-xs text-muted-foreground mt-0.5 break-all">
                {{ booking.customer_phone ?? booking.customer_email ?? '—' }}
              </p>
            </div>
            <Badge :class="bookingStatusClass(booking.status)" class="shrink-0">
              {{ bookingStatusLabel(booking.status) }}
            </Badge>
          </div>

          <div class="text-xs text-muted-foreground space-y-0.5">
            <p>{{ booking.slot.worker.name }} · {{ formatDate(booking.slot.date) }} · {{ booking.start_time.slice(0, 5) }}</p>
            <p v-if="booking.service" class="text-foreground/80">
              {{ booking.service.name }}<template v-if="booking.service.price"> · {{ formatPrice(booking.service.price, locale, tenantStore.config?.currency) }}</template>
            </p>
            <p v-if="booking.note" class="italic">{{ booking.note }}</p>
          </div>

          <Button
            v-if="booking.status === 'confirmed'"
            variant="link"
            size="xs"
            class="mt-2 px-0 text-destructive"
            @click="handleCancel(booking)"
          >
            {{ t('bookingsView.cancelBtn') }}
          </Button>
        </CardContent>
      </Card>

      <div v-if="filtered.length === 0" class="text-center py-8 text-muted-foreground text-sm">
        {{ t('bookingsView.noBookings') }}
      </div>
    </div>
  </AdminLayout>
</template>
