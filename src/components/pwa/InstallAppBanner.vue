<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { canPromptInstall, promptInstall } from '@/lib/pwa'
import { isIos, isStandalone } from '@/lib/push'

/**
 * Poziv da se sajt instalira kao aplikacija. Chrome/Edge/Android nude sistemsku instalaciju;
 * iPhone je nema, pa tamo objašnjavamo „Podeli → Dodaj na početni ekran“.
 */
const DISMISS_KEY = 'install-banner-dismissed'

const { t } = useI18n()
const dismissed = ref(readDismissed())
const ios = isIos()

const visible = computed(() => !dismissed.value && !isStandalone() && (canPromptInstall.value || ios))

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Pregledač ne dozvoljava čuvanje; baner se sakriva samo do osvežavanja
  }
}

async function install() {
  if (await promptInstall()) dismiss()
}
</script>

<template>
  <section v-if="visible" class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-card p-5" data-testid="install-banner">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="font-semibold">{{ t('install.title') }}</p>
      <p class="text-sm text-gray-600">{{ ios && !canPromptInstall ? t('install.ios') : t('install.text') }}</p>
    </div>
    <div class="flex gap-2">
      <Button variant="ghost" @click="dismiss">{{ t('install.later') }}</Button>
      <Button v-if="canPromptInstall" @click="install">{{ t('install.button') }}</Button>
    </div>
  </section>
</template>
