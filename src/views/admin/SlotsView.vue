<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { XIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { adminApi } from '@/api/admin'
import { useAdminContextStore } from '@/stores/adminContext'
import type { Worker } from '@/api/admin'
import type { Slot } from '@/api/booking'
import { apiErrorMessage } from '@/lib/apiError'

const { t, locale } = useI18n()
const { confirm } = useConfirm()
const adminContext = useAdminContextStore()

const slots = ref<Slot[]>([])
const workers = ref<Worker[]>([])
const loading = ref(true)
const showForm = ref(false)
const submitting = ref(false)
const error = ref('')

const form = ref({
  worker_id: '',
  date: '',
  start_time: '',
  end_time: '',
})

onMounted(async () => {
  await Promise.all([fetchSlots(), fetchWorkers()])
})

async function fetchSlots() {
  loading.value = true
  try {
    const { data } = await adminApi.getSlots(adminContext.selectedClient?.id)
    slots.value = data
  } finally {
    loading.value = false
  }
}

async function fetchWorkers() {
  const { data } = await adminApi.getWorkers(adminContext.selectedClient?.id)
  workers.value = data
}

async function handleCreate() {
  if (!form.value.worker_id || !form.value.date || !form.value.start_time || !form.value.end_time) {
    error.value = t('slots.timeRequired')
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await adminApi.createSlot({
      worker_id: Number(form.value.worker_id),
      date: form.value.date,
      start_time: form.value.start_time,
      end_time: form.value.end_time,
    })
    form.value = { worker_id: '', date: '', start_time: '', end_time: '' }
    showForm.value = false
    await fetchSlots()
  } catch (e) {
    error.value = apiErrorMessage(e, t('slots.addError'))
  } finally {
    submitting.value = false
  }
}

async function handleDelete(slot: Slot) {
  if (!await confirm(t('slots.deleteConfirm'))) return
  await adminApi.deleteSlot(slot.id)
  await fetchSlots()
}

function formatDate(date: string) {
  return new Date(date.slice(0, 10) + 'T00:00:00').toLocaleDateString(locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
</script>

<template>
  <AdminLayout>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold">{{ t('slots.title') }}</h1>
      <Button @click="showForm = !showForm">{{ t('slots.addBtn') }}</Button>
    </div>

    <Card v-if="showForm" class="mb-6">
      <CardContent>
        <h2 class="text-sm font-medium mb-4">{{ t('slots.formTitle') }}</h2>
        <div class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NativeSelect v-model="form.worker_id" class="min-w-0" :aria-label="t('slots.workerPlaceholder')">
              <NativeSelectOption value="">{{ t('slots.workerPlaceholder') }} *</NativeSelectOption>
              <NativeSelectOption v-for="w in workers" :key="w.id" :value="w.id">
                {{ w.name }}
              </NativeSelectOption>
            </NativeSelect>
            <Input
              v-model="form.date"
              type="date"
              :min="new Date().toISOString().slice(0, 10)"
              class="min-w-0"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5 min-w-0">
              <Label for="slot-start">{{ t('slots.startTime') }}</Label>
              <Input id="slot-start" v-model="form.start_time" type="time" class="min-w-0" />
            </div>
            <div class="grid gap-1.5 min-w-0">
              <Label for="slot-end">{{ t('slots.endTime') }}</Label>
              <Input id="slot-end" v-model="form.end_time" type="time" class="min-w-0" />
            </div>
          </div>
          <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
          <div class="flex gap-2 sm:justify-end">
            <Button class="flex-1 sm:flex-none sm:px-6" :disabled="submitting" @click="handleCreate">
              {{ submitting ? t('slots.saving') : t('common.save') }}
            </Button>
            <Button variant="outline" class="flex-1 sm:flex-none sm:px-6" @click="showForm = false">
              {{ t('common.cancel') }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <div v-if="loading" class="text-muted-foreground text-sm">{{ t('common.loading') }}</div>

    <div v-else class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="slot in slots" :key="slot.id" size="sm">
        <CardContent class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-medium capitalize">
              {{ formatDate(slot.date) }} ·
              {{ slot.start_time.slice(0, 5) }} — {{ slot.end_time.slice(0, 5) }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ slot.worker.name }}</p>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <Badge :class="slot.is_available ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'">
              {{ slot.is_available ? t('slots.available') : t('slots.taken') }}
            </Badge>
            <Button
              v-if="slot.is_available"
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground hover:text-destructive"
              :aria-label="t('common.delete')"
              @click="handleDelete(slot)"
            >
              <XIcon />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div v-if="slots.length === 0" class="col-span-full text-center py-8 text-muted-foreground text-sm">
        {{ t('slots.noSlots') }}
      </div>
    </div>
  </AdminLayout>
</template>
