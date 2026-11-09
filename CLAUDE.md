# booking-fe

Vue 3 + TypeScript frontend for a multi-tenant, white-label booking SaaS. The API is the separate repo `booking-api` (Laravel 13). `SCOPE.md` in this repo describes scope; code comments are mostly in Serbian.

## Stack
- Vue 3.5 (`<script setup lang="ts">`), TypeScript, Vite, Pinia, Vue Router, Axios, vue-i18n
- Tailwind CSS 4 (`@tailwindcss/vite`), shadcn-vue (`components.json`) on reka-ui, icons from `@lucide/vue`, `@vueuse/core`
- Tests: Vitest + Vue Test Utils (unit), Playwright (e2e)

## Commands
```
npm run dev          # vite
npm run build        # type-check + vite build
npm run type-check   # vue-tsc --build
npm run lint         # oxlint --fix, then eslint --fix
npm run format       # prettier --write src/
npm run test:unit    # vitest
npm run test:e2e     # playwright
```
Before calling a task done: `npm run type-check && npm run lint && npm run test:unit`.

## Structure (`src/`)
- `api/`: one Axios module per area (`booking`, `slots`, `services`, `tenant`, `admin`, `notifications`); the shared client is `api/axios.ts`. Don't call Axios directly from components.
- `stores/`: Pinia (`auth`, `tenant`, `adminContext`).
- `views/`: `booking/` (public), `auth/` (register, invite, Google callback), `admin/` (dashboard for client/worker/superadmin), plus `LandingView.vue`.
- `components/`: `ui/` is shadcn-vue (add new primitives with the shadcn-vue CLI, don't hand-roll), `admin/`, `auth/`, `booking/`, `brand/` (logo), plus shared ones (`ConfirmModal`, `ToastContainer`, `SubscriptionBanner`, ...).
- `composables/` (`useToast`, `useConfirm`), `lib/` (helpers: `domain`, `apiError`, `color`, `price`, `googleAuth`, `myBookings`, `utils`), `i18n/` (`en.ts`, `sr.ts`).
- Tests live in `src/__tests__/` and mirror the `src/` layout.

## Multi-tenancy
- One build serves every tenant. `api/axios.ts` decides the tenant from the hostname: `X-Tenant-Subdomain` for `*.localhost` and `*.<VITE_PLATFORM_HOST>`, `X-Tenant-Domain` for custom domains, and no header on the platform host. `VITE_TENANT_SUBDOMAIN` overrides it in dev.
- `lib/domain.ts` (`isPlatformHost`) decides what `/` shows: landing on the platform host, the booking form on a tenant domain.
- Env vars: `VITE_API_URL`, `VITE_PLATFORM_HOST`, `VITE_TENANT_SUBDOMAIN`.
- Tenant branding (name, colors, theme, logo) comes from the API via the `tenant` store. Apply it through CSS variables / Tailwind tokens, not hardcoded colors.
- Expired / canceled tenants get 403 from the API; show it with `SubscriptionBanner` or a clear screen, not a generic error.

## Auth and routes
- Sanctum token kept in the `auth` store and sent by the Axios client. Routes with `meta.requiresAuth` live under `/admin/*`.
- Public routes: `/` (booking or landing), `/confirmation`, `/manage/:token` (end user manages a booking by token, no account), `/register`, `/invite/:token` (worker sets password), `/auth/callback` (Google login returns here).
- Google login uses one central callback; the button works on tenant domains too.

## Conventions
- Use shadcn-vue components for UI; don't add another UI library.
- All user-facing strings go through vue-i18n and must exist in both `en.ts` and `sr.ts`. The active locale is sent as `Accept-Language`.
- Type API responses (no `any` for API data). Show API errors via `lib/apiError.ts`.
- Keep components small; split anything that grows past about 200 lines.
- Add or update a test in `src/__tests__/` when changing a store, API module, composable or lib helper.

## Landing page ("Termin")
`LandingView.vue` and `assets/landing` come from the Figma design. Some of its content (pricing tiers, online payments, reporting) isn't backed by the API. Don't build functionality for it unless asked.

## Don'ts
- Don't push to `main` or add dependencies without asking.
- Don't change API contracts from the frontend; if the API needs to change, say so.
- Don't hardcode tenant-specific values.
