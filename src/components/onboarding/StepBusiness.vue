<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { BUSINESS_TYPES } from '@/lib/onboarding'
import type { BusinessType } from '@/lib/onboarding'

defineProps<{ address: string }>()
const name = defineModel<string>('name', { required: true })
const type = defineModel<BusinessType>('type', { required: true })

const { t } = useI18n()
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1.5">
      <h1 class="text-2xl font-semibold">{{ t('onboarding.business.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('onboarding.business.subtitle') }}</p>
    </div>
    <div class="grid gap-1.5">
      <Label for="ob-name">{{ t('onboarding.business.name') }}</Label>
      <Input id="ob-name" v-model="name" />
    </div>
    <div class="grid gap-1.5">
      <Label for="ob-type">{{ t('onboarding.business.type') }}</Label>
      <NativeSelect id="ob-type" v-model="type">
        <NativeSelectOption v-for="b in BUSINESS_TYPES" :key="b" :value="b">
          {{ t(`onboarding.types.${b}`) }}
        </NativeSelectOption>
      </NativeSelect>
    </div>
    <div class="grid gap-1.5">
      <Label for="ob-address">{{ t('onboarding.business.address') }}</Label>
      <Input id="ob-address" :model-value="address" readonly />
      <p class="text-xs text-muted-foreground">{{ t('onboarding.business.addressHint') }}</p>
    </div>
  </div>
</template>
