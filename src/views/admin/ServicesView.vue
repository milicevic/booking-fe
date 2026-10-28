<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/admin/AdminLayout.vue'
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
      <h1 class="text-xl font-semibold text-gray-900">{{ t('services.title') }}</h1>
      <button
        @click="showForm = !showForm"
        class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {{ t('services.addBtn') }}
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showForm" class="bg-white rounded-xl border border-gray-100 p-5 mb-6">
      <div class="space-y-3">
        <input
          v-model="form.name"
          type="text"
          :placeholder="t('services.name') + ' *'"
          class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div class="flex gap-3">
          <input
            v-model="form.duration_minutes"
            type="number"
            min="1"
            :placeholder="t('services.duration')"
            class="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            v-model="form.price"
            type="number"
            min="0"
            step="0.01"
            :placeholder="t('services.price') + ' (' + t('common.optional') + ')'"
            class="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input v-model="form.is_active" type="checkbox" class="rounded" />
          {{ t('services.active') }}
        </label>
        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
        <div class="flex gap-2">
          <button
            @click="handleCreate"
            :disabled="submitting"
            class="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {{ submitting ? t('services.saving') : t('common.save') }}
          </button>
          <button
            @click="showForm = false; error = ''"
            class="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">{{ t('common.loading') }}</div>

    <div v-else class="space-y-2">
      <!-- Service row -->
      <div
        v-for="service in services"
        :key="service.id"
        class="bg-white rounded-xl border border-gray-100 overflow-hidden"
      >
        <!-- Edit form -->
        <div v-if="editingId === service.id" class="p-4 space-y-3">
          <input
            v-model="editForm.name"
            type="text"
            :placeholder="t('services.name')"
            class="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div class="flex gap-3">
            <input
              v-model="editForm.duration_minutes"
              type="number"
              min="1"
              :placeholder="t('services.duration')"
              class="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              v-model="editForm.price"
              type="number"
              min="0"
              step="0.01"
              :placeholder="t('services.price')"
              class="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input v-model="editForm.is_active" type="checkbox" class="rounded" />
            {{ t('services.active') }}
          </label>
          <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
          <div class="flex gap-2">
            <button
              @click="handleUpdate(service.id)"
              :disabled="submitting"
              class="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {{ submitting ? t('services.saving') : t('common.save') }}
            </button>
            <button
              @click="editingId = null"
              class="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>

        <!-- Normal view -->
        <div v-else class="p-4 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-gray-900">{{ service.name }}</p>
              <span
                v-if="service.is_active"
                class="text-[10px] bg-green-100 text-green-700 font-medium px-1.5 py-0.5 rounded-full"
              >
                {{ t('services.active') }}
              </span>
            </div>
            <p
              v-if="workers.length > 0 && !service.workers?.length"
              class="text-[11px] text-amber-600 mt-1"
              data-testid="service-unassigned"
            >
              {{ t('services.unassigned') }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ service.duration_minutes }} min
              <template v-if="service.price"> · {{ formatPrice(service.price, locale, tenantStore.config?.currency) }}</template>
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="toggleWorkers(service.id)"
              class="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {{ t('services.assignWorkers') }}
            </button>
            <button
              @click="startEdit(service)"
              class="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✏️
            </button>
            <button
              @click="handleDelete(service)"
              class="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Worker assignment section -->
        <div v-if="expandedWorkers[service.id] && editingId !== service.id" class="border-t border-gray-50 px-4 py-3">
          <div v-if="workers.length === 0" class="text-xs text-gray-400">
            {{ t('workers.noWorkers') }}
          </div>
          <div v-else class="space-y-2">
            <label
              v-for="worker in workers"
              :key="worker.id"
              class="flex items-center gap-2.5 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="isWorkerAssigned(service, worker.id)"
                @change="toggleWorkerAssignment(service, worker)"
                class="rounded text-indigo-600"
              />
              <span class="text-sm text-gray-700">{{ worker.name }}</span>
            </label>
          </div>
        </div>
      </div>

      <div v-if="services.length === 0" class="text-center py-8 text-gray-400 text-sm">
        {{ t('services.noServices') }}
      </div>
    </div>
  </AdminLayout>
</template>
