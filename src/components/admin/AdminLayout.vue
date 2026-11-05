<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useAdminContextStore } from '@/stores/adminContext'
import SubscriptionBanner from '@/components/SubscriptionBanner.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'
import TenantLogo from '@/components/TenantLogo.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const { t } = useI18n()

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const tenant = useTenantStore()
const adminContext = useAdminContextStore()

const isAdmin = computed(() => auth.client?.role === 'admin')
const showBottomNav = computed(() => !isAdmin.value || !!adminContext.selectedClient)

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}

function handleBack() {
  adminContext.clearClient()
  router.push({ name: 'dashboard' })
}

const isClient = computed(() => auth.client?.role === 'client')

const navItems = computed(() => [
  { name: 'dashboard', label: t('nav.overview'), icon: '📊' },
  { name: 'bookings', label: t('nav.bookings'), icon: '📅' },
  { name: 'slots', label: t('nav.slots'), icon: '🕐' },
  { name: 'workers', label: t('nav.workers'), icon: '👥' },
  { name: 'services', label: t('nav.services'), icon: '💆' },
  ...(isClient.value ? [{ name: 'branding', label: t('nav.branding'), icon: '🎨' }] : []),
])
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Subscription banner -->
    <SubscriptionBanner />

    <!-- Top nav -->
    <nav class="bg-card border-b px-4 py-3">
      <div class="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <!-- Admin in client context: back button + client name -->
          <template v-if="isAdmin && adminContext.selectedClient">
            <Button variant="link" class="h-auto px-0 mr-2" @click="handleBack">
              {{ t('nav.clients') }}
            </Button>
            <span class="font-semibold">{{ adminContext.selectedClient.name }}</span>
            <Badge v-if="adminContext.selectedClient.is_suspended" variant="destructive">
              {{ t('nav.suspended') }}
            </Badge>
          </template>

          <!-- Admin on main page -->
          <template v-else-if="isAdmin">
            <span class="font-semibold">{{ t('nav.adminPanel') }}</span>
          </template>

          <!-- Client / worker -->
          <template v-else>
            <TenantLogo :src="tenant.logoUrl" :size="24" />
            <span class="font-semibold truncate">{{ tenant.appName }}</span>
          </template>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <LangSwitcher />
          <Button variant="ghost" size="sm" class="text-muted-foreground" @click="handleLogout">
            {{ t('nav.logout') }}
          </Button>
        </div>
      </div>
    </nav>

    <!-- Navigacija na tabletu i desktopu: tabovi ispod gornje trake -->
    <nav v-if="showBottomNav" class="hidden md:block bg-card border-b px-4">
      <div class="max-w-5xl mx-auto flex gap-1">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="route.name === item.name
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'"
        >
          <span class="leading-none">{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </div>
    </nav>

    <!-- Navigacija na telefonu: donja traka — prikazuje se samo za non-admin ili admin u kontekstu klijenta -->
    <nav v-if="showBottomNav" class="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex z-10 pb-[env(safe-area-inset-bottom)]">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex-1 min-w-0 flex flex-col items-center py-2.5 px-0.5 text-[10px] min-[400px]:text-xs gap-1 transition-colors"
        :class="route.name === item.name
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'"
      >
        <span class="text-lg leading-none">{{ item.icon }}</span>
        <span class="max-w-full truncate">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- Content -->
    <main class="max-w-5xl mx-auto px-4 pt-6" :class="showBottomNav ? 'pb-24 md:pb-8' : 'pb-6'">
      <slot />
    </main>
  </div>
</template>
