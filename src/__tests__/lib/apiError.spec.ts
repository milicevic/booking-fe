import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { apiErrorMessage } from '@/lib/apiError'

function axiosError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR', config, null, { status, statusText: '', headers: {}, config, data })
}

describe('apiErrorMessage', () => {
  it('returns the translated backend message for client errors', () => {
    expect(apiErrorMessage(axiosError(422, { message: 'Polje email je obavezno.' }), 'fallback')).toBe(
      'Polje email je obavezno.',
    )
  })

  it('falls back on server errors', () => {
    expect(apiErrorMessage(axiosError(500, { message: 'Server Error' }), 'fallback')).toBe('fallback')
  })

  it('falls back when the response has no message', () => {
    expect(apiErrorMessage(axiosError(422, {}), 'fallback')).toBe('fallback')
  })

  it('falls back on network and non-axios errors', () => {
    expect(apiErrorMessage(new AxiosError('Network Error'), 'fallback')).toBe('fallback')
    expect(apiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
  })
})
