<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const GOOGLE_ERRORS = ['google_failed', 'email_not_verified', 'account_not_found', 'suspended', 'wrong_tenant', 'invalid_host']

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

// Backend šalje token u fragmentu (#token=...), da ne bi završio u logovima servera.
// Fragment odmah brišemo iz adrese, da token ne ostane u istoriji pregledača.
const params = new URLSearchParams(window.location.hash.slice(1))
history.replaceState(history.state, '', window.location.pathname + window.location.search)

const token = params.get('token')
const errorCode = ref(token ? '' : (params.get('error') ?? 'google_failed'))

const errorMessage = computed(() => {
  if (!errorCode.value) return ''
  const code = GOOGLE_ERRORS.includes(errorCode.value) ? errorCode.value : 'google_failed'
  return t(`auth.google.errors.${code}`)
})

if (token) {
  auth.loginWithToken(token).then(() => router.replace({ name: 'dashboard' }))
}
</script>

<template>
  <AuthLayout :title="t('auth.google.callbackTitle')">
    <Card>
      <CardContent class="space-y-5 text-center">
        <template v-if="errorMessage">
          <p class="text-destructive text-sm" data-testid="google-error">{{ errorMessage }}</p>
          <Button as-child size="lg" class="w-full">
            <router-link :to="{ name: 'login' }">{{ t('auth.google.backToLogin') }}</router-link>
          </Button>
        </template>
        <p v-else class="text-sm text-muted-foreground">{{ t('auth.google.signingIn') }}</p>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
