<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CheckIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { slotCount } from '@/lib/onboarding'
import type { WorkerDraft } from '@/lib/onboarding'

defineProps<{ address: string; workers: WorkerDraft[]; serviceCount: number; autoConfirm: boolean; hasInvites: boolean }>()

const { t } = useI18n()
</script>

<template>
  <div class="space-y-6 rounded-2xl border bg-card p-8 text-center shadow-xs">
    <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
      <CheckIcon class="size-7 text-primary" />
    </div>
    <div class="space-y-1.5">
      <h1 class="text-2xl font-semibold">{{ t('onboarding.done.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('onboarding.done.trial') }}</p>
    </div>
    <p class="break-all rounded-xl border bg-muted/40 px-4 py-3 text-sm font-semibold">{{ address }}</p>

    <dl class="space-y-2 text-left text-sm">
      <div class="flex justify-between gap-4">
        <dt class="text-muted-foreground">{{ t('onboarding.done.services') }}</dt>
        <dd class="font-medium">{{ serviceCount }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-muted-foreground">{{ t('onboarding.done.confirm') }}</dt>
        <dd class="font-medium">{{ autoConfirm ? t('onboarding.done.confirmAuto') : t('onboarding.done.confirmOwner') }}</dd>
      </div>
    </dl>

    <ul class="divide-y rounded-xl border text-left">
      <li v-for="w in workers" :key="w.id" class="flex flex-wrap items-center justify-between gap-x-4 px-4 py-3">
        <div class="text-sm">
          <p class="font-semibold">{{ w.name }}</p>
          <p class="text-xs text-muted-foreground">
            {{ w.schedule.workStart }}–{{ w.schedule.workEnd }} · {{ t('onboarding.services.minutes', { n: w.schedule.slotDuration }) }}
          </p>
        </div>
        <span class="text-sm font-medium">{{ t('onboarding.done.slots', { n: slotCount(w.schedule) }) }}</span>
      </li>
    </ul>

    <p v-if="hasInvites" class="text-xs text-muted-foreground">{{ t('onboarding.done.invites') }}</p>

    <div class="flex flex-wrap justify-center gap-3">
      <Button as-child size="lg">
        <router-link :to="{ name: 'dashboard' }">{{ t('onboarding.done.openDashboard') }}</router-link>
      </Button>
      <Button as-child variant="outline" size="lg">
        <a :href="address">{{ t('onboarding.done.viewSite') }}</a>
      </Button>
    </div>
  </div>
</template>
