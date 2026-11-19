<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { adminApi } from '@/api/admin'
import type { BlockedCustomer } from '@/api/admin'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/lib/apiError'

/** Kupci koje je vlasnik blokirao (blokira se sa rezervacije u „Termini“); ovde se odblokiraju. */
const { t, locale } = useI18n()
const { confirm } = useConfirm()

const customers = ref<BlockedCustomer[]>([])
const loading = ref(true)
const busy = ref<number | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    customers.value = (await adminApi.getBlockedCustomers()).data
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    loading.value = false
  }
})

function since(date: string) {
  return new Date(date).toLocaleDateString(locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function unblock(customer: BlockedCustomer) {
  if (!(await confirm(t('settings.blocked.unblockConfirm', { name: customer.name ?? customer.phone ?? customer.email ?? '' })))) return
  busy.value = customer.id
  error.value = ''
  try {
    await adminApi.unblockCustomer(customer.id)
    customers.value = customers.value.filter((c) => c.id !== customer.id)
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-2.5" data-testid="blocked-customers">
    <span class="text-sm font-medium text-gray-700">{{ t('settings.blocked.title') }}</span>
    <p v-if="loading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>
    <p v-else-if="customers.length === 0" class="text-[13px] text-gray-600">{{ t('settings.blocked.empty') }}</p>
    <ul v-else class="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-100">
      <li v-for="c in customers" :key="c.id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div class="flex min-w-0 flex-col text-sm">
          <span class="font-medium break-words">{{ c.name ?? '—' }}</span>
          <span class="text-[13px] text-gray-600 break-all">
            {{ [c.phone, c.email].filter(Boolean).join(' · ') }} · {{ t('settings.blocked.since', { date: since(c.created_at) }) }}
          </span>
        </div>
        <Button variant="outline" size="sm" :disabled="busy === c.id" @click="unblock(c)">{{ t('settings.blocked.unblock') }}</Button>
      </li>
    </ul>
    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
  </div>
</template>
