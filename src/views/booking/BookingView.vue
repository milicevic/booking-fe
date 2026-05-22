<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { slotsApi } from '@/api/slots'
import { bookingApi } from '@/api/booking'
import type { Slot } from '@/api/booking'

const router = useRouter()

const slots = ref<Slot[]>([])
const selectedSlot = ref<Slot | null>(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')

const form = ref({
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  note: '',
})

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await slotsApi.getAvailable()
    slots.value = data
  } catch {
    error.value = 'Greška pri učitavanju termina'
  } finally {
    loading.value = false
  }
})

// Grupiši slotove po datumu
function groupByDate(slots: Slot[]) {
  return slots.reduce((acc, slot) => {
    const date = slot.date
    if (!acc[date]) acc[date] = []
    acc[date].push(slot)
    return acc
  }, {} as Record<string, Slot[]>)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('sr-RS', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

async function handleSubmit() {
  if (!selectedSlot.value) return
  if (!form.value.customer_name) {
    error.value = 'Unesite vaše ime'
    return
  }
  if (!form.value.customer_email && !form.value.customer_phone) {
    error.value = 'Unesite email ili telefon'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const { data } = await bookingApi.create({
      slot_id: selectedSlot.value.id,
      ...form.value,
    })

    router.push({
      name: 'confirmation',
      query: { token: data.token }
    })
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
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-lg mx-auto">

      <div class="mb-8 pt-6">
        <h1 class="text-2xl font-semibold text-gray-900">Rezervišite termin</h1>
        <p class="text-gray-500 text-sm mt-1">Odaberite slobodan termin koji vam odgovara</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12 text-gray-400">
        Učitavanje termina...
      </div>

      <template v-else>
        <!-- Slotovi po datumu -->
        <div v-if="!selectedSlot" class="space-y-6">
          <div
            v-for="(daySlots, date) in groupByDate(slots)"
            :key="date"
          >
            <p class="text-sm font-medium text-gray-500 mb-2 capitalize">
              {{ formatDate(date) }}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="slot in daySlots"
                :key="slot.id"
                @click="selectedSlot = slot"
                class="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-400 hover:shadow-sm transition-all"
              >
                <p class="font-medium text-gray-900 text-sm">
                  {{ slot.start_time.slice(0, 5) }} — {{ slot.end_time.slice(0, 5) }}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">{{ slot.worker.name }}</p>
              </button>
            </div>
          </div>

          <div v-if="slots.length === 0" class="text-center py-12 text-gray-400">
            Nema dostupnih termina
          </div>
        </div>

        <!-- Forma za unos podataka -->
        <div v-else class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">

          <!-- Odabrani termin -->
          <div class="bg-indigo-50 rounded-xl p-4 mb-6">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-sm font-medium text-indigo-900">
                  {{ formatDate(selectedSlot.date) }}
                </p>
                <p class="text-indigo-700 text-sm mt-0.5">
                  {{ selectedSlot.start_time.slice(0, 5) }} — {{ selectedSlot.end_time.slice(0, 5) }}
                </p>
                <p class="text-xs text-indigo-500 mt-0.5">{{ selectedSlot.worker.name }}</p>
              </div>
              <button
                @click="selectedSlot = null"
                class="text-xs text-indigo-500 hover:text-indigo-700"
              >
                Promeni
              </button>
            </div>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Vaše ime <span class="text-red-400">*</span>
              </label>
              <input
                v-model="form.customer_name"
                type="text"
                placeholder="Ime i prezime"
                class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                v-model="form.customer_email"
                type="email"
                placeholder="vas@email.com"
                class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                v-model="form.customer_phone"
                type="tel"
                placeholder="+381 60 123 4567"
                class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Napomena (opciono)
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
      </template>
    </div>
  </div>
</template>
