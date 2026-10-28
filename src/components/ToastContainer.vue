<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-white border-gray-200 text-gray-800',
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
          :class="['pointer-events-auto rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 text-sm', styles[toast.type]]"
        >
          <p class="flex-1 leading-relaxed">{{ toast.message }}</p>
          <button
            @click="dismiss(toast.id)"
            aria-label="Close"
            class="shrink-0 opacity-50 hover:opacity-100 transition-opacity leading-none text-lg"
          >
            ×
          </button>
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
