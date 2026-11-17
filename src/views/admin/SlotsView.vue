<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { adminApi } from '@/api/admin'
import type { Worker } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { useAdminContextStore } from '@/stores/adminContext'
import { apiErrorMessage } from '@/lib/apiError'
import { useWorkerSchedule } from '@/composables/useWorkerSchedule'
import { useConfirm } from '@/composables/useConfirm'
import type { WorkerSchedule } from '@/api/admin'
import { buildSlotCandidates } from '@/lib/slotGenerator'
import { addDays, fromMinutes, toISODate } from '@/lib/weekCalendar'

const { t } = useI18n()
const { confirm } = useConfirm()
const auth = useAuthStore()
const adminContext = useAdminContextStore()

const isOwner = computed(() => auth.client?.role !== 'worker')
const canEdit = computed(() => isOwner.value || !!auth.client?.can_edit_slots)

const workers = ref<Worker[]>([])
const loading = ref(true)
const generating = ref(false)
const error = ref('')
const success = ref('')

// Vremena na pola sata za izbor početka, kraja i pauza
const TIMES = Array.from({ length: 33 }, (_, i) => fromMinutes(6 * 60 + i * 30))
const STEPS = [15, 20, 30, 45, 60, 90]
const WEEKS = [1, 2, 4, 8]

// 'once': termini za izabrani period (POST /slots/bulk); 'repeat': stalni raspored koji backend sam dopunjuje
const mode = ref<'once' | 'repeat'>('repeat')
const { schedule, saving: savingSchedule, load: loadSchedule, save: saveSchedule, remove: removeSchedule } = useWorkerSchedule()

const form = ref({
  workerId: 0,
  step: 30,
  days: [1, 2, 3, 4, 5, 6] as number[],
  from: '09:00',
  to: '17:00',
  weeks: 4,
  breaks: [{ start: '12:00', end: '12:30' }] as { start: string; end: string }[],
})

const weekdays = computed(() => [1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: t(`dashboard.weekdays.${n}`).slice(0, 3) })))
const workerName = computed(() =>
  isOwner.value ? workers.value.find((w) => w.id === form.value.workerId)?.name ?? '' : auth.client?.name ?? '',
)

const period = computed(() => {
  const start = new Date()
  return { from: toISODate(start), to: toISODate(addDays(start, form.value.weeks * 7 - 1)) }
})

const valid = computed(() => form.value.days.length > 0 && form.value.to > form.value.from && !!form.value.workerId)
const count = computed(() =>
  valid.value
    ? buildSlotCandidates({
        dateFrom: period.value.from,
        dateTo: period.value.to,
        weekdays: form.value.days,
        workStart: form.value.from,
        workEnd: form.value.to,
        slotDuration: form.value.step,
        breaks: form.value.breaks,
      }).length
    : 0,
)

onMounted(async () => {
  try {
    if (isOwner.value) {
      workers.value = (await adminApi.getWorkers(adminContext.selectedClient?.id)).data
      form.value.workerId = workers.value[0]?.id ?? 0
    } else {
      form.value.workerId = auth.client?.id ?? 0
    }
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    loading.value = false
  }
})

// Sačuvan raspored radnika popunjava formu i uključuje režim „svake nedelje“
watch(
  () => form.value.workerId,
  async (workerId) => {
    if (!workerId || !canEdit.value) return
    try {
      await loadSchedule(workerId)
    } catch (e) {
      error.value = apiErrorMessage(e, t('common.error'))
    }
  },
)
watch(schedule, (saved) => {
  if (saved) fillFromSchedule(saved)
})

function fillFromSchedule(saved: WorkerSchedule) {
  mode.value = 'repeat'
  form.value.days = [...saved.weekdays]
  form.value.from = saved.start
  form.value.to = saved.end
  form.value.step = saved.slot_duration
  form.value.breaks = saved.breaks.map((b) => ({ ...b }))
}

function workingHours() {
  return {
    weekdays: form.value.days,
    start: form.value.from,
    end: form.value.to,
    slot_duration: form.value.step,
    breaks: form.value.breaks.filter((b) => b.start && b.end && b.end > b.start),
  }
}

