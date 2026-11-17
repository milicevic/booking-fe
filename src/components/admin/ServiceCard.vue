<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PencilIcon, XIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import type { Service } from '@/api/services'
import type { Worker } from '@/api/admin'
import { formatPrice } from '@/lib/price'
import { DURATIONS } from '@/lib/serviceDurations'

const props = defineProps<{
  service: Service
  workers: Worker[]
  currency?: string
  busy: boolean
}>()

const emit = defineEmits<{
  toggleActive: [value: boolean]
  update: [data: { name: string; duration_minutes: number; price: number | null }]
  remove: []
  toggleWorker: [worker: Worker]
}>()

const { t, locale } = useI18n()
const editing = ref(false)
const showWorkers = ref(false)
const form = ref({ name: '', duration: 30, price: '' })

const durations = computed(() => (DURATIONS.includes(props.service.duration_minutes) ? DURATIONS : [...DURATIONS, props.service.duration_minutes].sort((a, b) => a - b)))
const meta = computed(() => {
  const price = props.service.price ? ` · ${formatPrice(props.service.price, locale.value, props.currency)}` : ''
  return `${props.service.duration_minutes} min${price}`
})
const workerLine = computed(() => {
  const names = props.service.workers?.map((w) => w.name) ?? []
  return names.length ? t('services.workersList', { list: names.join(', ') }) : t('services.unassignedShort')
})

function assigned(worker: Worker) {
  return props.service.workers?.some((w) => w.id === worker.id) ?? false
}

function startEdit() {
  form.value = { name: props.service.name, duration: props.service.duration_minutes, price: props.service.price ?? '' }
  editing.value = true
}

function save() {
  emit('update', { name: form.value.name.trim(), duration_minutes: Number(form.value.duration), price: form.value.price ? Number(form.value.price) : null })
  editing.value = false
}
</script>

<template>
  <article class="flex flex-col gap-4 rounded-xl border border-gray-100 bg-card px-5 py-4">
    <form v-if="editing" class="flex flex-wrap items-end gap-3" @submit.prevent="save">
      <div class="grid min-w-0 flex-[1_1_200px] gap-1">
        <Label :for="`svc-name-${service.id}`">{{ t('services.name') }}</Label>
        <Input :id="`svc-name-${service.id}`" v-model="form.name" type="text" />
      </div>
      <div class="grid w-32 gap-1">
        <Label :for="`svc-dur-${service.id}`">{{ t('services.durationShort') }}</Label>
        <NativeSelect :id="`svc-dur-${service.id}`" v-model="form.duration">
          <NativeSelectOption v-for="d in durations" :key="d" :value="d">{{ d }} min</NativeSelectOption>
        </NativeSelect>
      </div>
      <div class="grid w-36 gap-1">
        <Label :for="`svc-price-${service.id}`">{{ t('services.priceOptional', { currency: currency ?? '' }) }}</Label>
        <Input :id="`svc-price-${service.id}`" v-model="form.price" type="number" min="0" step="0.01" inputmode="decimal" />
      </div>
      <div class="flex gap-2">
        <Button type="submit" class="min-h-11" :disabled="busy || !form.name.trim()">{{ t('common.save') }}</Button>
        <Button type="button" variant="outline" class="min-h-11" @click="editing = false">{{ t('common.cancel') }}</Button>
      </div>
    </form>

    <div v-else class="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div class="flex min-w-0 flex-[1_1_220px] flex-col leading-snug">
        <span class="font-semibold break-words" :class="!service.is_active && 'text-gray-500 line-through'">{{ service.name }}</span>
        <span class="text-sm text-gray-600">{{ meta }}</span>
        <span
          class="text-[13px]"
          :class="service.workers?.length ? 'text-gray-600' : 'text-amber-800'"
          :data-testid="service.workers?.length ? undefined : 'service-unassigned'"
        >{{ workerLine }}</span>
      </div>
      <div class="flex flex-none items-center gap-2.5">
        <Label :for="`svc-active-${service.id}`" class="font-normal text-gray-700">{{ t('services.active') }}</Label>
        <Switch :id="`svc-active-${service.id}`" :model-value="service.is_active" :disabled="busy" @update:model-value="emit('toggleActive', $event)" />
      </div>
      <div class="flex flex-none items-center gap-1">
        <Button variant="outline" size="sm" :aria-expanded="showWorkers" @click="showWorkers = !showWorkers">{{ t('services.assignWorkers') }}</Button>
        <Button variant="ghost" size="icon-sm" class="text-muted-foreground" :aria-label="t('services.editLabel', { name: service.name })" @click="startEdit">
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground hover:text-destructive"
          :aria-label="t('services.deleteLabel', { name: service.name })"
          @click="emit('remove')"
        >
          <XIcon />
        </Button>
      </div>
    </div>

    <div v-if="showWorkers && !editing" class="flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 pt-3">
      <p v-if="workers.length === 0" class="text-sm text-gray-600">{{ t('workers.noWorkers') }}</p>
      <div v-for="worker in workers" :key="worker.id" class="flex items-center gap-2">
        <Checkbox
          :id="`service-${service.id}-worker-${worker.id}`"
          :model-value="assigned(worker)"
          :disabled="busy"
          @update:model-value="emit('toggleWorker', worker)"
        />
        <Label :for="`service-${service.id}-worker-${worker.id}`" class="font-normal">{{ worker.name }}</Label>
      </div>
    </div>
  </article>
</template>
