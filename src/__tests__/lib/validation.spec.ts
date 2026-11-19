import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { apiFieldErrors, email, required, sameAs, strongPassword, validate } from '@/lib/validation'

describe('validation', () => {
  it('returns the first failing rule per field', () => {
    const errors = validate(
      { name: ' ', mail: 'nije', password: 'Tajna12345', confirm: 'druga' },
      {
        name: [required('validation.nameRequired')],
        mail: [required('validation.emailRequired'), email()],
        password: [required('validation.passwordRequired'), strongPassword()],
        confirm: [sameAs(() => 'Tajna12345')],
      },
    )
    expect(errors).toEqual({ name: 'validation.nameRequired', mail: 'validation.emailInvalid', confirm: 'validation.passwordMismatch' })
  })

  it('allows an empty optional email and rejects a weak password', () => {
    expect(email()('')).toBeNull()
    expect(strongPassword()('tajna')).toBe('validation.passwordWeak')
  })

  it('reads field errors from a 422 response', () => {
    const error = new AxiosError('x', '422', undefined, undefined, {
      status: 422,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { message: 'x', errors: { app_name: ['Firma sa ovim nazivom već postoji.'], email: ['Zauzeto.'] } },
    })
    expect(apiFieldErrors(error)).toEqual({ app_name: 'Firma sa ovim nazivom već postoji.', email: 'Zauzeto.' })
    expect(apiFieldErrors(new Error('x'))).toEqual({})
  })
})
