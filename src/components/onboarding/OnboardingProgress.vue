<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ step: number }>()

const { t } = useI18n()
const keys = ['business', 'services', 'workers', 'schedule', 'look'] as const
</script>

<template>
  <ol class="flex gap-2">
    <li v-for="(key, i) in keys" :key="key" class="flex-1 min-w-0 space-y-1.5">
      <span class="block h-1.5 rounded-full" :class="i + 1 <= step ? 'bg-primary' : 'bg-border'" />
      <span class="block text-xs truncate" :class="i + 1 === step ? 'font-semibold' : 'text-muted-foreground'">
        {{ t(`onboarding.progress.${key}`) }}
      </span>
    </li>
  </ol>
</template>
