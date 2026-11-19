import { isAxiosError } from 'axios'
import { isStrongPassword } from '@/lib/password'

/**
 * Provera formi na frontendu: pravilo vraća i18n ključ poruke (validation.*) ili null.
 * Forme imaju `novalidate`, pa pregledač ne prikazuje svoje (neprevedene) poruke.
 */
export type Rule = (value: string) => string | null

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const required =
  (key: string): Rule =>
  (value) =>
    value.trim() ? null : key

/** Prazno je dozvoljeno (za obavezno polje dodaj i `required`). */
export const email =
  (key = 'validation.emailInvalid'): Rule =>
  (value) =>
    !value.trim() || EMAIL.test(value.trim()) ? null : key

export const strongPassword =
  (key = 'validation.passwordWeak'): Rule =>
  (value) =>
    !value || isStrongPassword(value) ? null : key

export const sameAs =
  (other: () => string, key = 'validation.passwordMismatch'): Rule =>
  (value) =>
    value === other() ? null : key

/** Prva poruka po polju; polja bez greške se ne vraćaju. */
export function validate<T extends string>(values: Record<T, string>, rules: Partial<Record<T, Rule[]>>): Partial<Record<T, string>> {
  const errors: Partial<Record<T, string>> = {}
  for (const field of Object.keys(rules) as T[]) {
    for (const rule of rules[field] ?? []) {
      const message = rule(values[field] ?? '')
      if (message) {
        errors[field] = message
        break
      }
    }
  }
  return errors
}

/** Greške polja iz odgovora 422 (Laravel: { errors: { polje: [poruka] } }), već prevedene na backendu. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!isAxiosError(error) || error.response?.status !== 422) return {}
  const errors = error.response.data?.errors as Record<string, unknown> | undefined
  if (!errors || typeof errors !== 'object') return {}
  return Object.fromEntries(
    Object.entries(errors)
      .map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages] as const)
      .filter((entry): entry is readonly [string, string] => typeof entry[1] === 'string'),
  )
}
