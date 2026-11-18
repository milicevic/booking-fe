import { describe, it, expect } from 'vitest'
import { CALLING_CODES, DEFAULT_COUNTRY, flag, isValidPhone, toE164 } from '@/lib/phone'

describe('phone', () => {
  it('builds the international number and drops the leading zero', () => {
    expect(toE164('381', '064 123 4567')).toBe('+381641234567')
    expect(toE164('381', '64/123-45-67')).toBe('+381641234567')
    expect(toE164('49', '0151 2345678')).toBe('+491512345678')
    expect(toE164('381', '  ')).toBe('')
  })

  it('keeps a pasted international number', () => {
    expect(toE164('381', '+387 61 123 456')).toBe('+38761123456')
    expect(toE164('381', '00381 64 123 4567')).toBe('+381641234567')
  })

  it('validates the same format as the API', () => {
    expect(isValidPhone('+381641234567')).toBe(true)
    expect(isValidPhone('0641234567')).toBe(false)
    expect(isValidPhone('+38164')).toBe(false)
  })

  it('starts with Serbia', () => {
    expect(DEFAULT_COUNTRY).toBe('RS')
    expect(CALLING_CODES[0]).toEqual({ country: 'RS', dial: '381' })
    expect(flag('RS')).toBe('🇷🇸')
  })
})
