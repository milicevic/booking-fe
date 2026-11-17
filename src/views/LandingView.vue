<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CheckIcon, CheckCircleIcon, LanguagesIcon, MailIcon, PaletteIcon, UserCheckIcon, UsersIcon } from '@lucide/vue'
import LogoMark from '@/components/brand/LogoMark.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'
import { Button } from '@/components/ui/button'

// Landing platforme „Termin“ (Claude Design, artboard „Landing page“)
const { t } = useI18n()
const year = new Date().getFullYear()

const nav = ['howItWorks', 'features', 'audience', 'pricing'] as const
const navTarget: Record<(typeof nav)[number], string> = {
  howItWorks: '#kako-radi',
  features: '#mogucnosti',
  audience: '#za-koga',
  pricing: '#cena',
}
const steps = ['staff', 'slots', 'share', 'calendar'] as const
const features = [
  { key: 'staff', icon: UsersIcon },
  { key: 'confirm', icon: CheckCircleIcon },
  { key: 'email', icon: MailIcon },
  { key: 'brand', icon: PaletteIcon },
  { key: 'languages', icon: LanguagesIcon },
  { key: 'noAccount', icon: UserCheckIcon },
] as const
const audiences = ['salons', 'barbers', 'dentists'] as const
const perks = ['bookings', 'staff', 'brand', 'email', 'domain'] as const
const mockTimes = [
  { time: '09:00', state: 'free' },
  { time: '09:30', state: 'busy' },
  { time: '10:00', state: 'selected' },
  { time: '10:30', state: 'free' },
  { time: '11:30', state: 'free' },
] as const
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-foreground">
    <!-- Navigacija -->
    <header class="border-b bg-card">
      <div class="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-8 gap-y-4 px-6 py-4">
        <a href="#vrh" class="flex items-center gap-2.5 text-lg font-semibold">
          <LogoMark :size="32" />
          Termin
        </a>
        <nav :aria-label="t('landing.nav.label')" class="flex grow flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
          <a v-for="item in nav" :key="item" :href="navTarget[item]" class="hover:text-foreground">{{ t(`landing.nav.${item}`) }}</a>
        </nav>
        <div class="flex items-center gap-3">
          <LangSwitcher />
          <router-link :to="{ name: 'login' }" class="text-sm font-medium text-gray-600 hover:text-foreground">{{ t('landing.nav.login') }}</router-link>
          <Button as-child>
            <router-link :to="{ name: 'register' }">{{ t('landing.nav.signup') }}</router-link>
          </Button>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section id="vrh" class="mx-auto flex max-w-[1120px] flex-wrap items-center gap-12 px-6 pt-[72px] pb-20">
      <div class="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
        <p class="text-xs font-semibold uppercase tracking-[.08em] text-primary">{{ t('landing.hero.eyebrow') }}</p>
        <h1 class="text-[34px] leading-[1.15] font-semibold sm:text-[44px]">{{ t('landing.hero.title') }}</h1>
        <p class="max-w-[520px] text-lg text-gray-600">{{ t('landing.hero.subtitle') }}</p>
        <div class="flex flex-wrap items-center gap-3 pt-1">
          <Button size="lg" as-child>
            <router-link :to="{ name: 'register' }">{{ t('landing.hero.cta') }}</router-link>
          </Button>
          <Button size="lg" variant="outline" as-child>
            <a href="#kako-radi">{{ t('landing.hero.secondary') }}</a>
          </Button>
        </div>
        <p class="text-sm text-gray-600">{{ t('landing.hero.note') }}</p>
      </div>

      <!-- Primer forme za zakazivanje -->
      <div role="img" :aria-label="t('landing.mock.label')" class="mx-auto w-full max-w-[460px] min-w-0 flex-[1_1_380px]">
        <div class="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-card p-6 shadow-xs">
          <div>
            <p class="text-xs text-gray-500">{{ t('landing.mock.business') }}</p>
            <p class="text-xl font-semibold">{{ t('landing.mock.title') }}</p>
          </div>
          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('landing.mock.worker') }}</p>
            <div class="flex gap-2">
              <div class="flex flex-1 items-center gap-2.5 rounded-xl border border-primary bg-accent px-3 py-2.5">
                <span class="flex size-8 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">A</span>
                <span class="text-sm font-medium">Ana</span>
              </div>
              <div class="flex flex-1 items-center gap-2.5 rounded-xl border border-gray-200 bg-card px-3 py-2.5">
                <span class="flex size-8 items-center justify-center rounded-full bg-gray-100 text-[13px] font-semibold text-gray-600">M</span>
                <span class="text-sm font-medium">Marija</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('landing.mock.service') }}</p>
            <div class="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              <span class="font-medium">{{ t('landing.mock.haircut') }}</span>
              <span class="text-gray-600">30 min</span>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <p class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('landing.mock.times') }}</p>
            <div class="flex flex-wrap gap-2 text-sm">
              <span
                v-for="slot in mockTimes"
                :key="slot.time"
                class="rounded-lg border px-3.5 py-2"
                :class="{
                  'border-gray-200 text-gray-700': slot.state === 'free',
                  'border-gray-100 bg-gray-50 text-gray-500 line-through': slot.state === 'busy',
                  'border-primary bg-accent font-medium text-primary': slot.state === 'selected',
                }"
              >{{ slot.time }}</span>
            </div>
          </div>
          <div class="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground">{{ t('landing.mock.confirm') }}</div>
        </div>
      </div>
    </section>

    <!-- Kako radi -->
    <section id="kako-radi" class="border-y bg-card">
      <div class="mx-auto flex max-w-[1120px] flex-col gap-10 px-6 py-[72px]">
        <div class="flex max-w-[640px] flex-col gap-3">
          <h2 class="text-[30px] leading-tight font-semibold">{{ t('landing.how.title') }}</h2>
          <p class="text-gray-600">{{ t('landing.how.subtitle') }}</p>
        </div>
        <ol class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="(step, i) in steps" :key="step" class="flex flex-col gap-3 rounded-xl border border-gray-100 bg-card p-6">
            <span class="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">{{ i + 1 }}</span>
            <h3 class="text-lg font-semibold">{{ t(`landing.how.${step}.title`) }}</h3>
            <p class="text-sm text-gray-600">{{ t(`landing.how.${step}.text`) }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Mogućnosti -->
    <section id="mogucnosti" class="mx-auto flex max-w-[1120px] flex-col gap-10 px-6 py-20">
      <div class="flex max-w-[640px] flex-col gap-3">
        <h2 class="text-[30px] leading-tight font-semibold">{{ t('landing.features.title') }}</h2>
        <p class="text-gray-600">{{ t('landing.features.subtitle') }}</p>
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="f in features" :key="f.key" class="flex gap-4 rounded-xl border border-gray-100 bg-card p-5">
          <span aria-hidden="true" class="flex size-10 flex-none items-center justify-center rounded-lg bg-accent text-primary">
            <component :is="f.icon" class="size-5" />
          </span>
          <div class="flex flex-col gap-1">
            <h3 class="font-semibold">{{ t(`landing.features.${f.key}.title`) }}</h3>
            <p class="text-sm text-gray-600">{{ t(`landing.features.${f.key}.text`) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Za koga je -->
    <section id="za-koga" class="border-y bg-card">
      <div class="mx-auto flex max-w-[1120px] flex-col gap-10 px-6 py-[72px]">
        <h2 class="max-w-[640px] text-[30px] leading-tight font-semibold">{{ t('landing.audience.title') }}</h2>
        <div class="grid gap-6 md:grid-cols-3">
          <div v-for="a in audiences" :key="a" class="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-6">
            <h3 class="text-lg font-semibold">{{ t(`landing.audience.${a}.title`) }}</h3>
            <p class="text-sm text-gray-600">{{ t(`landing.audience.${a}.text`) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Cena -->
    <section id="cena" class="mx-auto flex max-w-[1120px] flex-wrap items-center gap-10 px-6 py-20">
      <div class="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
        <h2 class="text-[30px] leading-tight font-semibold">{{ t('landing.pricing.title') }}</h2>
        <p class="max-w-[480px] text-gray-600">{{ t('landing.pricing.subtitle') }}</p>
      </div>
      <div class="flex max-w-[460px] min-w-0 flex-[1_1_360px] flex-col gap-5 rounded-2xl border border-gray-100 bg-card p-8 shadow-xs">
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium text-gray-600">{{ t('landing.pricing.plan') }}</p>
          <p class="flex items-baseline gap-2">
            <span class="text-4xl font-semibold">{{ t('landing.pricing.price') }}</span>
            <span class="text-sm text-gray-600">{{ t('landing.pricing.per') }}</span>
          </p>
        </div>
        <ul class="flex flex-col gap-2.5 text-sm text-gray-700">
          <li v-for="perk in perks" :key="perk" class="flex items-center gap-2.5">
            <CheckIcon class="size-[18px] flex-none text-primary" aria-hidden="true" />
            {{ t(`landing.pricing.perks.${perk}`) }}
          </li>
        </ul>
        <Button size="lg" as-child>
          <router-link :to="{ name: 'register' }">{{ t('landing.pricing.cta') }}</router-link>
        </Button>
      </div>
    </section>

    <!-- Završni poziv -->
    <section class="mx-auto max-w-[1120px] px-6 pb-20">
      <div class="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-primary px-8 py-12 text-primary-foreground">
        <div class="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
          <h2 class="text-[28px] leading-tight font-semibold">{{ t('landing.cta.title') }}</h2>
          <p>{{ t('landing.cta.text') }}</p>
        </div>
        <router-link
          :to="{ name: 'register' }"
          class="rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-indigo-800 outline-none hover:bg-indigo-50 focus-visible:ring-3 focus-visible:ring-white/60"
        >
          {{ t('landing.cta.button') }}
        </router-link>
      </div>
    </section>

    <footer class="border-t bg-card">
      <div class="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-gray-600">
        <span class="font-semibold text-foreground">Termin</span>
        <span>© {{ year }} Termin</span>
      </div>
    </footer>
  </div>
</template>
