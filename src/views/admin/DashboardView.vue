<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import NotificationList from '@/components/NotificationList.vue'
import WorkerProfileEditor from '@/components/admin/WorkerProfileEditor.vue'
import OwnerOverview from '@/components/admin/OwnerOverview.vue'
import BookingRow from '@/components/admin/BookingRow.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { adminApi } from '@/api/admin'
import { tenantUrl } from '@/lib/domain'
import { toISODate } from '@/lib/weekCalendar'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useAdminContextStore } from '@/stores/adminContext'
import type { Worker, AdminClient } from '@/api/admin'
import type { Booking } from '@/api/booking'

const { t, locale } = useI18n()
const auth = useAuthStore()
const tenantStore = useTenantStore()
const adminContext = useAdminContextStore()
const router = useRouter()

const isWorker = computed(() => auth.client?.role === 'worker')
const isClient = computed(() => auth.client?.role === 'client')
const isAdmin = computed(() => auth.client?.role === 'admin')
// Vlasnik koji nije prošao onboarding vidi baner; novog (bez radnika) vodimo pravo na onboarding
const onboardingPending = computed(() => isClient.value && !auth.client?.client_profile?.onboarding_completed_at)

const loading = ref(true)
const workers = ref<Worker[]>([])
const bookings = ref<Booking[]>([])
const ownProfile = ref<Worker | null>(null)

const title = computed(() => {
  if (isAdmin.value && !adminContext.selectedClient) return t('dashboard.admin.clients')
  if (isWorker.value) return t('dashboard.worker.welcome', { name: auth.client?.name })
  return t('dashboard.title')
})

const siteUrl = computed(() => (tenantStore.config?.subdomain ? tenantUrl(tenantStore.config.subdomain) : ''))

// ─── Admin: lista klijenata ───────────────────────────────────────────────────
const clients = ref<AdminClient[]>([])
const suspending = ref<number | null>(null)

async function toggleSuspend(c: AdminClient) {
  suspending.value = c.id
  try {
    const { data } = await adminApi.suspendClient(c.id)
    const idx = clients.value.findIndex((x) => x.id === c.id)
    if (idx !== -1) clients.value[idx] = data
    if (adminContext.selectedClient?.id === c.id) adminContext.selectClient(data)
  } finally {
    suspending.value = null
  }
}

async function openClient(c: AdminClient) {
  adminContext.selectClient(c)
  workers.value = (await adminApi.getWorkers(c.id)).data
}

