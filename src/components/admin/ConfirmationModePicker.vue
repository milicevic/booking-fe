<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ConfirmationMode } from '@/api/admin'

const mode = defineModel<ConfirmationMode>({ required: true })
const { t } = useI18n()

const options: ConfirmationMode[] = ['owner', 'worker', 'auto']
</script>

<template>
  <div class="flex flex-col gap-2" role="group" :aria-label="t('settings.confirm.title')">
    <button
      v-for="option in options"
      :key="option"
      type="button"
      :aria-pressed="mode === option"
      class="flex w-full flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      :class="mode === option ? 'border-primary bg-accent' : 'border-gray-200 bg-card hover:border-gray-400'"
      @click="mode = option"
    >
      <span class="text-[15px] font-semibold">{{ t(`settings.confirm.${option}.title`) }}</span>
      <span class="text-sm text-gray-600">{{ t(`settings.confirm.${option}.text`) }}</span>
    </button>
  </div>
</template>
