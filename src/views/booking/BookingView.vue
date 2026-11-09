<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { slotsApi } from '@/api/slots'
import { bookingApi } from '@/api/booking'
import type { BookableTime, Slot, Service } from '@/api/booking'
import type { CustomerContact } from '@/api/tenant'
import { useTenantStore } from '@/stores/tenant'
import { useToast } from '@/composables/useToast'
import TenantLogo from '@/components/TenantLogo.vue'
import MyBookings from '@/components/booking/MyBookings.vue'
import WorkerAvatar from '@/components/WorkerAvatar.vue'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import { captchaEnabled } from '@/lib/captcha'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { rememberBooking } from '@/lib/myBookings'
import { apiErrorMessage } from '@/lib/apiError'
import { formatPrice } from '@/lib/price'
import { availableDates, timeChoicesForDate, type TimeChoice } from '@/lib/bookingTimes'

const { t, locale } = useI18n()
const router = useRouter()
const tenant = useTenantStore()
const toast = useToast()

// ─── Data ─────────────────────────────────────────────────────────────────────
const allSlots = ref<Slot[]>([])
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

// ─── Izbor: usluga i/ili radnik → datum → vreme → forma ──────────────────────
// Cenovnik i radnici su uvek prikazani; kupac bira uslugu, radnika ili oba, a kalendar
// prikazuje slobodne termine prema onome što je izabrano.
const selectedService = ref<Service | null>(null)
const selectedWorkerId = ref<number | null>(null)
const selectedDate = ref<string | null>(null)
// Izabrano vreme (sa radnicima slobodnim u to vreme) i, kad je i radnik poznat, konkretan termin
const selectedTime = ref<TimeChoice | null>(null)
const selectedSlot = ref<BookableTime | null>(null)

const form = ref({
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  note: '',
})

// ─── Radnici i usluge iz slobodnih termina ────────────────────────────────────
type WorkerSummary = { id: number; name: string; photo_url: string | null; bio: string | null; serviceIds: number[] }

const workers = computed(() => {
  const map = new Map<number, WorkerSummary>()
  for (const s of allSlots.value) {
    if (!map.has(s.worker.id)) {
      map.set(s.worker.id, {
        id: s.worker.id,
        name: s.worker.name,
        photo_url: s.worker.photo_url ?? null,
        bio: s.worker.bio ?? null,
        serviceIds: (s.worker.services ?? []).map((svc) => svc.id),
      })
    }
  }
  // Zakazuje se uvek usluga kod radnika, pa se nude samo radnici koji rade bar jednu uslugu
  return [...map.values()].filter((w) => w.serviceIds.length > 0)
})

// Cenovnik: usluge koje radi bar jedan radnik sa slobodnim terminima
const services = computed(() => {
  const map = new Map<number, { service: Service; workers: WorkerSummary[] }>()
  for (const s of allSlots.value) {
    for (const svc of s.worker.services ?? []) {
      const entry = map.get(svc.id) ?? { service: svc, workers: [] }
      if (!entry.workers.some((w) => w.id === s.worker.id)) {
        const worker = workers.value.find((w) => w.id === s.worker.id)
        if (worker) entry.workers.push(worker)
      }
      map.set(svc.id, entry)
    }
  }
  return [...map.values()]
})

const selectedWorker = computed(() => workers.value.find((w) => w.id === selectedWorkerId.value) ?? null)

function workerById(id: number | null | undefined) {
  return workers.value.find((w) => w.id === id)
}

function workerName(id: number | null | undefined) {
  return workerById(id)?.name ?? ''
}

// Usluga i radnik moraju da se slažu: usluge koje izabrani radnik ne radi (i obrnuto) nisu dostupne
function serviceAvailable(serviceId: number) {
  return !selectedWorker.value || selectedWorker.value.serviceIds.includes(serviceId)
}

function workerAvailable(worker: WorkerSummary) {
  return !selectedService.value || worker.serviceIds.includes(selectedService.value.id)
}

// Ponovni klik na izabranu uslugu ili radnika poništava izbor, osim kad je to jedina opcija
// (tada je izabrana automatski i ostaje izabrana)
function pickService(service: Service) {
  const deselect = selectedService.value?.id === service.id
  if (deselect && services.value.length === 1) return
  selectedService.value = deselect ? null : service
  selectedTime.value = null
  selectedSlot.value = null
  error.value = ''
}