// ─── Radnik: današnji i predstojeći termini ───────────────────────────────────
const today = toISODate(new Date())
const jsLocale = computed(() => (locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US'))
const active = computed(() => bookings.value.filter((b) => b.status === 'pending' || b.status === 'confirmed'))
const byTime = (a: Booking, b: Booking) => a.slot.date.localeCompare(b.slot.date) || a.start_time.localeCompare(b.start_time)
const todayBookings = computed(() => active.value.filter((b) => b.slot.date.slice(0, 10) === today).sort(byTime))
const upcomingBookings = computed(() =>
  active.value.filter((b) => b.slot.date.slice(0, 10) > today).sort(byTime).slice(0, 10),
)

function shortDate(date: string) {
  return new Date(date.slice(0, 10) + 'T00:00:00').toLocaleDateString(jsLocale.value, { day: 'numeric', month: 'numeric' })
}

watch(
  () => auth.client,
  async (client) => {
    if (!client) return
    loading.value = true
    try {
      if (isAdmin.value) {
        clients.value = (await adminApi.getClients()).data
        if (adminContext.selectedClient) workers.value = (await adminApi.getWorkers(adminContext.selectedClient.id)).data
      } else if (isWorker.value) {
        const [bRes, meRes] = await Promise.all([adminApi.getBookings(), adminApi.getWorker(client.id)])
        bookings.value = bRes.data
        ownProfile.value = meRes.data
      } else {
        workers.value = (await adminApi.getWorkers()).data
        if (onboardingPending.value && workers.value.length === 0) {
          void router.replace({ name: 'onboarding' })
        }
      }
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <AdminLayout :title="title">
    <div v-if="loading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</div>

    <!-- ── Admin: lista klijenata ─────────────────────────────────────── -->
    <div v-else-if="isAdmin && !adminContext.selectedClient" class="flex flex-col gap-3">
      <div v-if="clients.length === 0" class="rounded-xl border border-gray-100 bg-card px-6 py-8 text-center text-sm text-gray-600">
        {{ t('dashboard.admin.noClients') }}
      </div>

      <article
        v-for="c in clients"
        :key="c.id"
        class="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-xl border border-gray-100 bg-card px-5 py-4"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="truncate font-semibold">{{ c.name }}</p>
            <Badge v-if="c.is_suspended" variant="destructive" class="shrink-0">{{ t('nav.suspended') }}</Badge>
          </div>
          <p class="text-[13px] text-gray-600">{{ c.email }} · {{ t('dashboard.admin.workers', { count: c.workers_count }) }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Button
            :variant="c.is_suspended ? 'outline' : 'destructive'"
            :disabled="suspending === c.id"
            @click="toggleSuspend(c)"
          >
            {{ c.is_suspended ? t('dashboard.admin.activate') : t('dashboard.admin.suspend') }}
          </Button>
          <Button @click="openClient(c)">{{ t('dashboard.admin.open') }}</Button>
        </div>
      </article>
    </div>

    <!-- ── Radnik ────────────────────────────────────────────────────── -->
    <div v-else-if="isWorker" class="flex flex-col gap-6">
      <NotificationList />

      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col rounded-xl border border-gray-100 bg-card px-5 py-4">
          <span class="text-[28px] leading-tight font-semibold">{{ todayBookings.length }}</span>
          <span class="text-sm text-gray-600">{{ t('dashboard.overview.today') }}</span>
        </div>
        <div class="flex flex-col rounded-xl border border-gray-100 bg-card px-5 py-4">
          <span class="text-[28px] leading-tight font-semibold">{{ upcomingBookings.length }}</span>
          <span class="text-sm text-gray-600">{{ t('dashboard.worker.upcoming') }}</span>
        </div>
      </div>

      <div class="grid items-start gap-6 lg:grid-cols-2">
        <section class="flex flex-col gap-3 rounded-xl border border-gray-100 bg-card p-5">
          <h2 class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('dashboard.worker.today') }}</h2>
          <BookingRow v-for="b in todayBookings" :key="b.id" :booking="b" :when="b.start_time.slice(0, 5)" />
          <p v-if="todayBookings.length === 0" class="text-sm text-gray-600">{{ t('dashboard.overview.noToday') }}</p>
        </section>
        <section class="flex flex-col gap-3 rounded-xl border border-gray-100 bg-card p-5">
          <h2 class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('dashboard.worker.upcomingTitle') }}</h2>
          <BookingRow
            v-for="b in upcomingBookings"
            :key="b.id"
            :booking="b"
            :when="`${shortDate(b.slot.date)} ${b.start_time.slice(0, 5)}`"
            class="[&>span:first-child]:w-[88px]"
          />
          <p v-if="upcomingBookings.length === 0" class="text-sm text-gray-600">{{ t('dashboard.worker.noUpcoming') }}</p>
        </section>
      </div>

      <section v-if="ownProfile" class="flex flex-col gap-4 rounded-xl border border-gray-100 bg-card p-6" data-testid="worker-own-profile">
        <div>
          <h2 class="text-lg font-semibold">{{ t('workers.myProfile') }}</h2>
          <p class="text-sm text-gray-600">{{ t('workers.myProfileHint') }}</p>
        </div>
        <WorkerProfileEditor :worker="ownProfile" @updated="ownProfile = $event" />
      </section>
    </div>

    <!-- ── Vlasnik, ili admin koji je otvorio klijenta: Pregled ──────────── -->
    <template v-else>
      <section
        v-if="onboardingPending"
        class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-card p-5"
      >
        <div>
          <p class="font-semibold">{{ t('onboarding.banner.title') }}</p>
          <p class="text-sm text-gray-600">{{ t('onboarding.banner.text') }}</p>
        </div>
        <Button as-child>
          <router-link :to="{ name: 'onboarding' }">{{ t('onboarding.banner.cta') }}</router-link>
        </Button>
      </section>

      <OwnerOverview
        :client-id="adminContext.selectedClient?.id"
        :workers-count="workers.length"
        :site-url="isAdmin ? '' : siteUrl"
      />

      <NotificationList v-if="!isAdmin" />
    </template>
  </AdminLayout>
</template>
