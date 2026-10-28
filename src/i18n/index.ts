import { createI18n } from 'vue-i18n'
import sr from './sr'
import en from './en'

export type Locale = 'sr' | 'en'

// Jezici i vremenske zone regiona u kojem se razume srpski (latinica)
const SERBIAN_LANGUAGES = ['sr', 'sh', 'hr', 'bs', 'cnr']
const SERBIAN_TIME_ZONES = ['Europe/Belgrade', 'Europe/Podgorica', 'Europe/Sarajevo', 'Europe/Zagreb']

// Lokacija se procenjuje iz vremenske zone uređaja (bez slanja podataka trećoj strani),
// a jezik pregledača pokriva korisnike iz regiona koji su trenutno u inostranstvu
export function detectLocale(): Locale {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (SERBIAN_TIME_ZONES.includes(timeZone)) return 'sr'

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  const speaksSerbian = languages.some((language) =>
    SERBIAN_LANGUAGES.includes(language.toLowerCase().split('-')[0] as string),
  )
  return speaksSerbian ? 'sr' : 'en'
}

const savedLocale = localStorage.getItem('locale')
const initialLocale: Locale = savedLocale === 'sr' || savedLocale === 'en' ? savedLocale : detectLocale()
document.documentElement.lang = initialLocale

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: { sr, en },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
  document.documentElement.lang = locale
}
