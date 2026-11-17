<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { defaultSchedule } from '@/lib/onboarding'
import type { ServiceDraft, WorkerDraft } from '@/lib/onboarding'

const props = defineProps<{ services: ServiceDraft[]; ownerName: string }>()
const workers = defineModel<WorkerDraft[]>({ required: true })

const { t } = useI18n()

const name = ref('')
const email = ref('')
let seq = 0

const hasOwner = computed(() => workers.value.some((w) => w.email === ''))
const canAdd = computed(() => name.value.trim().length >= 2 && email.value.includes('@'))

function newWorker(workerName: string, workerEmail: string): WorkerDraft {
  return {
    id: `w${seq++}`,
    name: workerName,
    email: workerEmail,
    serviceIds: props.services.map((s) => s.id),
    schedule: defaultSchedule(),
  }
}

function addOwner() {
  workers.value = [newWorker(props.ownerName, ''), ...workers.value]
}

function addWorker() {
  if (!canAdd.value) return
  workers.value = [...workers.value, newWorker(name.value.trim(), email.value.trim())]
  name.value = ''
  email.value = ''
}

function remove(id: string) {
  workers.value = workers.value.filter((w) => w.id !== id)
}

function toggleService(worker: WorkerDraft, serviceId: string) {
  const has = worker.serviceIds.includes(serviceId)
  worker.serviceIds = has ? worker.serviceIds.filter((id) => id !== serviceId) : [...worker.serviceIds, serviceId]
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1.5">
      <h1 class="text-2xl font-semibold">{{ t('onboarding.workers.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('onboarding.workers.subtitle') }}</p>
    </div>

    <div class="space-y-3">
      <article v-for="w in workers" :key="w.id" class="space-y-3 rounded-xl border bg-card p-4">
        <div class="flex items-center gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
            {{ w.name.charAt(0).toUpperCase() }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ w.name }}</p>
            <p class="truncate text-xs text-muted-foreground">
              {{ w.email ? t('onboarding.workers.inviteTo', { email: w.email }) : t('onboarding.workers.noInvite') }}
            </p>
          </div>
          <Button variant="outline" size="sm" :aria-label="t('onboarding.workers.removeLabel', { name: w.name })" @click="remove(w.id)">
            {{ t('onboarding.workers.remove') }}
          </Button>
        </div>
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ t('onboarding.workers.services') }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in services"
              :key="s.id"
              type="button"
              :aria-pressed="w.serviceIds.includes(s.id)"
              class="flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium"
              :class="w.serviceIds.includes(s.id) ? 'border-primary bg-primary/5' : 'bg-card hover:border-muted-foreground/40'"
              @click="toggleService(w, s.id)"
            >
              <CheckIcon v-if="w.serviceIds.includes(s.id)" class="size-3.5 text-primary" />
              {{ s.name }}
            </button>
          </div>
        </div>
      </article>

      <p v-if="workers.length === 0" class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        {{ t('onboarding.workers.empty') }}
      </p>
      <Button v-if="!hasOwner" variant="outline" size="lg" @click="addOwner">{{ t('onboarding.workers.addMe') }}</Button>
    </div>

    <div class="space-y-2 border-t pt-5">
      <p class="text-sm font-medium">{{ t('onboarding.workers.inviteTitle') }}</p>
      <div class="flex flex-wrap items-end gap-2">
        <div class="grid min-w-36 flex-1 gap-1">
          <Label for="ob-wname" class="text-xs text-muted-foreground">{{ t('onboarding.workers.name') }}</Label>
          <Input id="ob-wname" v-model="name" />
        </div>
        <div class="grid min-w-44 flex-1 gap-1">
          <Label for="ob-wmail" class="text-xs text-muted-foreground">{{ t('onboarding.workers.email') }}</Label>
          <Input id="ob-wmail" v-model="email" type="email" @keyup.enter="addWorker" />
        </div>
        <Button variant="outline" size="lg" :disabled="!canAdd" @click="addWorker">{{ t('onboarding.workers.add') }}</Button>
      </div>
      <p class="text-xs text-muted-foreground">{{ t('onboarding.workers.inviteHint') }}</p>
    </div>
  </div>
</template>
