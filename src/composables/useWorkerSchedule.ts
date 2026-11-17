import { ref } from 'vue'
import { adminApi } from '@/api/admin'
import type { SavedWorkerSchedule, WorkerSchedule, WorkingHours } from '@/api/admin'

/**
 * Stalni raspored jednog radnika: učitavanje, čuvanje i uklanjanje.
 * Backend iz rasporeda odmah pravi termine i svakog dana ih dopunjuje (weeks_ahead nedelja unapred).
 */
export function useWorkerSchedule() {
  const schedule = ref<WorkerSchedule | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  let requested = 0

  async function load(workerId: number) {
    const request = ++requested
    loading.value = true
    try {
      const { data } = await adminApi.getWorkerSchedule(workerId)
      // Odgovor za ranije izabranog radnika ne sme da pregazi trenutnog
      if (request === requested) schedule.value = data
    } finally {
      if (request === requested) loading.value = false
    }
  }

  async function save(workerId: number, hours: WorkingHours): Promise<SavedWorkerSchedule> {
    saving.value = true
    try {
      const { data } = await adminApi.saveWorkerSchedule(workerId, hours)
      schedule.value = data
      return data
    } finally {
      saving.value = false
    }
  }

  async function remove(workerId: number) {
    saving.value = true
    try {
      await adminApi.deleteWorkerSchedule(workerId)
      schedule.value = null
    } finally {
      saving.value = false
    }
  }

  return { schedule, loading, saving, load, save, remove }
}
