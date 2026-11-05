<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import { Button } from '@/components/ui/button'

const { locale } = useI18n()
</script>

<template>
  <Button
    variant="ghost"
    size="xs"
    class="text-muted-foreground"
    @click="setLocale(locale === 'sr' ? 'en' : 'sr')"
  >
    {{ locale === 'sr' ? 'EN' : 'SR' }}
  </Button>
</template>
