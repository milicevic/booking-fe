/**
 * Telefon kupca: pozivni broj bira se iz liste (podrazumevano Srbija), a API prima broj u
 * međunarodnom obliku (E.164, npr. +381641234567), isto kao provera na backendu.
 */
export interface CallingCode {
  /** ISO 3166-1 alpha-2 */
  country: string
  dial: string
}

export const DEFAULT_COUNTRY = 'RS'

// Srbija i region prvi, pa ostale zemlje iz kojih kupci najčešće dolaze
export const CALLING_CODES: CallingCode[] = [
  { country: 'RS', dial: '381' },
  { country: 'BA', dial: '387' },
  { country: 'ME', dial: '382' },
  { country: 'HR', dial: '385' },
  { country: 'MK', dial: '389' },
  { country: 'SI', dial: '386' },
  { country: 'XK', dial: '383' },
  { country: 'HU', dial: '36' },
  { country: 'RO', dial: '40' },
  { country: 'BG', dial: '359' },
  { country: 'AL', dial: '355' },
  { country: 'GR', dial: '30' },
  { country: 'AT', dial: '43' },
  { country: 'DE', dial: '49' },
  { country: 'CH', dial: '41' },
  { country: 'IT', dial: '39' },
  { country: 'FR', dial: '33' },
  { country: 'NL', dial: '31' },
  { country: 'BE', dial: '32' },
  { country: 'SE', dial: '46' },
  { country: 'NO', dial: '47' },
  { country: 'DK', dial: '45' },
  { country: 'PL', dial: '48' },
  { country: 'CZ', dial: '420' },
  { country: 'SK', dial: '421' },
  { country: 'ES', dial: '34' },
  { country: 'PT', dial: '351' },
  { country: 'IE', dial: '353' },
  { country: 'GB', dial: '44' },
  { country: 'TR', dial: '90' },
  { country: 'RU', dial: '7' },
  { country: 'UA', dial: '380' },
  { country: 'US', dial: '1' },
  { country: 'CA', dial: '1' },
  { country: 'AU', dial: '61' },
  { country: 'AE', dial: '971' },
]

const E164 = /^\+[1-9]\d{6,14}$/

export function isValidPhone(phone: string): boolean {
  return E164.test(phone)
}

/**
 * Pozivni broj + lokalni broj → +381641234567. Razmaci, crtice i vodeća nula lokalnog broja se uklanjaju.
 * Ako kupac nalepi ceo broj sa pozivnim (+381… ili 00381…), on ima prednost nad izabranim iz liste.
 */
export function toE164(dial: string, national: string): string {
  const trimmed = national.trim()
  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    const digits = trimmed.replace(/\D/g, '').replace(/^00/, '')
    return digits ? `+${digits}` : ''
  }
  const digits = trimmed.replace(/\D/g, '').replace(/^0+/, '')
  return digits ? `+${dial}${digits}` : ''
}

/** Zastavica od ISO koda (regionalni indikatori), npr. RS → 🇷🇸 */
export function flag(country: string): string {
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

/** Ime zemlje na jeziku stranice; ako pregledač ne zna, ostaje ISO kod. */
export function countryName(country: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(country) ?? country
  } catch {
    return country
  }
}
