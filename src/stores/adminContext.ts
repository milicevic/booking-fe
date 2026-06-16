import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminClient } from '@/api/admin'

export const useAdminContextStore = defineStore('adminContext', () => {
  const selectedClient = ref<AdminClient | null>(null)

  function selectClient(client: AdminClient) {
    selectedClient.value = client
  }

  function clearClient() {
    selectedClient.value = null
  }

  return { selectedClient, selectClient, clearClient }
})
