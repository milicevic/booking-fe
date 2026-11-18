import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminApi } from '@/api/admin'
import { servicesApi } from '@/api/services'
import { tenantApi } from '@/api/tenant'
import { useOnboardingSubmit } from '@/composables/useOnboardingSubmit'
import type { OnboardingInput } from '@/composables/useOnboardingSubmit'

vi.mock('@/api/admin', () => ({
  adminApi: { updateSettings: vi.fn<() => void>(), createWorker: vi.fn<() => void>(), saveWorkerSchedule: vi.fn<() => void>() },
}))
vi.mock('@/api/services', () => ({
  servicesApi: { createService: vi.fn<() => void>(), assignWorker: vi.fn<() => void>() },
}))
vi.mock('@/api/tenant', () => ({
  tenantApi: { updateBranding: vi.fn<() => void>() },
}))

const input: OnboardingInput = {
  appName: 'Salon Ana',
  businessType: 'barber',
  color: '#4f46e5',
  autoConfirm: false,
  services: [{ id: 'preset:haircut', name: 'Sisanje', duration: 30 }],
  workers: [
    {
      id: 'w0',
      name: 'Ana',
      email: '',
      serviceIds: ['preset:haircut'],
      schedule: {
        weekdays: [1, 2, 3],
        workStart: '09:00',
        workEnd: '17:00',
        slotDuration: 30,
        breaks: [{ start: '12:00', end: '12:30' }, { start: '', end: '' }],
      },
    },
    {
      id: 'w1',
      name: 'Marija',
      email: 'marija@example.com',
      serviceIds: [],
      schedule: { weekdays: [], workStart: '09:00', workEnd: '10:00', slotDuration: 30, breaks: [] },
    },
  ],
}

const completedClient = { id: 1, client_profile: { onboarding_completed_at: '2026-11-17T10:00:00Z' } }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tenantApi.updateBranding).mockResolvedValue({} as never)
  vi.mocked(adminApi.updateSettings).mockResolvedValue({ data: completedClient } as never)
  vi.mocked(servicesApi.createService).mockResolvedValue({ data: { id: 10 } } as never)
  let workerId = 100
  vi.mocked(adminApi.createWorker).mockImplementation(() => Promise.resolve({ data: { id: workerId++ } }) as never)
  vi.mocked(servicesApi.assignWorker).mockResolvedValue({} as never)
  vi.mocked(adminApi.saveWorkerSchedule).mockResolvedValue({} as never)
})

describe('useOnboardingSubmit', () => {
  it('creates settings, services, workers, assignments and a schedule per worker', async () => {
    const { state, run } = useOnboardingSubmit()
    await run(input)

    expect(state.phase).toBe('done')
    expect(tenantApi.updateBranding).toHaveBeenCalledWith({ app_name: 'Salon Ana', primary_color: '#4f46e5', business_type: 'barber' })
    expect(adminApi.updateSettings).toHaveBeenNthCalledWith(1, { confirmation_mode: 'owner' })
    expect(servicesApi.createService).toHaveBeenCalledWith({ name: 'Sisanje', duration_minutes: 30 })
    // vlasnik bez emaila ide bez emaila, radnik sa emailom ga dobija
    expect(adminApi.createWorker).toHaveBeenNthCalledWith(1, { name: 'Ana' })
    expect(adminApi.createWorker).toHaveBeenNthCalledWith(2, { name: 'Marija', email: 'marija@example.com' })
    // usluga je dodeljena samo prvom radniku
    expect(servicesApi.assignWorker).toHaveBeenCalledTimes(1)
    expect(servicesApi.assignWorker).toHaveBeenCalledWith(10, 100)
    // raspored jednim pozivom, samo za radnika koji ima radne dane; nepotpune pauze se ne šalju
    expect(adminApi.saveWorkerSchedule).toHaveBeenCalledTimes(1)
    expect(adminApi.saveWorkerSchedule).toHaveBeenCalledWith(100, {
      weekdays: [1, 2, 3],
      start: '09:00',
      end: '17:00',
      slot_duration: 30,
      breaks: [{ start: '12:00', end: '12:30' }],
    })
    expect(state.slotsDone).toBe(1)
    expect(state.slotsTotal).toBe(1)
    // na kraju se onboarding označava završenim
    expect(adminApi.updateSettings).toHaveBeenLastCalledWith({ onboarding_completed: true })
    expect(state.client).toEqual(completedClient)
  })

  it('sends auto confirmation mode when chosen', async () => {
    const { run } = useOnboardingSubmit()
    await run({ ...input, autoConfirm: true })

    expect(adminApi.updateSettings).toHaveBeenNthCalledWith(1, { confirmation_mode: 'auto' })
  })

  it('does not duplicate anything when retrying after a failed schedule', async () => {
    vi.mocked(adminApi.saveWorkerSchedule).mockRejectedValueOnce(new Error('network'))
    const { state, run } = useOnboardingSubmit()

    await run(input)
    expect(state.phase).toBe('error')
    expect(state.client).toBeNull()

    await run(input)
    expect(state.phase).toBe('done')
    expect(servicesApi.createService).toHaveBeenCalledTimes(1)
    expect(adminApi.createWorker).toHaveBeenCalledTimes(2)
    expect(servicesApi.assignWorker).toHaveBeenCalledTimes(1)
    expect(tenantApi.updateBranding).toHaveBeenCalledTimes(1)
    expect(adminApi.saveWorkerSchedule).toHaveBeenCalledTimes(2)
  })
})
