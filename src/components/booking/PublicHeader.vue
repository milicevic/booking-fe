<script setup lang="ts">
import { useTenantStore } from '@/stores/tenant'
import TenantLogo from '@/components/TenantLogo.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'

/** Zaglavlje javnih stranica firme: logo (ili početno slovo u boji firme), naziv, desno linkovi i jezik. */
const tenant = useTenantStore()
</script>

<template>
  <header class="border-b bg-card">
    <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
      <router-link :to="{ name: 'booking' }" class="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <TenantLogo v-if="tenant.logoUrl" :src="tenant.logoUrl" :size="40" />
        <span
          v-else
          aria-hidden="true"
          class="flex size-10 flex-none items-center justify-center rounded-[10px] bg-primary text-lg font-semibold text-primary-foreground"
        >{{ tenant.appName.charAt(0).toUpperCase() }}</span>
        <span class="truncate text-lg font-semibold">{{ tenant.appName }}</span>
      </router-link>
      <div class="flex items-center gap-5">
        <slot />
        <LangSwitcher />
      </div>
    </div>
  </header>
</template>