function pickWorker(id: number) {
  const deselect = selectedWorkerId.value === id
  if (deselect && workers.value.length === 1) return
  selectedWorkerId.value = deselect ? null : id
  selectedTime.value = null
  selectedSlot.value = null
  error.value = ''
}

// ─── Vremena prema izboru ─────────────────────────────────────────────────────
// Kupac mora da izabere radnika i uslugu koju on radi; tek tada se nude termini iz kalendara
// tog radnika. Izuzetak je radnik bez usluga, kod koga se bira ceo termin.
// Backend računa vremena prema trajanju usluge, uključujući rupe posle kraćih rezervacija.
const times = ref<BookableTime[]>([])
const timesLoading = ref(false)
// Termini se prikazuju čim je izabrana usluga: kod izabranog radnika, ili kod svih radnika koji
// je rade. Radnik se tada bira posle vremena, među onima koji su u to vreme slobodni.
const readyForTimes = computed(() => !!selectedService.value)

// Šta kupac još treba da izabere, dok kalendar nije spreman
const missingChoice = computed(() =>
  selectedWorker.value ? t('booking.pickServiceForWorker') : t('booking.pickServiceFirst')
)

async function loadTimes() {
  const workerId = selectedWorkerId.value
  const serviceId = selectedService.value?.id
  if (!serviceId) {
    times.value = []
    selectedDate.value = null
    return
  }
  timesLoading.value = true
  try {
    const { data } = await slotsApi.getTimes({ service_id: serviceId, ...(workerId ? { worker_id: workerId } : {}) })
    times.value = data
    // Izabrani dan ostaje samo ako i dalje ima slobodnih vremena (npr. posle promene radnika)
    if (selectedDate.value && !data.some((time) => time.date.slice(0, 10) === selectedDate.value)) {
      selectedDate.value = null
    }
  } catch (e) {
    times.value = []
    error.value = apiErrorMessage(e, t('booking.loadError'))
  } finally {
    timesLoading.value = false
  }
}

watch([selectedService, selectedWorkerId], loadTimes)

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

const freeDates = computed(() => availableDates(times.value))

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
      available: freeDates.value.has(dateStr),
      past: dateStr < today,
    })
  }
  return days
})

const timesForDate = computed(() => (selectedDate.value ? timeChoicesForDate(times.value, selectedDate.value) : []))

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
  selectedTime.value = null
  selectedSlot.value = null
  error.value = ''
}

// Kad je u izabrano vreme slobodan samo jedan radnik (ili je radnik već izabran), termin je odmah poznat;
// inače kupac bira jednog od slobodnih radnika
function pickTime(choice: TimeChoice) {
  selectedTime.value = choice
  selectedSlot.value = choice.options.length === 1 ? choice.options[0]! : null
  error.value = ''
}

function pickTimeWorker(option: BookableTime) {
  selectedSlot.value = option
  error.value = ''
}

function resetTime() {
  selectedTime.value = null
  selectedSlot.value = null
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
    // Kad postoji samo jedna usluga ili samo jedan radnik, kupac nema šta da bira
    if (services.value.length === 1) selectedService.value = services.value[0]!.service
    if (workers.value.length === 1) selectedWorkerId.value = workers.value[0]!.id
  } catch (e) {
    error.value = apiErrorMessage(e, t('booking.loadError'))
  } finally {
    loading.value = false
  }
})

// ─── Kontakt kupca ────────────────────────────────────────────────────────────
// Pravilo bira vlasnik firme (Pregled u adminu); backend proverava isto pri rezervaciji
const contactRule = computed<CustomerContact>(() => tenant.config?.customer_contact ?? 'email_or_phone')
const emailRequired = computed(() => contactRule.value === 'both' || contactRule.value === 'email')
const phoneRequired = computed(() => contactRule.value === 'both' || contactRule.value === 'phone')

function contactViolation(email: string, phone: string): string | null {
  const hasEmail = !!email.trim()
  const hasPhone = !!phone.trim()
  if (contactRule.value === 'email_or_phone') return hasEmail || hasPhone ? null : t('booking.emailOrPhone')
  if (emailRequired.value && phoneRequired.value && !(hasEmail && hasPhone)) return t('booking.emailAndPhone')
  if (emailRequired.value && !hasEmail) return t('booking.emailRequired')
  if (phoneRequired.value && !hasPhone) return t('booking.phoneRequired')
  return null
}

// Zaštita od botova (prazno dok captcha nije uključena)
const captchaToken = ref<string | null>(null)
const captcha = ref<InstanceType<typeof TurnstileWidget> | null>(null)

