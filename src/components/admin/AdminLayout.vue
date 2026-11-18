<script setup lang="ts">
import { computed, onMounted, type Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CalendarDaysIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ClockIcon,
  LayoutGridIcon,
  ListIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useAdminContextStore } from '@/stores/adminContext'
import { usePendingBookingsStore } from '@/stores/pendingBookings'
import { tenantUrl } from '@/lib/domain'
import SubscriptionBanner from '@/components/SubscriptionBanner.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'
import TenantLogo from '@/components/TenantLogo.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

defineProps<{
  /** Naslov stranice u zaglavlju (kao u dizajnu); bez njega stranica sama crta naslov */
  title?: string
}>()

const { t } = useI18n()

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const tenant = useTenantStore()
const adminContext = useAdminContextStore()
const pending = usePendingBookingsStore()

const isAdmin = computed(() => auth.client?.role === 'admin')
const isClient = computed(() => auth.client?.role === 'client')
const showNav = computed(() => !isAdmin.value || !!adminContext.selectedClient)

const brandName = computed(() => {
  if (isAdmin.value) return adminContext.selectedClient?.name ?? t('nav.adminPanel')
  return tenant.appName
})

const userName = computed(() => auth.client?.name ?? '')
const userInitial = computed(() => userName.value.trim().charAt(0).toUpperCase() || '?')
const roleLabel = computed(() => {
  const role = auth.client?.role
  if (role === 'client') return t('nav.roleClient')
  if (role === 'worker') return t('nav.roleWorker')
  return t('nav.roleAdmin')
})

// Javna stranica za zakazivanje ovog biznisa (vlasnik i radnik)
const siteUrl = computed(() =>
  !isAdmin.value && tenant.config?.subdomain ? tenantUrl(tenant.config.subdomain) : '',
)

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}

function handleBack() {
  adminContext.clearClient()
  router.push({ name: 'dashboard' })
}

// Probni period kao bedž u zaglavlju
const trialLabel = computed(() => {
  // Istekao probni period već prikazuje SubscriptionBanner
  if (isAdmin.value || !tenant.isTrialing || !tenant.trialDaysLeft) return ''
  return t('nav.trial', { n: tenant.trialDaysLeft }, tenant.trialDaysLeft)
})

onMounted(() => {
  if (showNav.value) void pending.refresh(adminContext.selectedClient?.id)
})

interface NavItem {
  name: string
  label: string
  icon: Component
  badge?: number
}

const navItems = computed<NavItem[]>(() => [
  { name: 'dashboard', label: t('nav.overview'), icon: LayoutGridIcon },
  { name: 'bookings', label: t('nav.bookings'), icon: CalendarDaysIcon, badge: pending.count },
  { name: 'calendar', label: t('nav.calendar'), icon: CalendarIcon },
  { name: 'workers', label: t('nav.workers'), icon: UsersIcon },
  { name: 'services', label: t('nav.services'), icon: ListIcon },
  { name: 'slots', label: t('nav.slots'), icon: ClockIcon },
  ...(isClient.value ? [{ name: 'branding', label: t('nav.branding'), icon: SlidersHorizontalIcon }] : []),
])
</script>

