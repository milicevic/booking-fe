<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress.vue'
import StepBusiness from '@/components/onboarding/StepBusiness.vue'
import StepServices from '@/components/onboarding/StepServices.vue'
import StepWorkers from '@/components/onboarding/StepWorkers.vue'
import StepSchedule from '@/components/onboarding/StepSchedule.vue'
import StepLook from '@/components/onboarding/StepLook.vue'
import OnboardingDone from '@/components/onboarding/OnboardingDone.vue'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useOnboardingSubmit } from '@/composables/useOnboardingSubmit'
import { tenantUrl } from '@/lib/domain'
import { SERVICE_PRESETS, scheduleProblem, workersProblem } from '@/lib/onboarding'
import type { BusinessType, ServiceDraft, WorkerDraft } from '@/lib/onboarding'

const TOTAL_STEPS = 5

const { t } = useI18n()
const auth = useAuthStore()
const tenant = useTenantStore()
const { state, run } = useOnboardingSubmit()

const step = ref(1)
const name = ref(tenant.config?.app_name ?? '')
// Delatnost se čuva na tenantu, pa se ponovni ulazak u onboarding nastavlja od nje
const type = ref<BusinessType>(tenant.config?.business_type ?? 'salon')
const color = ref(tenant.config?.primary_color ?? '#4f46e5')
const autoConfirm = ref(false)
const workers = ref<WorkerDraft[]>([])

function presetServices(businessType: BusinessType): ServiceDraft[] {
  return SERVICE_PRESETS[businessType].map((p) => ({
    id: `preset:${p.key}`,
    name: t(`onboarding.service.${p.key}`),
    duration: p.duration,
  }))
}
const services = ref<ServiceDraft[]>(presetServices(type.value))

watch(type, (value) => (services.value = presetServices(value)))

// Config firme stiže asinhrono; sačuvana delatnost se preuzima dok je korisnik još na prvom koraku
watch(
  () => tenant.config?.business_type,
  (saved) => {
    if (saved && step.value === 1) type.value = saved
  },
)

// Uklonjena usluga ne sme da ostane dodeljena radniku
watch(services, (list) => {
  const ids = new Set(list.map((s) => s.id))
  for (const w of workers.value) w.serviceIds = w.serviceIds.filter((id) => ids.has(id))
})

const address = computed(() => (tenant.config?.subdomain ? tenantUrl(tenant.config.subdomain) : ''))
const saving = computed(() => step.value > TOTAL_STEPS)
const hasInvites = computed(() => workers.value.some((w) => w.email !== ''))

const blockMessage = computed(() => {
  switch (step.value) {
    case 1:
      return name.value.trim().length < 2 ? t('onboarding.block.name') : ''
    case 2:
      return services.value.length === 0 ? t('onboarding.block.noServices') : ''
    case 3: {
      const problem = workersProblem(workers.value)
      if (!problem) return ''
      return problem.code === 'none' ? t('onboarding.block.noWorkers') : t('onboarding.block.workerNoService', { name: problem.name })
    }
    case 4: {
      const worker = scheduleProblem(workers.value)
      return worker ? t('onboarding.block.noSchedule', { name: worker.name }) : ''
    }
    default:
      return ''
  }
})

async function submit() {
  await run({
    appName: name.value.trim(),
    businessType: type.value,
    color: color.value,
    autoConfirm: autoConfirm.value,
    services: services.value,
    workers: workers.value,
  })
  // Vlasnik sa onboarding_completed_at: baner i preusmeravanje na kontrolnoj tabli nestaju
  if (state.client) auth.client = state.client
}

function next() {
  if (blockMessage.value) return
  step.value++
  if (step.value > TOTAL_STEPS) void submit()
}
</script>

<template>
  <AdminLayout>
    <div class="mx-auto max-w-2xl space-y-6">
      <template v-if="!saving">
        <div class="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>{{ t('onboarding.title') }}</span>
          <span>{{ t('onboarding.step', { n: step, total: TOTAL_STEPS }) }}</span>
        </div>
        <OnboardingProgress :step="step" />

        <section class="rounded-2xl border bg-card p-6 shadow-xs sm:p-8">
          <StepBusiness v-if="step === 1" v-model:name="name" v-model:type="type" :address="address" />
          <StepServices v-else-if="step === 2" v-model="services" :type="type" />
          <StepWorkers v-else-if="step === 3" v-model="workers" :services="services" :owner-name="auth.client?.name ?? ''" />
          <StepSchedule v-else-if="step === 4" v-model="workers" />
          <StepLook v-else v-model:color="color" v-model:auto-confirm="autoConfirm" :name="name" />
        </section>

        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <Button v-if="step > 1" variant="outline" size="lg" @click="step--">{{ t('onboarding.back') }}</Button>
            <span v-else />
            <Button size="lg" :disabled="!!blockMessage" @click="next">
              {{ step === TOTAL_STEPS ? t('onboarding.finish') : t('onboarding.next') }}
            </Button>
          </div>
          <p v-if="blockMessage" class="text-right text-xs text-muted-foreground">{{ blockMessage }}</p>
        </div>
      </template>

      <section v-else-if="state.phase === 'saving' || state.phase === 'idle'" class="space-y-4 rounded-2xl border bg-card p-8 text-center shadow-xs" role="status">
        <h1 class="text-xl font-semibold">{{ t('onboarding.saving.title') }}</h1>
        <p class="text-sm text-muted-foreground">
          {{
            state.stage === 'slots'
              ? t('onboarding.saving.slots', { done: state.slotsDone, total: state.slotsTotal })
              : t(`onboarding.saving.${state.stage}`)
          }}
        </p>
      </section>

      <section v-else-if="state.phase === 'error'" class="space-y-4 rounded-2xl border bg-card p-8 text-center shadow-xs">
        <p class="text-sm text-destructive">{{ t('onboarding.saving.error') }}</p>
        <Button size="lg" @click="submit">{{ t('onboarding.saving.retry') }}</Button>
      </section>

      <OnboardingDone
        v-else
        :address="address"
        :workers="workers"
        :service-count="services.length"
        :auto-confirm="autoConfirm"
        :has-invites="hasInvites"
      />
    </div>
  </AdminLayout>
</template>