async function handleSubmit() {
  if (!selectedSlot.value || !selectedService.value) return
  if (!form.value.customer_name) return (error.value = t('booking.nameRequired'))
  const contactError = contactViolation(form.value.customer_email, form.value.customer_phone)
  if (contactError) return (error.value = contactError)
  if (captchaEnabled() && !captchaToken.value) return (error.value = t('booking.captchaRequired'))

  submitting.value = true
  error.value = ''

  try {
    const { data } = await bookingApi.create({
      slot_id: selectedSlot.value.slot_id,
      start_time: selectedSlot.value.start_time.slice(0, 5),
      ...form.value,
      service_id: selectedService.value.id,
      ...(captchaToken.value ? { captcha_token: captchaToken.value } : {}),
    })
    rememberBooking(data.token)
    router.push({ name: 'confirmation', query: { token: data.token } })
  } catch (e) {
    if ((e as { response?: { status?: number } }).response?.status === 409) {
      toast.error(t('booking.slotTaken'))
      resetTime()
      await loadTimes()
    } else {
      error.value = apiErrorMessage(e, t('booking.submitError'))
    }
    // Captcha token važi za jedan zahtev
    captcha.value?.reset()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 py-8">

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

      <div v-else-if="services.length === 0" class="text-center py-8 text-muted-foreground text-sm" data-testid="no-services">
        {{ t('booking.noServices') }}
      </div>

      <div v-else>

        <div class="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">

          <!-- Cenovnik i radnici; izbor jednog ili oba određuje termine na kalendaru -->
          <aside class="space-y-6">
            <div v-if="services.length > 0">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{{ t('booking.priceList') }}</p>
              <div class="space-y-2">
                <Button
                  v-for="entry in services"
                  :key="entry.service.id"
                  variant="outline"
                  data-testid="service-option"
                  :disabled="!serviceAvailable(entry.service.id)"
                  :aria-pressed="selectedService?.id === entry.service.id"
                  :class="[
                    'h-auto w-full flex-col items-stretch gap-1 rounded-xl px-4 py-3 text-left whitespace-normal shadow-none disabled:opacity-40',
                    selectedService?.id === entry.service.id ? 'border-primary bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground' : 'bg-card',
                  ]"
                  @click="pickService(entry.service)"
                >
                  <span class="flex items-baseline justify-between gap-3">
                    <span class="text-sm font-medium">{{ entry.service.name }}</span>
                    <span v-if="entry.service.price" class="text-sm font-semibold shrink-0">
                      {{ formatPrice(entry.service.price, locale, tenant.config?.currency) }}
                    </span>
                  </span>
                  <span class="text-xs font-normal opacity-70">
                    {{ entry.service.duration_minutes }} min · {{ entry.workers.map((w) => w.name).join(', ') }}
                  </span>
                </Button>
              </div>
            </div>

            <div>
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{{ t('booking.workersTitle') }}</p>
              <div class="space-y-2" data-testid="worker-list">
                <Button
                  v-for="w in workers"
                  :key="w.id"
                  variant="outline"
                  data-testid="worker-option"
                  :disabled="!workerAvailable(w)"
                  :aria-pressed="selectedWorkerId === w.id"
                  :class="[
                    'h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-left whitespace-normal shadow-none disabled:opacity-40',
                    selectedWorkerId === w.id ? 'border-primary bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground' : 'bg-card',
                  ]"
                  @click="pickWorker(w.id)"
                >
                  <WorkerAvatar :photo-url="w.photo_url" :size="12" />
                  <span class="flex min-w-0 flex-col items-start">
                    <span class="text-sm font-medium">{{ w.name }}</span>
                    <span v-if="w.bio" class="text-xs font-normal opacity-70 line-clamp-2">{{ w.bio }}</span>
                  </span>
                </Button>
              </div>
            </div>
          </aside>

          <section class="min-w-0">
            <!-- Radnik i usluga još nisu oba izabrani -->
            <Card v-if="!readyForTimes" data-testid="missing-choice">
              <CardContent class="py-2 text-center text-muted-foreground">
                <p class="text-2xl mb-2">✂️</p>
                <p class="text-sm">{{ missingChoice }}</p>
              </CardContent>
            </Card>

            <template v-else>
              <div class="flex flex-col xl:flex-row gap-6">
                <!-- Calendar -->
                <div class="w-full max-w-sm xl:w-80 shrink-0">
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

                  <!-- Izabran dan: bira se vreme -->
                  <div v-else-if="!selectedTime">
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
                        v-for="choice in timesForDate"
                        :key="choice.start_time"
                        variant="outline"
                        data-testid="time-option"
                        class="h-auto flex-col items-start gap-0.5 rounded-xl bg-card p-4 shadow-none hover:border-primary/60 hover:bg-card hover:shadow-sm"
                        @click="pickTime(choice)"
                      >
                        <span>{{ choice.start_time.slice(0, 5) }} — {{ choice.end_time.slice(0, 5) }}</span>
                        <span v-if="!selectedWorker" class="text-xs font-normal text-muted-foreground">
                          {{ t('booking.freeWorkers', choice.options.length) }}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <!-- Izabrano vreme bez radnika: bira se jedan od radnika slobodnih u to vreme -->
                  <div v-else-if="!selectedSlot" data-testid="time-workers">
                    <div class="flex items-center gap-2 mb-4">
                      <Button variant="link" size="xs" class="px-0 text-muted-foreground" @click="resetTime">
                        {{ t('booking.backToTimes') }}
                      </Button>
                      <span class="text-muted-foreground/50">·</span>
                      <p class="text-sm font-medium capitalize">
                        {{ formatDate(selectedTime.date) }}, {{ selectedTime.start_time.slice(0, 5) }}
                      </p>
                    </div>
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{{ t('booking.pickFreeWorker') }}</p>
                    <div class="grid gap-2 sm:grid-cols-2">
                      <Button
                        v-for="option in selectedTime.options"
                        :key="option.worker_id"
                        variant="outline"
                        class="h-auto justify-start gap-3 rounded-xl bg-card px-3 py-2.5 text-left whitespace-normal shadow-none hover:border-primary/60 hover:bg-card"
                        @click="pickTimeWorker(option)"
                      >
                        <WorkerAvatar :photo-url="workerById(option.worker_id)?.photo_url" :size="12" />
                        <span class="flex min-w-0 flex-col items-start">
                          <span class="text-sm font-medium">{{ workerName(option.worker_id) }}</span>
                          <span v-if="workerById(option.worker_id)?.bio" class="text-xs font-normal opacity-70 line-clamp-2">
                            {{ workerById(option.worker_id)?.bio }}
                          </span>
                        </span>
                      </Button>
                    </div>
                  </div>

                  <!-- Slot selected: form -->
                  <div v-else>
                    <div class="bg-accent text-accent-foreground rounded-xl p-4 mb-5 flex items-start justify-between">
                      <div>
                        <p class="text-sm font-medium">
                          {{ workerName(selectedSlot.worker_id) }}
                          <span v-if="selectedService" class="font-normal opacity-80"> · {{ selectedService.name }}<template v-if="selectedService.price"> ({{ formatPrice(selectedService.price, locale, tenant.config?.currency) }})</template></span>
                        </p>
                        <p class="text-sm capitalize mt-0.5 opacity-90">
                          {{ formatDate(selectedSlot.date) }}
                        </p>
                        <p class="text-sm opacity-90">
                          {{ selectedSlot.start_time.slice(0, 5) }} — {{ selectedSlot.end_time.slice(0, 5) }}
                        </p>
                      </div>
                      <Button variant="link" size="xs" class="px-0" @click="resetTime">
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
                            <Label for="booking-email">
                              {{ t('booking.email') }}
                              <span v-if="emailRequired" class="text-destructive">*</span>
                              <span v-else-if="contactRule === 'email_or_phone'" class="font-normal opacity-80">{{ t('booking.orPhone') }}</span>
                              <span v-else class="font-normal opacity-80">({{ t('common.optional') }})</span>
                            </Label>
                            <Input id="booking-email" v-model="form.customer_email" type="email" placeholder="vas@email.com" />
                          </div>

                          <div class="grid gap-1.5">
                            <Label for="booking-phone">
                              {{ t('booking.phone') }}
                              <span v-if="phoneRequired" class="text-destructive">*</span>
                              <span v-else-if="contactRule === 'email_or_phone'" class="font-normal opacity-80">{{ t('booking.orEmail') }}</span>
                              <span v-else class="font-normal opacity-80">({{ t('common.optional') }})</span>
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

                          <TurnstileWidget ref="captcha" v-model="captchaToken" />

                          <Button type="submit" size="lg" class="w-full" :disabled="submitting">
                            {{ submitting ? t('booking.confirming') : t('booking.confirm') }}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </template>
          </section>
        </div>

      </div>
    </div>
  </div>
</template>
