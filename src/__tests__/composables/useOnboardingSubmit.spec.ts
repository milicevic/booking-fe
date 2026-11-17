import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminApi } from '@/api/admin'
import { servicesApi } from '@/api/services'
import { tenantApi } from '@/api/tenant'
import { useOnboardingSubmit } from '@/composables/useOnboardingSubmit'
import type { OnboardingInput } from '@/composables/useOnboardingSubmit'

vi.mock('@/api/admin', () => ({
  adminApi: { updateSettings: vi.fn<() => void>(), createWorker: vi.fn<() => void>(), createSlot: vi.fn<() => void>() },
}))
vi.mock('@/api/services', () => ({
  servicesApi: { createService: vi.fn<() => void>(), assignWorker: vi.fn<() => void>() },
}))
vi.mock('@/api/tenant', () => ({
  tenantApi: { updateBranding: vi.fn<() => void>() },
}))

const input: OnboardingInput = {
  appName: 'Salon Ana',
  color: '#4f46e5',
  autoConfirm: false,
  services: [{ id: 'preset:haircut', name: 'Sisanje', duration: 30 }],
  workers: [
    {
      id: 'w0',
      name: 'Ana',
      email: '',
      serviceIds: ['preset:haircut'],
      // 1 radni dan * 2 termina u 4 nedelje: 4 ponedeljka ili manje, zavisi od danas, pa uzimamo sve dane
      schedule: { weekdays: [1, 2, 3, 4, 5, 6, 7], workStart: '09:00', workEnd: '10:00', slotDuration: 30, breaks: [] },
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tenantApi.updateBranding).mockResolvedValue({} as never)
  vi.mocked(adminApi.updateSettings).mockResolvedValue({} as never)
  vi.mocked(servicesApi.createService).mockResolvedValue({ data: { id: 10 } } as never)
  let workerId = 100
  vi.mocked(adminApi.createWorker).mockImplementation(() => Promise.resolve({ data: { id: workerId++ } }) as never)
  vi.mocked(servicesApi.assignWorker).mockResolvedValue({} as never)
  vi.mocked(adminApi.createSlot).mockResolvedValue({} as never)
})

describe('useOnboardingSubmit', () => {
  it('creates settings, services, workers, assignments and slots per worker', async () => {
    const { state, run } = useOnboardingSubmit()
    await run(input)

    expect(state.phase).toBe('done')
    expect(tenantApi.updateBranding).toHaveBeenCalledWith({ app_name: 'Salon Ana', primary_color: '#4f46e5' })
    expect(adminApi.updateSettings).toHaveBeenCalledWith({ auto_confirm_bookings: false })
    expect(servicesApi.createService).toHaveBeenCalledWith({ name: 'Sisanje', duration_minutes: 30 })
    // vlasnik bez emaila ide bez emaila, radnik sa emailom ga dobija
    expect(adminApi.createWorker).toHaveBeenNthCalledWith(1, { name: 'Ana' })
    expect(adminApi.createWorker).toHaveBeenNthCalledWith(2, { name: 'Marija', email: 'marija@example.com' })
    // usluga je dodeljena samo prvom radniku
    expect(servicesApi.assignWorker).toHaveBeenCalledTimes(1)
    expect(servicesApi.assignWorker).toHaveBeenCalledWith(10, 100)
    // termini se prave samo radniku koji ima radne dane
    const slotCalls = vi.mocked(adminApi.createSlot).mock.calls
    expect(slotCalls.length).toBeGreaterThan(0)
    expect(slotCalls.every(([slot]) => slot.worker_id === 100)).toBe(true)
    expect(state.slotsDone).toBe(state.slotsTotal)
  })

  it('does not duplicate anything when retrying after a failed slot', async () => {
    vi.mocked(adminApi.createSlot).mockRejectedValueOnce(new Error('network'))
    const { state, run } = useOnboardingSubmit()

    await run(input)
    expect(state.phase).toBe('error')

    await run(input)
    expect(state.phase).toBe('done')
    expect(servicesApi.createService).toHaveBeenCalledTimes(1)
    expect(adminApi.createWorker).toHaveBeenCalledTimes(2)
    expect(servicesApi.assignWorker).toHaveBeenCalledTimes(1)
    expect(tenantApi.updateBranding).toHaveBeenCalledTimes(1)
  })
})
