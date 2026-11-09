<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

// Cloudflare Turnstile: potvrda da kupac nije bot, bez slagalica. Uključena je samo kad je
// postavljen VITE_TURNSTILE_SITE_KEY; backend tada proverava token (TURNSTILE_SECRET_KEY).

interface Turnstile {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptLoading: Promise<void> | null = null

function loadScript(): Promise<void> {
  scriptLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile script failed to load'))
    document.head.appendChild(script)
  })
  return scriptLoading
}

const token = defineModel<string | null>({ default: null })
const { locale } = useI18n()
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
const container = ref<HTMLElement | null>(null)
let widgetId: string | null = null

onMounted(async () => {
  if (!siteKey || !container.value) return
  await loadScript()
  if (!window.turnstile || !container.value) return
  widgetId = window.turnstile.render(container.value, {
    sitekey: siteKey,
    language: locale.value,
    appearance: 'interaction-only',
    callback: (value: string) => (token.value = value),
    'expired-callback': () => (token.value = null),
    'error-callback': () => (token.value = null),
  })
})

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
})

/** Token važi za jedan zahtev: posle neuspelog slanja treba tražiti novi. */
function reset() {
  token.value = null
  if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
}

defineExpose({ reset })
</script>

<template>
  <div v-if="siteKey" ref="container" data-testid="captcha" />
</template>
