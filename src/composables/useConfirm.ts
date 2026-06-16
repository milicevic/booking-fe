import { ref } from 'vue'

const isOpen = ref(false)
const message = ref('')
let _resolve: ((v: boolean) => void) | null = null

export function useConfirm() {
  function confirm(msg: string): Promise<boolean> {
    message.value = msg
    isOpen.value = true
    return new Promise((resolve) => {
      _resolve = resolve
    })
  }

  function accept() {
    isOpen.value = false
    _resolve?.(true)
    _resolve = null
  }

  function reject() {
    isOpen.value = false
    _resolve?.(false)
    _resolve = null
  }

  return { isOpen, message, confirm, accept, reject }
}
