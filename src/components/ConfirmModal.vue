<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { TriangleAlertIcon } from '@lucide/vue'
import { useConfirm } from '@/composables/useConfirm'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const { isOpen, message, accept, reject } = useConfirm()

// Dijalog zatvara samo naše stanje (isOpen); Esc se računa kao odustajanje
function onOpenChange(open: boolean) {
  if (!open) reject()
}
</script>

<template>
  <AlertDialog :open="isOpen" @update:open="onOpenChange">
    <AlertDialogContent class="data-[size=default]:sm:max-w-sm">
      <AlertDialogHeader>
        <AlertDialogMedia class="size-10 rounded-full bg-destructive/10 text-destructive *:[svg:not([class*=size-])]:size-5">
          <TriangleAlertIcon />
        </AlertDialogMedia>
        <AlertDialogTitle class="sr-only">{{ t('common.confirm') }}</AlertDialogTitle>
        <AlertDialogDescription class="text-foreground leading-relaxed">{{ message }}</AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter class="grid grid-cols-2 gap-2">
        <Button variant="outline" @click="reject">{{ t('common.cancel') }}</Button>
        <Button class="bg-destructive text-white hover:bg-destructive/90" @click="accept">{{ t('common.confirm') }}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
