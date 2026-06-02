import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Javne rute
    {
      path: '/',
      name: 'booking',
      component: () => import('@/views/booking/BookingView.vue'),
    },
    {
      path: '/confirmation',
      name: 'confirmation',
      component: () => import('@/views/booking/ConfirmationView.vue'),
    },
    {
      path: '/manage/:token',
      name: 'manage',
      component: () => import('@/views/booking/ManageView.vue'),
    },

    // Auth rute
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
    },
    {
      path: '/invite/:token',
      name: 'worker-invite',
      component: () => import('@/views/auth/WorkerInviteView.vue'),
    },

    // Admin rute
    {
      path: '/admin/login',
      name: 'login',
      component: () => import('@/views/admin/LoginView.vue'),
    },
    {
      path: '/admin',
      name: 'dashboard',
      component: () => import('@/views/admin/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/workers',
      name: 'workers',
      component: () => import('@/views/admin/WorkersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/slots',
      name: 'slots',
      component: () => import('@/views/admin/SlotsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/bookings',
      name: 'bookings',
      component: () => import('@/views/admin/BookingsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Auth guard
router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }
})

export default router
