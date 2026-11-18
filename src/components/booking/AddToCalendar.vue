<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CalendarPlusIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { isIos } from '@/lib/push'

/**
 * Dodavanje termina u kalendar kupca: na iPhone-u/iPad-u .ics (Apple Calendar, sa podsetnikom),
 * na Android-u i webu Google Calendar. Ispod je i .ics za Outlook i Mac.
 */
const props = defineProps<{ calendar: { google_url: string; ics_url: string } }>()

const { t } = useI18n()
const ios = isIos()
const primaryUrl = ios ? props.calendar.ics_url : props.calendar.google_url
</script>

<template>
  <div class="flex flex-col items-center gap-2" data-testid="add-to-calendar">
    <Button variant="outline" size="lg" as-child>
      <a :href="primaryUrl" :target="ios ? undefined : '_blank'" rel="noopener">
        <CalendarPlusIcon aria-hidden="true" />
        {{ ios ? t('calendar.addApple') : t('calendar.addGoogle') }}
      </a>
    </Button>
    <a v-if="!ios" :href="calendar.ics_url" class="text-[13px] text-gray-600 underline-offset-2 hover:underline">
      {{ t('calendar.addIcs') }}
    </a>
  </div>
</template>
