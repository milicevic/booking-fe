<script setup lang="ts">
withDefaults(
  defineProps<{
    src: string | null
    /** Visina u pikselima; širina prati odnos stranica, ali najviše 140px. */
    size?: number
  }>(),
  { size: 32 },
)
</script>

<template>
  <!-- alt je prazan jer se naziv firme uvek prikazuje odmah pored loga -->
  <img
    v-if="src"
    :src="src"
    alt=""
    :style="{ height: `${size}px` }"
    class="w-auto max-w-[140px] shrink-0 object-contain"
  />
</template>
