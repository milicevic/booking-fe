<script setup lang="ts">
import { XIcon } from '@lucide/vue'
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'

const { toasts, dismiss } = useToast()

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-popover text-popover-foreground',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed z-50 inset-x-4 top-4 sm:inset-x-auto sm:right-4 sm:w-96 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          role="alert"
          :class="['pointer-events-auto rounded-xl border shadow-lg pl-4 pr-2 py-2 flex items-start gap-2 text-sm', styles[toast.type]]"
        >
          <p class="flex-1 leading-relaxed py-1">{{ toast.message }}</p>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Close"
            class="shrink-0 opacity-60 hover:opacity-100 hover:bg-black/5"
            @click="dismiss(toast.id)"
          >
            <XIcon />
          </Button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
