<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { bookingApi } from '@/api/booking'
import { useConfirm } from '@/composables/useConfirm'
import type { Booking } from '@/api/booking'
import PublicHeader from '@/components/booking/PublicHeader.vue'
import BookingDetails from '@/components/booking/BookingDetails.vue'
import RescheduleBooking from '@/components/booking/RescheduleBooking.vue'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/apiError'

const { t } = useI18n()
const { confirm } = useConfirm()
const route = useRoute()
const router = useRouter()

const booking = ref<Booking | null>(null)
const loading = ref(true)
const cancelling = ref(false)
const error = ref('')
const rescheduling = ref(false)
const notice = ref('')

onMounted(async () => {
  try {
    const { data } = await bookingApi.getByToken(route.params.token as string)
    booking.value = data
  } catch (e) {
    error.value = apiErrorMessage(e, t('manage.notFound'))
  } finally {
    loading.value = false
  }
})

const isActive = computed(() => !!booking.value && ['pending', 'confirmed'].includes(booking.value.status))
// Pomeranje: samo aktivna rezervacija sa uslugom, dok do početka ima više od roka koji je zadao salon
const canReschedule = computed(() => isActive.value && !!booking.value?.can_reschedule && !!booking.value?.service)
const tooLateToReschedule = computed(() => isActive.value && booking.value?.can_reschedule === false)

function onRescheduled(updated: Booking) {
  booking.value = updated
  rescheduling.value = false
  notice.value = updated.status === 'pending' ? t('manage.reschedule.donePending') : t('manage.reschedule.done')
}

function bookingStatusLabel(status: string) {
  if (status === 'confirmed') return t('manage.statusActive')
  if (status === 'cancelled') return t('manage.statusCancelled')
  if (status === 'rejected') return t('manage.statusRejected')
  return t('manage.statusPending')
}

function bookingStatusClass(status: string) {
  if (status === 'confirmed') return 'bg-green-100 text-green-800'
  if (status === 'cancelled' || status === 'rejected') return 'bg-gray-100 text-gray-600'
  return 'bg-amber-100 text-amber-800'
}


async function handleCancel() {
  if (!booking.value) return
  if (!await confirm(t('manage.cancelConfirm'))) return

  cancelling.value = true
  try {
    await bookingApi.cancel(booking.value.token)
    booking.value.status = 'cancelled'
  } catch (e) {
    error.value = apiErrorMessage(e, t('manage.cancelError'))
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <PublicHeader>
      <router-link :to="{ name: 'my-bookings' }" class="text-sm font-medium text-primary hover:underline">{{ t('myBookings.title') }}</router-link>
    </PublicHeader>

    <main class="mx-auto flex max-w-[520px] flex-col gap-6 px-4 pt-12 pb-20 sm:px-6">
      <div v-if="loading" class="text-center text-muted-foreground">{{ t('common.loading') }}</div>

      <p v-else-if="!booking && error" class="rounded-xl border border-gray-100 bg-card px-6 py-8 text-center text-destructive">{{ error }}</p>

      <template v-else-if="booking">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 class="text-[28px] leading-tight font-semibold">{{ t('manage.title') }}</h1>
          <span class="rounded-full px-2.5 py-1 text-[13px] font-semibold" :class="bookingStatusClass(booking.status)">
            {{ bookingStatusLabel(booking.status) }}
          </span>
        </div>

        <div v-if="notice" role="status" class="rounded-xl border border-green-200 bg-green-50 px-4 py-3.5 text-sm font-medium text-green-800">
          {{ notice }}
        </div>

        <BookingDetails :booking="booking" show-name />

        <RescheduleBooking v-if="rescheduling" :booking="booking" @done="onRescheduled" @cancel="rescheduling = false" />
        <Button v-else-if="canReschedule" variant="outline" size="lg" @click="(rescheduling = true), (notice = '')">
          {{ t('manage.reschedule.open') }}
        </Button>
        <p v-else-if="tooLateToReschedule" class="text-center text-[13px] text-gray-600">
          {{ t('manage.reschedule.tooLate', { n: booking.reschedule_cutoff_hours ?? 0 }) }}
        </p>

        <p v-if="booking.status === 'cancelled'" class="text-center text-sm text-gray-600">{{ t('manage.cancelled') }}</p>
        <p v-else-if="booking.status === 'rejected'" class="text-center text-sm text-gray-600">{{ t('manage.rejected') }}</p>

        <p v-if="error" class="text-center text-sm text-destructive" role="alert">{{ error }}</p>

        <Button
          v-if="isActive"
          variant="outline"
          size="lg"
          class="border-red-300 text-red-800 hover:bg-red-50 hover:text-red-800"
          :disabled="cancelling"
          @click="handleCancel"
        >
          {{ cancelling ? t('manage.cancelling') : t('manage.cancelBtn') }}
        </Button>

        <Button v-else size="lg" @click="router.push({ name: 'booking' })">
          {{ t('manage.backHome') }}
        </Button>
      </template>
    </main>

    <footer class="px-6 pb-8 text-center text-[13px] text-gray-600">{{ t('booking.poweredBy') }}</footer>
  </div>
</template>
