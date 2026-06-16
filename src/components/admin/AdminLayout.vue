<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useAdminContextStore } from '@/stores/adminContext'
import SubscriptionBanner from '@/components/SubscriptionBanner.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'

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

const navItems = computed(() => [
  { name: 'dashboard', label: t('nav.overview'), icon: '📊' },
  { name: 'bookings', label: t('nav.bookings'), icon: '📅' },
  { name: 'slots', label: t('nav.slots'), icon: '🕐' },
  { name: 'workers', label: t('nav.workers'), icon: '👥' },
])
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Subscription banner -->
    <SubscriptionBanner />

    <!-- Top nav -->
    <nav class="bg-white border-b border-gray-100 px-4 py-3">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <!-- Admin in client context: back button + client name -->
          <template v-if="isAdmin && adminContext.selectedClient">
            <button
              @click="handleBack"
              class="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium mr-2"
            >
              {{ t('nav.clients') }}
            </button>
            <span class="font-semibold text-gray-900">{{ adminContext.selectedClient.name }}</span>
            <span
              v-if="adminContext.selectedClient.is_suspended"
              class="text-[10px] bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full"
            >
              {{ t('nav.suspended') }}
            </span>
          </template>

          <!-- Admin on main page -->
          <template v-else-if="isAdmin">
            <span class="font-semibold text-gray-900">{{ t('nav.adminPanel') }}</span>
          </template>

          <!-- Client / worker -->
          <template v-else>
            <img v-if="tenant.logoUrl" :src="tenant.logoUrl" alt="logo" class="h-6 w-auto" />
            <span class="font-semibold text-gray-900">{{ tenant.appName }}</span>
          </template>
        </div>

        <div class="flex items-center gap-2">
          <LangSwitcher />
          <button
            @click="handleLogout"
            class="text-sm text-gray-500 hover:text-gray-700"
          >
            {{ t('nav.logout') }}
          </button>
        </div>
      </div>
    </nav>

    <!-- Bottom nav — prikazuje se samo za non-admin ili admin u kontekstu klijenta -->
    <nav v-if="showBottomNav" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-10">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors"
        :class="route.name === item.name
          ? 'text-indigo-600'
          : 'text-gray-400 hover:text-gray-600'"
      >
        <span class="text-lg leading-none">{{ item.icon }}</span>
        {{ item.label }}
      </router-link>
    </nav>

    <!-- Content -->
    <main class="max-w-5xl mx-auto px-4 pt-6" :class="showBottomNav ? 'pb-24' : 'pb-6'">
      <slot />
    </main>
  </div>
</template>
