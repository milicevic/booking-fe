<script setup lang="ts">
import FieldError from '@/components/FieldError.vue'
import { useFieldErrors } from '@/composables/useFieldErrors'
import { email as emailRule, required } from '@/lib/validation'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import GoogleButton from '@/components/auth/GoogleButton.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorCode, apiErrorMessage } from '@/lib/apiError'

const { t } = useI18n()
// Naše poruke ispod polja umesto poruka pregledača (forma ima novalidate)
const { errors: fieldErrors, check, clear } = useFieldErrors<'email' | 'password'>()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// Link iz mejla za potvrdu vraća ovde sa ?verified=1 (uspeh) ili ?verified=invalid
const verifiedStatus = ref(typeof route.query.verified === 'string' ? route.query.verified : '')

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const needsVerification = ref(false)
const resending = ref(false)
const resent = ref(false)

async function handleLogin() {
  error.value = ''
  if (!check({ email: email.value, password: password.value }, { email: [required('validation.emailRequired'), emailRule()], password: [required('validation.passwordRequired')] })) return
  needsVerification.value = false
  resent.value = false
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (e) {
    error.value = apiErrorMessage(e, t('auth.loginError'))
    needsVerification.value = apiErrorCode(e) === 'email_not_verified'
  } finally {
    loading.value = false
  }
}

async function resendVerification() {
  resending.value = true
  try {
    await auth.resendVerification(email.value)
    resent.value = true
  } catch (e) {
    error.value = apiErrorMessage(e, t('auth.verify.resendError'))
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <AuthLayout :title="t('auth.loginTitle')" :subtitle="t('auth.loginSubtitle')">
    <Card>
      <CardContent>
        <form novalidate @submit.prevent="handleLogin" class="space-y-5">
          <GoogleButton intent="login" first />

          <p
            v-if="route.query.reset === '1'"
            class="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700"
            data-testid="password-reset-done"
          >
            {{ t('auth.reset.done') }}
          </p>
          <p
            v-else-if="verifiedStatus === '1'"
            class="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700"
            data-testid="email-verified"
          >
            {{ t('auth.verify.confirmed') }}
          </p>
          <p
            v-else-if="verifiedStatus === 'invalid'"
            class="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
            data-testid="email-verify-invalid"
          >
            {{ t('auth.verify.invalidLink') }}
          </p>

          <div class="grid gap-1.5">
            <Label for="login-email">{{ t('auth.email') }}</Label>
            <Input
              id="login-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              :placeholder="t('auth.emailPlaceholder')"
              :aria-invalid="!!fieldErrors.email"
              aria-describedby="login-email-error"
              @input="clear('email')"
            />
            <FieldError id="login-email-error" :message="fieldErrors.email" />
          </div>

          <div class="grid gap-1.5">
            <div class="flex items-center justify-between">
              <Label for="login-password">{{ t('auth.password') }}</Label>
              <router-link :to="{ name: 'forgot-password' }" class="text-xs text-primary hover:text-primary/80" data-testid="forgot-password-link">
                {{ t('auth.forgot.link') }}
              </router-link>
            </div>
            <Input
              id="login-password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              :aria-invalid="!!fieldErrors.password"
              aria-describedby="login-password-error"
              @input="clear('password')"
            />
            <FieldError id="login-password-error" :message="fieldErrors.password" />
          </div>

          <p v-if="error" class="text-destructive text-xs">{{ error }}</p>

          <div v-if="needsVerification" class="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
            <p class="text-xs text-muted-foreground" data-testid="verification-resent">
              {{ resent ? t('auth.verify.resent') : t('auth.verify.notReceived') }}
            </p>
            <Button
              v-if="!resent"
              type="button"
              variant="outline"
              size="sm"
              class="shrink-0"
              :disabled="resending"
              data-testid="resend-verification"
              @click="resendVerification"
            >
              {{ resending ? t('auth.verify.resending') : t('auth.verify.resend') }}
            </Button>
          </div>

          <Button type="submit" size="lg" class="w-full" :disabled="loading">
            {{ loading ? t('auth.loggingIn') : t('auth.loginBtn') }}
          </Button>

          <p class="text-center text-xs text-muted-foreground">
            {{ t('auth.noAccount') }}
            <router-link :to="{ name: 'register' }" class="text-primary hover:text-primary/80">
              {{ t('auth.registerLink') }}
            </router-link>
          </p>
        </form>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
