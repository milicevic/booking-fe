<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { notificationsApi } from '@/api/notifications'
import type { Notification } from '@/api/notifications'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
    locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US',
    { day: 'numeric', month: 'short' }
  )
}

function notifLabel(n: Notification) {
  return t(`notifications.${n.data.type}`, { name: n.data.customer_name })
}
</script>

<template>
  <div v-if="!loading && notifications.length > 0" class="mb-6">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-medium text-muted-foreground">{{ t('notifications.title') }}</h2>
        <Badge v-if="unreadCount > 0" data-testid="unread-count">{{ unreadCount }}</Badge>
      </div>
      <Button
        v-if="unreadCount > 0"
        variant="link"
        size="xs"
        class="px-0"
        :disabled="marking"
        @click="markAllRead"
      >
        {{ t('notifications.markAllRead') }}
      </Button>
    </div>

    <div class="space-y-2">
      <div
        v-for="n in notifications"
        :key="n.id"
        @click="markRead(n)"
        :class="[
          'bg-card rounded-xl border p-4 flex items-start gap-3 transition-colors',
          n.read_at
            ? 'opacity-60 cursor-default'
            : 'border-primary/20 cursor-pointer hover:border-primary/40',
        ]"
      >
        <div
          :class="[
            'w-2 h-2 rounded-full mt-1.5 shrink-0',
            n.read_at ? 'bg-muted-foreground/40' : 'bg-primary',
          ]"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium">
            {{ notifLabel(n) }}
          </p>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ formatDate(n.data.date) }} {{ t('notifications.at') }} {{ n.data.start_time.slice(0, 5) }}
            · {{ t('notifications.with') }} {{ n.data.worker_name }}<template v-if="n.data.service_name"> · {{ n.data.service_name }}</template>
          </p>
        </div>
        <span class="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
          {{ new Date(n.created_at).toLocaleDateString(locale === 'sr' ? 'sr-Latn-RS' : 'en-US', { day: 'numeric', month: 'short' }) }}
        </span>
      </div>
    </div>
  </div>
</template>
