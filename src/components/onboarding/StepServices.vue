<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { SERVICE_PRESETS, SLOT_DURATIONS } from '@/lib/onboarding'
import type { BusinessType, ServiceDraft } from '@/lib/onboarding'

const props = defineProps<{ type: BusinessType }>()
const services = defineModel<ServiceDraft[]>({ required: true })

const { t } = useI18n()

const customName = ref('')
const customDuration = ref(30)
let seq = 0

const presets = computed(() =>
  SERVICE_PRESETS[props.type].map((p) => ({ ...p, id: `preset:${p.key}`, name: t(`onboarding.service.${p.key}`) })),
)
const custom = computed(() => services.value.filter((s) => !s.id.startsWith('preset:')))

function isOn(id: string) {
  return services.value.some((s) => s.id === id)
}

function togglePreset(p: { id: string; name: string; duration: number }) {
  services.value = isOn(p.id)
    ? services.value.filter((s) => s.id !== p.id)
    : [...services.value, { id: p.id, name: p.name, duration: p.duration }]
}

function addCustom() {
  const name = customName.value.trim()
  if (name.length < 2) return
  services.value = [...services.value, { id: `custom:${seq++}`, name, duration: customDuration.value }]
  customName.value = ''
}

function remove(id: string) {
  services.value = services.value.filter((s) => s.id !== id)
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1.5">
      <h1 class="text-2xl font-semibold">{{ t('onboarding.services.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('onboarding.services.subtitle') }}</p>
    </div>

    <div class="space-y-2">
      <button
        v-for="p in presets"
        :key="p.id"
        type="button"
        :aria-pressed="isOn(p.id)"
        class="flex w-full min-h-11 items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left text-sm"
        :class="isOn(p.id) ? 'border-primary bg-primary/5' : 'bg-card hover:border-muted-foreground/40'"
        @click="togglePreset(p)"
      >
        <span class="flex items-center gap-2.5 font-medium">
          <span
            class="flex size-5 items-center justify-center rounded-md border"
            :class="isOn(p.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60'"
          >
            <CheckIcon v-if="isOn(p.id)" class="size-3.5" />
          </span>
          {{ p.name }}
        </span>
        <span class="text-muted-foreground">{{ t('onboarding.services.minutes', { n: p.duration }) }}</span>
      </button>

      <div
        v-for="c in custom"
        :key="c.id"
        class="flex items-center justify-between gap-4 rounded-xl border border-primary bg-primary/5 py-2 pl-4 pr-2 text-sm"
      >
        <span class="font-medium">
          {{ c.name }} <span class="font-normal text-muted-foreground">· {{ t('onboarding.services.minutes', { n: c.duration }) }}</span>
        </span>
        <Button variant="outline" size="sm" :aria-label="t('onboarding.services.removeLabel', { name: c.name })" @click="remove(c.id)">
          {{ t('onboarding.services.remove') }}
        </Button>
      </div>
    </div>

    <div class="space-y-2 border-t pt-5">
      <p class="text-sm font-medium">{{ t('onboarding.services.addTitle') }}</p>
      <div class="flex flex-wrap items-end gap-2">
        <div class="grid min-w-40 flex-1 gap-1">
          <Label for="ob-cname" class="text-xs text-muted-foreground">{{ t('onboarding.services.name') }}</Label>
          <Input id="ob-cname" v-model="customName" @keyup.enter="addCustom" />
        </div>
        <div class="grid w-32 gap-1">
          <Label for="ob-cdur" class="text-xs text-muted-foreground">{{ t('onboarding.services.duration') }}</Label>
          <NativeSelect id="ob-cdur" v-model.number="customDuration">
            <NativeSelectOption v-for="d in SLOT_DURATIONS" :key="d" :value="d">
              {{ t('onboarding.services.minutes', { n: d }) }}
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <Button variant="outline" size="lg" :disabled="customName.trim().length < 2" @click="addCustom">
          {{ t('onboarding.services.add') }}
        </Button>
      </div>
    </div>
  </div>
</template>
