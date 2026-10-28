<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LogoMark from './LogoMark.vue'

withDefaults(
  defineProps<{
    /** Tamna (na svetloj pozadini) ili svetla (na tamnoj pozadini) tema teksta. */
    theme?: 'light' | 'dark'
    /** Prikaži podnaslov ispod naziva. */
    tagline?: boolean
    /** Veličina znaka u pikselima. */
    size?: number
  }>(),
  { theme: 'light', tagline: true, size: 32 },
)

const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-2.5">
    <LogoMark :size="size" />
    <div class="flex flex-col gap-0.5 leading-none">
      <span
        class="text-lg font-extrabold"
        :class="theme === 'light' ? 'text-gray-900' : 'text-white'"
      >
        Termin
      </span>
      <span
        v-if="tagline"
        class="text-xs font-semibold"
        :class="theme === 'light' ? 'text-gray-500' : 'text-white/60'"
      >
        {{ t('landing.brandTagline') }}
      </span>
    </div>
  </div>
</template>
