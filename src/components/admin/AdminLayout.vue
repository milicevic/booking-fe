<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}

const navItems = [
  { name: 'dashboard', label: 'Pregled', icon: '📊' },
  { name: 'bookings', label: 'Rezervacije', icon: '📅' },
  { name: 'slots', label: 'Termini', icon: '🕐' },
  { name: 'workers', label: 'Radnici', icon: '👥' },
]
</script>

<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Top nav -->
    <nav class="bg-white border-b border-gray-100 px-4 py-3">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <span class="font-semibold text-gray-900">
          {{ auth.client?.name }}
        </span>
        <button
          @click="handleLogout"
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          Odjava
        </button>
      </div>
    </nav>

    <!-- Bottom nav (mobile) -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-10">
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
    <main class="max-w-5xl mx-auto px-4 pt-6 pb-24">
      <slot />
    </main>
  </div>
</template>
