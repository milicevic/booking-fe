<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { notificationsApi } from '@/api/notifications'
import { apiErrorMessage } from '@/lib/apiError'
import { createSubscription, currentSubscription, pushNeedsInstall, pushSupported, PushPermissionDeniedError, toKeys } from '@/lib/push'

/**
 * Push obaveštenja za prijavljenog korisnika (nova rezervacija, potvrda…) na ovom uređaju.
 * Pretplata je po uređaju i pregledaču, pa se uključuje na svakom telefonu/računaru posebno.
 */
type State = 'loading' | 'unsupported' | 'needsInstall' | 'denied' | 'off' | 'on'

const { t } = useI18n()
const state = ref<State>('loading')
const busy = ref(false)
const error = ref('')

onMounted(async () => {
  if (!pushSupported()) {
    state.value = pushNeedsInstall() ? 'needsInstall' : 'unsupported'
    return
  }
  if (Notification.permission === 'denied') {
    state.value = 'denied'
    return
  }
  try {
    const subscription = await currentSubscription()
    state.value = subscription ? 'on' : 'off'
    // Server možda ne zna za ovu pretplatu (npr. posle promene VAPID ključeva ili brisanja); šaljemo je ponovo
    if (subscription) await notificationsApi.subscribePush(toKeys(subscription)).catch(() => {})
  } catch {
    state.value = 'off'
  }
})

async function enable() {
  busy.value = true
  error.value = ''
  try {
    await notificationsApi.subscribePush(await createSubscription())
    state.value = 'on'
  } catch (e) {
    if (e instanceof PushPermissionDeniedError) state.value = 'denied'
    else error.value = apiErrorMessage(e, t('push.error'))
  } finally {
    busy.value = false
  }
}

async function disable() {
  busy.value = true
  error.value = ''
  try {
    const subscription = await currentSubscription()
    if (subscription) {
      await notificationsApi.unsubscribePush(subscription.endpoint)
      await subscription.unsubscribe()
    }
    state.value = 'off'
  } catch (e) {
    error.value = apiErrorMessage(e, t('push.error'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section v-if="state !== 'loading'" class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-card p-5" data-testid="push-toggle">
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="font-semibold">{{ t('push.title') }}</p>
      <p class="text-sm text-gray-600">{{ t(`push.state.${state}`) }}</p>
      <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    </div>
    <Button v-if="state === 'off'" :disabled="busy" @click="enable">{{ busy ? t('push.enabling') : t('push.enable') }}</Button>
    <Button v-else-if="state === 'on'" variant="outline" :disabled="busy" @click="disable">{{ t('push.disable') }}</Button>
  </section>
</template>
