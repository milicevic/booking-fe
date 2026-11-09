<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/apiError'

const { t } = useI18n()
const auth = useAuthStore()

const email = ref('')
const sent = ref(false)
const loading = ref(false)
const error = ref('')

// Odgovor je isti i kad nalog ne postoji, pa uvek prikazujemo istu poruku
async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.requestPasswordReset(email.value)
    sent.value = true
  } catch (e) {
    error.value = apiErrorMessage(e, t('auth.forgot.error'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout :title="t('auth.forgot.title')" :subtitle="t('auth.forgot.subtitle')">
    <Card>
      <CardContent>
        <div v-if="sent" class="space-y-5 text-center" data-testid="forgot-sent">
          <p class="text-sm text-muted-foreground">{{ t('auth.forgot.sent') }}</p>
          <Button as-child variant="outline" class="w-full">
            <router-link :to="{ name: 'login' }">{{ t('auth.forgot.backToLogin') }}</router-link>
          </Button>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-5">
          <div class="grid gap-1.5">
            <Label for="forgot-email">{{ t('auth.email') }}</Label>
            <Input
              id="forgot-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              :placeholder="t('auth.emailPlaceholder')"
            />
          </div>

          <p v-if="error" class="text-destructive text-xs">{{ error }}</p>

          <Button type="submit" size="lg" class="w-full" :disabled="loading">
            {{ loading ? t('auth.forgot.sending') : t('auth.forgot.send') }}
          </Button>

          <p class="text-center text-xs">
            <router-link :to="{ name: 'login' }" class="text-primary hover:text-primary/80">
              {{ t('auth.forgot.backToLogin') }}
            </router-link>
          </p>
        </form>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
