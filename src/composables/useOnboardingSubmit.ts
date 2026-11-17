import { reactive } from 'vue'
import { isAxiosError } from 'axios'
import { adminApi } from '@/api/admin'
import { servicesApi } from '@/api/services'
import { tenantApi } from '@/api/tenant'
import { scheduleCandidates } from '@/lib/onboarding'
import type { ServiceDraft, WorkerDraft } from '@/lib/onboarding'

export interface OnboardingInput {
  appName: string
  color: string
  autoConfirm: boolean
  services: ServiceDraft[]
  workers: WorkerDraft[]
}

const SLOT_CONCURRENCY = 5

/** Pokreće `fn` nad listom, najviše `limit` poziva istovremeno; prva greška prekida ostale. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items]
  let failure: unknown = null
  const run = async () => {
    for (let item = queue.shift(); item !== undefined && failure === null; item = queue.shift()) {
      try {
        await fn(item)
      } catch (e) {
        failure = e
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  if (failure !== null) throw failure
}

/**
 * Pravi sve što je korisnik složio u onboardingu: izgled, usluge, radnike, dodelu usluga i termine.
 * Već napravljeno se pamti, pa ponovni pokušaj posle greške ne duplira ništa.
 */
export function useOnboardingSubmit() {
  const state = reactive({
    phase: 'idle' as 'idle' | 'saving' | 'done' | 'error',
    stage: 'services' as 'services' | 'workers' | 'slots',
    slotsDone: 0,
    slotsTotal: 0,
  })

  let settingsSaved = false
  const serviceIds = new Map<string, number>()
  const workerIds = new Map<string, number>()
  const assigned = new Set<string>()
  const createdSlots = new Set<string>()

  async function run(input: OnboardingInput) {
    state.phase = 'saving'
    state.stage = 'services'
    try {
      if (!settingsSaved) {
        await tenantApi.updateBranding({ app_name: input.appName, primary_color: input.color })
        await adminApi.updateSettings({ auto_confirm_bookings: input.autoConfirm })
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
      const tasks = input.workers.flatMap((worker) =>
        scheduleCandidates(worker.schedule).map((slot) => ({ workerId: workerIds.get(worker.id)!, slot })),
      )
      state.slotsTotal = tasks.length
      state.slotsDone = tasks.filter((t) => createdSlots.has(`${t.workerId}|${t.slot.date}|${t.slot.start}`)).length

      await pool(
        tasks.filter((t) => !createdSlots.has(`${t.workerId}|${t.slot.date}|${t.slot.start}`)),
        SLOT_CONCURRENCY,
        async ({ workerId, slot }) => {
          try {
            await adminApi.createSlot({ worker_id: workerId, date: slot.date, start_time: slot.start, end_time: slot.end })
          } catch (e) {
            // 422: termin već postoji (npr. posle prekinutog pokušaja), računamo ga kao gotov
            if (!(isAxiosError(e) && e.response?.status === 422)) throw e
          }
          createdSlots.add(`${workerId}|${slot.date}|${slot.start}`)
          state.slotsDone++
        },
      )

      state.phase = 'done'
    } catch {
      state.phase = 'error'
    }
  }

  return { state, run }
}