async function saveRepeating() {
  if (!valid.value) return
  error.value = ''
  success.value = ''
  try {
    const { generated, weeks_ahead } = await saveSchedule(form.value.workerId, workingHours())
    success.value = t('schedule.repeatSaved', { n: generated.created, removed: generated.removed, weeks: weeks_ahead, name: workerName.value })
  } catch (e) {
    error.value = apiErrorMessage(e, t('dashboard.generate.errorGenerate'))
  }
}

async function stopRepeating() {
  if (!(await confirm(t('schedule.repeatRemoveConfirm', { name: workerName.value })))) return
  error.value = ''
  success.value = ''
  try {
    await removeSchedule(form.value.workerId)
    success.value = t('schedule.repeatRemoved', { name: workerName.value })
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  }
}

function toggleDay(day: number) {
  const days = form.value.days
  form.value.days = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort()
}

async function generate() {
  if (!valid.value) return
  generating.value = true
  error.value = ''
  success.value = ''
  try {
    const { data } = await adminApi.bulkCreateSlots({
      worker_id: form.value.workerId,
      date_from: period.value.from,
      date_to: period.value.to,
      ...workingHours(),
    })
    success.value = data.skipped
      ? t('schedule.doneSkipped', { n: data.created, skipped: data.skipped, name: workerName.value })
      : t('schedule.done', { n: data.created, name: workerName.value })
  } catch (e) {
    error.value = apiErrorMessage(e, t('dashboard.generate.errorGenerate'))
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <AdminLayout :title="t('schedule.title')">
    <div class="flex max-w-3xl flex-col gap-5">
      <div v-if="success" role="status" class="rounded-xl border border-green-200 bg-green-50 px-4 py-3.5 text-sm font-medium text-green-800">
        {{ success }}
      </div>

      <p v-if="!loading && !canEdit" class="text-sm text-gray-600">{{ t('schedule.noAccess') }}</p>

      <section v-else class="flex flex-col gap-5 rounded-xl border border-gray-100 bg-card p-6">
        <div class="flex flex-col gap-1">
          <h2 class="text-lg font-semibold">{{ t('schedule.cardTitle') }}</h2>
          <p class="text-sm text-gray-600">{{ t('schedule.cardText') }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div v-if="isOwner" class="grid gap-1.5">
            <Label for="sch-worker">{{ t('bookingsView.filterWorker') }}</Label>
            <NativeSelect id="sch-worker" v-model="form.workerId">
              <NativeSelectOption v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="grid gap-1.5">
            <Label for="sch-step">{{ t('schedule.step') }}</Label>
            <NativeSelect id="sch-step" v-model="form.step">
              <NativeSelectOption v-for="n in STEPS" :key="n" :value="n">{{ n }} min</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-gray-700">{{ t('schedule.mode') }}</span>
          <div class="flex flex-wrap gap-2" role="group" :aria-label="t('schedule.mode')">
            <button
              v-for="option in (['repeat', 'once'] as const)"
              :key="option"
              type="button"
              :aria-pressed="mode === option"
              class="min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              :class="mode === option ? 'border-primary bg-accent text-foreground font-semibold' : 'border-gray-200 bg-card text-gray-700 hover:border-gray-400'"
              @click="mode = option"
            >
              {{ t(`schedule.modes.${option}`) }}
            </button>
          </div>
          <p class="text-[13px] text-gray-600">
            {{ mode === 'repeat' ? t('schedule.repeatHint', { weeks: schedule?.weeks_ahead ?? 4 }) : t('schedule.onceHint') }}
          </p>
          <p v-if="mode === 'repeat' && schedule?.generated_until" class="text-[13px] font-medium text-green-800">
            {{ t('schedule.repeatActive', { date: schedule.generated_until }) }}
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium text-gray-700">{{ t('schedule.days') }}</span>
          <div class="flex flex-wrap gap-2" role="group" :aria-label="t('schedule.days')">
            <button
              v-for="day in weekdays"
              :key="day.value"
              type="button"
              :aria-pressed="form.days.includes(day.value)"
              class="min-h-11 min-w-14 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              :class="form.days.includes(day.value) ? 'border-primary bg-accent text-foreground font-semibold' : 'border-gray-200 bg-card text-gray-700 hover:border-gray-400'"
              @click="toggleDay(day.value)"
            >
              {{ day.label }}
            </button>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <div class="grid gap-1.5">
            <Label for="sch-from">{{ t('schedule.from') }}</Label>
            <NativeSelect id="sch-from" v-model="form.from">
              <NativeSelectOption v-for="time in TIMES" :key="time" :value="time">{{ time }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="grid gap-1.5">
            <Label for="sch-to">{{ t('schedule.to') }}</Label>
            <NativeSelect id="sch-to" v-model="form.to">
              <NativeSelectOption v-for="time in TIMES" :key="time" :value="time">{{ time }}</NativeSelectOption>
            </NativeSelect>
          </div>
          <div v-if="mode === 'once'" class="grid gap-1.5">
            <Label for="sch-weeks">{{ t('schedule.period') }}</Label>
            <NativeSelect id="sch-weeks" v-model="form.weeks">
              <NativeSelectOption v-for="n in WEEKS" :key="n" :value="n">{{ t('schedule.weeks', n) }}</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <span class="text-sm font-medium text-gray-700">{{ t('schedule.breaks') }}</span>
          <div v-for="(item, i) in form.breaks" :key="i" class="flex flex-wrap items-end gap-3">
            <div class="grid min-w-32 flex-1 gap-1">
              <Label :for="`br-from-${i}`" class="text-[13px] font-normal text-gray-600">{{ t('schedule.breakFrom', { n: i + 1 }) }}</Label>
              <NativeSelect :id="`br-from-${i}`" v-model="item.start">
                <NativeSelectOption v-for="time in TIMES" :key="time" :value="time">{{ time }}</NativeSelectOption>
              </NativeSelect>
            </div>
            <div class="grid min-w-32 flex-1 gap-1">
              <Label :for="`br-to-${i}`" class="text-[13px] font-normal text-gray-600">{{ t('schedule.breakTo', { n: i + 1 }) }}</Label>
              <NativeSelect :id="`br-to-${i}`" v-model="item.end">
                <NativeSelectOption v-for="time in TIMES" :key="time" :value="time">{{ time }}</NativeSelectOption>
              </NativeSelect>
            </div>
            <Button variant="outline" class="min-h-11" :aria-label="t('schedule.removeBreak', { n: i + 1 })" @click="form.breaks.splice(i, 1)">
              {{ t('schedule.remove') }}
            </Button>
          </div>
          <span v-if="form.breaks.length === 0" class="text-[13px] text-gray-600">{{ t('schedule.noBreaks') }}</span>
          <Button variant="outline" class="self-start" @click="form.breaks.push({ start: '12:00', end: '12:30' })">
            {{ t('schedule.addBreak') }}
          </Button>
        </div>

        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

        <div class="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-gray-100 pt-5">
          <template v-if="mode === 'repeat'">
            <span class="text-[15px] font-medium">
              {{ valid ? t('schedule.repeatPreview', { name: workerName }) : t('schedule.invalid') }}
            </span>
            <div class="flex flex-wrap gap-2">
              <Button v-if="schedule" variant="outline" size="lg" :disabled="savingSchedule" @click="stopRepeating">
                {{ t('schedule.repeatRemove') }}
              </Button>
              <Button size="lg" :disabled="!valid || savingSchedule" @click="saveRepeating">
                {{ savingSchedule ? t('branding.saving') : t('schedule.repeatSave') }}
              </Button>
            </div>
          </template>
          <template v-else>
            <span class="text-[15px] font-medium">
              {{ valid ? t('schedule.preview', { n: count, name: workerName }) : t('schedule.invalid') }}
            </span>
            <Button size="lg" :disabled="!valid || count === 0 || generating" @click="generate">
              {{ generating ? t('dashboard.generate.generating') : t('schedule.generate') }}
            </Button>
          </template>
        </div>
      </section>
    </div>
  </AdminLayout>
</template>
