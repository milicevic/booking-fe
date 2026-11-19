<script setup lang="ts">
/** Poruka greške ispod polja; polje je povezuje preko aria-describedby (`${id}`). */
defineProps<{ id: string; message?: string | null }>()
</script>

<template>
  <p v-if="message" :id="id" class="text-[13px] text-destructive" role="alert">{{ message }}</p>
</template>
