<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import NotificationList from '@/components/NotificationList.vue'
import WorkerProfileEditor from '@/components/admin/WorkerProfileEditor.vue'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { adminApi } from '@/api/admin'
import { tenantUrl } from '@/lib/domain'
import { buildSlotCandidates, splitByExisting } from '@/lib/slotGenerator'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useAdminContextStore } from '@/stores/adminContext'
import type { Worker, AdminClient } from '@/api/admin'
import type { CustomerContact } from '@/api/tenant'
import type { Booking, Slot } from '@/api/booking'
import { apiErrorMessage } from '@/lib/apiError'

const { t, locale } = useI18n()

// ─── Data ────────────────────────────────────────────────────────────────────
const slots = ref<Slot[]>([])
const workers = ref<Worker[]>([])
const loading = ref(true)
const generating = ref(false)
const generateError = ref('')
const generateSuccess = ref('')

// ─── Auth / role ──────────────────────────────────────────────────────────────
const auth = useAuthStore()
const isWorker = computed(() => auth.client?.role === 'worker')

// Radnik sam uređuje svoju sliku i opis koje kupci vide pri zakazivanju
const ownProfile = ref<Worker | null>(null)
const isAdmin = computed(() => auth.client?.role === 'admin')

// ─── Admin: client list ───────────────────────────────────────────────────────
const adminContext = useAdminContextStore()
const clients = ref<AdminClient[]>([])
const suspending = ref<number | null>(null)

async function loadClients() {
  const { data } = await adminApi.getClients()
  clients.value = data
}

async function toggleSuspend(c: AdminClient) {
  suspending.value = c.id
  try {
    const { data } = await adminApi.suspendClient(c.id)
    const idx = clients.value.findIndex(x => x.id === c.id)
    if (idx !== -1) clients.value[idx] = data
    if (adminContext.selectedClient?.id === c.id) adminContext.selectClient(data)
  } finally {
    suspending.value = null
  }
}

function openClient(c: AdminClient) {
  adminContext.selectClient(c)
  loadClientDashboard(c.id)
}

async function loadClientDashboard(clientId: number) {
  loading.value = true
  try {
    const [sRes, wRes] = await Promise.all([
      adminApi.getSlots(clientId),
      adminApi.getWorkers(clientId),
    ])
    slots.value = sRes.data
    workers.value = wRes.data
  } finally {
    loading.value = false
  }
}

// ─── Sajt klijenta ─────────────────────────────────────────────────────────────
const tenantStore = useTenantStore()
const siteUrl = computed(() => tenantStore.config?.subdomain ? tenantUrl(tenantStore.config.subdomain) : '')

// ─── Auto-confirm ─────────────────────────────────────────────────────────────
const autoConfirm = ref(false)
const savingSettings = ref(false)

async function toggleAutoConfirm() {
  savingSettings.value = true
  try {
    const { data } = await adminApi.updateSettings({ auto_confirm_bookings: !autoConfirm.value })
    autoConfirm.value = data.client_profile?.auto_confirm_bookings ?? false
    auth.client = data
  } finally {
    savingSettings.value = false
  }
}

// ─── Kontakt kupca pri zakazivanju ────────────────────────────────────────────
const CUSTOMER_CONTACT_OPTIONS: CustomerContact[] = ['email_or_phone', 'both', 'phone', 'email']
const customerContact = ref<CustomerContact>('email_or_phone')

function onCustomerContactChange(value: unknown) {
  const option = CUSTOMER_CONTACT_OPTIONS.find((o) => o === value)
  if (option && option !== customerContact.value) saveCustomerContact(option)
}

async function saveCustomerContact(value: CustomerContact) {
  const previous = customerContact.value
  customerContact.value = value
  savingSettings.value = true
  try {
    const { data } = await adminApi.updateSettings({ customer_contact: value })
    customerContact.value = data.client_profile?.customer_contact ?? value
    auth.client = data
  } catch {
    customerContact.value = previous
  } finally {
    savingSettings.value = false
  }
}

// ─── Calendar ────────────────────────────────────────────────────────────────
const calendarBase = ref(new Date())
const selectedDate = ref<string | null>(null)

