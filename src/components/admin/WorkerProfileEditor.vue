<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminApi } from '@/api/admin'
import type { Worker } from '@/api/admin'
import WorkerAvatar from '@/components/WorkerAvatar.vue'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage } from '@/lib/apiError'
import { cn } from '@/lib/utils'

// Slika, opis i (samo za klijenta) ime radnika; koristi ga klijent za svakog radnika i sam radnik za svoj profil
const props = defineProps<{ worker: Worker; canEditName?: boolean }>()
const emit = defineEmits<{ updated: [worker: Worker] }>()

const { t } = useI18n()

const name = ref(props.worker.name)
const bio = ref(props.worker.worker_profile?.bio ?? '')
const photoUrl = ref(props.worker.worker_profile?.photo_url ?? null)
const savingBio = ref(false)
const bioSaved = ref(false)
const uploading = ref(false)
const error = ref('')

watch(() => props.worker, (worker) => {
  name.value = worker.name
  bio.value = worker.worker_profile?.bio ?? ''
  photoUrl.value = worker.worker_profile?.photo_url ?? null
})

const inputId = `worker-${props.worker.id}`

async function saveBio() {
  if (props.canEditName && !name.value.trim()) {
    error.value = t('workers.nameRequired')
    return
  }

  savingBio.value = true
  bioSaved.value = false
  error.value = ''
  try {
    const newBio = bio.value.trim() || null
    // Klijent menja i ime (PUT /workers); radnik sme samo opis (PATCH /workers/{id}/profile)
    const { data } = props.canEditName
      ? await adminApi.updateWorker(props.worker.id, { name: name.value.trim(), bio: newBio })
      : await adminApi.updateWorkerProfile(props.worker.id, newBio)
    bioSaved.value = true
    emit('updated', data)
  } catch (e) {
    error.value = apiErrorMessage(e, t('workers.updateError'))
  } finally {
    savingBio.value = false
  }
}

async function uploadPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  uploading.value = true
  error.value = ''
  try {
    const { data } = await adminApi.uploadWorkerPhoto(props.worker.id, file)
    photoUrl.value = data.worker_profile?.photo_url ?? null
    emit('updated', data)
  } catch (e) {
    error.value = apiErrorMessage(e, t('workers.photoError'))
  } finally {
    uploading.value = false
  }
}

async function removePhoto() {
  uploading.value = true
  error.value = ''
  try {
    const { data } = await adminApi.deleteWorkerPhoto(props.worker.id)
    photoUrl.value = null
    emit('updated', data)
  } catch (e) {
    error.value = apiErrorMessage(e, t('workers.photoError'))
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-4">
      <WorkerAvatar :photo-url="photoUrl" :size="16" />
      <div class="space-y-2">
        <div class="flex flex-wrap gap-2">
          <label class="cursor-pointer">
            <span
              :class="cn(buttonVariants({ variant: 'outline', size: 'sm' }), uploading && 'opacity-50 pointer-events-none')"
              data-testid="worker-photo-upload"
            >
              {{ uploading ? t('common.loading') : photoUrl ? t('workers.changePhoto') : t('workers.uploadPhoto') }}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="sr-only"
              :disabled="uploading"
              @change="uploadPhoto"
            />
          </label>
          <Button
            v-if="photoUrl"
            variant="ghost"
            size="sm"
            class="text-muted-foreground hover:text-destructive"
            :disabled="uploading"
            @click="removePhoto"
          >
            {{ t('workers.removePhoto') }}
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">{{ t('workers.photoHint') }}</p>
      </div>
    </div>

    <div v-if="canEditName" class="grid gap-1.5">
      <Label :for="`${inputId}-name`">{{ t('workers.name') }}</Label>
      <Input :id="`${inputId}-name`" v-model="name" type="text" maxlength="255" />
    </div>

    <div class="grid gap-1.5">
      <Label :for="`${inputId}-bio`">{{ t('workers.bio') }}</Label>
      <Textarea
        :id="`${inputId}-bio`"
        v-model="bio"
        rows="3"
        maxlength="500"
        :placeholder="t('workers.bioPlaceholder')"
        class="resize-none field-sizing-fixed"
      />
    </div>

    <p v-if="error" class="text-destructive text-sm">{{ error }}</p>

    <div class="flex items-center justify-end gap-3">
      <span v-if="bioSaved" class="text-xs text-green-600">{{ t('workers.saved') }}</span>
      <Button size="sm" :disabled="savingBio" @click="saveBio">
        {{ savingBio ? t('workers.saving') : t('common.save') }}
      </Button>
    </div>
  </div>
</template>
