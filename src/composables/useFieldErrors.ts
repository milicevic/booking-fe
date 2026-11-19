import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiFieldErrors, validate } from '@/lib/validation'
import type { Rule } from '@/lib/validation'

/**
 * Greške po poljima forme: naše prevedene poruke umesto poruka pregledača, i greške polja iz API-ja (422).
 */
export function useFieldErrors<T extends string>() {
  const { t } = useI18n()
  const errors = ref<Partial<Record<T, string>>>({})

  /** Proverava sva polja; true ako je forma ispravna. */
  function check(values: Record<T, string>, rules: Partial<Record<T, Rule[]>>): boolean {
    const keys = validate(values, rules)
    errors.value = Object.fromEntries(Object.entries(keys).map(([field, key]) => [field, t(key as string)])) as Partial<Record<T, string>>
    return Object.keys(keys).length === 0
  }

  /** Prenosi greške polja iz odgovora API-ja; true ako ih je bilo. */
  function fromApi(error: unknown, fields: readonly T[]): boolean {
    const api = apiFieldErrors(error)
    const own = Object.fromEntries(fields.filter((f) => api[f]).map((f) => [f, api[f]])) as Partial<Record<T, string>>
    errors.value = own
    return Object.keys(own).length > 0
  }

  function clear(field: T) {
    if (errors.value[field]) errors.value = { ...errors.value, [field]: undefined }
  }

  return { errors, check, fromApi, clear }
}
