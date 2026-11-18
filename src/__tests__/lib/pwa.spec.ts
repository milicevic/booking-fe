import { describe, it, expect, beforeEach, vi } from 'vitest'
import { addManifestLink, canPromptInstall, listenForInstallPrompt, promptInstall, setThemeColor } from '@/lib/pwa'

describe('pwa', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('links the per-tenant manifest from the API once', () => {
    addManifestLink('https://api.slotres.click/', 'https://salon-ana.slotres.click')
    addManifestLink('https://api.slotres.click/', 'https://salon-ana.slotres.click')

    const links = document.querySelectorAll('link[rel="manifest"]')
    expect(links).toHaveLength(1)
    expect(links[0]!.getAttribute('href')).toBe(
      'https://api.slotres.click/api/tenant/manifest?origin=https%3A%2F%2Fsalon-ana.slotres.click',
    )
  })

  it('uses a relative URL when the API is proxied', () => {
    addManifestLink('', 'https://salon-a.slotres-local.click:5173')
    expect(document.querySelector('link[rel="manifest"]')!.getAttribute('href')).toBe(
      '/api/tenant/manifest?origin=https%3A%2F%2Fsalon-a.slotres-local.click%3A5173',
    )
  })

  it('sets the browser theme color', () => {
    setThemeColor('#be185d')
    setThemeColor('#0f766e')
    const metas = document.querySelectorAll('meta[name="theme-color"]')
    expect(metas).toHaveLength(1)
    expect(metas[0]!.getAttribute('content')).toBe('#0f766e')
  })

  it('keeps the install prompt and shows it on demand', async () => {
    listenForInstallPrompt()
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn<() => Promise<void>>().mockResolvedValue(),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(canPromptInstall.value).toBe(true)
    expect(await promptInstall()).toBe(true)
    expect(event.prompt).toHaveBeenCalled()
    expect(canPromptInstall.value).toBe(false)
  })
})
