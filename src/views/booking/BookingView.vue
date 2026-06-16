<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { slotsApi } from '@/api/slots'
import { bookingApi } from '@/api/booking'
import type { Slot } from '@/api/booking'

const { t, locale } = useI18n()
const router = useRouter()

// ─── Data ─────────────────────────────────────────────────────────────────────
const allSlots = ref<Slot[]>([])
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

// ─── Steps: worker → service → date → slot → form ────────────────────────────
const selectedWorkerId = ref<number | null>(null)
const selectedService = ref<string | null>(null)
const selectedDate = ref<string | null>(null)
const selectedSlot = ref<Slot | null>(null)

const form = ref({
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  note: '',
})

// ─── Workers derived from slots ───────────────────────────────────────────────
const workers = computed(() => {
  const map = new Map<number, { id: number; name: string }>()
  for (const s of allSlots.value) {
    if (!map.has(s.worker.id)) map.set(s.worker.id, s.worker)
  }
  return [...map.values()]
})

function pickWorker(id: number) {
  selectedWorkerId.value = id
  selectedService.value = null
  selectedDate.value = null
  selectedSlot.value = null
  error.value = ''
}

// ─── Services for selected worker ─────────────────────────────────────────────
const workerServices = computed(() => {
  if (!selectedWorkerId.value) return []
  const set = new Set<string>()
  for (const s of allSlots.value) {
    if (s.worker.id === selectedWorkerId.value && s.service_name) {
      set.add(s.service_name)
    }
  }
  return [...set]
})

function pickService(service: string) {
  selectedService.value = service
  selectedDate.value = null
  selectedSlot.value = null
  error.value = ''
}

// ─── Slots filtered by worker + service ──────────────────────────────────────
const workerSlots = computed(() => {
  if (!selectedWorkerId.value) return []
  return allSlots.value.filter(s => {
    if (s.worker.id !== selectedWorkerId.value) return false
    if (workerServices.value.length > 0 && selectedService.value) {
      return s.service_name === selectedService.value
    }
    return true
  })
})

// ─── Calendar ─────────────────────────────────────────────────────────────────
const calendarBase = ref(new Date())

const jsLocale = computed(() => locale.value === 'sr' ? 'sr-RS' : 'en-US')

const monthLabel = computed(() =>
  calendarBase.value.toLocaleDateString(jsLocale.value, { month: 'long', year: 'numeric' })
)

const calDays = computed(() => [
  t('dashboard.weekdays.1').slice(0, 2),
  t('dashboard.weekdays.2').slice(0, 2),
  t('dashboard.weekdays.3').slice(0, 2),
  t('dashboard.weekdays.4').slice(0, 2),
  t('dashboard.weekdays.5').slice(0, 2),
  t('dashboard.weekdays.6').slice(0, 2),
  t('dashboard.weekdays.7').slice(0, 2),
])

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const availableDates = computed(() => {
  const set = new Set<string>()
  for (const s of workerSlots.value) set.add(s.date.slice(0, 10))
  return set
})

const calendarDays = computed(() => {
  const year = calendarBase.value.getFullYear()
  const month = calendarBase.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startDow = firstDay.getDay()
  if (startDow === 0) startDow = 7

  const days: Array<{ date: string; day: number; available: boolean; past: boolean } | null> = []
  for (let i = 1; i < startDow; i++) days.push(null)

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      date: dateStr,
      day: d,
      available: availableDates.value.has(dateStr),
      past: dateStr < today,
    })
  }
  return days
})

