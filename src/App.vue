<script setup lang="ts">
import { isPlatformHostname } from '@/lib/domain'
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import ConfirmModal from '@/components/ConfirmModal.vue'
import ToastContainer from '@/components/ToastContainer.vue'

const auth = useAuthStore()
const tenant = useTenantStore()

function isTenantDomain(): boolean {
  // U dev modu: tenant subdomain je eksplicitno postavljen u .env
  const devSubdomain = import.meta.env.VITE_TENANT_SUBDOMAIN
  if (devSubdomain) return true

  // U produkciji: main platforma je na VITE_PLATFORM_HOST (npr. booking.app)
  // Sve ostalo je tenant domena
  const platformHost = import.meta.env.VITE_PLATFORM_HOST
  if (!platformHost) return false
  return !isPlatformHostname(window.location.hostname)
}

onMounted(async () => {
  await auth.fetchMe()
  if (isTenantDomain()) {
    await tenant.fetchConfig()
  }
})
</script>

<template>
  <RouterView />
  <ConfirmModal />
  <ToastContainer />
</template>
