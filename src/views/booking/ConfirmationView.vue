<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { bookingApi } from '@/api/booking'
import api from '@/api/axios'
import type { Booking } from '@/api/booking'
import { useTenantStore } from '@/stores/tenant'
import TenantLogo from '@/components/TenantLogo.vue'
import { CheckIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { apiErrorMessage } from '@/lib/apiError'
import { formatPrice } from '@/lib/price'

const { t, locale } = useI18n()
const tenant = useTenantStore()
const route = useRoute()
const router = useRouter()

const booking = ref<Booking | null>(null)
const loading = ref(true)

const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window
const pushSubscribed = ref(false)
const pushSubscribing = ref(false)
const pushError = ref('')

const jsLocale = computed(() => locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US')

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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(jsLocale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

async function subscribePush() {
  if (!booking.value) return
  pushSubscribing.value = true
  pushError.value = ''

  try {
    await navigator.serviceWorker.register('/sw.js')
    const registration = await navigator.serviceWorker.ready  // the active registration

    const { data: { vapid_public_key } } = await api.get('/api/push/vapid-public-key')

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid_public_key) as Uint8Array<ArrayBuffer>,
    })
    const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    await bookingApi.registerPushSubscription(booking.value.token, json)
    pushSubscribed.value = true
  } catch (e) {
    console.error('Push subscription failed:', e)
    pushError.value = apiErrorMessage(e, t('confirmation.pushError'))
  } finally {
    pushSubscribing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <CardContent class="px-8 py-2 text-center">

        <div class="flex items-center justify-center gap-2 mb-6">
          <TenantLogo :src="tenant.logoUrl" :size="28" />
          <span class="font-semibold">{{ tenant.appName }}</span>
        </div>

        <div v-if="loading" class="text-muted-foreground">{{ t('common.loading') }}</div>

        <template v-else-if="booking">
          <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon class="w-7 h-7 text-green-600" />
          </div>

          <h1 class="text-xl font-semibold mb-1">{{ t('confirmation.title') }}</h1>
          <p class="text-muted-foreground text-sm mb-6">
            {{ t('confirmation.sentTo', { contact: booking.customer_email ? 'email' : t('booking.phone').toLowerCase() }) }}
          </p>

          <div class="bg-muted/60 rounded-xl p-4 text-left space-y-2 mb-6">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ t('confirmation.worker') }}</span>
              <span class="font-medium">{{ booking.slot.worker.name }}</span>
            </div>
            <div v-if="booking.service" class="flex justify-between gap-4 text-sm">
              <span class="text-muted-foreground">{{ t('confirmation.service') }}</span>
              <span class="font-medium text-right">
                {{ booking.service.name }}<template v-if="booking.service.price"> · {{ formatPrice(booking.service.price, locale, tenant.config?.currency) }}</template>
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ t('confirmation.date') }}</span>
              <span class="font-medium capitalize">{{ formatDate(booking.slot.date) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ t('confirmation.time') }}</span>
              <span class="font-medium">
                {{ booking.start_time.slice(0, 5) }} — {{ booking.end_time.slice(0, 5) }}
              </span>
            </div>
          </div>

          <!-- Push subscription -->
          <div v-if="pushSupported && !pushSubscribed" class="mt-6">
            <Separator class="mb-5" />
            <p class="text-sm font-medium mb-1">{{ t('confirmation.pushTitle') }}</p>
            <p class="text-xs text-muted-foreground mb-3">{{ t('confirmation.pushDesc') }}</p>
            <Button class="w-full" :disabled="pushSubscribing" @click="subscribePush">
              {{ pushSubscribing ? t('confirmation.pushSubscribing') : t('confirmation.pushBtn') }}
            </Button>
            <p v-if="pushError" class="text-destructive text-xs mt-2">{{ pushError }}</p>
          </div>

          <div v-else-if="pushSubscribed" class="mt-6 text-center">
            <Separator class="mb-5" />
            <p class="text-sm text-green-600 font-medium">🔔 {{ t('confirmation.pushSubscribed') }}</p>
          </div>

          <div v-if="!pushSupported" class="mt-4 text-xs text-muted-foreground text-center">
            {{ t('confirmation.pushUnsupported') }}
          </div>

          <div class="mt-5">
            <router-link
              :to="{ name: 'manage', params: { token: booking.token } }"
              class="text-sm text-primary hover:text-primary/80"
            >
              {{ t('confirmation.manageLink') }}
            </router-link>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
