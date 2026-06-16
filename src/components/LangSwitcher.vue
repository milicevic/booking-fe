<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'

const { locale } = useI18n()
</script>

<template>
  <button
    @click="setLocale(locale === 'sr' ? 'en' : 'sr')"
    class="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
  >
    {{ locale === 'sr' ? 'EN' : 'SR' }}
  </button>
</template>
