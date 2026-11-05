import { describe, it, expect } from 'vitest'
import { isHexColor, readableForeground } from '@/lib/color'

describe('color', () => {
  it('accepts only #rrggbb colors', () => {
    expect(isHexColor('#4f46e5')).toBe(true)
    expect(isHexColor('#FFF')).toBe(false)
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor(null)).toBe(false)
  })

  it('uses white text on dark brand colors', () => {
    expect(readableForeground('#4f46e5')).toBe('#ffffff')
    expect(readableForeground('#000000')).toBe('#ffffff')
    expect(readableForeground('#b91c1c')).toBe('#ffffff')
  })

  it('uses dark text on light brand colors', () => {
    expect(readableForeground('#ffffff')).toBe('#111827')
    expect(readableForeground('#facc15')).toBe('#111827')
    expect(readableForeground('#a5b4fc')).toBe('#111827')
    // Svetlija crvena: beli tekst bi imao kontrast ispod 4.5:1
    expect(readableForeground('#dc5b5b')).toBe('#111827')
  })
})
