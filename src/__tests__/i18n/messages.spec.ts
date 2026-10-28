import { describe, it, expect } from 'vitest'
import sr from '@/i18n/sr'
import en from '@/i18n/en'

function keys(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

describe('i18n messages', () => {
  it('sr and en landing translations have the same keys', () => {
    expect(keys(sr.landing).sort()).toEqual(keys(en.landing).sort())
  })
})
