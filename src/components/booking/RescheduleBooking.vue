<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { bookingApi } from '@/api/booking'
import { slotsApi } from '@/api/slots'
import type { Booking, BookableTime } from '@/api/booking'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/apiError'
import { availableDates, timeChoicesForDate } from '@/lib/bookingTimes'

/**
 * Kupac sam bira novo vreme za istu uslugu kod istog radnika (samo ponuđena vremena, kao pri zakazivanju).
 * Van režima „auto“ rezervacija posle pomeranja ponovo čeka potvrdu salona.
 */
const props = defineProps<{ booking: Booking }>()
const emit = defineEmits<{ done: [booking: Booking]; cancel: [] }>()

const { t, locale } = useI18n()

const times = ref<BookableTime[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const selectedDate = ref<string | null>(null)
const selected = ref<BookableTime | null>(null)

const jsLocale = computed(() => (locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US'))
const dates = computed(() => [...availableDates(times.value)].sort().slice(0, 21))
const choices = computed(() => (selectedDate.value ? timeChoicesForDate(times.value, selectedDate.value) : []))

function dayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(jsLocale.value, { weekday: 'short', day: 'numeric', month: 'numeric' })
}

onMounted(async () => {
  try {
    const serviceId = props.booking.service?.id
    if (!serviceId) return
    const { data } = await slotsApi.getTimes({ service_id: serviceId, worker_id: props.booking.slot.worker_id })
    times.value = data
    selectedDate.value = dates.value[0] ?? null
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    loading.value = false
  }
})

function pickDate(date: string) {
  selectedDate.value = date
  selected.value = null
}

async function submit() {
  if (!selected.value) return
  saving.value = true
  error.value = ''
  try {
    const { data } = await bookingApi.reschedule(props.booking.token, {
      slot_id: selected.value.slot_id,
      start_time: selected.value.start_time.slice(0, 5),
    })
    emit('done', data)
  } catch (e) {
    error.value = apiErrorMessage(e, t('manage.reschedule.error'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-card p-6 shadow-xs" :aria-label="t('manage.reschedule.title')">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold">{{ t('manage.reschedule.title') }}</h2>
      <p class="text-sm text-gray-600">{{ t('manage.reschedule.hint') }}</p>
    </div>

    <p v-if="loading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>
    <p v-else-if="dates.length === 0 && !error" class="text-sm text-gray-600">{{ t('manage.reschedule.noTimes') }}</p>

    <template v-else-if="dates.length > 0">
      <div class="flex flex-wrap gap-2" role="group" :aria-label="t('manage.date')">
        <Button
          v-for="date in dates"
          :key="date"
          size="sm"
          :variant="selectedDate === date ? 'default' : 'outline'"
          :aria-pressed="selectedDate === date"
          class="capitalize"
          @click="pickDate(date)"
        >
          {{ dayLabel(date) }}
        </Button>
      </div>

      <div v-if="choices.length > 0" class="flex flex-wrap gap-2" role="group" :aria-label="t('manage.time')">
        <Button
          v-for="choice in choices"
          :key="choice.start_time"
          size="sm"
          :variant="selected?.start_time === choice.start_time && selected?.date.slice(0, 10) === choice.date ? 'default' : 'outline'"
          :aria-pressed="selected?.start_time === choice.start_time && selected?.date.slice(0, 10) === choice.date"
          @click="selected = choice.options[0] ?? null"
        >
          {{ choice.start_time.slice(0, 5) }}
        </Button>
      </div>
    </template>

    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

    <div class="flex flex-wrap justify-end gap-2">
      <Button variant="outline" :disabled="saving" @click="emit('cancel')">{{ t('manage.reschedule.back') }}</Button>
      <Button :disabled="!selected || saving" @click="submit">
        {{ saving ? t('manage.reschedule.saving') : t('manage.reschedule.confirm') }}
      </Button>
    </div>
  </section>
</template>
