<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

defineProps<{ name: string }>()
const color = defineModel<string>('color', { required: true })
const autoConfirm = defineModel<boolean>('autoConfirm', { required: true })

const { t } = useI18n()

const palette = [
  { value: '#4f46e5', key: 'indigo' },
  { value: '#0f766e', key: 'green' },
  { value: '#be185d', key: 'pink' },
  { value: '#b45309', key: 'orange' },
]
const confirmOptions = [
  { auto: false, title: 'confirmOwner', text: 'confirmOwnerText' },
  { auto: true, title: 'confirmAuto', text: 'confirmAutoText' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1.5">
      <h1 class="text-2xl font-semibold">{{ t('onboarding.look.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('onboarding.look.subtitle') }}</p>
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">{{ t('onboarding.look.color') }}</p>
      <div class="flex gap-3">
        <button
          v-for="c in palette"
          :key="c.value"
          type="button"
          :aria-pressed="color === c.value"
          :aria-label="t(`onboarding.colors.${c.key}`)"
          class="size-11 rounded-full"
          :class="color === c.value ? 'ring-2 ring-offset-2 ring-foreground' : ''"
          :style="{ backgroundColor: c.value }"
          @click="color = c.value"
        />
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">{{ t('onboarding.look.confirm') }}</p>
      <button
        v-for="o in confirmOptions"
        :key="o.title"
        type="button"
        :aria-pressed="autoConfirm === o.auto"
        class="flex w-full flex-col gap-0.5 rounded-xl border px-4 py-3 text-left"
        :class="autoConfirm === o.auto ? 'border-primary bg-primary/5' : 'bg-card hover:border-muted-foreground/40'"
        @click="autoConfirm = o.auto"
      >
        <span class="text-sm font-semibold">{{ t(`onboarding.look.${o.title}`) }}</span>
        <span class="text-sm text-muted-foreground">{{ t(`onboarding.look.${o.text}`) }}</span>
      </button>
    </div>

    <div role="img" :aria-label="t('onboarding.look.previewLabel')" class="space-y-3 rounded-xl border bg-muted/40 p-4">
      <div class="flex items-center gap-2.5">
        <span class="flex size-8 items-center justify-center rounded-lg font-semibold text-white" :style="{ backgroundColor: color }">
          {{ (name.trim().charAt(0) || 'T').toUpperCase() }}
        </span>
        <span class="font-semibold">{{ name }}</span>
      </div>
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="rounded-lg border bg-card px-3 py-1.5">09:00</span>
        <span class="rounded-lg border px-3 py-1.5 font-semibold" :style="{ borderColor: color, color }">10:00</span>
        <span class="rounded-lg border bg-card px-3 py-1.5">10:30</span>
      </div>
      <Button as="span" size="sm" class="text-white" :style="{ backgroundColor: color }">{{ t('onboarding.look.previewButton') }}</Button>
    </div>
  </div>
</template>
