<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { SCHEDULE_WEEKS, SLOT_DURATIONS, slotCount } from '@/lib/onboarding'
import type { ScheduleDraft } from '@/lib/onboarding'

const props = defineProps<{ id: string; name: string; copyFromName?: string }>()
const schedule = defineModel<ScheduleDraft>({ required: true })
const emit = defineEmits<{ copy: [] }>()

const { t } = useI18n()

// Pola sata od 07:00 do 21:00
const times = Array.from({ length: 29 }, (_, i) => {
  const m = 7 * 60 + i * 30
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 === 0 ? '00' : '30'}`
})

const count = computed(() => slotCount(schedule.value))

function toggleDay(day: number) {
  const s = schedule.value
  s.weekdays = s.weekdays.includes(day) ? s.weekdays.filter((d) => d !== day) : [...s.weekdays, day].sort()
}

function addBreak() {
  schedule.value.breaks.push({ start: '12:00', end: '12:30' })
}

function removeBreak(i: number) {
  schedule.value.breaks.splice(i, 1)
}
</script>

<template>
  <article class="space-y-5 rounded-2xl border bg-card p-5 shadow-xs">
    <div class="flex flex-wrap items-center gap-3">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
        {{ name.charAt(0).toUpperCase() }}
      </span>
      <p class="min-w-0 flex-1 font-semibold">{{ name }}</p>
      <Button v-if="copyFromName" variant="outline" size="sm" @click="emit('copy')">
        {{ t('onboarding.schedule.copyFrom', { name: copyFromName }) }}
      </Button>
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">{{ t('onboarding.schedule.days') }}</p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="d in 7"
          :key="d"
          :variant="schedule.weekdays.includes(d) ? 'default' : 'outline'"
          :aria-pressed="schedule.weekdays.includes(d)"
          class="min-w-14"
          @click="toggleDay(d)"
        >
          {{ t(`dashboard.weekdays.${d}`) }}
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="grid gap-1.5">
        <Label :for="`${props.id}-from`">{{ t('onboarding.schedule.from') }}</Label>
        <NativeSelect :id="`${props.id}-from`" v-model="schedule.workStart">
          <NativeSelectOption v-for="x in times" :key="x" :value="x">{{ x }}</NativeSelectOption>
        </NativeSelect>
      </div>
      <div class="grid gap-1.5">
        <Label :for="`${props.id}-to`">{{ t('onboarding.schedule.to') }}</Label>
        <NativeSelect :id="`${props.id}-to`" v-model="schedule.workEnd">
          <NativeSelectOption v-for="x in times" :key="x" :value="x">{{ x }}</NativeSelectOption>
        </NativeSelect>
      </div>
      <div class="grid gap-1.5">
        <Label :for="`${props.id}-len`">{{ t('onboarding.schedule.slotLength') }}</Label>
        <NativeSelect :id="`${props.id}-len`" v-model.number="schedule.slotDuration">
          <NativeSelectOption v-for="d in SLOT_DURATIONS" :key="d" :value="d">
            {{ t('onboarding.services.minutes', { n: d }) }}
          </NativeSelectOption>
        </NativeSelect>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">{{ t('onboarding.schedule.breaks') }}</p>
      <div v-for="(br, i) in schedule.breaks" :key="i" class="flex flex-wrap items-end gap-3">
        <div class="grid min-w-28 flex-1 gap-1">
          <Label :for="`${props.id}-bs-${i}`" class="text-xs text-muted-foreground">{{ t('onboarding.schedule.breakFrom', { n: i + 1 }) }}</Label>
          <NativeSelect :id="`${props.id}-bs-${i}`" v-model="br.start">
            <NativeSelectOption v-for="x in times" :key="x" :value="x">{{ x }}</NativeSelectOption>
          </NativeSelect>
        </div>
        <div class="grid min-w-28 flex-1 gap-1">
          <Label :for="`${props.id}-be-${i}`" class="text-xs text-muted-foreground">{{ t('onboarding.schedule.breakTo', { n: i + 1 }) }}</Label>
          <NativeSelect :id="`${props.id}-be-${i}`" v-model="br.end">
            <NativeSelectOption v-for="x in times" :key="x" :value="x">{{ x }}</NativeSelectOption>
          </NativeSelect>
        </div>
        <Button variant="outline" size="lg" :aria-label="t('onboarding.schedule.removeBreak', { n: i + 1 })" @click="removeBreak(i)">
          {{ t('onboarding.services.remove') }}
        </Button>
      </div>
      <p v-if="schedule.breaks.length === 0" class="text-xs text-muted-foreground">{{ t('onboarding.schedule.noBreaks') }}</p>
      <Button variant="outline" size="sm" @click="addBreak">{{ t('onboarding.schedule.addBreak') }}</Button>
    </div>

    <p class="border-t pt-3 text-sm">
      {{ count > 0 ? t('onboarding.schedule.count', { n: count, weeks: SCHEDULE_WEEKS }) : t('onboarding.schedule.countNone') }}
    </p>
  </article>
</template>
