import { describe, it, expect, vi, afterEach } from 'vitest'
import { detectLocale } from '@/i18n'

function mockEnvironment(timeZone: string, languages: string[]) {
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    timeZone,
  } as Intl.ResolvedDateTimeFormatOptions)
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
}

describe('detectLocale', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(['Europe/Belgrade', 'Europe/Podgorica', 'Europe/Sarajevo', 'Europe/Zagreb'])(
    'returns sr for time zone %s even with an English browser',
    (timeZone) => {
      mockEnvironment(timeZone, ['en-US'])
      expect(detectLocale()).toBe('sr')
    },
  )

  it.each(['sr', 'sr-Latn-RS', 'hr-HR', 'bs'])('returns sr abroad when the browser language is %s', (language) => {
    mockEnvironment('Europe/Berlin', [language, 'en'])
    expect(detectLocale()).toBe('sr')
  })

  it('returns en elsewhere', () => {
    mockEnvironment('America/New_York', ['en-US', 'de'])
    expect(detectLocale()).toBe('en')
  })
})
