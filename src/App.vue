<script setup lang="ts">
import { isPlatformHostname } from '@/lib/domain'
import { computed, onMounted } from 'vue'
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

const onTenantSite = isTenantDomain()

// Na sajtu firme se ništa ne prikazuje dok izgled firme nije poznat (iz keša ili sa API-ja),
// da se ne vidi podrazumevana boja i naziv pa tek onda pravi. Greška API-ja ne blokira stranicu.
const ready = computed(() => !onTenantSite || tenant.config !== null || tenant.loaded)

onMounted(async () => {
  // Prijava i izgled firme ne zavise jedno od drugog, pa se učitavaju istovremeno
  await Promise.all([auth.fetchMe(), onTenantSite ? tenant.fetchConfig() : Promise.resolve()])
})
</script>

<template>
  <RouterView v-if="ready" />
  <ConfirmModal />
  <ToastContainer />
</template>
