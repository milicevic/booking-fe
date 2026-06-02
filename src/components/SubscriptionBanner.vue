<script setup lang="ts">
import { useTenantStore } from '@/stores/tenant'

const tenant = useTenantStore()
</script>

<template>
  <!-- Expired / canceled -->
  <div
    v-if="tenant.isExpired"
    class="bg-red-50 border-b border-red-200 px-4 py-2.5 text-center text-sm text-red-700"
  >
    Vaš nalog je
    {{ tenant.config?.subscription_status === 'canceled' ? 'otkazan' : 'istekao' }}.
    Kontaktirajte podršku za aktivaciju.
  </div>

  <!-- Trialing -->
  <div
    v-else-if="tenant.isTrialing"
    class="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-sm text-amber-700"
  >
    <template v-if="tenant.trialDaysLeft > 0">
      Trial period — ostalo <strong>{{ tenant.trialDaysLeft }} {{ tenant.trialDaysLeft === 1 ? 'dan' : tenant.trialDaysLeft < 5 ? 'dana' : 'dana' }}</strong>.
      Kontaktirajte nas za aktivaciju.
    </template>
    <template v-else>
      Trial period je istekao. Kontaktirajte podršku za aktivaciju.
    </template>
  </div>

  <!-- Pending deploy -->
  <div
    v-else-if="tenant.config?.subscription_status === 'pending_deploy'"
    class="bg-blue-50 border-b border-blue-200 px-4 py-2.5 text-center text-sm text-blue-700"
  >
    Deploy zahtev je na čekanju — administrator obrađuje vaš zahtev.
  </div>
</template>
