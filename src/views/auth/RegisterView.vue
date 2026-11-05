<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { tenantApi } from '@/api/tenant'
import { apiErrorMessage } from '@/lib/apiError'
import { isPlatformHost, tenantUrl } from '@/lib/domain'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import GoogleButton from '@/components/auth/GoogleButton.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckIcon } from '@lucide/vue'

const { t } = useI18n()

const platformHost = import.meta.env.VITE_PLATFORM_HOST || 'slotres.click'

const form = reactive({
  app_name: '',
  name: '',
  email: '',
  password: '',
})

// Nova firma se registruje samo na glavnom domenu (backend odbija Google registraciju sa sajta firme)
const showGoogle = isPlatformHost()

const error = ref('')
const loading = ref(false)
const success = ref(false)
const registeredSubdomain = ref('')

// Adresu računa backend, isto kao pri registraciji (uključujući sufiks kada je naziv zauzet)
const subdomain = ref('')
const subdomainLoading = ref(false)

watchDebounced(
  () => form.app_name.trim(),
  async (appName) => {
    if (!appName) {
      subdomain.value = ''
      return
    }
    subdomainLoading.value = true
    try {
      const { data } = await tenantApi.previewSubdomain(appName)
      if (appName === form.app_name.trim()) subdomain.value = data.subdomain
    } catch {
      subdomain.value = ''
    } finally {
      subdomainLoading.value = false
    }
  },
  { debounce: 300 },
)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await tenantApi.register(form)
    registeredSubdomain.value = data.tenant.subdomain
    success.value = true
  } catch (e) {
    error.value = apiErrorMessage(e, t('auth.registerError'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout :title="t('auth.registerTitle')" :subtitle="t('auth.registerSubtitle')">
    <!-- Success -->
    <Card v-if="success">
      <CardContent class="space-y-4 text-center">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckIcon class="w-6 h-6 text-green-600" />
        </div>
        <h2 class="text-lg font-semibold">{{ t('auth.successTitle') }}</h2>
        <p class="text-sm text-muted-foreground">{{ t('auth.successMsg') }}</p>
        <div class="rounded-lg bg-muted/50 border px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">{{ t('auth.yourAddress') }}</p>
          <a
            :href="tenantUrl(registeredSubdomain)"
            data-testid="registered-address"
            class="text-sm font-semibold text-primary hover:text-primary/80 break-all"
          >{{ tenantUrl(registeredSubdomain) }}</a>
        </div>
        <Button as-child size="lg" class="w-full">
          <a :href="tenantUrl(registeredSubdomain, '/admin/login')" data-testid="go-to-login">
            {{ t('auth.goToLogin') }}
          </a>
        </Button>
      </CardContent>
    </Card>

    <!-- Form -->
    <Card v-else>
      <CardContent>
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div class="grid gap-1.5">
            <Label for="register-app-name">{{ t('auth.businessName') }} *</Label>
            <Input
              id="register-app-name"
              v-model="form.app_name"
              type="text"
              required
              maxlength="255"
              :placeholder="t('auth.businessNamePlaceholder')"
            />
            <p class="text-[11px] text-muted-foreground">{{ t('auth.businessNameHint') }}</p>
            <div class="mt-0.5 rounded-lg bg-muted/50 border px-3 py-2.5" aria-live="polite">
              <p class="text-[11px] text-muted-foreground mb-0.5">{{ t('auth.addressLabel') }}</p>
              <p
                class="text-sm font-mono break-all transition-opacity"
                :class="subdomainLoading ? 'opacity-50' : ''"
                data-testid="address-preview"
              >
                <span class="text-muted-foreground">https://</span><span
                  :class="subdomain ? 'text-primary font-semibold' : 'text-muted-foreground/60'"
                >{{ subdomain || t('auth.addressPlaceholder') }}</span><span class="text-muted-foreground">.{{ platformHost }}</span>
              </p>
            </div>
          </div>

          <div class="grid gap-1.5">
            <Label for="register-name">{{ t('auth.yourName') }} *</Label>
            <Input
              id="register-name"
              v-model="form.name"
              type="text"
              required
              maxlength="255"
              :placeholder="t('auth.yourNamePlaceholder')"
            />
          </div>

          <div class="grid gap-1.5">
            <Label for="register-email">{{ t('auth.email') }} *</Label>
            <Input
              id="register-email"
              v-model="form.email"
              type="email"
              required
              :placeholder="t('auth.emailPlaceholder')"
            />
          </div>

          <div class="grid gap-1.5">
            <Label for="register-password">{{ t('auth.password') }} *</Label>
            <Input
              id="register-password"
              v-model="form.password"
              type="password"
              required
              minlength="8"
              :placeholder="t('auth.minPassword')"
            />
          </div>

          <p class="text-xs text-muted-foreground">{{ t('auth.customizeLater') }}</p>

          <p v-if="error" class="text-destructive text-xs">{{ error }}</p>

          <Button type="submit" size="lg" class="w-full" :disabled="loading">
            {{ loading ? t('auth.creating') : t('auth.createBtn') }}
          </Button>

          <GoogleButton
            v-if="showGoogle"
            intent="register"
            :app-name="form.app_name.trim()"
            :disabled="!form.app_name.trim()"
            :hint="t('auth.google.registerHint')"
          />

          <p class="text-center text-xs text-muted-foreground">
            {{ t('auth.alreadyHaveAccount') }}
            <router-link :to="{ name: 'login' }" class="text-primary hover:text-primary/80">
              {{ t('auth.loginBtn') }}
            </router-link>
          </p>
        </form>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
