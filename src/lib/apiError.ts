import { isAxiosError } from 'axios'

// Backend vraća poruke već prevedene prema Accept-Language headeru. Za greške klijenta (4xx)
// prikazujemo tu poruku, a za greške servera i mreže opštu poruku iz frontenda.
// Mašinski kod greške koji backend šalje uz poruku (npr. "email_not_verified")
export function apiErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) return null
  const code = error.response?.data?.code
  return typeof code === 'string' ? code : null
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && error.response && error.response.status < 500) {
    const message = error.response.data?.message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}
