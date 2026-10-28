<script setup lang="ts">
import { useTenantStore } from '@/stores/tenant'
import AppLogo from '@/components/brand/AppLogo.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'
import TenantLogo from '@/components/TenantLogo.vue'

defineProps<{
  title: string
  subtitle?: string
}>()

// Na adresi klijenta prikazujemo njegov brend, a na glavnom domenu brend platforme
const tenant = useTenantStore()
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <nav class="bg-white border-b border-gray-100 px-4 py-3">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <div v-if="tenant.config" class="flex items-center gap-2.5" data-testid="auth-tenant-brand">
          <TenantLogo :src="tenant.logoUrl" :size="24" />
          <span class="font-semibold text-gray-900">{{ tenant.appName }}</span>
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
          <h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
          <p v-if="subtitle" class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
        </div>

        <slot />
      </div>
    </main>
  </div>
</template>
