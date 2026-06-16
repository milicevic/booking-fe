<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'

const { t } = useI18n()
const { isOpen, message, accept, reject } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="reject"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="reject" />

        <!-- Card -->
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p class="text-sm text-gray-700 pt-2 leading-relaxed">{{ message }}</p>
          </div>

          <div class="flex gap-2 pt-1">
            <button
              @click="reject"
              class="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              @click="accept"
              class="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {{ t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.15s ease;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
