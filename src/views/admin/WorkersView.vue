<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { XIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { adminApi } from '@/api/admin'
import { useAdminContextStore } from '@/stores/adminContext'
import type { Worker } from '@/api/admin'
import { apiErrorMessage } from '@/lib/apiError'

const { t } = useI18n()
const { confirm } = useConfirm()
const adminContext = useAdminContextStore()
const workers = ref<Worker[]>([])
const loading = ref(true)
const showForm = ref(false)
const submitting = ref(false)
const error = ref('')

const form = ref({
  name: '',
  email: '',
  phone: '',
})

onMounted(async () => {
  await fetchWorkers()
})

async function fetchWorkers() {
  loading.value = true
  try {
    const { data } = await adminApi.getWorkers(adminContext.selectedClient?.id)
    workers.value = data
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!form.value.name) {
    error.value = t('workers.nameRequired')
    return
  }

  submitting.value = true
  error.value = ''

  try {
    await adminApi.createWorker(form.value)
    form.value = { name: '', email: '', phone: '' }
    showForm.value = false
    await fetchWorkers()
  } catch (e) {
    error.value = apiErrorMessage(e, t('workers.addError'))
  } finally {
    submitting.value = false
  }
}

async function handleDelete(worker: Worker) {
  if (!await confirm(t('workers.deleteConfirm', { name: worker.name }))) return
  await adminApi.deleteWorker(worker.id)
  await fetchWorkers()
}
</script>

<template>
  <AdminLayout>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold">{{ t('workers.title') }}</h1>
      <Button @click="showForm = !showForm">{{ t('workers.addBtn') }}</Button>
    </div>

    <Card v-if="showForm" class="mb-6">
      <CardContent>
        <h2 class="text-sm font-medium mb-4">{{ t('workers.formTitle') }}</h2>
        <div class="space-y-3">
          <Input
            v-model="form.name"
            type="text"
            :aria-label="t('workers.namePlaceholder')"
            :placeholder="t('workers.namePlaceholder')"
          />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              v-model="form.email"
              type="email"
              :aria-label="t('workers.emailPlaceholder')"
              :placeholder="t('workers.emailPlaceholder')"
              class="min-w-0"
            />
            <Input
              v-model="form.phone"
              type="tel"
              :aria-label="t('workers.phonePlaceholder')"
              :placeholder="t('workers.phonePlaceholder')"
              class="min-w-0"
            />
          </div>
          <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
          <div class="flex gap-2 sm:justify-end">
            <Button class="flex-1 sm:flex-none sm:px-6" :disabled="submitting" @click="handleCreate">
              {{ submitting ? t('workers.saving') : t('common.save') }}
            </Button>
            <Button variant="outline" class="flex-1 sm:flex-none sm:px-6" @click="showForm = false">
              {{ t('common.cancel') }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <div v-if="loading" class="text-muted-foreground text-sm">{{ t('common.loading') }}</div>

    <div v-else class="space-y-2">
      <Card v-for="worker in workers" :key="worker.id" size="sm">
        <CardContent class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 shrink-0 bg-accent rounded-full flex items-center justify-center text-primary font-medium text-sm">
              {{ worker.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ worker.name }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ worker.email ?? worker.worker_profile?.phone ?? '—' }}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            class="text-muted-foreground hover:text-destructive shrink-0"
            :aria-label="t('common.delete')"
            @click="handleDelete(worker)"
          >
            <XIcon />
          </Button>
        </CardContent>
      </Card>

      <div v-if="workers.length === 0" class="text-center py-8 text-muted-foreground text-sm">
        {{ t('workers.noWorkers') }}
      </div>
    </div>
  </AdminLayout>
</template>
