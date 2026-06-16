<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { notificationsApi } from '@/api/notifications'
import type { Notification } from '@/api/notifications'

const { t, locale } = useI18n()
const router = useRouter()

const notifications = ref<Notification[]>([])
const loading = ref(true)
const marking = ref(false)

const unreadCount = computed(() => notifications.value.filter(n => !n.read_at).length)

onMounted(async () => {
  try {
    const { data } = await notificationsApi.getAll()
    notifications.value = data
  } finally {
    loading.value = false
  }
})

async function markRead(n: Notification) {
  if (n.read_at) return
  await notificationsApi.markRead(n.id)
  n.read_at = new Date().toISOString()
  if (n.data.booking_token) {
    router.push({ name: 'manage', params: { token: n.data.booking_token } })
  }
}

async function markAllRead() {
  if (unreadCount.value === 0) return
  marking.value = true
  try {
    await notificationsApi.markAllRead()
    notifications.value.forEach(n => {
      if (!n.read_at) n.read_at = new Date().toISOString()
    })
  } finally {
    marking.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(
    locale.value === 'sr' ? 'sr-RS' : 'en-US',
    { day: 'numeric', month: 'short' }
  )
}

function notifLabel(n: Notification) {
  const key = `notifications.${n.data.type}` as any
  return t(key, { name: n.data.customer_name })
}
</script>

<template>
  <div v-if="!loading && notifications.length > 0" class="mb-6">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-medium text-gray-500">{{ t('notifications.title') }}</h2>
        <span
          v-if="unreadCount > 0"
          class="text-[10px] font-semibold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full leading-none"
        >
          {{ unreadCount }}
        </span>
      </div>
      <button
        v-if="unreadCount > 0"
        @click="markAllRead"
        :disabled="marking"
        class="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 transition-colors"
      >
        {{ t('notifications.markAllRead') }}
      </button>
    </div>

    <div class="space-y-2">
      <div
        v-for="n in notifications"
        :key="n.id"
        @click="markRead(n)"
        :class="[
          'bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors',
          n.read_at
            ? 'border-gray-100 opacity-60 cursor-default'
            : 'border-indigo-100 cursor-pointer hover:border-indigo-200',
        ]"
      >
        <div
          :class="[
            'w-2 h-2 rounded-full mt-1.5 shrink-0',
            n.read_at ? 'bg-gray-300' : 'bg-indigo-500',
          ]"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">
            {{ notifLabel(n) }}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ formatDate(n.data.date) }} {{ t('notifications.at') }} {{ n.data.start_time.slice(0, 5) }}
            · {{ t('notifications.with') }} {{ n.data.worker_name }}
          </p>
        </div>
        <span class="text-[10px] text-gray-300 shrink-0 mt-0.5">
          {{ new Date(n.created_at).toLocaleDateString(locale === 'sr' ? 'sr-RS' : 'en-US', { day: 'numeric', month: 'short' }) }}
        </span>
      </div>
    </div>
  </div>
</template>
