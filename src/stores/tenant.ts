import { defineStore } from 'pinia'
import { setThemeColor } from '@/lib/pwa'
import { ref, computed } from 'vue'
import { tenantApi } from '@/api/tenant'
import type { TenantConfig } from '@/api/tenant'
import { isHexColor, readableForeground } from '@/lib/color'

// Poslednji izgled firme u ovom pregledaču (localStorage je odvojen po adresi, pa svaka firma ima svoj).
// Primenjuje se pre prvog prikaza, da posle osvežavanja ne bljesne podrazumevana boja i naziv.
const CACHE_KEY = 'tenant-config'

function readCachedConfig(): TenantConfig | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as TenantConfig | null
    return cached && typeof cached === 'object' && typeof cached.app_name === 'string' ? cached : null
  } catch {
    return null
  }
}

function writeCachedConfig(config: TenantConfig) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config))
  } catch {
    // Pregledač ne dozvoljava čuvanje; izgled stiže sa API-ja kao i do sada
  }
}

export const useTenantStore = defineStore('tenant', () => {
  const config = ref<TenantConfig | null>(readCachedConfig())
  const loaded = ref(false)

  const appName = computed(() => config.value?.app_name ?? 'Booking')
  const logoUrl = computed(() => config.value?.logo_url ?? null)
  const isExpired = computed(() =>
    config.value?.subscription_status === 'expired' ||
    config.value?.subscription_status === 'canceled'
  )
  const isTrialing = computed(() => config.value?.subscription_status === 'trialing')
  // Bez datuma isteka ne znamo koliko je ostalo, pa trial ne proglašavamo isteklim
  const trialDaysLeft = computed<number | null>(() => {
    if (!config.value?.trial_ends_at) return null
    const diff = new Date(config.value.trial_ends_at).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  })

  async function fetchConfig() {
    try {
      const { data } = await tenantApi.getConfig()
      config.value = data
      applyTheme(data)
      writeCachedConfig(data)
    } catch {
      // Bez tenant config-a - koristi defaults
    } finally {
      loaded.value = true
    }
  }

  function applyTheme(cfg: TenantConfig) {
    const root = document.documentElement
    // Boja firme postaje --primary teme; nijanse (accent, ring) se izvode iz nje u style.css
    if (isHexColor(cfg.primary_color)) {
      root.style.setProperty('--primary', cfg.primary_color)
      root.style.setProperty('--primary-foreground', readableForeground(cfg.primary_color))
      setThemeColor(cfg.primary_color)
    }
    if (cfg.theme) root.setAttribute('data-theme', cfg.theme)
  }

  if (config.value) applyTheme(config.value)

  return { config, loaded, appName, logoUrl, isExpired, isTrialing, trialDaysLeft, fetchConfig }
})
