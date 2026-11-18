<script setup lang="ts" generic="T extends string | number">
defineProps<{
  label: string
  options: { value: T; label: string }[]
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <div role="group" :aria-label="label" class="flex flex-wrap items-center gap-2">
    <span class="pr-1 text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ label }}</span>
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      class="rounded-lg border px-3.5 py-2 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      :class="model === option.value
        ? 'border-primary bg-accent text-primary font-semibold'
        : 'border-gray-200 bg-card text-gray-700 hover:border-gray-400'"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