const slotsForDate = computed(() =>
  selectedDate.value
    ? workerSlots.value
        .filter(s => s.date.slice(0, 10) === selectedDate.value)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
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

function pickDate(day: { date: string; available: boolean; past: boolean }) {
  if (day.past || !day.available) return
  selectedDate.value = day.date
  selectedSlot.value = null
  error.value = ''
}

function pickSlot(slot: Slot) {
  selectedSlot.value = slot
  error.value = ''
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString(jsLocale.value, {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── Load & submit ────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const { data } = await slotsApi.getAvailable()
    allSlots.value = data
  } catch {
    error.value = t('booking.loadError')
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  if (!selectedSlot.value) return
  if (!form.value.customer_name) return (error.value = t('booking.nameRequired'))
  if (!form.value.customer_email && !form.value.customer_phone)
    return (error.value = t('booking.emailOrPhone'))

  submitting.value = true
  error.value = ''

  try {
    const { data } = await bookingApi.create({
      slot_id: selectedSlot.value.id,
      ...form.value,
    })
    router.push({ name: 'confirmation', query: { token: data.token } })
  } catch (e: any) {
    if (e.response?.status === 409) {
      error.value = t('booking.slotTaken')
      selectedSlot.value = null
      const { data } = await slotsApi.getAvailable()
      allSlots.value = data
    } else {
      error.value = t('booking.submitError')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 py-8">

      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">{{ t('booking.title') }}</h1>
      </div>

      <div v-if="loading" class="text-center py-16 text-gray-400">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="error && allSlots.length === 0" class="text-center py-8 text-red-500 text-sm">
        {{ error }}
      </div>

      <div v-else-if="allSlots.length === 0" class="text-center py-8 text-gray-400 text-sm">
        {{ t('booking.noSlots') }}
      </div>

      <div v-else>

        <!-- Step 1: Select worker -->
        <div class="mb-6">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{{ t('booking.selectWorker') }}</p>
          <div class="flex flex-wrap gap-3">
            <button
              v-for="w in workers"
              :key="w.id"
              @click="pickWorker(w.id)"
              :class="selectedWorkerId === w.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
              class="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-colors"
            >
              <span class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold flex items-center justify-center shrink-0">
                {{ w.name.charAt(0).toUpperCase() }}
              </span>
              <span class="text-sm font-medium">{{ w.name }}</span>
            </button>
          </div>
        </div>

        <!-- Step 2: Select service (if worker has services) -->
        <div v-if="selectedWorkerId && workerServices.length > 0" class="mb-6">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{{ t('booking.selectService') }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="service in workerServices"
              :key="service"
              @click="pickService(service)"
              :class="selectedService === service
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
              class="px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors"
            >
              {{ service }}
            </button>
          </div>
        </div>

        <!-- Step 3+: Calendar + slots -->
        <div v-if="selectedWorkerId && (workerServices.length === 0 || selectedService)" class="flex flex-col lg:flex-row gap-6">

          <!-- Calendar -->
          <div class="lg:w-80 shrink-0">
            <div class="bg-white rounded-xl border border-gray-100 p-4">
              <div class="flex items-center justify-between mb-4">
                <button @click="prevMonth"
                  class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-lg">
                  ‹
                </button>
                <span class="text-sm font-medium text-gray-900 capitalize">{{ monthLabel }}</span>
                <button @click="nextMonth"
                  class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-lg">
                  ›
                </button>
              </div>

              <div class="grid grid-cols-7 mb-1">
                <div v-for="d in calDays" :key="d"
                  class="text-center text-xs text-gray-400 py-1">{{ d }}</div>
              </div>

              <div class="grid grid-cols-7 gap-0.5">
                <div v-for="(day, i) in calendarDays" :key="i">
                  <div v-if="!day" class="h-9" />
                  <button
                    v-else
                    @click="pickDate(day)"
                    :disabled="day.past || !day.available"
                    :class="[
                      'w-full h-9 rounded-lg text-xs font-medium transition-colors',
                      day.past || !day.available
                        ? 'text-gray-300 cursor-default'
                        : selectedDate === day.date
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
                    ]"
                  >
                    {{ day.day }}
                  </button>
                </div>
              </div>

              <div class="mt-4 flex items-center gap-3 text-xs text-gray-400">
                <span class="flex items-center gap-1">
                  <span class="w-3 h-3 rounded bg-indigo-50 inline-block" /> {{ t('booking.available') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right column -->
          <div class="flex-1">

            <!-- No date selected -->
            <div v-if="!selectedDate"
              class="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
              <p class="text-2xl mb-2">📅</p>
              <p class="text-sm">{{ t('booking.selectDate') }}</p>
            </div>

            <!-- Date selected, pick slot -->
            <div v-else-if="!selectedSlot">
              <div class="flex items-center gap-2 mb-4">
                <button @click="selectedDate = null"
                  class="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  {{ t('booking.backCalendar') }}
                </button>
                <span class="text-gray-300">·</span>
                <p class="text-sm font-medium text-gray-900 capitalize">
                  {{ formatDate(selectedDate) }}
                </p>
              </div>

              <div v-if="slotsForDate.length === 0"
                class="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                {{ t('booking.noSlotsDay') }}
              </div>

              <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  v-for="slot in slotsForDate"
                  :key="slot.id"
                  @click="pickSlot(slot)"
                  class="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-400 hover:shadow-sm transition-all"
                >
                  <p class="font-medium text-gray-900 text-sm">
                    {{ slot.start_time.slice(0, 5) }} — {{ slot.end_time.slice(0, 5) }}
                  </p>
                </button>
              </div>
            </div>

            <!-- Slot selected: form -->
            <div v-else>
              <div class="bg-indigo-50 rounded-xl p-4 mb-5 flex items-start justify-between">
                <div>
                  <p class="text-sm font-medium text-indigo-900">
                    {{ workers.find(w => w.id === selectedWorkerId)?.name }}
                    <span v-if="selectedService" class="font-normal text-indigo-600"> · {{ selectedService }}</span>
                  </p>
                  <p class="text-sm text-indigo-700 capitalize mt-0.5">
                    {{ formatDate(selectedSlot.date) }}
                  </p>
                  <p class="text-indigo-700 text-sm">
                    {{ selectedSlot.start_time.slice(0, 5) }} — {{ selectedSlot.end_time.slice(0, 5) }}
                  </p>
                </div>
                <button @click="selectedSlot = null"
                  class="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
                  {{ t('booking.change') }}
                </button>
              </div>

              <div class="bg-white rounded-xl border border-gray-100 p-5">
                <h2 class="text-sm font-semibold text-gray-900 mb-4">{{ t('booking.yourDetails') }}</h2>

                <form @submit.prevent="handleSubmit" class="space-y-4">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1.5">
                      {{ t('booking.fullName') }} <span class="text-red-400">*</span>
                    </label>
                    <input v-model="form.customer_name" type="text" :placeholder="t('booking.fullNamePlaceholder')"
                      class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1.5">{{ t('booking.email') }}</label>
                    <input v-model="form.customer_email" type="email" placeholder="vas@email.com"
                      class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1.5">
                      {{ t('booking.phone') }} <span class="text-gray-400 font-normal">{{ t('booking.orEmail') }}</span>
                    </label>
                    <input v-model="form.customer_phone" type="tel" placeholder="+381 60 123 4567"
                      class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1.5">
                      {{ t('booking.note') }} <span class="text-gray-400 font-normal">({{ t('common.optional') }})</span>
                    </label>
                    <textarea v-model="form.note" rows="3" :placeholder="t('booking.notePlaceholder')"
                      class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  </div>

                  <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

                  <button type="submit" :disabled="submitting"
                    class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors">
                    {{ submitting ? t('booking.confirming') : t('booking.confirm') }}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <!-- No worker selected -->
        <div v-else class="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
          <p class="text-2xl mb-2">👤</p>
          <p class="text-sm">{{ t('booking.workerPlaceholder') }}</p>
        </div>

      </div>
    </div>
  </div>
</template>
