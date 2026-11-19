<script setup lang="ts">
import FieldError from '@/components/FieldError.vue'
import { useFieldErrors } from '@/composables/useFieldErrors'
import { required, strongPassword } from '@/lib/validation'
import { PASSWORD_MIN } from '@/lib/password'
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { tenantApi } from '@/api/tenant'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '@/lib/apiError'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const { t } = useI18n()
// Naše poruke ispod polja umesto poruka pregledača (forma ima novalidate)
const { errors: fieldErrors, check, fromApi, clear } = useFieldErrors<'password'>()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const token = route.params.token as string

const form = reactive({
  password: '',
})

const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  if (!check({ password: form.password }, { password: [required('validation.passwordRequired'), strongPassword()] })) return
  loading.value = true
  try {
    const { data } = await tenantApi.acceptInvite(token, form.password)
    auth.setSession(data.token, data.user)
    router.push({ name: 'dashboard' })
  } catch (e) {
    if (!fromApi(e, ['password'])) error.value = apiErrorMessage(e, t('auth.inviteError'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">

      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold">{{ t('auth.inviteTitle') }}</h1>
        <p class="text-sm text-muted-foreground mt-1">{{ t('auth.inviteSubtitle') }}</p>
      </div>

      <Card>
        <CardContent>
          <form novalidate @submit.prevent="handleSubmit" class="space-y-5">

            <div class="grid gap-1.5">
              <Label for="invite-password">{{ t('auth.password') }} *</Label>
              <Input
                id="invite-password"
                v-model="form.password"
                type="password"
                required
                :minlength="PASSWORD_MIN"
                :placeholder="t('auth.minPassword')"
                :aria-invalid="!!fieldErrors.password"
                aria-describedby="invite-password-error"
                @input="clear('password')"
              />
              <FieldError id="invite-password-error" :message="fieldErrors.password" />
            </div>

            <p v-if="error" class="text-destructive text-xs">{{ error }}</p>

            <Button type="submit" size="lg" class="w-full" :disabled="loading">
              {{ loading ? t('auth.activating') : t('auth.activateBtn') }}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
