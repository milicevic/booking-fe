<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Veličina u pikselima (širina = visina). */
    size?: number
    /** 'color' = plavi kvadrat, 'dark' / 'white' = samo slovo bez pozadine. */
    variant?: 'color' | 'dark' | 'white'
  }>(),
  { size: 32, variant: 'color' },
)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    :width="size"
    :height="size"
    role="img"
    aria-label="Termin"
  >
    <rect v-if="variant === 'color'" width="64" height="64" rx="16" fill="#2563eb" />
    <g transform="translate(5.1 5.1) rotate(-45 32 32)">
      <rect
        x="14"
        y="16"
        width="36"
        height="7"
        :fill="variant === 'dark' ? '#111827' : '#ffffff'"
      />
      <rect
        x="28.5"
        y="29"
        width="7"
        height="19"
        :fill="variant === 'color' ? '#bfdbfe' : variant === 'dark' ? '#111827' : '#ffffff'"
      />
    </g>
  </svg>
</template>
