<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CheckIcon } from '@lucide/vue'
import { useTenantStore } from '@/stores/tenant'
import AppLogo from '@/components/brand/AppLogo.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'
import TenantLogo from '@/components/TenantLogo.vue'

defineProps<{
  title: string
  subtitle?: string
  /** Registracija: panel sa prednostima pored forme (samo na širokim ekranima) */
  split?: boolean
}>()

const { t } = useI18n()
const benefits = ['trial', 'address', 'noAccount'] as const

// Na adresi klijenta prikazujemo njegov brend, a na glavnom domenu brend platforme
const tenant = useTenantStore()
</script>

<template>
  <div class="min-h-screen" :class="split ? 'lg:grid lg:grid-cols-2' : ''">
    <aside
      v-if="split"
      class="hidden lg:flex flex-col justify-between gap-12 bg-primary p-12 text-primary-foreground"
      data-testid="auth-value-panel"
    >
      <AppLogo :tagline="false" :size="32" />
      <div class="max-w-md space-y-6">
        <h2 class="text-4xl font-semibold leading-tight">{{ t('auth.panel.title') }}</h2>
        <ul class="space-y-3.5">
          <li v-for="b in benefits" :key="b" class="flex items-center gap-3">
            <CheckIcon class="size-5 shrink-0" aria-hidden="true" />
            {{ t(`auth.panel.${b}`) }}
          </li>
        </ul>
      </div>
      <p class="text-sm">{{ t('auth.panel.copyright') }}</p>
    </aside>

    <div class="flex min-h-screen flex-col bg-muted/40">
    <nav class="bg-card border-b px-4 py-3">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <div v-if="tenant.config" class="flex items-center gap-2.5" data-testid="auth-tenant-brand">
          <TenantLogo :src="tenant.logoUrl" :size="24" />
          <span class="font-semibold">{{ tenant.appName }}</span>
        </div>
        <RouterLink v-else to="/" data-testid="auth-platform-brand">
          <AppLogo :tagline="false" :size="28" />
        </RouterLink>
        <LangSwitcher />
      </div>
    </nav>

    <main class="flex-1 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold">{{ title }}</h1>
          <p v-if="subtitle" class="text-sm text-muted-foreground mt-1">{{ subtitle }}</p>
        </div>

        <slot />
      </div>
    </main>
    </div>
  </div>
</template>
