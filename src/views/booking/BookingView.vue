<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { slotsApi } from '@/api/slots'
import { bookingApi } from '@/api/booking'
import type { BookableTime, Slot, Service } from '@/api/booking'
import { useTenantStore } from '@/stores/tenant'
import { useToast } from '@/composables/useToast'
import TenantLogo from '@/components/TenantLogo.vue'
import MyBookings from '@/components/booking/MyBookings.vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { rememberBooking } from '@/lib/myBookings'
import { apiErrorMessage } from '@/lib/apiError'
import { formatPrice } from '@/lib/price'

const { t, locale } = useI18n()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()

// ─── Data ─────────────────────────────────────────────────────────────────────
const allSlots = ref<Slot[]>([])
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

// ─── Steps: worker → service → date → slot → form ────────────────────────────
const selectedWorkerId = ref<number | null>(null)
const selectedService = ref<Service | null>(null)
const selectedDate = ref<string | null>(null)
const selectedSlot = ref<BookableTime | null>(null)

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
  const map = new Map<number, Service>()
  for (const s of allSlots.value) {
    if (s.worker.id === selectedWorkerId.value) {
      for (const svc of s.worker.services ?? []) {
        if (!map.has(svc.id)) map.set(svc.id, svc)
      }
    }
  }
  return [...map.values()]
})

function pickService(service: Service) {
  selectedService.value = service
  selectedDate.value = null
  selectedSlot.value = null
  error.value = ''
}

// ─── Vremena za izabranog radnika i uslugu ────────────────────────────────────
// Backend računa vremena prema trajanju usluge, uključujući rupe posle kraćih rezervacija
const times = ref<BookableTime[]>([])
const timesLoading = ref(false)
const readyForTimes = computed(() =>
  !!selectedWorkerId.value && (workerServices.value.length === 0 || !!selectedService.value)
)

async function loadTimes() {
  if (!readyForTimes.value || !selectedWorkerId.value) {
    times.value = []
    return
  }
  timesLoading.value = true
  try {
    const { data } = await slotsApi.getTimes({
      worker_id: selectedWorkerId.value,
      ...(selectedService.value ? { service_id: selectedService.value.id } : {}),
    })
    times.value = data
  } catch (e) {
    times.value = []
    error.value = apiErrorMessage(e, t('booking.loadError'))
  } finally {
    timesLoading.value = false
  }
}

watch([selectedWorkerId, selectedService], loadTimes)

// ─── Calendar ─────────────────────────────────────────────────────────────────
const calendarBase = ref(new Date())

