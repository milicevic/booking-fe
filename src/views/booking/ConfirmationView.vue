<script setup lang="ts">
import AddToCalendar from '@/components/booking/AddToCalendar.vue'
import { useLiveRefresh } from '@/composables/useLiveRefresh'
import { useBookingChangeToast } from '@/composables/useBookingChangeToast'
import { bookingChange } from '@/lib/bookingChanges'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { bookingApi } from '@/api/booking'
import type { Booking } from '@/api/booking'
import PublicHeader from '@/components/booking/PublicHeader.vue'
import BookingDetails from '@/components/booking/BookingDetails.vue'
import InstallAppBanner from '@/components/pwa/InstallAppBanner.vue'
import { CheckIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/apiError'
import { createSubscription, pushNeedsInstall, pushSupported as browserSupportsPush, PushPermissionDeniedError } from '@/lib/push'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const booking = ref<Booking | null>(null)
const loading = ref(true)

// Na iPhone-u push radi tek kad je sajt dodat na početni ekran
const needsInstall = pushNeedsInstall()
const pushSupported = browserSupportsPush() && !needsInstall
const pushSubscribed = ref(false)
const pushSubscribing = ref(false)
const pushError = ref('')


onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    router.push({ name: 'booking' })
    return
  }

  try {
    const { data } = await bookingApi.getByToken(token)
    booking.value = data
  } finally {
    loading.value = false
  }
})


// Salon potvrdi ili odbije rezervaciju dok kupac još gleda potvrdu
const showChanges = useBookingChangeToast()
useLiveRefresh(async () => {
  if (!booking.value) return
  const { data } = await bookingApi.getByToken(booking.value.token)
  const change = bookingChange(booking.value, data)
  booking.value = data
  if (change) showChanges([change])
})

async function subscribePush() {
  if (!booking.value) return
  pushSubscribing.value = true
  pushError.value = ''

  try {
    await bookingApi.registerPushSubscription(booking.value.token, await createSubscription())
    pushSubscribed.value = true
  } catch (e) {
    pushError.value = e instanceof PushPermissionDeniedError ? t('push.denied') : apiErrorMessage(e, t('confirmation.pushError'))
  } finally {
    pushSubscribing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <PublicHeader>
      <router-link :to="{ name: 'my-bookings' }" class="text-sm font-medium text-primary hover:underline">{{ t('myBookings.title') }}</router-link>
    </PublicHeader>

    <main class="mx-auto flex max-w-[520px] flex-col items-center gap-6 px-4 pt-16 pb-20 text-center sm:px-6">
      <div v-if="loading" class="text-muted-foreground">{{ t('common.loading') }}</div>

      <template v-else-if="booking">
        <span aria-hidden="true" class="flex size-14 items-center justify-center rounded-full bg-accent">
          <CheckIcon class="size-7 text-primary" />
        </span>
        <div class="flex flex-col gap-2">
          <h1 class="text-[28px] leading-tight font-semibold">
            {{ booking.status === 'confirmed' ? t('confirmation.titleConfirmed') : t('confirmation.title') }}
          </h1>
          <p class="text-gray-600">
            {{ booking.status === 'confirmed' ? t('confirmation.textConfirmed') : t('confirmation.text') }}
          </p>
        </div>

        <BookingDetails :booking="booking">
          <div class="flex justify-between gap-4">
            <dt class="text-gray-600">{{ t('confirmation.status') }}</dt>
            <dd class="text-right font-medium">{{ t(`myBookings.status.${booking.status}`) }}</dd>
          </div>
        </BookingDetails>

        <AddToCalendar v-if="booking.calendar" :calendar="booking.calendar" />

        <!-- Push obaveštenja -->
        <div v-if="pushSupported && !pushSubscribed" class="flex w-full flex-col gap-3 rounded-xl border border-gray-100 bg-card p-5 text-left">
          <div>
            <p class="font-semibold">{{ t('confirmation.pushTitle') }}</p>
            <p class="text-sm text-gray-600">{{ t('confirmation.pushDesc') }}</p>
          </div>
          <Button variant="outline" :disabled="pushSubscribing" @click="subscribePush">
            {{ pushSubscribing ? t('confirmation.pushSubscribing') : t('confirmation.pushBtn') }}
          </Button>
          <p v-if="pushError" class="text-sm text-destructive">{{ pushError }}</p>
        </div>
        <p v-else-if="pushSubscribed" class="text-sm font-medium text-green-800" role="status">{{ t('confirmation.pushSubscribed') }}</p>
        <p v-else-if="needsInstall" class="text-[13px] text-gray-600">{{ t('push.installFirst') }}</p>
        <p v-else class="text-[13px] text-gray-600">{{ t('confirmation.pushUnsupported') }}</p>

        <InstallAppBanner class="w-full text-left" />

        <Button variant="outline" size="lg" as-child>
          <router-link :to="{ name: 'booking' }">{{ t('confirmation.bookAnother') }}</router-link>
        </Button>
        <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
          <router-link :to="{ name: 'my-bookings' }" class="text-primary hover:underline">{{ t('confirmation.myBookings') }}</router-link>
          <router-link :to="{ name: 'manage', params: { token: booking.token } }" class="text-primary hover:underline">{{ t('confirmation.manageLink') }}</router-link>
        </div>
      </template>
    </main>

    <footer class="px-6 pb-8 text-center text-[13px] text-gray-600">{{ t('booking.poweredBy') }}</footer>
  </div>
</template>
