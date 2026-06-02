import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tenantApi } from '@/api/tenant'
import type { TenantConfig } from '@/api/tenant'

export const useTenantStore = defineStore('tenant', () => {
  const config = ref<TenantConfig | null>(null)
  const loaded = ref(false)

  const appName = computed(() => config.value?.app_name ?? 'Booking')
  const logoUrl = computed(() => config.value?.logo_url ?? null)
  const isExpired = computed(() =>
    config.value?.subscription_status === 'expired' ||
    config.value?.subscription_status === 'canceled'
  )
  const isTrialing = computed(() => config.value?.subscription_status === 'trialing')
  const trialDaysLeft = computed(() => {
    if (!config.value?.trial_ends_at) return 0
    const diff = new Date(config.value.trial_ends_at).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  })

  async function fetchConfig() {
    try {
      const { data } = await tenantApi.getConfig()
      config.value = data
      applyTheme(data)
    } catch {
      // Bez tenant config-a - koristi defaults
    } finally {
      loaded.value = true
    }
  }

  function applyTheme(cfg: TenantConfig) {
    const root = document.documentElement
    if (cfg.primary_color) root.style.setProperty('--color-primary', cfg.primary_color)
    if (cfg.secondary_color) root.style.setProperty('--color-secondary', cfg.secondary_color)
  }

  return { config, loaded, appName, logoUrl, isExpired, isTrialing, trialDaysLeft, fetchConfig }
})
