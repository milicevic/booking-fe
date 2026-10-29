import { describe, it, expect } from 'vitest'
import sr from '@/i18n/sr'
import en from '@/i18n/en'
import { baseCompile } from '@intlify/message-compiler'

function entries(messages: object, prefix = ''): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]): [string, string][] =>
    typeof value === 'object' && value !== null
      ? entries(value, `${prefix}${key}.`)
      : typeof value === 'string' ? [[`${prefix}${key}`, value]] : [],
  )
}

function keys(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

describe('i18n messages', () => {
  it('sr and en landing translations have the same keys', () => {
    expect(keys(sr.landing).sort()).toEqual(keys(en.landing).sort())
  })

  // Produkcijski build baca grešku na neispravan prevod (npr. "@" u email adresi), dok dev samo upozori
  it.each([['sr', sr], ['en', en]] as const)('every %s message compiles', (_locale, messages) => {
    const broken = entries(messages).filter(([, message]) => {
      let failed = false
      baseCompile(message, { onError: () => { failed = true } })
      return failed
    }).map(([key]) => key)

    expect(broken).toEqual([])
  })
})