const jsLocale = computed(() => locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US')

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
  for (const time of times.value) set.add(time.date.slice(0, 10))
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

const timesForDate = computed(() =>
  selectedDate.value
    ? times.value
        .filter(time => time.date.slice(0, 10) === selectedDate.value)
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

function pickSlot(time: BookableTime) {
  selectedSlot.value = time
  error.value = ''
}

function formatDate(date: string) {
  return new Date(date.slice(0, 10) + 'T00:00:00').toLocaleDateString(jsLocale.value, {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── Load & submit ────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const { data } = await slotsApi.getAvailable()
    allSlots.value = data
  } catch (e) {
    error.value = apiErrorMessage(e, t('booking.loadError'))
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
      slot_id: selectedSlot.value.slot_id,
      start_time: selectedSlot.value.start_time.slice(0, 5),
      ...form.value,
      ...(selectedService.value ? { service_id: selectedService.value.id } : {}),
    })
    rememberBooking(data.token)
    router.push({ name: 'confirmation', query: { token: data.token } })
  } catch (e) {
    if ((e as { response?: { status?: number } }).response?.status === 409) {
      toast.error(t('booking.slotTaken'))
      selectedSlot.value = null
      await loadTimes()
    } else {
      error.value = apiErrorMessage(e, t('booking.submitError'))
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
        <div class="flex items-center gap-3 mb-2">
          <TenantLogo :src="tenant.logoUrl" :size="32" />
          <span class="font-semibold text-lg">{{ tenant.appName }}</span>
        </div>
        <h1 class="text-2xl font-semibold">{{ t('booking.title') }}</h1>
      </div>

      <MyBookings />

      <div v-if="loading" class="text-center py-16 text-muted-foreground">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="error && allSlots.length === 0" class="text-center py-8 text-destructive text-sm">
        {{ error }}
      </div>

      <div v-else-if="allSlots.length === 0" class="text-center py-8 text-muted-foreground text-sm">
        {{ t('booking.noSlots') }}
      </div>

      <div v-else>

        <!-- Step 1: Select worker -->
        <div class="mb-6">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{{ t('booking.selectWorker') }}</p>
          <div class="flex flex-wrap gap-3">
            <Button
              v-for="w in workers"
              :key="w.id"
              variant="outline"
              :aria-pressed="selectedWorkerId === w.id"
              :class="[
                'h-auto gap-2.5 rounded-xl px-4 py-2.5 shadow-none',
                selectedWorkerId === w.id ? 'border-primary bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground' : '',
              ]"
              @click="pickWorker(w.id)"
            >
              <span class="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                {{ w.name.charAt(0).toUpperCase() }}
              </span>
              <span class="text-sm font-medium">{{ w.name }}</span>
            </Button>
          </div>
        </div>

        <!-- Step 2: Select service (if worker has services) -->
        <div v-if="selectedWorkerId && workerServices.length > 0" class="mb-6">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{{ t('booking.selectService') }}</p>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="service in workerServices"
              :key="service.id"
              variant="outline"
              :aria-pressed="selectedService?.id === service.id"
              :class="[
                'h-auto rounded-xl px-4 py-2.5 shadow-none text-left whitespace-normal',
                selectedService?.id === service.id ? 'border-primary bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground' : '',
              ]"
              @click="pickService(service)"
            >
              <span>{{ service.name }}</span>
              <span v-if="service.price" class="ml-0.5 font-normal opacity-70">{{ formatPrice(service.price, locale, tenant.config?.currency) }}</span>
            </Button>
          </div>
        </div>

        <!-- Step 3+: Calendar + slots -->
        <div v-if="readyForTimes" class="flex flex-col lg:flex-row gap-6">

          <!-- Calendar -->
          <div class="lg:w-80 shrink-0">
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
                  <div v-for="d in calDays" :key="d"
                    class="text-center text-xs text-muted-foreground py-1">{{ d }}</div>
                </div>

                <div class="grid grid-cols-7 gap-0.5">
                  <div v-for="(day, i) in calendarDays" :key="i">
                    <div v-if="!day" class="h-9" />
                    <Button
                      v-else
                      :variant="selectedDate === day.date ? 'default' : 'ghost'"
                      size="sm"
                      :disabled="day.past || !day.available"
                      :aria-pressed="selectedDate === day.date"
                      :class="[
                        'w-full h-9 text-xs',
                        day.past || !day.available
                          ? 'text-muted-foreground/40 disabled:opacity-100'
                          : selectedDate !== day.date && 'bg-accent text-accent-foreground hover:bg-primary/15',
                      ]"
                      @click="pickDate(day)"
                    >
                      {{ day.day }}
                    </Button>
                  </div>
                </div>

                <div class="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <span class="w-3 h-3 rounded bg-accent inline-block" /> {{ t('booking.available') }}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Right column -->
          <div class="flex-1">

            <!-- No date selected -->
            <Card v-if="!selectedDate">
              <CardContent class="py-2 text-center text-muted-foreground">
                <p class="text-2xl mb-2">📅</p>
                <p class="text-sm">{{ t('booking.selectDate') }}</p>
              </CardContent>
            </Card>

            <!-- Date selected, pick slot -->
            <div v-else-if="!selectedSlot">
              <div class="flex items-center gap-2 mb-4">
                <Button variant="link" size="xs" class="px-0 text-muted-foreground" @click="selectedDate = null">
                  {{ t('booking.backCalendar') }}
                </Button>
                <span class="text-muted-foreground/50">·</span>
                <p class="text-sm font-medium capitalize">
                  {{ formatDate(selectedDate) }}
                </p>
              </div>

              <Card v-if="timesForDate.length === 0">
                <CardContent class="py-2 text-center text-muted-foreground text-sm">
                  {{ t('booking.noSlotsDay') }}
                </CardContent>
              </Card>

              <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button
                  v-for="slot in timesForDate"
                  :key="`${slot.slot_id}-${slot.start_time}`"
                  variant="outline"
                  class="h-auto justify-start rounded-xl bg-card p-4 shadow-none hover:border-primary/60 hover:bg-card hover:shadow-sm"
                  @click="pickSlot(slot)"
                >
                  {{ slot.start_time.slice(0, 5) }} — {{ slot.end_time.slice(0, 5) }}
                </Button>
              </div>
            </div>

            <!-- Slot selected: form -->
            <div v-else>
              <div class="bg-accent text-accent-foreground rounded-xl p-4 mb-5 flex items-start justify-between">
                <div>
                  <p class="text-sm font-medium">
                    {{ workers.find(w => w.id === selectedWorkerId)?.name }}
                    <span v-if="selectedService" class="font-normal opacity-80"> · {{ selectedService.name }}<template v-if="selectedService.price"> ({{ formatPrice(selectedService.price, locale, tenant.config?.currency) }})</template></span>
                  </p>
                  <p class="text-sm capitalize mt-0.5 opacity-90">
                    {{ formatDate(selectedSlot.date) }}
                  </p>
                  <p class="text-sm opacity-90">
                    {{ selectedSlot.start_time.slice(0, 5) }} — {{ selectedSlot.end_time.slice(0, 5) }}
                  </p>
                </div>
                <Button variant="link" size="xs" class="px-0" @click="selectedSlot = null">
                  {{ t('booking.change') }}
                </Button>
              </div>

              <Card>
                <CardContent>
                  <h2 class="text-sm font-semibold mb-4">{{ t('booking.yourDetails') }}</h2>

                  <form @submit.prevent="handleSubmit" class="space-y-4">
                    <div class="grid gap-1.5">
                      <Label for="booking-name">
                        {{ t('booking.fullName') }} <span class="text-destructive">*</span>
                      </Label>
                      <Input id="booking-name" v-model="form.customer_name" type="text" :placeholder="t('booking.fullNamePlaceholder')" />
                    </div>

                    <div class="grid gap-1.5">
                      <Label for="booking-email">{{ t('booking.email') }}</Label>
                      <Input id="booking-email" v-model="form.customer_email" type="email" placeholder="vas@email.com" />
                    </div>

                    <div class="grid gap-1.5">
                      <Label for="booking-phone">
                        {{ t('booking.phone') }} <span class="font-normal opacity-80">{{ t('booking.orEmail') }}</span>
                      </Label>
                      <Input id="booking-phone" v-model="form.customer_phone" type="tel" placeholder="+381 60 123 4567" />
                    </div>

                    <div class="grid gap-1.5">
                      <Label for="booking-note">
                        {{ t('booking.note') }} <span class="font-normal opacity-80">({{ t('common.optional') }})</span>
                      </Label>
                      <Textarea id="booking-note" v-model="form.note" rows="3" :placeholder="t('booking.notePlaceholder')" class="resize-none field-sizing-fixed" />
                    </div>

                    <p v-if="error" class="text-destructive text-sm">{{ error }}</p>

                    <Button type="submit" size="lg" class="w-full" :disabled="submitting">
                      {{ submitting ? t('booking.confirming') : t('booking.confirm') }}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <!-- Radnik ili usluga još nisu izabrani -->
        <Card v-else>
          <CardContent class="py-2 text-center text-muted-foreground">
            <p class="text-2xl mb-2">{{ selectedWorkerId ? '✂️' : '👤' }}</p>
            <p class="text-sm">{{ selectedWorkerId ? t('booking.servicePlaceholder') : t('booking.workerPlaceholder') }}</p>
          </CardContent>
        </Card>

      </div>
    </div>
  </div>
</template>
