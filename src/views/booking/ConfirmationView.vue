<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { bookingApi } from '@/api/booking'
import api from '@/api/axios'
import type { Booking } from '@/api/booking'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const booking = ref<Booking | null>(null)
const loading = ref(true)

const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window
const pushSubscribed = ref(false)
const pushSubscribing = ref(false)
const pushError = ref('')

const jsLocale = computed(() => locale.value === 'sr' ? 'sr-RS' : 'en-US')

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
      applicationServerKey: urlBase64ToUint8Array(vapid_public_key),
    })
    const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    await bookingApi.registerPushSubscription(booking.value.token, json)
    pushSubscribed.value = true
  } catch (e) {
    console.error('Push subscription failed:', e)
    pushError.value = t('confirmation.pushError')
  } finally {
    pushSubscribing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8 text-center">

      <div v-if="loading" class="text-gray-400">{{ t('common.loading') }}</div>

      <template v-else-if="booking">
        <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        <h1 class="text-xl font-semibold text-gray-900 mb-1">{{ t('confirmation.title') }}</h1>
        <p class="text-gray-500 text-sm mb-6">
          {{ t('confirmation.sentTo', { contact: booking.customer_email ? 'email' : t('booking.phone').toLowerCase() }) }}
        </p>

        <div class="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('confirmation.worker') }}</span>
            <span class="font-medium text-gray-900">{{ booking.slot.worker.name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('confirmation.date') }}</span>
            <span class="font-medium text-gray-900 capitalize">{{ formatDate(booking.slot.date) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('confirmation.time') }}</span>
            <span class="font-medium text-gray-900">
              {{ booking.slot.start_time.slice(0, 5) }} — {{ booking.slot.end_time.slice(0, 5) }}
            </span>
          </div>
        </div>

        <!-- Push subscription -->
        <div v-if="pushSupported && !pushSubscribed" class="mt-6 border-t border-gray-100 pt-5">
          <p class="text-sm font-medium text-gray-700 mb-1">{{ t('confirmation.pushTitle') }}</p>
          <p class="text-xs text-gray-400 mb-3">{{ t('confirmation.pushDesc') }}</p>
          <button
            @click="subscribePush"
            :disabled="pushSubscribing"
            class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {{ pushSubscribing ? t('confirmation.pushSubscribing') : t('confirmation.pushBtn') }}
          </button>
          <p v-if="pushError" class="text-red-500 text-xs mt-2">{{ pushError }}</p>
        </div>

        <div v-else-if="pushSubscribed" class="mt-6 border-t border-gray-100 pt-5 text-center">
          <p class="text-sm text-green-600 font-medium">🔔 {{ t('confirmation.pushSubscribed') }}</p>
        </div>

        <div v-if="!pushSupported" class="mt-4 text-xs text-gray-400 text-center">
          {{ t('confirmation.pushUnsupported') }}
        </div>

        <div class="mt-5">
          <router-link
            :to="{ name: 'manage', params: { token: booking.token } }"
            class="text-sm text-indigo-600 hover:text-indigo-700"
          >
            {{ t('confirmation.manageLink') }}
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>
