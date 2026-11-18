import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminApi } from '@/api/admin'
import { useWorkerSchedule } from '@/composables/useWorkerSchedule'

vi.mock('@/api/admin', () => ({
  adminApi: {
    getWorkerSchedule: vi.fn<() => void>(),
    saveWorkerSchedule: vi.fn<() => void>(),
    deleteWorkerSchedule: vi.fn<() => void>(),
  },
}))

const hours = { weekdays: [1, 2], start: '09:00', end: '17:00', slot_duration: 30, breaks: [] }
const saved = { ...hours, worker_id: 5, weeks_ahead: 4, generated_until: '2026-12-14', updated_at: '', generated: { created: 10, skipped: 0, removed: 2 } }

beforeEach(() => vi.clearAllMocks())

describe('useWorkerSchedule', () => {
  it('loads, saves and removes a schedule', async () => {
    vi.mocked(adminApi.getWorkerSchedule).mockResolvedValue({ data: null } as never)
    vi.mocked(adminApi.saveWorkerSchedule).mockResolvedValue({ data: saved } as never)
    vi.mocked(adminApi.deleteWorkerSchedule).mockResolvedValue({} as never)
    const { schedule, load, save, remove } = useWorkerSchedule()

    await load(5)
    expect(schedule.value).toBeNull()

    const result = await save(5, hours)
    expect(adminApi.saveWorkerSchedule).toHaveBeenCalledWith(5, hours)
    expect(result.generated.created).toBe(10)
    expect(schedule.value?.weekdays).toEqual([1, 2])

    await remove(5)
    expect(adminApi.deleteWorkerSchedule).toHaveBeenCalledWith(5)
    expect(schedule.value).toBeNull()
  })

  it('ignores a late response for a previously selected worker', async () => {
    let resolveFirst: (value: unknown) => void = () => {}
    vi.mocked(adminApi.getWorkerSchedule)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)) as never)
      .mockResolvedValueOnce({ data: { ...saved, worker_id: 6 } } as never)
    const { schedule, load } = useWorkerSchedule()

    const first = load(5)
    await load(6)
    resolveFirst({ data: { ...saved, worker_id: 5 } })
    await first

    expect(schedule.value?.worker_id).toBe(6)
  })
})