const jsLocale = computed(() => locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US')

const monthLabel = computed(() =>
  calendarBase.value.toLocaleDateString(jsLocale.value, { month: 'long', year: 'numeric' })
)

const calDays = computed(() => [
  t('dashboard.weekdays.1'),
  t('dashboard.weekdays.2'),
  t('dashboard.weekdays.3'),
  t('dashboard.weekdays.4'),
  t('dashboard.weekdays.5'),
  t('dashboard.weekdays.6'),
  t('dashboard.weekdays.7'),
])

const calendarDays = computed(() => {
  const year = calendarBase.value.getFullYear()
  const month = calendarBase.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startDow = firstDay.getDay()
  if (startDow === 0) startDow = 7

  const days: Array<{ date: string; day: number; slotCount: number; availableCount: number } | null> = []

  for (let i = 1; i < startDow; i++) days.push(null)

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const daySlots = slots.value.filter(s => s.date.slice(0, 10) === dateStr)
    days.push({
      date: dateStr,
      day: d,
      slotCount: daySlots.length,
      availableCount: daySlots.filter(s => s.is_available).length,
    })
  }

  return days
})

const selectedDaySlots = computed(() =>
  selectedDate.value
    ? slots.value.filter(s => s.date.slice(0, 10) === selectedDate.value).sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      )
    : []
)

function prevMonth() {
  const d = new Date(calendarBase.value)
  d.setMonth(d.getMonth() - 1)
  calendarBase.value = d
}

function nextMonth() {
  const d = new Date(calendarBase.value)
  d.setMonth(d.getMonth() + 1)
  calendarBase.value = d
}

function selectDate(date: string) {
  selectedDate.value = selectedDate.value === date ? null : date
}

