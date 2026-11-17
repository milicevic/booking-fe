import { reactive } from 'vue'
import { adminApi } from '@/api/admin'
import { servicesApi } from '@/api/services'
import { tenantApi } from '@/api/tenant'
import type { Client } from '@/stores/auth'
import type { BusinessType, ServiceDraft, WorkerDraft } from '@/lib/onboarding'

export interface OnboardingInput {
  appName: string
  businessType: BusinessType
  color: string
  autoConfirm: boolean
  services: ServiceDraft[]
  workers: WorkerDraft[]
}

/**
 * Pravi sve što je korisnik složio u onboardingu: izgled, usluge, radnike, dodelu usluga i stalni raspored
 * svakog radnika (backend iz njega odmah pravi termine i drži ih 4 nedelje unapred). Na kraju označava
 * onboarding završenim. Već napravljeno se pamti, pa ponovni pokušaj posle greške ne duplira ništa.
 */
export function useOnboardingSubmit() {
  const state = reactive({
    phase: 'idle' as 'idle' | 'saving' | 'done' | 'error',
    stage: 'services' as 'services' | 'workers' | 'slots',
    /** Radnici kojima je raspored sačuvan / ukupno radnika sa radnim danima */
    slotsDone: 0,
    slotsTotal: 0,
    /** Vlasnik posle završetka (sa onboarding_completed_at), za auth store */
    client: null as Client | null,
  })

  let settingsSaved = false
  const serviceIds = new Map<string, number>()
  const workerIds = new Map<string, number>()
  const assigned = new Set<string>()
  const scheduled = new Set<string>()

  async function run(input: OnboardingInput) {
    state.phase = 'saving'
    state.stage = 'services'
    try {
      if (!settingsSaved) {
        await tenantApi.updateBranding({ app_name: input.appName, primary_color: input.color, business_type: input.businessType })
        await adminApi.updateSettings({ confirmation_mode: input.autoConfirm ? 'auto' : 'owner' })
        settingsSaved = true
      }

      for (const service of input.services) {
        if (serviceIds.has(service.id)) continue
        const { data } = await servicesApi.createService({ name: service.name, duration_minutes: service.duration })
        serviceIds.set(service.id, data.id)
      }

      state.stage = 'workers'
      for (const worker of input.workers) {
        if (workerIds.has(worker.id)) continue
        const { data } = await adminApi.createWorker({ name: worker.name, ...(worker.email ? { email: worker.email } : {}) })
        workerIds.set(worker.id, data.id)
      }

      for (const worker of input.workers) {
        for (const draftServiceId of worker.serviceIds) {
          const serviceId = serviceIds.get(draftServiceId)
          const workerId = workerIds.get(worker.id)
          const key = `${serviceId}:${workerId}`
          if (serviceId === undefined || workerId === undefined || assigned.has(key)) continue
          await servicesApi.assignWorker(serviceId, workerId)
          assigned.add(key)
        }
      }

      state.stage = 'slots'
      const withSchedule = input.workers.filter((w) => w.schedule.weekdays.length > 0)
      state.slotsTotal = withSchedule.length
      state.slotsDone = withSchedule.filter((w) => scheduled.has(w.id)).length

      for (const worker of withSchedule) {
        if (scheduled.has(worker.id)) continue
        const { schedule } = worker
        await adminApi.saveWorkerSchedule(workerIds.get(worker.id)!, {
          weekdays: schedule.weekdays,
          start: schedule.workStart,
          end: schedule.workEnd,
          slot_duration: schedule.slotDuration,
          breaks: schedule.breaks.filter((br) => br.start && br.end && br.end > br.start),
        })
        scheduled.add(worker.id)
        state.slotsDone++
      }

      const { data } = await adminApi.updateSettings({ onboarding_completed: true })
      state.client = data
      state.phase = 'done'
    } catch {
      state.phase = 'error'
    }
  }

  return { state, run }
}
