<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import WorkerScheduleCard from './WorkerScheduleCard.vue'
import { cloneSchedule, slotCount } from '@/lib/onboarding'
import type { WorkerDraft } from '@/lib/onboarding'

const workers = defineModel<WorkerDraft[]>({ required: true })

const { t } = useI18n()

const first = computed(() => workers.value[0])
const total = computed(() => workers.value.reduce((n, w) => n + slotCount(w.schedule), 0))

function copyFromFirst(worker: WorkerDraft) {
  if (first.value) worker.schedule = cloneSchedule(first.value.schedule)
}
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-1.5">
      <h1 class="text-2xl font-semibold">{{ t('onboarding.schedule.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('onboarding.schedule.subtitle') }}</p>
    </div>

    <WorkerScheduleCard
      v-for="(w, i) in workers"
      :id="`sch-${w.id}`"
      :key="w.id"
      v-model="w.schedule"
      :name="w.name"
      :copy-from-name="i > 0 ? first?.name : undefined"
      @copy="copyFromFirst(w)"
    />

    <p role="status" class="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium">
      {{ t('onboarding.schedule.total', { n: total, workers: workers.length }) }}
    </p>
  </div>
</template>
