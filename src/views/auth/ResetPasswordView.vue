<script setup lang="ts">
import FieldError from '@/components/FieldError.vue'
import { useFieldErrors } from '@/composables/useFieldErrors'
import { required, sameAs, strongPassword } from '@/lib/validation'
import { PASSWORD_MIN } from '@/lib/password'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/apiError'

const { t } = useI18n()
// Naše poruke ispod polja umesto poruka pregledača (forma ima novalidate)
const { errors: fieldErrors, check, fromApi, clear } = useFieldErrors<'password' | 'password_confirmation'>()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// Token i email stižu u linku iz mejla
const token = typeof route.query.token === 'string' ? route.query.token : ''
const email = typeof route.query.email === 'string' ? route.query.email : ''

const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  if (!check({ password: password.value, password_confirmation: passwordConfirmation.value }, { password: [required('validation.passwordRequired'), strongPassword()], password_confirmation: [sameAs(() => password.value)] })) return

  loading.value = true
  try {
    await auth.resetPassword({ token, email, password: password.value, password_confirmation: passwordConfirmation.value })
    router.replace({ name: 'login', query: { reset: '1' } })
  } catch (e) {
    if (!fromApi(e, ['password'])) error.value = apiErrorMessage(e, t('auth.reset.error'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout :title="t('auth.reset.title')" :subtitle="email">
    <Card>
      <CardContent>
        <div v-if="!token || !email" class="space-y-5 text-center" data-testid="reset-invalid">
          <p class="text-sm text-destructive">{{ t('auth.reset.invalidLink') }}</p>
          <Button as-child variant="outline" class="w-full">
            <router-link :to="{ name: 'forgot-password' }">{{ t('auth.reset.requestNew') }}</router-link>
          </Button>
        </div>

        <form novalidate v-else @submit.prevent="handleSubmit" class="space-y-5">
          <div class="grid gap-1.5">
            <Label for="reset-password">{{ t('auth.reset.newPassword') }}</Label>
            <Input
              id="reset-password"
              v-model="password"
              type="password"
              required
              :minlength="PASSWORD_MIN"
              autocomplete="new-password"
              :placeholder="t('auth.minPassword')"
              :aria-invalid="!!fieldErrors.password"
              aria-describedby="reset-password-error"
              @input="clear('password')"
            />
            <FieldError id="reset-password-error" :message="fieldErrors.password" />
          </div>

          <div class="grid gap-1.5">
            <Label for="reset-password-confirmation">{{ t('auth.reset.confirmPassword') }}</Label>
            <Input
              id="reset-password-confirmation"
              v-model="passwordConfirmation"
              type="password"
              required
              :minlength="PASSWORD_MIN"
              autocomplete="new-password"
              :aria-invalid="!!fieldErrors.password_confirmation"
              aria-describedby="reset-password-confirmation-error"
              @input="clear('password_confirmation')"
            />
            <FieldError id="reset-password-confirmation-error" :message="fieldErrors.password_confirmation" />
          </div>

          <p v-if="error" class="text-destructive text-xs">{{ error }}</p>

          <Button type="submit" size="lg" class="w-full" :disabled="loading">
            {{ loading ? t('auth.reset.saving') : t('auth.reset.save') }}
          </Button>

          <p class="text-center text-xs">
            <router-link :to="{ name: 'forgot-password' }" class="text-primary hover:text-primary/80">
              {{ t('auth.reset.requestNew') }}
            </router-link>
          </p>
        </form>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
