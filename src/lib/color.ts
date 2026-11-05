// Podrazumevana boja brenda (indigo), ista kao --primary u style.css
export const DEFAULT_PRIMARY_COLOR = '#4f46e5'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && HEX_COLOR.test(value)
}

// Relativna osvetljenost po WCAG formuli (0 = crna, 1 = bela)
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Boja teksta na pozadini brenda: bela ili tamna, šta god daje veći kontrast
export function readableForeground(hex: string): string {
  const background = luminance(hex)
  const contrastWithWhite = 1.05 / (background + 0.05)
  const contrastWithDark = (background + 0.05) / 0.05
  return contrastWithWhite >= contrastWithDark ? '#ffffff' : '#111827'
}
