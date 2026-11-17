<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import ServiceCard from '@/components/admin/ServiceCard.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { servicesApi } from '@/api/services'
import { adminApi } from '@/api/admin'
import type { Service } from '@/api/services'
import type { Worker } from '@/api/admin'
import { useAdminContextStore } from '@/stores/adminContext'
import { useTenantStore } from '@/stores/tenant'
import { apiErrorMessage } from '@/lib/apiError'
import { DURATIONS } from '@/lib/serviceDurations'

const { t } = useI18n()
const tenantStore = useTenantStore()
const { confirm } = useConfirm()
const adminContext = useAdminContextStore()

const services = ref<Service[]>([])
const workers = ref<Worker[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const form = ref({ name: '', duration: 30, price: '' })

onMounted(async () => {
  try {
    const [s, w] = await Promise.all([servicesApi.getServices(), adminApi.getWorkers(adminContext.selectedClient?.id)])
    services.value = s.data
    workers.value = w.data
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    loading.value = false
  }
})

/** Izvršava izmenu i ponovo učitava usluge; poruka greške zavisi od akcije. */
async function act(action: () => Promise<unknown>, fallback: string) {
  busy.value = true
  error.value = ''
  try {
    await action()
    services.value = (await servicesApi.getServices()).data
    return true
  } catch (e) {
    error.value = apiErrorMessage(e, t(fallback))
    return false
  } finally {
    busy.value = false
  }
}

async function add() {
  if (!form.value.name.trim()) return
  const ok = await act(
    () =>
      servicesApi.createService({
        name: form.value.name.trim(),
        duration_minutes: Number(form.value.duration),
        price: form.value.price ? Number(form.value.price) : null,
        is_active: true,
      }),
    'services.addError',
  )
  if (ok) form.value = { name: '', duration: 30, price: '' }
}

async function remove(service: Service) {
  if (!(await confirm(t('services.deleteConfirm', { name: service.name })))) return
  await act(() => servicesApi.deleteService(service.id), 'services.deleteError')
}

function toggleWorker(service: Service, worker: Worker) {
  const assigned = service.workers?.some((w) => w.id === worker.id)
  void act(
    () => (assigned ? servicesApi.unassignWorker(service.id, worker.id) : servicesApi.assignWorker(service.id, worker.id)),
    'services.assignError',
  )
}
</script>

<template>
  <AdminLayout :title="t('services.title')">
    <div class="flex flex-col gap-5">
      <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
      <div v-if="loading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</div>

      <div v-else class="flex flex-col gap-3">
        <ServiceCard
          v-for="service in services"
          :key="service.id"
          :service="service"
          :workers="workers"
          :currency="tenantStore.config?.currency"
          :busy="busy"
          @toggle-active="act(() => servicesApi.updateService(service.id, { is_active: $event }), 'services.updateError')"
          @update="act(() => servicesApi.updateService(service.id, $event), 'services.updateError')"
          @remove="remove(service)"
          @toggle-worker="toggleWorker(service, $event)"
        />
        <div v-if="services.length === 0" class="rounded-xl border border-gray-100 bg-card px-6 py-8 text-center text-sm text-gray-600">
          {{ t('services.noServices') }}
        </div>
      </div>

      <section class="flex flex-col gap-3.5 rounded-xl border border-gray-100 bg-card p-5">
        <h2 class="text-lg font-semibold">{{ t('services.addTitle') }}</h2>
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="add">
          <div class="grid min-w-0 flex-[1_1_200px] gap-1">
            <Label for="new-service-name">{{ t('services.name') }}</Label>
            <Input id="new-service-name" v-model="form.name" type="text" />
          </div>
          <div class="grid w-32 gap-1">
            <Label for="new-service-duration">{{ t('services.durationShort') }}</Label>
            <NativeSelect id="new-service-duration" v-model="form.duration">
              <NativeSelectOption v-for="d in DURATIONS" :key="d" :value="d">{{ d }} min</NativeSelectOption>
            </NativeSelect>
          </div>
          <div class="grid w-36 gap-1">
            <Label for="new-service-price">{{ t('services.priceOptional', { currency: tenantStore.config?.currency ?? '' }) }}</Label>
            <Input id="new-service-price" v-model="form.price" type="number" min="0" step="0.01" inputmode="decimal" />
          </div>
          <Button type="submit" class="min-h-11" :disabled="busy || !form.name.trim()">{{ t('services.add') }}</Button>
        </form>
        <p class="text-[13px] text-gray-600">{{ t('services.addHint') }}</p>
      </section>
    </div>
  </AdminLayout>
</template>
