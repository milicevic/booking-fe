<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { PencilIcon, XIcon } from '@lucide/vue'
import WorkerAvatar from '@/components/WorkerAvatar.vue'
import WorkerProfileEditor from '@/components/admin/WorkerProfileEditor.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { adminApi } from '@/api/admin'
import { servicesApi } from '@/api/services'
import type { Service } from '@/api/services'
import { useAdminContextStore } from '@/stores/adminContext'
import type { Worker } from '@/api/admin'
import { apiErrorMessage } from '@/lib/apiError'

const { t } = useI18n()
const { confirm } = useConfirm()
const adminContext = useAdminContextStore()

const workers = ref<Worker[]>([])
const services = ref<Service[]>([])
const loading = ref(true)
const submitting = ref(false)
const savingId = ref<number | null>(null)
const error = ref('')
const listError = ref('')
const invited = ref('')
const form = ref({ name: '', email: '' })

// Radnik čiji se opis i slika upravo uređuju
const editingId = ref<number | null>(null)

const canInvite = computed(() => form.value.name.trim() !== '' && /\S+@\S+\.\S+/.test(form.value.email))

function servicesOf(worker: Worker) {
  const names = services.value.filter((s) => s.workers?.some((w) => w.id === worker.id)).map((s) => s.name)
  return names.length ? t('workers.servicesList', { list: names.join(', ') }) : t('workers.noServices')
}

function onWorkerUpdated(updated: Worker) {
  workers.value = workers.value.map((w) => (w.id === updated.id ? { ...w, name: updated.name, worker_profile: updated.worker_profile } : w))
}

onMounted(load)

async function load() {
  try {
    const [w, s] = await Promise.all([
      adminApi.getWorkers(adminContext.selectedClient?.id),
      servicesApi.getServices().catch(() => ({ data: [] as Service[] })),
    ])
    workers.value = w.data
    services.value = s.data
  } catch (e) {
    listError.value = apiErrorMessage(e, t('common.error'))
  } finally {
    loading.value = false
  }
}

async function invite() {
  if (!canInvite.value) return
  submitting.value = true
  error.value = ''
  invited.value = ''
  try {
    await adminApi.createWorker({ name: form.value.name.trim(), email: form.value.email.trim() })
    invited.value = t('workers.invited', { email: form.value.email.trim() })
    form.value = { name: '', email: '' }
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e, t('workers.addError'))
  } finally {
    submitting.value = false
  }
}

async function toggleCanEdit(worker: Worker, value: boolean) {
  savingId.value = worker.id
  listError.value = ''
  try {
    const { data } = await adminApi.updateWorker(worker.id, { can_edit_slots: value })
    workers.value = workers.value.map((w) => (w.id === worker.id ? { ...w, can_edit_slots: data.can_edit_slots } : w))
  } catch (e) {
    listError.value = apiErrorMessage(e, t('workers.updateError'))
  } finally {
    savingId.value = null
  }
}

async function handleDelete(worker: Worker) {
  if (!(await confirm(t('workers.deleteConfirm', { name: worker.name })))) return
  await adminApi.deleteWorker(worker.id)
  await load()
}
</script>

<template>
  <AdminLayout :title="t('workers.title')">
    <div class="flex flex-col gap-5">
      <p v-if="listError" class="text-sm text-destructive" role="alert">{{ listError }}</p>
      <div v-if="loading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</div>

      <div v-else class="flex flex-col gap-3">
        <article
          v-for="worker in workers"
          :key="worker.id"
          class="flex flex-col gap-4 rounded-xl border border-gray-100 bg-card px-5 py-4"
        >
          <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
            <WorkerAvatar :photo-url="worker.worker_profile?.photo_url" :size="12" />
            <div class="flex min-w-0 flex-[1_1_200px] flex-col leading-snug">
              <span class="font-semibold">{{ worker.name }}</span>
              <span class="text-[13px] break-all text-gray-600">{{ worker.email ?? worker.worker_profile?.phone ?? t('workers.noEmail') }}</span>
              <span class="text-[13px] text-gray-600">{{ servicesOf(worker) }}</span>
            </div>
            <div class="flex flex-none items-center gap-2.5">
              <Label :for="`can-edit-${worker.id}`" class="font-normal text-gray-700">{{ t('workers.canEditSlots') }}</Label>
              <Switch
                :id="`can-edit-${worker.id}`"
                :model-value="worker.can_edit_slots"
                :disabled="savingId === worker.id"
                @update:model-value="toggleCanEdit(worker, $event)"
              />
            </div>
            <div class="flex flex-none items-center gap-1">
              <Button
                variant="outline"
                size="sm"
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
                :aria-label="t('workers.deleteLabel', { name: worker.name })"
                @click="handleDelete(worker)"
              >
                <XIcon />
              </Button>
            </div>
          </div>

          <div v-if="editingId === worker.id" class="border-t border-gray-100 pt-4">
            <WorkerProfileEditor :worker="worker" can-edit-name @updated="onWorkerUpdated" />
          </div>
        </article>

        <div v-if="workers.length === 0" class="rounded-xl border border-gray-100 bg-card px-6 py-8 text-center text-sm text-gray-600">
          {{ t('workers.noWorkers') }}
        </div>
      </div>

      <section class="flex flex-col gap-3.5 rounded-xl border border-gray-100 bg-card p-5">
        <h2 class="text-lg font-semibold">{{ t('workers.inviteTitle') }}</h2>
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="invite">
          <div class="grid min-w-0 flex-[1_1_180px] gap-1">
            <Label for="invite-name">{{ t('workers.fullName') }}</Label>
            <Input id="invite-name" v-model="form.name" type="text" autocomplete="off" />
          </div>
          <div class="grid min-w-0 flex-[1_1_220px] gap-1">
            <Label for="invite-email">{{ t('booking.email') }}</Label>
            <Input id="invite-email" v-model="form.email" type="email" autocomplete="off" />
          </div>
          <Button type="submit" class="min-h-11" :disabled="!canInvite || submitting">
            {{ submitting ? t('workers.saving') : t('workers.inviteBtn') }}
          </Button>
        </form>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <p v-if="invited" class="text-sm font-medium text-green-800" role="status">{{ invited }}</p>
        <p class="text-[13px] text-gray-600">{{ t('workers.inviteHint') }}</p>
      </section>
    </div>
  </AdminLayout>
</template>
