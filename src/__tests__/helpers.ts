import { createRouter, createMemoryHistory } from 'vue-router'

const Stub = { template: '<div />' }

// Router sa istim imenima ruta kao aplikacija, ali bez lazy-load view-ova
export function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'booking', component: Stub },
      { path: '/confirmation', name: 'confirmation', component: Stub },
      { path: '/manage/:token', name: 'manage', component: Stub },
      { path: '/register', name: 'register', component: Stub },
      { path: '/admin/login', name: 'login', component: Stub },
      { path: '/admin', name: 'dashboard', component: Stub },
    ],
  })
}

export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