function formatDateLong(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString(jsLocale.value, {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── Generator form ───────────────────────────────────────────────────────────
const WEEKDAYS = computed(() => [
  { value: 1, label: t('dashboard.weekdays.1') },
  { value: 2, label: t('dashboard.weekdays.2') },
  { value: 3, label: t('dashboard.weekdays.3') },
  { value: 4, label: t('dashboard.weekdays.4') },
  { value: 5, label: t('dashboard.weekdays.5') },
  { value: 6, label: t('dashboard.weekdays.6') },
  { value: 7, label: t('dashboard.weekdays.7') },
])

const DURATIONS = [15, 20, 30, 45, 60, 90, 120]

const form = ref({
  worker_id: '',
  date_from: new Date().toISOString().slice(0, 10),
  date_to: new Date().toISOString().slice(0, 10),
  weekdays: [1, 2, 3, 4, 5] as number[],
  work_start: '08:00',
  work_end: '17:00',
  slot_duration: 30,
  breaks: [{ start: '13:00', end: '14:00' }] as { start: string; end: string }[],
})

function toggleWeekday(val: number) {
  const idx = form.value.weekdays.indexOf(val)
  if (idx === -1) form.value.weekdays.push(val)
  else form.value.weekdays.splice(idx, 1)
}

function addBreak() {
  form.value.breaks.push({ start: '', end: '' })
}

function removeBreak(i: number) {
  form.value.breaks.splice(i, 1)
}

// ─── Slot generation logic ────────────────────────────────────────────────────
// Kandidati iz forme, podeljeni na nove i one koje radnik već ima (ti se preskaču)
const generatedSlots = computed(() => {
  const candidates = buildSlotCandidates({
    dateFrom: form.value.date_from,
    dateTo: form.value.date_to,
    weekdays: form.value.weekdays,
    workStart: form.value.work_start,
    workEnd: form.value.work_end,
    slotDuration: form.value.slot_duration,
    breaks: form.value.breaks,
  })
  return form.value.worker_id
    ? splitByExisting(candidates, slots.value, Number(form.value.worker_id))
    : { fresh: candidates, existing: [] }
})

const preview = computed(() => generatedSlots.value.fresh.length)
const alreadyExisting = computed(() => generatedSlots.value.existing.length)

async function handleGenerate() {
  generateError.value = ''
  generateSuccess.value = ''

  if (!form.value.worker_id) return (generateError.value = t('dashboard.generate.errorNoWorker'))
  if (!form.value.date_from || !form.value.date_to) return (generateError.value = t('dashboard.generate.errorNoPeriod'))
  if (form.value.weekdays.length === 0) return (generateError.value = t('dashboard.generate.errorNoDays'))

  const toCreate = generatedSlots.value.fresh
  if (toCreate.length === 0) {
    return (generateError.value = alreadyExisting.value > 0 ? t('dashboard.generate.errorAllExist') : t('dashboard.generate.errorNoSlots'))
  }

  generating.value = true
  let created = 0
  let skipped = alreadyExisting.value
  try {
    for (const s of toCreate) {
      try {
        await adminApi.createSlot({
          worker_id: Number(form.value.worker_id),
          date: s.date,
          start_time: s.start,
          end_time: s.end,
        })
        created++
      } catch (e) {
        // Termin je u međuvremenu napravljen (npr. u drugom prozoru): backend ga odbija, preskačemo ga
        if (isAxiosError(e) && e.response?.status === 422) {
          skipped++
          continue
        }
        throw e
      }
    }
    generateSuccess.value = skipped > 0
      ? t('dashboard.generate.successWithSkipped', { count: created, skipped })
      : t('dashboard.generate.success', { count: created })
  } catch (e) {
    generateError.value = apiErrorMessage(e, t('dashboard.generate.errorGenerate'))
  } finally {
    generating.value = false
    await fetchSlots()
  }
}

// ─── Worker dashboard ─────────────────────────────────────────────────────────

const bookings = ref<Booking[]>([])

const now = new Date()
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const todayBookings = computed(() =>
  bookings.value.filter(b => b.slot.date.slice(0, 10) === todayStr && b.status !== 'cancelled')
)

const upcomingBookings = computed(() =>
  bookings.value
    .filter(b => b.slot.date.slice(0, 10) > todayStr && b.status !== 'cancelled')
    .sort((a, b) => a.slot.date.localeCompare(b.slot.date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 10)
)

function formatDate(date: string) {
  return new Date(date.slice(0, 10) + 'T00:00:00').toLocaleDateString(jsLocale.value, {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchSlots() {
  const { data } = await adminApi.getSlots(adminContext.selectedClient?.id)
  slots.value = data
}

watch(() => auth.client, async (client) => {
  if (!client) return
  loading.value = true
  try {
    if (isAdmin.value) {
      await loadClients()
    } else if (isWorker.value) {
      const [sRes, bRes, meRes] = await Promise.all([adminApi.getSlots(), adminApi.getBookings(), adminApi.getWorker(client.id)])
      slots.value = sRes.data
      bookings.value = bRes.data
      ownProfile.value = meRes.data
    } else {
      const [sRes, wRes] = await Promise.all([adminApi.getSlots(), adminApi.getWorkers()])
      slots.value = sRes.data
      workers.value = wRes.data
      autoConfirm.value = client.client_profile?.auto_confirm_bookings ?? false
      customerContact.value = client.client_profile?.customer_contact ?? 'email_or_phone'
    }
  } finally {
    loading.value = false
  }
}, { immediate: true })

function formatTime(t: string) {
  return t.slice(0, 5)
}
</script>

<template>
  <AdminLayout>

    <!-- ── Admin: client list ─────────────────────────────────────────── -->
    <template v-if="isAdmin && !adminContext.selectedClient">
      <h1 class="text-xl font-semibold mb-6">{{ t('dashboard.admin.clients') }}</h1>

      <div v-if="loading" class="text-muted-foreground text-sm">{{ t('common.loading') }}</div>

      <div v-else class="space-y-3">
        <Card v-if="clients.length === 0">
          <CardContent class="text-center text-muted-foreground text-sm">
            {{ t('dashboard.admin.noClients') }}
          </CardContent>
        </Card>

        <Card v-for="c in clients" :key="c.id" size="sm">
          <CardContent class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium truncate">{{ c.name }}</p>
                <Badge v-if="c.is_suspended" variant="destructive" class="shrink-0">
                  {{ t('nav.suspended') }}
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">{{ c.email }} · {{ t('dashboard.admin.workers', { count: c.workers_count }) }}</p>
            </div>

            <div class="flex items-center gap-2 ml-4 shrink-0">
              <Button
                v-if="c.is_suspended"
                size="sm"
                variant="outline"
                class="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-700"
                :disabled="suspending === c.id"
                @click="toggleSuspend(c)"
              >
                {{ suspending === c.id ? '...' : t('dashboard.admin.activate') }}
              </Button>
              <Button
                v-else
                size="sm"
                variant="destructive"
                :disabled="suspending === c.id"
                @click="toggleSuspend(c)"
              >
                {{ suspending === c.id ? '...' : t('dashboard.admin.suspend') }}
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                @click="openClient(c)"
              >
                {{ t('dashboard.admin.open') }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>

    <!-- ── Worker dashboard ──────────────────────────────────────────── -->
    <template v-else-if="isWorker">
      <h1 class="text-xl font-semibold mb-6">{{ t('dashboard.worker.welcome', { name: auth.client?.name }) }}</h1>

      <NotificationList />

      <div v-if="loading" class="text-muted-foreground text-sm">{{ t('common.loading') }}</div>

      <template v-else>
        <div class="grid grid-cols-2 gap-3 mb-6">
          <Card size="sm">
            <CardContent class="text-center">
              <p class="text-2xl font-semibold">{{ todayBookings.length }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ t('dashboard.worker.today') }}</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent class="text-center">
              <p class="text-2xl font-semibold text-primary">{{ upcomingBookings.length }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ t('dashboard.worker.upcoming') }}</p>
            </CardContent>
          </Card>
        </div>

        <h2 class="text-sm font-medium text-muted-foreground mb-3">{{ t('dashboard.worker.today') }}</h2>
        <div class="space-y-2 mb-6">
          <Card v-if="todayBookings.length === 0" size="sm">
            <CardContent class="text-center text-muted-foreground text-sm">{{ t('dashboard.worker.noToday') }}</CardContent>
          </Card>
          <Card v-for="b in todayBookings" :key="b.id" size="sm">
            <CardContent class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">{{ b.customer_name }}</p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {{ b.start_time.slice(0, 5) }} — {{ b.end_time.slice(0, 5) }}
                </p>
              </div>
              <Badge :class="b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
                {{ b.status === 'confirmed' ? t('dashboard.worker.confirmed') : t('dashboard.worker.pending') }}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <h2 class="text-sm font-medium text-muted-foreground mb-3">{{ t('dashboard.worker.upcomingTitle') }}</h2>
        <div class="space-y-2">
          <Card v-if="upcomingBookings.length === 0" size="sm">
            <CardContent class="text-center text-muted-foreground text-sm">{{ t('dashboard.worker.noUpcoming') }}</CardContent>
          </Card>
          <Card v-for="b in upcomingBookings" :key="b.id" size="sm">
            <CardContent class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">{{ b.customer_name }}</p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {{ formatDate(b.slot.date) }} · {{ b.start_time.slice(0, 5) }} — {{ b.end_time.slice(0, 5) }}
                </p>
              </div>
              <Badge :class="b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
                {{ b.status === 'confirmed' ? t('dashboard.worker.confirmed') : t('dashboard.worker.pending') }}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card v-if="ownProfile" class="mt-6" data-testid="worker-own-profile">
          <CardContent class="space-y-4">
            <div>
              <h2 class="text-sm font-semibold">{{ t('workers.myProfile') }}</h2>
              <p class="text-xs text-muted-foreground mt-0.5">{{ t('workers.myProfileHint') }}</p>
            </div>
            <WorkerProfileEditor :worker="ownProfile" @updated="ownProfile = $event" />
          </CardContent>
        </Card>
      </template>
    </template>

    <!-- ── Klijent, ili admin koji je otvorio klijenta: kalendar i generator termina ── -->
    <template v-else>
      <template v-if="!isAdmin">
        <NotificationList />

        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 class="text-xl font-semibold">{{ t('dashboard.title') }}</h1>

          <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div class="flex items-center gap-2">
              <Label for="customer-contact" class="font-normal shrink-0">{{ t('dashboard.customerContact.label') }}</Label>
              <NativeSelect
                id="customer-contact"
                :model-value="customerContact"
                :disabled="savingSettings"
                size="sm"
                class="w-auto"
                @update:model-value="onCustomerContactChange"
              >
                <NativeSelectOption v-for="option in CUSTOMER_CONTACT_OPTIONS" :key="option" :value="option">
                  {{ t(`dashboard.customerContact.${option}`) }}
                </NativeSelectOption>
              </NativeSelect>
            </div>

            <div class="flex items-center gap-3">
              <Label for="auto-confirm" class="font-normal">
                {{ autoConfirm ? t('dashboard.autoConfirm') : t('dashboard.manualConfirm') }}
              </Label>
              <Switch
                id="auto-confirm"
                :model-value="autoConfirm"
                :disabled="savingSettings"
                class="data-checked:bg-green-500"
                @update:model-value="toggleAutoConfirm"
              />
            </div>
          </div>
        </div>

        <!-- Sajt klijenta -->
        <Card v-if="siteUrl" size="sm" class="mb-6">
          <CardContent class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-sm font-medium">{{ t('dashboard.site.title') }}</p>
              <p class="text-xs text-muted-foreground mt-0.5 truncate">{{ siteUrl }}</p>
            </div>
            <Button as-child class="shrink-0">
              <a :href="siteUrl" target="_blank" rel="noopener">{{ t('dashboard.site.open') }}</a>
            </Button>
          </CardContent>
        </Card>
      </template>

      <div v-if="loading" class="text-muted-foreground text-sm">{{ t('common.loading') }}</div>

      <div v-else class="flex flex-col lg:flex-row gap-6">

        <!-- ── Calendar ─────────────────────────────────────────────── -->
        <div class="lg:w-1/2 space-y-4">
          <Card size="sm">
            <CardContent>
              <div class="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon-sm" class="text-muted-foreground" :aria-label="t('common.prevMonth')" @click="prevMonth">
                  <ChevronLeftIcon />
                </Button>
                <span class="text-sm font-medium capitalize">{{ monthLabel }}</span>
                <Button variant="ghost" size="icon-sm" class="text-muted-foreground" :aria-label="t('common.nextMonth')" @click="nextMonth">
                  <ChevronRightIcon />
                </Button>
              </div>

              <div class="grid grid-cols-7 mb-1">
                <div
                  v-for="d in calDays"
                  :key="d"
                  class="text-center text-xs text-muted-foreground font-medium py-1"
                >
                  {{ d }}
                </div>
              </div>

              <div class="grid grid-cols-7 gap-1">
                <div v-for="(day, i) in calendarDays" :key="i">
                  <div v-if="!day" class="h-12" />
                  <Button
                    v-else
                    :variant="selectedDate === day.date ? 'default' : 'ghost'"
                    :aria-pressed="selectedDate === day.date"
                    :class="[
                      'w-full h-12 flex-col gap-0 px-0 text-xs font-normal',
                      selectedDate !== day.date && (day.slotCount > 0
                        ? 'bg-accent hover:bg-primary/15 text-foreground'
                        : 'text-muted-foreground'),
                    ]"
                    @click="selectDate(day.date)"
                  >
                    <span class="font-medium leading-none">{{ day.day }}</span>
                    <span
                      v-if="day.slotCount > 0"
                      class="text-[10px] leading-none mt-0.5 opacity-75"
                    >
                      {{ day.availableCount }}/{{ day.slotCount }}
                    </span>
                  </Button>
                </div>
              </div>

              <p class="text-xs text-muted-foreground mt-3 text-center">
                {{ t('dashboard.slotsLegend') }}
              </p>
            </CardContent>
          </Card>

          <Card v-if="selectedDate" size="sm">
            <CardContent>
              <h2 class="text-sm font-medium mb-3 capitalize">
                {{ formatDateLong(selectedDate) }}
              </h2>

              <div v-if="selectedDaySlots.length === 0" class="text-muted-foreground text-sm text-center py-4">
                {{ t('dashboard.noSlots') }}
              </div>

              <div v-else class="space-y-1.5">
                <div
                  v-for="slot in selectedDaySlots"
                  :key="slot.id"
                  class="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/60"
                >
                  <span class="text-sm">
                    {{ formatTime(slot.start_time) }} — {{ formatTime(slot.end_time) }}
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted-foreground">{{ slot.worker.name }}</span>
                    <Badge :class="slot.is_available ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'">
                      {{ slot.is_available ? t('dashboard.slotAvailable') : t('dashboard.slotTaken') }}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- ── Slot generator ──────────────────────────────────────── -->
        <div class="lg:w-1/2">
          <Card>
            <CardContent class="space-y-5">
              <h2 class="text-sm font-semibold">{{ t('dashboard.generate.title') }}</h2>

              <div class="grid gap-1.5">
                <Label for="generate-worker">{{ t('dashboard.generate.worker') }} *</Label>
                <NativeSelect id="generate-worker" v-model="form.worker_id">
                  <NativeSelectOption value="">{{ t('dashboard.generate.workerPlaceholder') }}</NativeSelectOption>
                  <NativeSelectOption v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</NativeSelectOption>
                </NativeSelect>
              </div>

              <div class="grid gap-1.5">
                <Label for="generate-date-from">{{ t('dashboard.generate.period') }} *</Label>
                <div class="grid grid-cols-2 gap-2">
                  <Input
                    id="generate-date-from"
                    v-model="form.date_from"
                    type="date"
                    :min="new Date().toISOString().slice(0, 10)"
                    class="min-w-0"
                  />
                  <Input
                    v-model="form.date_to"
                    type="date"
                    :min="form.date_from"
                    class="min-w-0"
                  />
                </div>
              </div>

              <div class="grid gap-1.5">
                <Label>{{ t('dashboard.generate.weekdays') }}</Label>
                <div class="flex gap-1.5 flex-wrap">
                  <Button
                    v-for="d in WEEKDAYS"
                    :key="d.value"
                    type="button"
                    size="sm"
                    :variant="form.weekdays.includes(d.value) ? 'default' : 'secondary'"
                    :aria-pressed="form.weekdays.includes(d.value)"
                    class="text-xs"
                    @click="toggleWeekday(d.value)"
                  >
                    {{ d.label }}
                  </Button>
                </div>
              </div>

              <div class="grid gap-1.5">
                <Label for="generate-work-start">{{ t('dashboard.generate.workHours') }}</Label>
                <div class="flex items-center gap-2">
                  <Input id="generate-work-start" v-model="form.work_start" type="time" class="flex-1 min-w-0" />
                  <span class="text-muted-foreground text-sm">{{ t('dashboard.generate.to') }}</span>
                  <Input v-model="form.work_end" type="time" class="flex-1 min-w-0" />
                </div>
              </div>

              <div class="grid gap-1.5">
                <Label>{{ t('dashboard.generate.duration') }}</Label>
                <div class="flex gap-1.5 flex-wrap">
                  <Button
                    v-for="dur in DURATIONS"
                    :key="dur"
                    type="button"
                    size="sm"
                    :variant="form.slot_duration === dur ? 'default' : 'secondary'"
                    :aria-pressed="form.slot_duration === dur"
                    class="text-xs"
                    @click="form.slot_duration = dur"
                  >
                    {{ dur }}min
                  </Button>
                </div>
              </div>

              <div class="grid gap-1.5">
                <div class="flex items-center justify-between">
                  <Label>{{ t('dashboard.generate.breaks') }}</Label>
                  <Button type="button" variant="link" size="xs" class="px-0" @click="addBreak">
                    {{ t('dashboard.generate.addBreak') }}
                  </Button>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="(br, i) in form.breaks"
                    :key="i"
                    class="flex items-center gap-2"
                  >
                    <Input v-model="br.start" type="time" class="flex-1 min-w-0" />
                    <span class="text-muted-foreground text-xs">—</span>
                    <Input v-model="br.end" type="time" class="flex-1 min-w-0" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      class="text-muted-foreground hover:text-destructive shrink-0"
                      :aria-label="t('common.delete')"
                      @click="removeBreak(i)"
                    >
                      <XIcon />
                    </Button>
                  </div>
                  <p v-if="form.breaks.length === 0" class="text-xs text-muted-foreground">
                    {{ t('dashboard.generate.noBreaks') }}
                  </p>
                </div>
              </div>

              <Separator />

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-muted-foreground">{{ t('dashboard.generate.willGenerate') }}</span>
                  <span class="text-sm font-semibold text-primary">{{ preview }} {{ t('dashboard.generate.slots') }}</span>
                </div>
                <p v-if="alreadyExisting > 0" class="text-xs text-muted-foreground" data-testid="generate-existing">
                  {{ t('dashboard.generate.alreadyExisting', { count: alreadyExisting }) }}
                </p>

                <p v-if="generateError" class="text-destructive text-xs">{{ generateError }}</p>
                <p v-if="generateSuccess" class="text-green-600 text-xs font-medium">{{ generateSuccess }}</p>

                <Button class="w-full" :disabled="generating || preview === 0" @click="handleGenerate">
                  {{ generating ? t('dashboard.generate.generating') : t('dashboard.generate.generateBtn') }}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>

  </AdminLayout>
</template>
