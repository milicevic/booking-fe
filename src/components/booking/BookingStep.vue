<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section class="flex flex-col gap-4 rounded-xl border border-gray-100 bg-card p-5 sm:p-6">
    <h2 class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ title }}</h2>
    <slot />
  </section>
</template>
