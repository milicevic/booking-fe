<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { slotsApi } from '@/api/slots'
import { bookingApi } from '@/api/booking'
import type { Slot } from '@/api/booking'

const router = useRouter()

// ─── Data ────────────────────────────────────────────────────────────────────
const slots = ref<Slot[]>([])
const selectedDate = ref<string | null>(null)
const selectedSlot = ref<Slot | null>(null)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

const form = ref({
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  note: '',
})

// ─── Calendar ────────────────────────────────────────────────────────────────
const calendarBase = ref(new Date())

const monthLabel = computed(() =>
  calendarBase.value.toLocaleDateString('sr-RS', { month: 'long', year: 'numeric' })
)

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const availableDates = computed(() => {
  const set = new Set<string>()
  for (const s of slots.value) set.add(s.date.slice(0, 10))
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
    ? slots.value
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
  return new Date(date + 'T00:00:00').toLocaleDateString('sr-RS', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// ─── Booking ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const { data } = await slotsApi.getAvailable()
    slots.value = data
  } catch {
    error.value = 'Greška pri učitavanju termina'
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  if (!selectedSlot.value) return
  if (!form.value.customer_name) return (error.value = 'Unesite vaše ime')
  if (!form.value.customer_email && !form.value.customer_phone)
    return (error.value = 'Unesite email ili telefon')

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
      error.value = 'Termin je upravo zauzet, odaberite drugi'
      selectedSlot.value = null
      const { data } = await slotsApi.getAvailable()
      slots.value = data
    } else {
      error.value = 'Greška pri rezervaciji'
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
        <h1 class="text-2xl font-semibold text-gray-900">Rezervišite termin</h1>
        <p class="text-gray-500 text-sm mt-1">Odaberite datum, zatim slobodan termin</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-16 text-gray-400">
        Učitavanje termina...
      </div>

      <!-- API greška -->
      <div v-else-if="error && slots.length === 0" class="text-center py-8 text-red-500 text-sm">
        {{ error }}
      </div>

      <div v-else-if="slots.length === 0" class="text-center py-8 text-gray-400 text-sm">
        Trenutno nema dostupnih termina
      </div>

      <div v-else class="flex flex-col lg:flex-row gap-6">

        <!-- ── Leva kolona: kalendar ──────────────────────────────── -->
        <div class="lg:w-80 shrink-0">
          <div class="bg-white rounded-xl border border-gray-100 p-4">

            <!-- Navigacija -->
            <div class="flex items-center justify-between mb-4">
              <button
                @click="prevMonth"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-lg"
              >
                ‹
              </button>
              <span class="text-sm font-medium text-gray-900 capitalize">{{ monthLabel }}</span>
              <button
                @click="nextMonth"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-lg"
              >
                ›
              </button>
            </div>

            <!-- Zaglavlje -->
            <div class="grid grid-cols-7 mb-1">
              <div
                v-for="d in ['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne']"
                :key="d"
                class="text-center text-xs text-gray-400 py-1"
              >
                {{ d }}
              </div>
            </div>

            <!-- Dani -->
            <div class="grid grid-cols-7 gap-0.5">
              <div v-for="(day, i) in calendarDays" :key="i">
                <div v-if="!day" class="h-9" />
                <button
                  v-else
                  @click="pickDate(day)"
                  :disabled="day.past || !day.available"
                  :class="[
                    'w-full h-9 rounded-lg text-xs font-medium transition-colors flex flex-col items-center justify-center',
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

            <!-- Legenda -->
            <div class="mt-4 flex items-center gap-3 text-xs text-gray-400">
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-indigo-50 inline-block" /> Slobodni
              </span>
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-gray-100 inline-block" /> Nema termina
              </span>
            </div>
          </div>
        </div>

        <!-- ── Desna kolona: termini ili forma ───────────────────── -->
        <div class="flex-1">

          <!-- Nije odabran datum -->
          <div
            v-if="!selectedDate"
            class="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400"
          >
            <p class="text-2xl mb-2">📅</p>
            <p class="text-sm">Odaberite datum na kalendaru</p>
          </div>

          <!-- Odabran datum, bira termin -->
          <div v-else-if="!selectedSlot">
            <div class="flex items-center gap-2 mb-4">
              <button
                @click="selectedDate = null"
                class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Kalendar
              </button>
              <span class="text-gray-300">·</span>
              <p class="text-sm font-medium text-gray-900 capitalize">
                {{ formatDate(selectedDate) }}
              </p>
            </div>

            <div v-if="slotsForDate.length === 0" class="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              Nema slobodnih termina za ovaj dan
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
                <p class="text-xs text-gray-400 mt-0.5">{{ slot.worker.name }}</p>
              </button>
            </div>
          </div>

          <!-- Odabran termin: forma -->
          <div v-else>
            <!-- Odabrani termin -->
            <div class="bg-indigo-50 rounded-xl p-4 mb-5 flex items-start justify-between">
              <div>
                <p class="text-sm font-medium text-indigo-900 capitalize">
                  {{ formatDate(selectedSlot.date) }}
                </p>
                <p class="text-indigo-700 text-sm mt-0.5">
                  {{ selectedSlot.start_time.slice(0, 5) }} — {{ selectedSlot.end_time.slice(0, 5) }}
                </p>
                <p class="text-xs text-indigo-400 mt-0.5">{{ selectedSlot.worker.name }}</p>
              </div>
              <button
                @click="selectedSlot = null"
                class="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                Promeni
              </button>
            </div>

            <!-- Forma -->
            <div class="bg-white rounded-xl border border-gray-100 p-5">
              <h2 class="text-sm font-semibold text-gray-900 mb-4">Vaši podaci</h2>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1.5">
                    Ime i prezime <span class="text-red-400">*</span>
                  </label>
                  <input
                    v-model="form.customer_name"
                    type="text"
                    placeholder="Petar Petrović"
                    class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input
                    v-model="form.customer_email"
                    type="email"
                    placeholder="vas@email.com"
                    class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1.5">
                    Telefon <span class="text-gray-400 font-normal">(ili email)</span>
                  </label>
                  <input
                    v-model="form.customer_phone"
                    type="tel"
                    placeholder="+381 60 123 4567"
                    class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1.5">
                    Napomena <span class="text-gray-400 font-normal">(opciono)</span>
                  </label>
                  <textarea
                    v-model="form.note"
                    rows="3"
                    placeholder="Dodatne informacije..."
                    class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

                <button
                  type="submit"
                  :disabled="submitting"
                  class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition-colors"
                >
                  {{ submitting ? 'Rezervacija...' : 'Potvrdi rezervaciju' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
