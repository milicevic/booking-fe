<script setup lang="ts">
import PhoneInput from '@/components/booking/PhoneInput.vue'
import { isValidPhone } from '@/lib/phone'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { slotsApi } from '@/api/slots'
import { bookingApi } from '@/api/booking'
import type { BookableTime, Slot, Service } from '@/api/booking'
import type { CustomerContact } from '@/api/tenant'
import { useTenantStore } from '@/stores/tenant'
import { useToast } from '@/composables/useToast'
import PublicHeader from '@/components/booking/PublicHeader.vue'
import BookingStep from '@/components/booking/BookingStep.vue'
import BookingSummary from '@/components/booking/BookingSummary.vue'
import WorkerAvatar from '@/components/WorkerAvatar.vue'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import { captchaEnabled } from '@/lib/captcha'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
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

// Izgled dugmeta za izbor (usluga, radnik, vreme) iz dizajna
function optionClass(selected: boolean) {
  return [
    'border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40',
    selected ? 'border-primary bg-accent text-foreground' : 'border-gray-200 bg-card text-foreground enabled:hover:border-gray-400',
  ]
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
const contactRule = computed<CustomerContact>(() => tenant.config?.customer_contact ?? 'phone')
const emailRequired = computed(() => contactRule.value === 'both' || contactRule.value === 'email')
const phoneRequired = computed(() => contactRule.value === 'both' || contactRule.value === 'phone')

function contactViolation(email: string, phone: string): string | null {
  const hasEmail = !!email.trim()
  const hasPhone = !!phone.trim()
  if (contactRule.value === 'email_or_phone') return hasEmail || hasPhone ? null : t('booking.emailOrPhone')
  if (emailRequired.value && phoneRequired.value && !(hasEmail && hasPhone)) return t('booking.emailAndPhone')
  if (emailRequired.value && !hasEmail) return t('booking.emailRequired')
  if (phoneRequired.value && !hasPhone) return t('booking.phoneRequired')
  if (hasPhone && !isValidPhone(phone)) return t('booking.phoneInvalid')
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
    <PublicHeader>
      <router-link :to="{ name: 'my-bookings' }" class="text-sm font-medium text-primary hover:underline">{{ t('myBookings.title') }}</router-link>
    </PublicHeader>

    <main class="mx-auto flex max-w-5xl flex-col gap-8 px-4 pt-10 pb-20 sm:px-6">
      <div class="flex flex-col gap-2">
        <h1 class="text-[28px] leading-tight font-semibold sm:text-[32px]">{{ t('booking.title') }}</h1>
        <p class="text-gray-600">{{ t('booking.subtitle') }}</p>
      </div>


      <div v-if="loading" class="py-16 text-center text-muted-foreground">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="error && allSlots.length === 0" class="py-8 text-center text-sm text-destructive">
        {{ error }}
      </div>

      <div v-else-if="allSlots.length === 0" class="py-8 text-center text-sm text-muted-foreground">
        {{ t('booking.noSlots') }}
      </div>

      <div v-else-if="services.length === 0" class="py-8 text-center text-sm text-muted-foreground" data-testid="no-services">
        {{ t('booking.noServices') }}
      </div>

      <div v-else class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="flex min-w-0 flex-col gap-5">

          <!-- 1. Usluga -->
          <BookingStep :title="`1. ${t('booking.priceList')}`">
            <div class="flex flex-col gap-2">
              <button
                v-for="entry in services"
                :key="entry.service.id"
                type="button"
                data-testid="service-option"
                :disabled="!serviceAvailable(entry.service.id)"
                :aria-pressed="selectedService?.id === entry.service.id"
                :class="[optionClass(selectedService?.id === entry.service.id), 'flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left']"
                @click="pickService(entry.service)"
              >
                <span class="flex min-w-0 flex-col">
                  <span class="text-[15px] font-medium">{{ entry.service.name }}</span>
                  <span class="text-[13px] text-gray-600">
                    {{ entry.service.duration_minutes }} min · {{ entry.workers.map((w) => w.name).join(', ') }}
                  </span>
                </span>
                <span v-if="entry.service.price" class="shrink-0 text-sm font-semibold">
                  {{ formatPrice(entry.service.price, locale, tenant.config?.currency) }}
                </span>
              </button>
            </div>
          </BookingStep>

          <!-- 2. Radnik -->
          <BookingStep :title="`2. ${t('booking.workersTitle')}`">
            <div class="flex flex-wrap gap-2" data-testid="worker-list">
              <button
                v-for="w in workers"
                :key="w.id"
                type="button"
                data-testid="worker-option"
                :disabled="!workerAvailable(w)"
                :aria-pressed="selectedWorkerId === w.id"
                :class="[optionClass(selectedWorkerId === w.id), 'flex max-w-full items-center gap-3 rounded-xl py-2.5 pr-4 pl-3 text-left']"
                @click="pickWorker(w.id)"
              >
                <WorkerAvatar :photo-url="w.photo_url" :size="12" />
                <span class="flex min-w-0 flex-col">
                  <span class="text-[15px] font-medium">{{ w.name }}</span>
                  <span v-if="w.bio" class="line-clamp-2 text-[13px] text-gray-600">{{ w.bio }}</span>
                </span>
              </button>
            </div>
          </BookingStep>

          <!-- 3. Datum i vreme -->
          <BookingStep :title="`3. ${t('booking.dateTime')}`">
            <p v-if="!readyForTimes" class="text-sm text-gray-600" data-testid="missing-choice">{{ missingChoice }}</p>

            <div v-else class="flex flex-col gap-6 md:flex-row">
              <!-- Kalendar -->
              <div class="w-full max-w-sm shrink-0 md:w-72">
                <div class="mb-3 flex items-center justify-between">
                  <Button variant="ghost" size="icon-sm" class="text-muted-foreground" :aria-label="t('common.prevMonth')" @click="prevMonth">
                    <ChevronLeftIcon />
                  </Button>
                  <span class="text-sm font-medium capitalize">{{ monthLabel }}</span>
                  <Button variant="ghost" size="icon-sm" class="text-muted-foreground" :aria-label="t('common.nextMonth')" @click="nextMonth">
                    <ChevronRightIcon />
                  </Button>
                </div>
                <div class="mb-1 grid grid-cols-7">
                  <div v-for="d in calDays" :key="d" class="py-1 text-center text-xs text-muted-foreground">{{ d }}</div>
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
                        'h-9 w-full text-xs',
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
              </div>

              <!-- Vremena -->
              <div class="min-w-0 flex-1">
                <p v-if="!selectedDate" class="text-sm text-gray-600">{{ t('booking.selectDate') }}</p>

                <template v-else-if="!selectedTime">
                  <p class="mb-3 text-sm font-medium first-letter:uppercase">{{ formatDate(selectedDate) }}</p>
                  <p v-if="timesForDate.length === 0" class="text-sm text-gray-600">{{ t('booking.noSlotsDay') }}</p>
                  <div v-else class="flex flex-wrap gap-2">
                    <button
                      v-for="choice in timesForDate"
                      :key="choice.start_time"
                      type="button"
                      data-testid="time-option"
                      :class="[optionClass(false), 'flex flex-col items-start rounded-lg px-3.5 py-2 text-sm']"
                      @click="pickTime(choice)"
                    >
                      <span>{{ choice.start_time.slice(0, 5) }} — {{ choice.end_time.slice(0, 5) }}</span>
                      <span v-if="!selectedWorker" class="text-xs text-gray-600">
                        {{ t('booking.freeWorkers', choice.options.length) }}
                      </span>
                    </button>
                  </div>
                </template>

                <!-- Izabrano vreme bez radnika: bira se jedan od radnika slobodnih u to vreme -->
                <div v-else-if="!selectedSlot" data-testid="time-workers">
                  <div class="mb-3 flex items-center gap-2">
                    <Button variant="link" size="xs" class="px-0 text-muted-foreground" @click="resetTime">
                      {{ t('booking.backToTimes') }}
                    </Button>
                    <span class="text-muted-foreground/50">·</span>
                    <p class="text-sm font-medium first-letter:uppercase">
                      {{ formatDate(selectedTime.date) }}, {{ selectedTime.start_time.slice(0, 5) }}
                    </p>
                  </div>
                  <p class="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('booking.pickFreeWorker') }}</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="option in selectedTime.options"
                      :key="option.worker_id"
                      type="button"
                      :class="[optionClass(false), 'flex items-center gap-3 rounded-xl py-2.5 pr-4 pl-3 text-left']"
                      @click="pickTimeWorker(option)"
                    >
                      <WorkerAvatar :photo-url="workerById(option.worker_id)?.photo_url" :size="12" />
                      <span class="text-[15px] font-medium">{{ workerName(option.worker_id) }}</span>
                    </button>
                  </div>
                </div>

                <!-- Termin je izabran -->
                <div v-else class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary bg-accent px-4 py-3 text-accent-foreground">
                  <div>
                    <p class="text-sm font-semibold first-letter:uppercase">{{ formatDate(selectedSlot.date) }}</p>
                    <p class="text-sm">{{ selectedSlot.start_time.slice(0, 5) }} — {{ selectedSlot.end_time.slice(0, 5) }} · {{ workerName(selectedSlot.worker_id) }}</p>
                  </div>
                  <Button variant="link" size="xs" class="px-0" @click="resetTime">{{ t('booking.change') }}</Button>
                </div>
              </div>
            </div>
          </BookingStep>

          <!-- 4. Vaši podaci -->
          <BookingStep v-if="selectedSlot" :title="`4. ${t('booking.yourDetails')}`">
            <form id="booking-form" class="flex flex-col gap-4" @submit.prevent="handleSubmit">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="grid gap-1.5">
                  <Label for="booking-name">
                    {{ t('booking.fullName') }} <span class="text-destructive">*</span>
                  </Label>
                  <Input id="booking-name" v-model="form.customer_name" type="text" autocomplete="name" :placeholder="t('booking.fullNamePlaceholder')" />
                </div>

                <div class="grid gap-1.5">
                  <Label for="booking-phone">
                    {{ t('booking.phone') }}
                    <span v-if="phoneRequired" class="text-destructive">*</span>
                    <span v-else-if="contactRule === 'email_or_phone'" class="font-normal opacity-80">{{ t('booking.orEmail') }}</span>
                    <span v-else class="font-normal opacity-80">({{ t('common.optional') }})</span>
                  </Label>
                  <PhoneInput id="booking-phone" v-model="form.customer_phone" :required="phoneRequired" />
                </div>
              </div>

              <div class="grid gap-1.5">
                <Label for="booking-email">
                  {{ t('booking.email') }}
                  <span v-if="emailRequired" class="text-destructive">*</span>
                  <span v-else-if="contactRule === 'email_or_phone'" class="font-normal opacity-80">{{ t('booking.orPhone') }}</span>
                  <span v-else class="font-normal opacity-80">({{ t('common.optional') }})</span>
                </Label>
                <Input id="booking-email" v-model="form.customer_email" type="email" autocomplete="email" placeholder="vas@email.com" />
                <p class="text-[13px] text-gray-600">{{ t('booking.emailHint') }}</p>
              </div>

              <div class="grid gap-1.5">
                <Label for="booking-note">
                  {{ t('booking.note') }} <span class="font-normal opacity-80">({{ t('common.optional') }})</span>
                </Label>
                <Textarea id="booking-note" v-model="form.note" rows="3" :placeholder="t('booking.notePlaceholder')" class="field-sizing-fixed resize-y" />
              </div>

              <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

              <TurnstileWidget ref="captcha" v-model="captchaToken" />
            </form>
          </BookingStep>

          <p v-else-if="error" class="text-sm text-destructive">{{ error }}</p>
        </div>

        <BookingSummary
          form-id="booking-form"
          :worker="selectedSlot ? workerName(selectedSlot.worker_id) : (selectedWorker?.name ?? '')"
          :service="selectedService?.name ?? ''"
          :duration="selectedService ? `${selectedService.duration_minutes} min` : ''"
          :when="selectedSlot ? `${formatDate(selectedSlot.date)}, ${selectedSlot.start_time.slice(0, 5)}` : ''"
          :can-submit="!!selectedSlot"
          :submitting="submitting"
        />
      </div>
    </main>

    <footer class="px-6 pb-8 text-center text-[13px] text-gray-600">{{ t('booking.poweredBy') }}</footer>
  </div>
</template>
