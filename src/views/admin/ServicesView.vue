<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { PencilIcon, XIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { servicesApi } from '@/api/services'
import { adminApi } from '@/api/admin'
import type { Service } from '@/api/services'
import type { Worker } from '@/api/admin'
import { useAdminContextStore } from '@/stores/adminContext'
import { apiErrorMessage } from '@/lib/apiError'
import { formatPrice } from '@/lib/price'
import { useTenantStore } from '@/stores/tenant'

const { t, locale } = useI18n()
const tenantStore = useTenantStore()
const priceLabel = computed(() =>
  tenantStore.config?.currency ? `${t('services.price')} (${tenantStore.config.currency})` : t('services.price')
)
const { confirm } = useConfirm()
const adminContext = useAdminContextStore()

const services = ref<Service[]>([])
const workers = ref<Worker[]>([])
const loading = ref(true)
const showForm = ref(false)
const submitting = ref(false)
const error = ref('')
const editingId = ref<number | null>(null)
const expandedWorkers = ref<Record<number, boolean>>({})

const form = ref({
  name: '',
  duration_minutes: 30 as number | string,
  price: '' as string,
  is_active: true,
})

const editForm = ref({
  name: '',
  duration_minutes: 30 as number | string,
  price: '' as string,
  is_active: true,
})

onMounted(async () => {
  await Promise.all([fetchServices(), fetchWorkers()])
})

async function fetchServices() {
  loading.value = true
  try {
    const { data } = await servicesApi.getServices()
    services.value = data
  } finally {
    loading.value = false
  }
}

async function fetchWorkers() {
  try {
    const { data } = await adminApi.getWorkers(adminContext.selectedClient?.id)
    workers.value = data
  } catch {}
}

async function handleCreate() {
  if (!form.value.name) {
    error.value = t('services.nameRequired')
    return
  }
  if (!form.value.duration_minutes) {
    error.value = t('services.durationRequired')
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await servicesApi.createService({
      name: form.value.name,
      duration_minutes: Number(form.value.duration_minutes),
      price: form.value.price ? Number(form.value.price) : null,
      is_active: form.value.is_active,
    })
    form.value = { name: '', duration_minutes: 30, price: '', is_active: true }
    showForm.value = false
    await fetchServices()
  } catch (e) {
    error.value = apiErrorMessage(e, t('services.addError'))
  } finally {
    submitting.value = false
  }
}

function startEdit(service: Service) {
  editingId.value = service.id
  editForm.value = {
    name: service.name,
    duration_minutes: service.duration_minutes,
    price: service.price ?? '',
    is_active: service.is_active,
  }
}

async function handleUpdate(id: number) {
  submitting.value = true
  error.value = ''
  try {
    await servicesApi.updateService(id, {
      name: editForm.value.name,
      duration_minutes: Number(editForm.value.duration_minutes),
      price: editForm.value.price ? Number(editForm.value.price) : null,
      is_active: editForm.value.is_active,
    })
    editingId.value = null
    await fetchServices()
  } catch (e) {
    error.value = apiErrorMessage(e, t('services.updateError'))
  } finally {
    submitting.value = false
  }
}

async function handleDelete(service: Service) {
  if (!await confirm(t('services.deleteConfirm', { name: service.name }))) return
  try {
    await servicesApi.deleteService(service.id)
    await fetchServices()
  } catch (e) {
    error.value = apiErrorMessage(e, t('services.deleteError'))
  }
}

function toggleWorkers(id: number) {
  expandedWorkers.value[id] = !expandedWorkers.value[id]
}

function isWorkerAssigned(service: Service, workerId: number): boolean {
  return service.workers?.some(w => w.id === workerId) ?? false
}

async function toggleWorkerAssignment(service: Service, worker: Worker) {
  try {
    if (isWorkerAssigned(service, worker.id)) {
      await servicesApi.unassignWorker(service.id, worker.id)
    } else {
      await servicesApi.assignWorker(service.id, worker.id)
    }
    await fetchServices()
  } catch (e) {
    error.value = apiErrorMessage(e, t('services.assignError'))
  }
}
</script>

<template>
  <AdminLayout>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold">{{ t('services.title') }}</h1>
      <Button @click="showForm = !showForm">{{ t('services.addBtn') }}</Button>
    </div>

    <!-- Create form -->
    <Card v-if="showForm" class="mb-6">
      <CardContent class="space-y-3">
        <Input
          v-model="form.name"
          type="text"
          :aria-label="t('services.name')"
          :placeholder="t('services.name') + ' *'"
        />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="grid gap-1.5 min-w-0">
            <Label for="service-duration">{{ t('services.duration') }}</Label>
            <Input id="service-duration" v-model="form.duration_minutes" type="number" min="1" class="min-w-0" />
          </div>
          <div class="grid gap-1.5 min-w-0">
            <Label for="service-price">{{ priceLabel }}</Label>
            <Input
              id="service-price"
              v-model="form.price"
              type="number"
              min="0"
              step="0.01"
              :placeholder="t('common.optional')"
              class="min-w-0"
            />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox id="service-active" v-model="form.is_active" />
          <Label for="service-active" class="text-sm font-normal text-foreground">{{ t('services.active') }}</Label>
        </div>
        <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
        <div class="flex gap-2 sm:justify-end">
          <Button class="flex-1 sm:flex-none sm:px-6" :disabled="submitting" @click="handleCreate">
            {{ submitting ? t('services.saving') : t('common.save') }}
          </Button>
          <Button variant="outline" class="flex-1 sm:flex-none sm:px-6" @click="showForm = false; error = ''">
            {{ t('common.cancel') }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <div v-if="loading" class="text-muted-foreground text-sm">{{ t('common.loading') }}</div>

    <div v-else class="space-y-2">
      <!-- Service row -->
      <Card v-for="service in services" :key="service.id" class="gap-0 py-0">
        <!-- Edit form -->
        <div v-if="editingId === service.id" class="p-4 space-y-3">
          <Input
            v-model="editForm.name"
            type="text"
            :aria-label="t('services.name')"
            :placeholder="t('services.name')"
          />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="grid gap-1.5 min-w-0">
              <Label :for="`service-duration-${service.id}`">{{ t('services.duration') }}</Label>
              <Input :id="`service-duration-${service.id}`" v-model="editForm.duration_minutes" type="number" min="1" class="min-w-0" />
            </div>
            <div class="grid gap-1.5 min-w-0">
              <Label :for="`service-price-${service.id}`">{{ priceLabel }}</Label>
              <Input
                :id="`service-price-${service.id}`"
                v-model="editForm.price"
                type="number"
                min="0"
                step="0.01"
                :placeholder="t('common.optional')"
                class="min-w-0"
              />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Checkbox :id="`service-active-${service.id}`" v-model="editForm.is_active" />
            <Label :for="`service-active-${service.id}`" class="text-sm font-normal text-foreground">{{ t('services.active') }}</Label>
          </div>
          <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
          <div class="flex gap-2 sm:justify-end">
            <Button class="flex-1 sm:flex-none sm:px-6" :disabled="submitting" @click="handleUpdate(service.id)">
              {{ submitting ? t('services.saving') : t('common.save') }}
            </Button>
            <Button variant="outline" class="flex-1 sm:flex-none sm:px-6" @click="editingId = null">
              {{ t('common.cancel') }}
            </Button>
          </div>
        </div>

        <!-- Normal view -->
        <div v-else class="p-4 flex items-start sm:items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-medium break-words">{{ service.name }}</p>
              <Badge v-if="service.is_active" class="bg-green-100 text-green-700">
                {{ t('services.active') }}
              </Badge>
            </div>
            <p
              v-if="workers.length > 0 && !service.workers?.length"
              class="text-[11px] text-amber-600 mt-1"
              data-testid="service-unassigned"
            >
              {{ t('services.unassigned') }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ service.duration_minutes }} min
              <template v-if="service.price"> · {{ formatPrice(service.price, locale, tenantStore.config?.currency) }}</template>
            </p>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <Button variant="link" size="xs" class="px-1" @click="toggleWorkers(service.id)">
              {{ t('services.assignWorkers') }}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground"
              :aria-label="t('services.edit')"
              @click="startEdit(service)"
            >
              <PencilIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground hover:text-destructive"
              :aria-label="t('common.delete')"
              @click="handleDelete(service)"
            >
              <XIcon />
            </Button>
          </div>
        </div>

        <!-- Worker assignment section -->
        <template v-if="expandedWorkers[service.id] && editingId !== service.id">
          <Separator />
          <div class="px-4 py-3">
            <div v-if="workers.length === 0" class="text-xs text-muted-foreground">
              {{ t('workers.noWorkers') }}
            </div>
            <div v-else class="space-y-2">
              <div v-for="worker in workers" :key="worker.id" class="flex items-center gap-2.5">
                <Checkbox
                  :id="`service-${service.id}-worker-${worker.id}`"
                  :model-value="isWorkerAssigned(service, worker.id)"
                  @update:model-value="toggleWorkerAssignment(service, worker)"
                />
                <Label :for="`service-${service.id}-worker-${worker.id}`" class="text-sm font-normal text-foreground">
                  {{ worker.name }}
                </Label>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <div v-if="services.length === 0" class="text-center py-8 text-muted-foreground text-sm">
        {{ t('services.noServices') }}
      </div>
    </div>
  </AdminLayout>
</template>