<template>
  <div class="min-h-screen bg-gray-50 md:flex">

    <!-- Bočni meni na tabletu i desktopu -->
    <aside class="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:justify-between md:gap-6 md:sticky md:top-0 md:h-screen bg-card border-r px-4 py-5">
      <div class="flex flex-col gap-6 min-h-0">
        <div class="flex items-center gap-2.5 px-2 min-w-0">
          <TenantLogo v-if="!isAdmin" :src="tenant.logoUrl" :size="32" />
          <span class="font-semibold text-lg truncate">{{ brandName }}</span>
        </div>

        <!-- Admin u kontekstu klijenta -->
        <div v-if="isAdmin && adminContext.selectedClient" class="flex flex-col gap-2 px-2">
          <Button variant="link" class="h-auto justify-start px-0" @click="handleBack">
            {{ t('nav.clients') }}
          </Button>
          <Badge v-if="adminContext.selectedClient.is_suspended" variant="destructive" class="self-start">
            {{ t('nav.suspended') }}
          </Badge>
        </div>

        <nav v-if="showNav" :aria-label="t('nav.menu')" class="flex flex-col gap-1 overflow-y-auto">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name }"
            class="flex items-center gap-3 min-h-11 px-3 py-2.5 rounded-lg text-[15px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            :class="route.name === item.name
              ? 'bg-accent text-primary font-semibold'
              : 'text-gray-700 font-medium hover:bg-gray-100'"
            :aria-current="route.name === item.name ? 'page' : undefined"
          >
            <component :is="item.icon" class="size-[18px] shrink-0" aria-hidden="true" />
            <span class="flex-1 truncate">{{ item.label }}</span>
            <span
              v-if="item.badge"
              class="min-w-5 rounded-full bg-amber-100 px-1.5 py-px text-center text-xs font-semibold text-amber-800"
              :aria-label="t('nav.pendingCount', { n: item.badge })"
            >{{ item.badge }}</span>
          </router-link>
        </nav>
      </div>

      <div class="flex flex-col gap-3 border-t border-gray-100 px-2 pt-4">
        <div class="flex items-center gap-2.5 min-w-0">
          <span aria-hidden="true" class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
            {{ userInitial }}
          </span>
          <div class="flex min-w-0 flex-col leading-tight">
            <span class="truncate text-sm font-semibold">{{ userName }}</span>
            <span class="text-[13px] text-gray-600">{{ roleLabel }}</span>
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <Button variant="link" class="h-auto px-0" @click="handleLogout">
            {{ t('nav.logout') }}
          </Button>
          <LangSwitcher />
        </div>
      </div>
    </aside>

    <div class="flex-1 min-w-0">
      <SubscriptionBanner />

      <!-- Gornja traka na telefonu -->
      <header class="md:hidden bg-card border-b px-4 py-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <Button v-if="isAdmin && adminContext.selectedClient" variant="ghost" size="icon-sm" :aria-label="t('nav.clients')" @click="handleBack">
              <ChevronLeftIcon />
            </Button>
            <TenantLogo v-if="!isAdmin" :src="tenant.logoUrl" :size="24" />
            <span class="font-semibold truncate">{{ brandName }}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <LangSwitcher />
            <Button variant="ghost" size="sm" class="text-muted-foreground" @click="handleLogout">
              {{ t('nav.logout') }}
            </Button>
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-4 pt-6 md:px-10 md:pt-8" :class="showNav ? 'pb-24 md:pb-20' : 'pb-6'">
        <div v-if="title" class="mb-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 class="text-[28px] leading-tight font-semibold">{{ title }}</h1>
          <div class="flex flex-wrap items-center gap-3">
            <slot name="actions" />
            <span v-if="trialLabel" class="rounded-full bg-amber-100 px-3 py-1 text-[13px] font-semibold text-amber-800">{{ trialLabel }}</span>
            <Button v-if="siteUrl" variant="outline" as-child>
              <a :href="siteUrl" target="_blank" rel="noopener">{{ t('nav.viewSite') }}</a>
            </Button>
          </div>
        </div>
        <slot />
      </main>
    </div>

    <!-- Donja navigacija na telefonu -->
    <nav
      v-if="showNav"
      :aria-label="t('nav.menu')"
      class="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex z-10 pb-[env(safe-area-inset-bottom)]"
    >
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex-1 min-w-0 flex flex-col items-center py-2.5 px-0.5 text-[10px] min-[400px]:text-xs gap-1 transition-colors"
        :class="route.name === item.name ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'"
        :aria-current="route.name === item.name ? 'page' : undefined"
      >
        <span class="relative">
          <component :is="item.icon" class="size-5" aria-hidden="true" />
          <span v-if="item.badge" class="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-amber-100 px-1 text-[10px] leading-4 font-semibold text-amber-800">{{ item.badge }}</span>
        </span>
        <span class="max-w-full truncate">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>
