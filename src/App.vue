<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

const auth = useAuthStore()
const tenant = useTenantStore()

onMounted(async () => {
  await Promise.all([auth.fetchMe(), tenant.fetchConfig()])
})
</script>

<template>
  <RouterView />
</template>
