import { createI18n } from 'vue-i18n'
import sr from './sr'
import en from './en'

const savedLocale = localStorage.getItem('locale') ?? 'en'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { sr, en },
})

export function setLocale(locale: 'sr' | 'en') {
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
}
