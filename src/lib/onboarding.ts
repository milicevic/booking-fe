import { buildSlotCandidates } from '@/lib/slotGenerator'
import type { SlotCandidate } from '@/lib/slotGenerator'

export type BusinessType = 'salon' | 'barber' | 'dentist' | 'mechanic' | 'beauty' | 'other'

export const BUSINESS_TYPES: BusinessType[] = ['salon', 'barber', 'dentist', 'mechanic', 'beauty', 'other']

/** Predlozi usluga po delatnosti: `key` je i18n ključ (onboarding.services.<key>), trajanje u minutima. */
export const SERVICE_PRESETS: Record<BusinessType, { key: string; duration: number }[]> = {
  salon: [
    { key: 'haircut', duration: 30 },
    { key: 'coloring', duration: 90 },
    { key: 'blowdry', duration: 20 },
  ],
  barber: [
    { key: 'haircut', duration: 30 },
    { key: 'shave', duration: 20 },
    { key: 'haircutBeard', duration: 45 },
  ],
  dentist: [
    { key: 'checkup', duration: 30 },
    { key: 'scaling', duration: 45 },
    { key: 'filling', duration: 60 },
  ],
  mechanic: [
    { key: 'diagnostics', duration: 30 },
    { key: 'smallService', duration: 60 },
    { key: 'bigService', duration: 180 },
  ],
  beauty: [
    { key: 'manicure', duration: 45 },
    { key: 'pedicure', duration: 60 },
    { key: 'facial', duration: 60 },
  ],
  other: [{ key: 'generic', duration: 30 }],
}

export const SLOT_DURATIONS = [15, 20, 30, 45, 60, 90]
export const SCHEDULE_WEEKS = 4

export interface BreakDraft {
  start: string
  end: string
}

/** Radno vreme jednog radnika: dani, sati, dužina termina i pauze. */
export interface ScheduleDraft {
  /** 1 = ponedeljak … 7 = nedelja */
  weekdays: number[]
  workStart: string
  workEnd: string
  slotDuration: number
  breaks: BreakDraft[]
}

export interface ServiceDraft {
  id: string
  name: string
  duration: number
}

export interface WorkerDraft {
  id: string
  name: string
  /** Prazan email znači radnika bez naloga (npr. sam vlasnik): pozivnica se ne šalje. */
  email: string
  serviceIds: string[]
  schedule: ScheduleDraft
}

export function defaultSchedule(): ScheduleDraft {
  return {
    weekdays: [1, 2, 3, 4, 5, 6],
    workStart: '09:00',
    workEnd: '17:00',
    slotDuration: 30,
    breaks: [{ start: '12:00', end: '12:30' }],
  }
}

export function cloneSchedule(schedule: ScheduleDraft): ScheduleDraft {
  return {
    ...schedule,
    weekdays: [...schedule.weekdays],
    breaks: schedule.breaks.map((br) => ({ ...br })),
  }
}

function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Termini jednog radnika od danas, za zadati broj nedelja. */
export function scheduleCandidates(
  schedule: ScheduleDraft,
  weeks = SCHEDULE_WEEKS,
  from: Date = new Date(),
): SlotCandidate[] {
  const to = new Date(from)
  to.setDate(to.getDate() + weeks * 7 - 1)
  return buildSlotCandidates({
    dateFrom: toISODate(from),
    dateTo: toISODate(to),
    weekdays: schedule.weekdays,
    workStart: schedule.workStart,
    workEnd: schedule.workEnd,
    slotDuration: schedule.slotDuration,
    breaks: schedule.breaks,
  })
}

export function slotCount(schedule: ScheduleDraft, weeks = SCHEDULE_WEEKS, from: Date = new Date()): number {
  return scheduleCandidates(schedule, weeks, from).length
}

/** Prvi problem koji sprečava prelazak sa koraka sa radnicima (kod za poruku), ili null. */
export function workersProblem(workers: WorkerDraft[]): { code: 'none' | 'noService'; name?: string } | null {
  if (workers.length === 0) return { code: 'none' }
  const withoutService = workers.find((w) => w.serviceIds.length === 0)
  return withoutService ? { code: 'noService', name: withoutService.name } : null
}

/** Prvi radnik čiji raspored ne daje nijedan termin, ili null. */
export function scheduleProblem(workers: WorkerDraft[], from: Date = new Date()): WorkerDraft | null {
  return workers.find((w) => slotCount(w.schedule, SCHEDULE_WEEKS, from) === 0) ?? null
}
