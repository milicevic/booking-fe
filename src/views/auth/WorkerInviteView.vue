<script setup lang="ts">
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
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const token = route.params.token as string

const form = reactive({
  name: '',
  password: '',
})

const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await tenantApi.acceptInvite(token, form)
    auth.setSession(data.token, data.client)
    router.push({ name: 'dashboard' })
  } catch (e) {
    error.value = apiErrorMessage(e, t('auth.inviteError'))
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
          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div class="grid gap-1.5">
              <Label for="invite-name">{{ t('auth.yourName') }} *</Label>
              <Input
                id="invite-name"
                v-model="form.name"
                type="text"
                required
                placeholder="Ime i prezime"
              />
            </div>

            <div class="grid gap-1.5">
              <Label for="invite-password">{{ t('auth.password') }} *</Label>
              <Input
                id="invite-password"
                v-model="form.password"
                type="password"
                required
                minlength="8"
                :placeholder="t('auth.minPassword')"
              />
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
