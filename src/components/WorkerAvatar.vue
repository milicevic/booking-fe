<script setup lang="ts">
import { UserRoundIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    photoUrl?: string | null
    /** Veličina u Tailwind jedinicama klase size-* (npr. 7 = 28px) */
    size?: 7 | 9 | 12 | 16 | 20
  }>(),
  { photoUrl: null, size: 9 },
)

const sizeClass = { 7: 'size-7', 9: 'size-9', 12: 'size-12', 16: 'size-16', 20: 'size-20' }
</script>

<template>
  <!-- alt je prazan jer se ime radnika uvek prikazuje pored slike -->
  <img
    v-if="props.photoUrl"
    :src="props.photoUrl"
    alt=""
    :class="cn('shrink-0 rounded-full object-cover', sizeClass[props.size])"
  />
  <!-- Generička slika dok radnik nema svoju -->
  <span
    v-else
    aria-hidden="true"
    data-testid="worker-avatar-default"
    :class="cn('flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-muted text-muted-foreground/60', sizeClass[props.size])"
  >
    <UserRoundIcon class="size-[85%] translate-y-[12%]" :stroke-width="1.5" />
  </span>
</template>
