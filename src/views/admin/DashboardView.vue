<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { adminApi } from '@/api/admin'
import { tenantApi } from '@/api/tenant'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import type { Worker, AdminClient } from '@/api/admin'
import type { Slot } from '@/api/booking'

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
const isAdmin = computed(() => auth.client?.role === 'admin')

// ─── Admin: client list ───────────────────────────────────────────────────────
const clients = ref<AdminClient[]>([])
const selectedClient = ref<AdminClient | null>(null)
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
  } finally {
    suspending.value = null
  }
}

function openClient(c: AdminClient) {
  selectedClient.value = c
  loadClientDashboard(c.id)
}

function backToList() {
  selectedClient.value = null
  slots.value = []
  workers.value = []
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

// ─── Deploy zahtev ────────────────────────────────────────────────────────────
const tenantStore = useTenantStore()
const showDeployModal = ref(false)
const deployForm = ref({ subdomain: '', custom_domain: '' })
const deployLoading = ref(false)
const deployError = ref('')
const deploySuccess = ref('')

async function handleDeployRequest() {
  deployError.value = ''
  const payload = deployForm.value.custom_domain
    ? { custom_domain: deployForm.value.custom_domain }
    : { subdomain: deployForm.value.subdomain }
  if (!payload.subdomain && !payload.custom_domain) {
    deployError.value = 'Unesite subdomenu ili custom domenu'
    return
  }
  deployLoading.value = true
  try {
    await tenantApi.requestDeploy(payload)
    deploySuccess.value = 'Zahtev je poslat! Administrator će ga obraditi.'
    showDeployModal.value = false
    await tenantStore.fetchConfig()
  } catch (e: any) {
    deployError.value = e.response?.data?.message ?? 'Greška pri slanju zahteva'
  } finally {
    deployLoading.value = false
  }
}

// ─── Auto-confirm toggle ──────────────────────────────────────────────────────
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

// ─── Calendar ────────────────────────────────────────────────────────────────
const calendarBase = ref(new Date())
const selectedDate = ref<string | null>(null)

const monthLabel = computed(() =>
  calendarBase.value.toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' })
)

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

// ─── Generator form ───────────────────────────────────────────────────────────
const WEEKDAYS = [
  { value: 1, label: 'Pon' },
  { value: 2, label: 'Uto' },
  { value: 3, label: 'Sre' },
  { value: 4, label: 'Čet' },
  { value: 5, label: 'Pet' },
  { value: 6, label: 'Sub' },
  { value: 7, label: 'Ned' },
]

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
function buildSlots() {
  const result: { date: string; start: string; end: string }[] = []

  const from = new Date(form.value.date_from)
  const to = new Date(form.value.date_to)
  if (from > to) return result

  const [endH, endM] = form.value.work_end.split(':').map(Number)
  const workEndMin = endH * 60 + endM

  for (const cur = new Date(from); cur <= to; cur.setDate(cur.getDate() + 1)) {
    const dow = cur.getDay() === 0 ? 7 : cur.getDay()
    if (!form.value.weekdays.includes(dow)) continue

    const dateStr = cur.toISOString().slice(0, 10)
    const [sh, sm] = form.value.work_start.split(':').map(Number)
    let cursor = sh * 60 + sm

    while (cursor + form.value.slot_duration <= workEndMin) {
      const slotEnd = cursor + form.value.slot_duration

      const inBreak = form.value.breaks.some(br => {
        if (!br.start || !br.end) return false
        const [bsh, bsm] = br.start.split(':').map(Number)
        const [beh, bem] = br.end.split(':').map(Number)
        return cursor < beh * 60 + bem && slotEnd > bsh * 60 + bsm
      })

      if (!inBreak) {
        const fmt = (min: number) =>
          `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
        result.push({ date: dateStr, start: fmt(cursor), end: fmt(slotEnd) })
      }

      cursor += form.value.slot_duration
    }
  }

  return result
}

const preview = computed(() => buildSlots().length)

async function handleGenerate() {
  generateError.value = ''
  generateSuccess.value = ''

  if (!form.value.worker_id) return (generateError.value = 'Odaberite radnika')
  if (!form.value.date_from || !form.value.date_to) return (generateError.value = 'Unesite period')
  if (form.value.weekdays.length === 0) return (generateError.value = 'Odaberite bar jedan dan')

  const toCreate = buildSlots()
  if (toCreate.length === 0) return (generateError.value = 'Nema termina za generisanje')

  generating.value = true
  try {
    for (const s of toCreate) {
      await adminApi.createSlot({
        worker_id: Number(form.value.worker_id),
        date: s.date,
        start_time: s.start,
        end_time: s.end,
      } as any)
    }
    generateSuccess.value = `Generisano ${toCreate.length} termina`
    await fetchSlots()
  } catch {
    generateError.value = 'Greška pri generisanju'
  } finally {
    generating.value = false
  }
}

// ─── Worker dashboard ─────────────────────────────────────────────────────────
import type { Booking } from '@/api/booking'

const bookings = ref<Booking[]>([])

const now = new Date()
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const todayBookings = computed(() =>
  bookings.value.filter(b => b.slot.date.slice(0, 10) === todayStr && b.status !== 'cancelled')
)

const upcomingBookings = computed(() =>
  bookings.value
    .filter(b => b.slot.date.slice(0, 10) > todayStr && b.status !== 'cancelled')
    .sort((a, b) => a.slot.date.localeCompare(b.slot.date) || a.slot.start_time.localeCompare(b.slot.start_time))
    .slice(0, 10)
)

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('sr-RS', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchSlots() {
  const { data } = await adminApi.getSlots(selectedClient.value?.id)
  slots.value = data
}

onMounted(async () => {
  try {
    if (isAdmin.value) {
      await loadClients()
    } else if (isWorker.value) {
      const [sRes, bRes] = await Promise.all([adminApi.getSlots(), adminApi.getBookings()])
      slots.value = sRes.data
      bookings.value = bRes.data
    } else {
      const [sRes, wRes] = await Promise.all([adminApi.getSlots(), adminApi.getWorkers()])
      slots.value = sRes.data
      workers.value = wRes.data
      autoConfirm.value = auth.client?.client_profile?.auto_confirm_bookings ?? false
    }
  } finally {
    loading.value = false
  }
})

function formatTime(t: string) {
  return t.slice(0, 5)
}
</script>

<template>
  <AdminLayout>

    <!-- ── Admin: client list ─────────────────────────────────────────── -->
    <template v-if="isAdmin">

      <!-- Drilled into a client -->
      <template v-if="selectedClient">
        <div class="flex items-center gap-3 mb-6">
          <button
            @click="backToList"
            class="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            ← Nazad
          </button>
          <h1 class="text-xl font-semibold text-gray-900">{{ selectedClient.name }}</h1>
          <span
            v-if="selectedClient.is_suspended"
            class="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full"
          >
            Suspendovan
          </span>
        </div>

        <div v-if="loading" class="text-gray-400 text-sm">Učitavanje...</div>

        <div v-else class="flex flex-col lg:flex-row gap-6">
          <!-- ── Kalendar ─────────────────────────────────────────────── -->
          <div class="lg:w-1/2 space-y-4">
            <div class="bg-white rounded-xl border border-gray-100 p-4">
              <div class="flex items-center justify-between mb-4">
                <button @click="prevMonth" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">‹</button>
                <span class="text-sm font-medium text-gray-900 capitalize">{{ monthLabel }}</span>
                <button @click="nextMonth" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">›</button>
              </div>
              <div class="grid grid-cols-7 mb-1">
                <div v-for="d in ['Pon','Uto','Sre','Čet','Pet','Sub','Ned']" :key="d"
                  class="text-center text-xs text-gray-400 font-medium py-1">{{ d }}</div>
              </div>
              <div class="grid grid-cols-7 gap-1">
                <div v-for="(day, i) in calendarDays" :key="i">
                  <div v-if="!day" class="h-12" />
                  <button v-else @click="selectDate(day.date)"
                    :class="[
                      'w-full h-12 rounded-lg flex flex-col items-center justify-center text-xs transition-colors',
                      selectedDate === day.date
                        ? 'bg-indigo-600 text-white'
                        : day.slotCount > 0
                          ? 'bg-indigo-50 hover:bg-indigo-100 text-gray-900'
                          : 'hover:bg-gray-50 text-gray-500',
                    ]"
                  >
                    <span class="font-medium leading-none">{{ day.day }}</span>
                    <span v-if="day.slotCount > 0" class="text-[10px] leading-none mt-0.5 opacity-75">
                      {{ day.availableCount }}/{{ day.slotCount }}
                    </span>
                  </button>
                </div>
              </div>
              <p class="text-xs text-gray-400 mt-3 text-center">Slobodni / Ukupno termini po danu</p>
            </div>

            <div v-if="selectedDate" class="bg-white rounded-xl border border-gray-100 p-4">
              <h2 class="text-sm font-medium text-gray-700 mb-3">
                {{ new Date(selectedDate).toLocaleDateString('sr-RS', { weekday: 'long', day: 'numeric', month: 'long' }) }}
              </h2>
              <div v-if="selectedDaySlots.length === 0" class="text-gray-400 text-sm text-center py-4">Nema termina</div>
              <div v-else class="space-y-1.5">
                <div v-for="slot in selectedDaySlots" :key="slot.id"
                  class="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                  <span class="text-sm text-gray-900">{{ formatTime(slot.start_time) }} — {{ formatTime(slot.end_time) }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">{{ slot.worker.name }}</span>
                    <span :class="slot.is_available ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
                      class="text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {{ slot.is_available ? 'Slobodan' : 'Zauzet' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Generator forme ──────────────────────────────────────── -->
          <div class="lg:w-1/2">
            <div class="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
              <h2 class="text-sm font-semibold text-gray-900">Generisanje termina</h2>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1.5">Radnik *</label>
                <select v-model="form.worker_id"
                  class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Odaberi radnika</option>
                  <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1.5">Period *</label>
                <div class="grid grid-cols-2 gap-2">
                  <input v-model="form.date_from" type="date" :min="new Date().toISOString().slice(0,10)"
                    class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input v-model="form.date_to" type="date" :min="form.date_from"
                    class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1.5">Radni dani</label>
                <div class="flex gap-1.5 flex-wrap">
                  <button v-for="d in WEEKDAYS" :key="d.value" @click="toggleWeekday(d.value)"
                    :class="form.weekdays.includes(d.value) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">{{ d.label }}</button>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1.5">Radno vreme</label>
                <div class="flex items-center gap-2">
                  <input v-model="form.work_start" type="time"
                    class="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <span class="text-gray-400 text-sm">do</span>
                  <input v-model="form.work_end" type="time"
                    class="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1.5">Trajanje slota</label>
                <div class="flex gap-1.5 flex-wrap">
                  <button v-for="dur in DURATIONS" :key="dur" @click="form.slot_duration = dur"
                    :class="form.slot_duration === dur ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">{{ dur }}min</button>
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-medium text-gray-600">Pauze</label>
                  <button @click="addBreak" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">+ Dodaj pauzu</button>
                </div>
                <div class="space-y-2">
                  <div v-for="(br, i) in form.breaks" :key="i" class="flex items-center gap-2">
                    <input v-model="br.start" type="time"
                      class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <span class="text-gray-400 text-xs">—</span>
                    <input v-model="br.end" type="time"
                      class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button @click="removeBreak(i)" class="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0">×</button>
                  </div>
                  <p v-if="form.breaks.length === 0" class="text-xs text-gray-400">Nema pauza</p>
                </div>
              </div>
              <div class="border-t border-gray-100 pt-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">Biće generisano:</span>
                  <span class="text-sm font-semibold text-indigo-600">{{ preview }} termina</span>
                </div>
                <p v-if="generateError" class="text-red-500 text-xs">{{ generateError }}</p>
                <p v-if="generateSuccess" class="text-green-600 text-xs font-medium">{{ generateSuccess }}</p>
                <button @click="handleGenerate" :disabled="generating || preview === 0"
                  class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                  {{ generating ? 'Generisanje...' : 'Generisi termine' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Client list -->
      <template v-else>
        <h1 class="text-xl font-semibold text-gray-900 mb-6">Klijenti</h1>

        <div v-if="loading" class="text-gray-400 text-sm">Učitavanje...</div>

        <div v-else class="space-y-3">
          <div v-if="clients.length === 0" class="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
            Nema klijenata
          </div>

          <div
            v-for="c in clients"
            :key="c.id"
            class="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-gray-900 truncate">{{ c.name }}</p>
                <span v-if="c.is_suspended"
                  class="text-[10px] bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full shrink-0">
                  Suspendovan
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5">{{ c.email }} · {{ c.workers_count }} radnika</p>
            </div>

            <div class="flex items-center gap-2 ml-4 shrink-0">
              <button
                @click="toggleSuspend(c)"
                :disabled="suspending === c.id"
                :class="c.is_suspended
                  ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'"
                class="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50"
              >
                {{ suspending === c.id ? '...' : c.is_suspended ? 'Aktiviraj' : 'Suspenduj' }}
              </button>
              <button
                @click="openClient(c)"
                class="text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                Otvori
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ── Worker dashboard ──────────────────────────────────────────── -->
    <template v-else-if="isWorker">
      <h1 class="text-xl font-semibold text-gray-900 mb-6">Dobrodošli, {{ auth.client?.name }}</h1>

      <div v-if="loading" class="text-gray-400 text-sm">Učitavanje...</div>

      <template v-else>
        <!-- Stats -->
        <div class="grid grid-cols-2 gap-3 mb-6">
          <div class="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p class="text-2xl font-semibold text-gray-900">{{ todayBookings.length }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Danas</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p class="text-2xl font-semibold text-indigo-600">{{ upcomingBookings.length }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Predstojeći</p>
          </div>
        </div>

        <!-- Danas -->
        <h2 class="text-sm font-medium text-gray-500 mb-3">Danas</h2>
        <div class="space-y-2 mb-6">
          <div v-if="todayBookings.length === 0" class="bg-white rounded-xl border border-gray-100 p-4 text-center text-gray-400 text-sm">
            Nema termina danas
          </div>
          <div
            v-for="b in todayBookings"
            :key="b.id"
            class="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
          >
            <div>
              <p class="text-sm font-medium text-gray-900">{{ b.customer_name }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ b.slot.start_time.slice(0, 5) }} — {{ b.slot.end_time.slice(0, 5) }}
              </p>
            </div>
            <span
              :class="b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
              class="text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {{ b.status === 'confirmed' ? 'Potvrđena' : 'Na čekanju' }}
            </span>
          </div>
        </div>

        <!-- Predstojeći -->
        <h2 class="text-sm font-medium text-gray-500 mb-3">Predstojeći termini</h2>
        <div class="space-y-2">
          <div v-if="upcomingBookings.length === 0" class="bg-white rounded-xl border border-gray-100 p-4 text-center text-gray-400 text-sm">
            Nema predstojejih termina
          </div>
          <div
            v-for="b in upcomingBookings"
            :key="b.id"
            class="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
          >
            <div>
              <p class="text-sm font-medium text-gray-900">{{ b.customer_name }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ formatDate(b.slot.date) }} · {{ b.slot.start_time.slice(0, 5) }} — {{ b.slot.end_time.slice(0, 5) }}
              </p>
            </div>
            <span
              :class="b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
              class="text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {{ b.status === 'confirmed' ? 'Potvrđena' : 'Na čekanju' }}
            </span>
          </div>
        </div>
      </template>
    </template>

    <!-- ── Client dashboard ───────────────────────────────────────────── -->
    <template v-else>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-gray-900">Dashboard</h1>

      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-500">
          {{ autoConfirm ? 'Automatsko odobravanje' : 'Ručno odobravanje' }}
        </span>
        <button
          role="switch"
          :aria-checked="autoConfirm"
          @click="toggleAutoConfirm"
          :disabled="savingSettings"
          :class="autoConfirm ? 'bg-green-500' : 'bg-gray-200'"
          class="relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 cursor-pointer shrink-0"
        >
          <span
            :class="autoConfirm ? 'translate-x-5' : 'translate-x-0'"
            class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
          />
        </button>
      </div>
    </div>

    <!-- ── Deploy sekcija ──────────────────────────────────────────── -->
    <div
      v-if="tenantStore.config && !['active', 'trialing'].includes(tenantStore.config.subscription_status) === false && tenantStore.config.subscription_status !== 'pending_deploy'"
      class="hidden"
    />
    <div
      v-if="tenantStore.config?.subscription_status === 'pending_deploy'"
      class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3"
    >
      <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse shrink-0" />
      <p class="text-sm text-blue-700">Deploy zahtev je na čekanju — administrator obrađuje vaš zahtev.</p>
    </div>
    <div v-else-if="tenantStore.config && ['trialing', 'active'].includes(tenantStore.config.subscription_status)" class="mb-6">
      <div v-if="deploySuccess" class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <p class="text-sm text-green-700">{{ deploySuccess }}</p>
      </div>
      <div v-else-if="!showDeployModal" class="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900">Objavite svoju booking stranicu</p>
          <p class="text-xs text-gray-400 mt-0.5">Pošaljite zahtev za deploy na vašu subdomenu ili custom domenu</p>
        </div>
        <button
          @click="showDeployModal = true"
          class="text-sm font-medium px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shrink-0 ml-4"
        >
          Deploy
        </button>
      </div>

      <!-- Deploy modal inline -->
      <div v-else class="bg-white border border-indigo-200 rounded-xl p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900">Zahtev za deploy</h3>
          <button @click="showDeployModal = false; deployError = ''" class="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Subdomena</label>
          <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <input
              v-model="deployForm.subdomain"
              type="text"
              placeholder="moj-salon"
              :disabled="!!deployForm.custom_domain"
              class="flex-1 px-3 py-2.5 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
            <span class="px-3 py-2.5 bg-gray-50 text-gray-400 text-xs border-l border-gray-200">.booking.app</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex-1 h-px bg-gray-200" />
          <span class="text-xs text-gray-400">ili</span>
          <div class="flex-1 h-px bg-gray-200" />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Custom domena</label>
          <input
            v-model="deployForm.custom_domain"
            type="text"
            placeholder="rezervacije.moj-salon.com"
            :disabled="!!deployForm.subdomain"
            class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        <p v-if="deployError" class="text-red-500 text-xs">{{ deployError }}</p>

        <button
          @click="handleDeployRequest"
          :disabled="deployLoading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {{ deployLoading ? 'Slanje...' : 'Pošalji zahtev' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">Učitavanje...</div>

    <div v-else class="flex flex-col lg:flex-row gap-6">

      <!-- ── Kalendar ─────────────────────────────────────────────── -->
      <div class="lg:w-1/2 space-y-4">
        <div class="bg-white rounded-xl border border-gray-100 p-4">

          <!-- Navigacija -->
          <div class="flex items-center justify-between mb-4">
            <button @click="prevMonth" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              ‹
            </button>
            <span class="text-sm font-medium text-gray-900 capitalize">{{ monthLabel }}</span>
            <button @click="nextMonth" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              ›
            </button>
          </div>

          <!-- Zaglavlje dana -->
          <div class="grid grid-cols-7 mb-1">
            <div
              v-for="d in ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']"
              :key="d"
              class="text-center text-xs text-gray-400 font-medium py-1"
            >
              {{ d }}
            </div>
          </div>

          <!-- Dani -->
          <div class="grid grid-cols-7 gap-1">
            <div v-for="(day, i) in calendarDays" :key="i">
              <!-- Prazan (prethodni mesec) -->
              <div v-if="!day" class="h-12" />

              <!-- Dan -->
              <button
                v-else
                @click="selectDate(day.date)"
                :class="[
                  'w-full h-12 rounded-lg flex flex-col items-center justify-center text-xs transition-colors',
                  selectedDate === day.date
                    ? 'bg-indigo-600 text-white'
                    : day.slotCount > 0
                      ? 'bg-indigo-50 hover:bg-indigo-100 text-gray-900'
                      : 'hover:bg-gray-50 text-gray-500',
                ]"
              >
                <span class="font-medium leading-none">{{ day.day }}</span>
                <span
                  v-if="day.slotCount > 0"
                  class="text-[10px] leading-none mt-0.5 opacity-75"
                >
                  {{ day.availableCount }}/{{ day.slotCount }}
                </span>
              </button>
            </div>
          </div>

          <p class="text-xs text-gray-400 mt-3 text-center">
            Slobodni / Ukupno termini po danu
          </p>
        </div>

        <!-- Termini odabranog dana -->
        <div v-if="selectedDate" class="bg-white rounded-xl border border-gray-100 p-4">
          <h2 class="text-sm font-medium text-gray-700 mb-3">
            {{ new Date(selectedDate).toLocaleDateString('sr-RS', { weekday: 'long', day: 'numeric', month: 'long' }) }}
          </h2>

          <div v-if="selectedDaySlots.length === 0" class="text-gray-400 text-sm text-center py-4">
            Nema termina
          </div>

          <div v-else class="space-y-1.5">
            <div
              v-for="slot in selectedDaySlots"
              :key="slot.id"
              class="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50"
            >
              <span class="text-sm text-gray-900">
                {{ formatTime(slot.start_time) }} — {{ formatTime(slot.end_time) }}
              </span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400">{{ slot.worker.name }}</span>
                <span
                  :class="slot.is_available ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
                  class="text-[10px] font-medium px-2 py-0.5 rounded-full"
                >
                  {{ slot.is_available ? 'Slobodan' : 'Zauzet' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Generator forme ──────────────────────────────────────── -->
      <div class="lg:w-1/2">
        <div class="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
          <h2 class="text-sm font-semibold text-gray-900">Generisanje termina</h2>

          <!-- Radnik -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Radnik *</label>
            <select
              v-model="form.worker_id"
              class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Odaberi radnika</option>
              <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>

          <!-- Period -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Period *</label>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="form.date_from"
                type="date"
                :min="new Date().toISOString().slice(0, 10)"
                class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                v-model="form.date_to"
                type="date"
                :min="form.date_from"
                class="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <!-- Radni dani -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Radni dani</label>
            <div class="flex gap-1.5 flex-wrap">
              <button
                v-for="d in WEEKDAYS"
                :key="d.value"
                @click="toggleWeekday(d.value)"
                :class="form.weekdays.includes(d.value)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {{ d.label }}
              </button>
            </div>
          </div>

          <!-- Radno vreme -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Radno vreme</label>
            <div class="flex items-center gap-2">
              <input
                v-model="form.work_start"
                type="time"
                class="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span class="text-gray-400 text-sm">do</span>
              <input
                v-model="form.work_end"
                type="time"
                class="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <!-- Trajanje slota -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Trajanje slota</label>
            <div class="flex gap-1.5 flex-wrap">
              <button
                v-for="dur in DURATIONS"
                :key="dur"
                @click="form.slot_duration = dur"
                :class="form.slot_duration === dur
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {{ dur }}min
              </button>
            </div>
          </div>

          <!-- Pauze -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-medium text-gray-600">Pauze</label>
              <button
                @click="addBreak"
                class="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                + Dodaj pauzu
              </button>
            </div>
            <div class="space-y-2">
              <div
                v-for="(br, i) in form.breaks"
                :key="i"
                class="flex items-center gap-2"
              >
                <input
                  v-model="br.start"
                  type="time"
                  class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span class="text-gray-400 text-xs">—</span>
                <input
                  v-model="br.end"
                  type="time"
                  class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  @click="removeBreak(i)"
                  class="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                >
                  ×
                </button>
              </div>
              <p v-if="form.breaks.length === 0" class="text-xs text-gray-400">
                Nema pauza
              </p>
            </div>
          </div>

          <!-- Preview + Generate -->
          <div class="border-t border-gray-100 pt-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Biće generisano:</span>
              <span class="text-sm font-semibold text-indigo-600">{{ preview }} termina</span>
            </div>

            <p v-if="generateError" class="text-red-500 text-xs">{{ generateError }}</p>
            <p v-if="generateSuccess" class="text-green-600 text-xs font-medium">{{ generateSuccess }}</p>

            <button
              @click="handleGenerate"
              :disabled="generating || preview === 0"
              class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {{ generating ? 'Generisanje...' : 'Generisi termine' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    </template>

  </AdminLayout>
</template>
