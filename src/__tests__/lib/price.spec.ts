import { describe, it, expect } from 'vitest'
import { formatPrice } from '@/lib/price'

describe('formatPrice', () => {
  it('drops trailing zero decimals and groups thousands per locale', () => {
    expect(formatPrice('1200.00', 'sr')).toBe('1.200')
    expect(formatPrice('1200.00', 'en')).toBe('1,200')
  })

  it('keeps real decimals', () => {
    expect(formatPrice('19.50', 'en')).toBe('19.5')
  })

  it('appends the tenant currency', () => {
    expect(formatPrice('1200.00', 'sr', 'RSD')).toBe('1.200 RSD')
    expect(formatPrice('15', 'en', 'EUR')).toBe('15 EUR')
  })
})
