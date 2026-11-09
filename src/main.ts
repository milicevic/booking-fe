import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './style.css'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { onUnauthorized } from './api/axios'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

// Istekla prijava: brišemo token i vraćamo korisnika na prijavu ako je bio u adminu
onUnauthorized(() => {
  useAuthStore().clearSession()
  if (router.currentRoute.value.meta.requiresAuth) router.push({ name: 'login' })
})

app.mount('#app')

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
