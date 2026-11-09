<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { PencilIcon, XIcon } from '@lucide/vue'
import WorkerAvatar from '@/components/WorkerAvatar.vue'
import WorkerProfileEditor from '@/components/admin/WorkerProfileEditor.vue'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { adminApi } from '@/api/admin'
import { useAdminContextStore } from '@/stores/adminContext'
import type { Worker } from '@/api/admin'
import { apiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/utils'

const { t } = useI18n()
const { confirm } = useConfirm()
const toast = useToast()
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
  bio: '',
})

// Radnik čiji se opis i slika upravo uređuju
const editingId = ref<number | null>(null)

function onWorkerUpdated(updated: Worker) {
  workers.value = workers.value.map((w) => (w.id === updated.id ? { ...w, name: updated.name, worker_profile: updated.worker_profile } : w))
}

// Slika izabrana u formi za novog radnika; postavlja se odmah posle kreiranja
const newPhoto = ref<File | null>(null)
const newPhotoPreview = ref<string | null>(null)

function setNewPhoto(file: File | null) {
  if (newPhotoPreview.value) URL.revokeObjectURL(newPhotoPreview.value)
  newPhoto.value = file
  newPhotoPreview.value = file ? URL.createObjectURL(file) : null
}

function pickNewPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  setNewPhoto(input.files?.[0] ?? null)
  input.value = ''
}

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
    const { data: created } = await adminApi.createWorker(form.value)
    if (newPhoto.value) {
      try {
        await adminApi.uploadWorkerPhoto(created.id, newPhoto.value)
      } catch (e) {
        toast.error(apiErrorMessage(e, t('workers.photoError')))
      }
    }
    form.value = { name: '', email: '', phone: '', bio: '' }
    setNewPhoto(null)
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
          <div class="flex items-center gap-3">
            <WorkerAvatar :photo-url="newPhotoPreview" :size="12" />
            <label class="cursor-pointer">
              <span :class="cn(buttonVariants({ variant: 'outline', size: 'sm' }))" data-testid="new-worker-photo">
                {{ newPhoto ? t('workers.changePhoto') : t('workers.uploadPhoto') }}
              </span>
              <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="pickNewPhoto" />
            </label>
            <span class="text-xs text-muted-foreground">{{ t('workers.photoOptional') }}</span>
          </div>
          <Textarea
            v-model="form.bio"
            rows="2"
            maxlength="500"
            :aria-label="t('workers.bio')"
            :placeholder="t('workers.bioPlaceholder')"
            class="resize-none field-sizing-fixed"
          />
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
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <WorkerAvatar :photo-url="worker.worker_profile?.photo_url" :size="12" />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ worker.name }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ worker.email ?? worker.worker_profile?.phone ?? '—' }}</p>
                <p v-if="worker.worker_profile?.bio" class="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {{ worker.worker_profile.bio }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                class="gap-1.5"
                :aria-expanded="editingId === worker.id"
                @click="editingId = editingId === worker.id ? null : worker.id"
              >
                <PencilIcon />
                {{ t('workers.edit') }}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                class="text-muted-foreground hover:text-destructive"
                :aria-label="t('common.delete')"
                @click="handleDelete(worker)"
              >
                <XIcon />
              </Button>
            </div>
          </div>

          <template v-if="editingId === worker.id">
            <Separator />
            <WorkerProfileEditor :worker="worker" can-edit-name @updated="onWorkerUpdated" />
          </template>
        </CardContent>
      </Card>

      <div v-if="workers.length === 0" class="text-center py-8 text-muted-foreground text-sm">
        {{ t('workers.noWorkers') }}
      </div>
    </div>
  </AdminLayout>
</template>
