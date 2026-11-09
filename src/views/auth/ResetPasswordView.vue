<script setup lang="ts">
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
  if (password.value !== passwordConfirmation.value) return (error.value = t('auth.reset.mismatch'))

  loading.value = true
  try {
    await auth.resetPassword({ token, email, password: password.value, password_confirmation: passwordConfirmation.value })
    router.replace({ name: 'login', query: { reset: '1' } })
  } catch (e) {
    error.value = apiErrorMessage(e, t('auth.reset.error'))
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

        <form v-else @submit.prevent="handleSubmit" class="space-y-5">
          <div class="grid gap-1.5">
            <Label for="reset-password">{{ t('auth.reset.newPassword') }}</Label>
            <Input
              id="reset-password"
              v-model="password"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
              :placeholder="t('auth.minPassword')"
            />
          </div>

          <div class="grid gap-1.5">
            <Label for="reset-password-confirmation">{{ t('auth.reset.confirmPassword') }}</Label>
            <Input
              id="reset-password-confirmation"
              v-model="passwordConfirmation"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
            />
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
