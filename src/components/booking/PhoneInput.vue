<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { CALLING_CODES, DEFAULT_COUNTRY, countryName, flag, toE164 } from '@/lib/phone'

/**
 * Broj telefona: pozivni broj iz liste (podrazumevano Srbija) + lokalni broj.
 * v-model je broj u međunarodnom obliku (+381641234567), ili prazan string dok broj nije unet.
 */
const props = defineProps<{ id: string; required?: boolean }>()
const model = defineModel<string>({ required: true })

const { t, locale } = useI18n()
const country = ref(DEFAULT_COUNTRY)
const national = ref('')

const dial = computed(() => CALLING_CODES.find((c) => c.country === country.value)?.dial ?? '381')
const options = computed(() =>
  CALLING_CODES.map((c) => ({ value: c.country, label: `${flag(c.country)} +${c.dial} ${countryName(c.country, locale.value)}` })),
)

watch([dial, national], () => (model.value = toE164(dial.value, national.value)))
</script>

<template>
  <div class="flex gap-2">
    <NativeSelect v-model="country" class="w-28 shrink-0" :aria-label="t('booking.callingCode')">
      <NativeSelectOption v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</NativeSelectOption>
    </NativeSelect>
    <Input
      :id="props.id"
      v-model="national"
      type="tel"
      inputmode="tel"
      autocomplete="tel-national"
      :required="props.required"
      placeholder="64 123 4567"
      class="min-w-0 flex-1"
    />
  </div>
</template>
