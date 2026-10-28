<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import heroVisual from '@/assets/landing/hero-visual.png'
import AppLogo from '@/components/brand/AppLogo.vue'
import LangSwitcher from '@/components/LangSwitcher.vue'
import sparklesIcon from '@/assets/landing/sparkles.svg'
import arrowRightIcon from '@/assets/landing/arrow-right.svg'
import arrowRightSmIcon from '@/assets/landing/arrow-right-sm.svg'
import arrowRightBlueIcon from '@/assets/landing/arrow-right-blue.svg'
import playIcon from '@/assets/landing/play.svg'
import playWhiteIcon from '@/assets/landing/play-white.svg'
import checkCircleIcon from '@/assets/landing/check-circle.svg'
import checkCircleWhiteIcon from '@/assets/landing/check-circle-white.svg'
import shieldCheckIcon from '@/assets/landing/shield-check.svg'
import shieldCheckWhiteIcon from '@/assets/landing/shield-check-white.svg'
import clockWhiteIcon from '@/assets/landing/clock-white.svg'
import checkIcon from '@/assets/landing/check.svg'
import layoutIcon from '@/assets/landing/layout.svg'
import calendarGreenIcon from '@/assets/landing/calendar-green.svg'
import usersIcon from '@/assets/landing/users.svg'
import creditCardIcon from '@/assets/landing/credit-card.svg'
import bellIcon from '@/assets/landing/bell.svg'
import barChartIcon from '@/assets/landing/bar-chart-3.svg'
import chartBarIcon from '@/assets/landing/chart-bar.svg'

const { t } = useI18n()

const year = new Date().getFullYear()

const navLinks = [
  { key: 'features', href: '#features' },
  { key: 'howItWorks', href: '#how-it-works' },
  { key: 'pricing', href: '#pricing' },
  { key: 'testimonials', href: '#testimonials' },
]

const heroTrust = ['noCode', 'payments', 'mobile']

const features = [
  { key: 'themes', icon: layoutIcon, bg: 'bg-[#eef2ff]' },
  { key: 'calendar', icon: calendarGreenIcon, bg: 'bg-[#ecfdf5]' },
  { key: 'clients', icon: usersIcon, bg: 'bg-[#fff7ed]' },
  { key: 'staff', icon: creditCardIcon, bg: 'bg-[#eef2ff]' },
  { key: 'notifications', icon: bellIcon, bg: 'bg-[#ecfdf5]' },
  { key: 'performance', icon: barChartIcon, bg: 'bg-[#f3f4f6]' },
  { key: 'insights', icon: chartBarIcon, bg: 'bg-[#ecfdf5]' },
]

const steps = [
  { key: 'signUp', bg: 'bg-[#eef2ff]', color: 'text-[#2563eb]' },
  { key: 'customize', bg: 'bg-[#ecfdf5]', color: 'text-[#10b981]' },
  { key: 'publish', bg: 'bg-[#fff7ed]', color: 'text-[#f97316]' },
]

const quotes = [
  { key: 'alex', name: 'Alex Rivera', bg: 'bg-[#eef2ff]', color: 'text-[#2563eb]' },
  { key: 'maya', name: 'Maya Chen', bg: 'bg-[#ecfdf5]', color: 'text-[#10b981]' },
  { key: 'jordan', name: 'Jordan Lee', bg: 'bg-[#fff7ed]', color: 'text-[#f97316]' },
]

const plans = [
  {
    key: 'starter',
    price: '$0',
    items: ['websiteBuilder', 'basicBooking', 'bookingLimit'],
    featured: false,
  },
  {
    key: 'pro',
    price: '$29',
    items: ['unlimited', 'payments', 'reminders'],
    featured: true,
  },
]

const ctaTrust = [
  { key: 'securePayments', icon: shieldCheckWhiteIcon },
  { key: 'support', icon: clockWhiteIcon },
  { key: 'cancelAnytime', icon: checkCircleWhiteIcon },
]

const footerColumns = [
  {
    key: 'product',
    links: [
      { key: 'features', href: '#features' },
      { key: 'howItWorks', href: '#how-it-works' },
      { key: 'pricing', href: '#pricing' },
    ],
  },
  {
    key: 'company',
    links: [
      { key: 'about', href: '#' },
      { key: 'blog', href: '#' },
      { key: 'careers', href: '#' },
    ],
  },
  {
    key: 'support',
    links: [
      { key: 'helpCenter', href: '#' },
      { key: 'contact', href: '#' },
      { key: 'status', href: '#' },
    ],
  },
]
</script>

<template>
  <div class="min-h-screen bg-[#f9fafb] font-['Inter',sans-serif] text-[#111827]">
    <!-- Navbar -->
    <header
      class="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e5e7eb] bg-white px-5 py-4 lg:px-20"
    >
      <RouterLink to="/" class="whitespace-nowrap">
        <AppLogo />
      </RouterLink>

      <nav class="hidden items-center gap-6 text-sm font-semibold md:flex">
        <a v-for="link in navLinks" :key="link.key" :href="link.href" class="hover:text-[#2563eb]">
          {{ t(`landing.nav.${link.key}`) }}
        </a>
      </nav>

      <div class="flex items-center gap-3">
        <LangSwitcher />
        <RouterLink
          to="/admin/login"
          class="hidden h-10 items-center justify-center rounded-full border border-[#e5e7eb] px-3.5 text-sm font-semibold hover:bg-[#f9fafb] sm:flex"
        >
          {{ t('landing.nav.login') }}
        </RouterLink>
        <RouterLink
          to="/register"
          class="flex h-10 items-center justify-center rounded-full bg-[#2563eb] px-4 text-sm font-bold whitespace-nowrap text-white shadow-[0_10px_12px_rgba(37,99,235,0.2)] hover:bg-[#1d4ed8]"
        >
          {{ t('landing.nav.getStarted') }}
        </RouterLink>
      </div>
    </header>

    <!-- Hero -->
    <section class="flex flex-col items-center gap-16 px-5 py-12 lg:px-20 lg:py-[72px] xl:flex-row">
      <div class="flex w-full flex-col items-start gap-5 xl:w-[520px] xl:shrink-0">
        <span
          class="flex items-center gap-2 rounded-full border border-[#e0e7ff] bg-[#eef2ff] px-3 py-1.5"
        >
          <img :src="sparklesIcon" alt="" width="16" height="16" class="shrink-0" />
          <span class="text-xs font-bold text-[#2563eb] uppercase">
            {{ t('landing.hero.eyebrow') }}
          </span>
        </span>
        <h1 class="text-4xl leading-[1.1] font-extrabold sm:text-[56px]">
          {{ t('landing.hero.title') }}
        </h1>
        <p class="text-lg leading-[1.5] text-[#6b7280]">
          {{ t('landing.hero.subtitle') }}
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <RouterLink
            to="/register"
            class="flex h-12 items-center justify-center gap-2.5 rounded-full bg-[#2563eb] px-[22px] text-[15px] font-extrabold text-white shadow-[0_12px_13px_rgba(37,99,235,0.2)] hover:bg-[#1d4ed8]"
          >
            {{ t('landing.hero.ctaPrimary') }}
            <img :src="arrowRightIcon" alt="" width="18" height="18" />
          </RouterLink>
          <a
            href="#how-it-works"
            class="flex h-12 items-center justify-center gap-2.5 rounded-full border border-[#e5e7eb] px-[18px] text-[15px] font-bold hover:bg-white"
          >
            <img :src="playIcon" alt="" width="18" height="18" />
            {{ t('landing.hero.ctaSecondary') }}
          </a>
        </div>
        <ul class="flex flex-wrap items-center gap-4">
          <li v-for="item in heroTrust" :key="item" class="flex items-center gap-2">
            <img :src="checkCircleIcon" alt="" width="16" height="16" />
            <span class="text-[13px] font-semibold">{{ t(`landing.hero.trust.${item}`) }}</span>
          </li>
        </ul>
      </div>

      <div
        class="relative aspect-[640/420] w-full max-w-[640px] overflow-hidden rounded-3xl shadow-[0_18px_42px_-14px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.06)] xl:min-w-0 xl:flex-1"
      >
        <img :src="heroVisual" alt="" class="absolute inset-0 size-full object-cover" />
        <div class="absolute inset-0 bg-black/8" />
        <span
          class="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white/80 px-3 py-2 backdrop-blur-[9px]"
        >
          <img :src="shieldCheckIcon" alt="" width="16" height="16" />
          <span class="text-xs font-bold">{{ t('landing.hero.badge') }}</span>
        </span>
        <div
          class="absolute right-4 bottom-4 left-4 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-2 shadow-[0_10px_12px_rgba(0,0,0,0.07)]"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[13px] font-extrabold">{{ t('landing.hero.bannerTitle') }}</span>
            <span class="hidden text-xs text-[#6b7280] sm:block">
              {{ t('landing.hero.bannerText') }}
            </span>
          </div>
          <RouterLink
            to="/register"
            class="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#2563eb] px-3.5 text-[13px] font-extrabold text-white hover:bg-[#1d4ed8]"
          >
            {{ t('landing.hero.bannerCta') }}
            <img :src="arrowRightSmIcon" alt="" width="16" height="16" />
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="flex flex-col gap-10 bg-white px-5 py-16 lg:px-20 lg:py-24">
      <div class="flex flex-col items-center gap-3 text-center">
        <p class="text-sm font-extrabold text-[#2563eb] uppercase">{{ t('landing.features.eyebrow') }}</p>
        <h2 class="text-3xl font-extrabold lg:text-[40px]">{{ t('landing.features.title') }}</h2>
        <p class="max-w-[720px] text-base leading-[1.5] text-[#6b7280]">
          {{ t('landing.features.subtitle') }}
        </p>
      </div>
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(feature, i) in features"
          :key="feature.key"
          :class="[
            'flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_5px_rgba(0,0,0,0.04)] lg:min-h-[220px]',
            i === features.length - 1 && 'md:col-span-2 lg:col-span-3',
          ]"
        >
          <span :class="['flex size-11 items-center justify-center rounded-[14px]', feature.bg]">
            <img :src="feature.icon" alt="" width="22" height="22" />
          </span>
          <h3 class="text-lg font-extrabold">{{ t(`landing.features.${feature.key}.title`) }}</h3>
          <p class="text-sm leading-[1.5] text-[#6b7280]">{{ t(`landing.features.${feature.key}.text`) }}</p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how-it-works" class="flex flex-col gap-10 bg-[#f9fafb] px-5 py-16 lg:px-20 lg:py-24">
      <div class="flex flex-col items-center gap-3 text-center">
        <p class="text-sm font-extrabold text-[#2563eb] uppercase">{{ t('landing.howItWorks.eyebrow') }}</p>
        <h2 class="text-3xl font-extrabold lg:text-[40px]">{{ t('landing.howItWorks.title') }}</h2>
        <p class="max-w-[720px] text-base leading-[1.5] text-[#6b7280]">
          {{ t('landing.howItWorks.subtitle') }}
        </p>
      </div>
      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="(step, i) in steps"
          :key="step.key"
          class="flex flex-col gap-3.5 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_5px_rgba(0,0,0,0.04)] md:min-h-[320px]"
        >
          <span
            :class="[
              'flex size-10 items-center justify-center rounded-xl text-sm font-extrabold',
              step.bg,
              step.color,
            ]"
          >
            {{ i + 1 }}
          </span>
          <h3 class="text-lg font-extrabold">{{ t(`landing.howItWorks.${step.key}.title`) }}</h3>
          <p class="text-sm leading-[1.5] text-[#6b7280]">{{ t(`landing.howItWorks.${step.key}.text`) }}</p>
        </div>
      </div>
    </section>

    <!-- Social proof -->
    <section id="testimonials" class="flex flex-col gap-10 bg-white px-5 py-16 lg:px-20 lg:py-24">
      <div class="flex flex-col items-center gap-3 text-center">
        <p class="text-sm font-extrabold text-[#2563eb] uppercase">{{ t('landing.testimonials.eyebrow') }}</p>
        <h2 class="text-3xl font-extrabold lg:text-[40px]">{{ t('landing.testimonials.title') }}</h2>
        <p class="max-w-[720px] text-base leading-[1.5] text-[#6b7280]">
          {{ t('landing.testimonials.subtitle') }}
        </p>
      </div>
      <div class="grid items-start gap-6 md:grid-cols-3">
        <figure
          v-for="quote in quotes"
          :key="quote.key"
          class="flex flex-col gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_2px_5px_rgba(0,0,0,0.04)]"
        >
          <blockquote class="text-base leading-[1.5]">{{ t(`landing.testimonials.${quote.key}.quote`) }}</blockquote>
          <figcaption class="flex items-center gap-2.5">
            <span
              :class="[
                'flex size-9 items-center justify-center rounded-[18px] text-sm font-extrabold',
                quote.bg,
                quote.color,
              ]"
            >
              {{ quote.name[0] }}
            </span>
            <span class="flex flex-col gap-0.5">
              <span class="text-sm font-extrabold">{{ quote.name }}</span>
              <span class="text-[13px] text-[#6b7280]">{{ t(`landing.testimonials.${quote.key}.role`) }}</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="flex flex-col gap-10 bg-[#f9fafb] px-5 py-16 lg:px-20 lg:py-24">
      <div class="flex flex-col items-center gap-3 text-center">
        <p class="text-sm font-extrabold text-[#2563eb] uppercase">{{ t('landing.pricing.eyebrow') }}</p>
        <h2 class="text-3xl font-extrabold lg:text-[40px]">{{ t('landing.pricing.title') }}</h2>
        <p class="max-w-[720px] text-base leading-[1.5] text-[#6b7280]">
          {{ t('landing.pricing.subtitle') }}
        </p>
      </div>
      <div class="grid gap-6 md:grid-cols-2">
        <div
          v-for="plan in plans"
          :key="plan.key"
          :class="[
            'flex flex-col gap-4 rounded-2xl bg-white p-6 md:min-h-[420px]',
            plan.featured
              ? 'border-2 border-[#2563eb] shadow-[0_18px_40px_rgba(37,99,235,0.12),0_2px_10px_rgba(0,0,0,0.04)]'
              : 'border border-[#e5e7eb] shadow-[0_2px_5px_rgba(0,0,0,0.04)]',
          ]"
        >
          <div class="flex flex-col gap-1.5">
            <h3 :class="['text-base', plan.featured ? 'font-black' : 'font-extrabold']">
              {{ t(`landing.pricing.${plan.key}.name`) }}
            </h3>
            <p class="text-[13px] text-[#6b7280]">{{ t(`landing.pricing.${plan.key}.desc`) }}</p>
          </div>
          <p class="flex items-baseline gap-2">
            <span class="text-[40px] font-black">{{ plan.price }}</span>
            <span class="text-sm text-[#6b7280]">{{ t('landing.pricing.perMonth') }}</span>
          </p>
          <ul class="flex flex-col gap-2.5">
            <li v-for="item in plan.items" :key="item" class="flex items-center gap-2.5 text-sm">
              <img :src="checkIcon" alt="" width="16" height="16" />
              {{ t(`landing.pricing.${plan.key}.${item}`) }}
            </li>
          </ul>
          <RouterLink
            to="/register"
            :class="[
              'flex h-11 w-full items-center justify-center rounded-xl text-sm',
              plan.featured
                ? 'bg-[#2563eb] font-extrabold text-white hover:bg-[#1d4ed8]'
                : 'border border-[#e5e7eb] font-bold hover:bg-[#f9fafb]',
            ]"
          >
            {{ t(`landing.pricing.${plan.key}.cta`) }}
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="flex flex-col items-center gap-6 bg-[#2563eb] px-5 py-16 text-center lg:px-20 lg:py-[72px]">
      <div class="flex flex-col items-center gap-4">
        <h2 class="text-3xl font-black text-white lg:text-[44px]">{{ t('landing.cta.title') }}</h2>
        <p class="max-w-[720px] text-base leading-[1.5] text-white/80">
          {{ t('landing.cta.subtitle') }}
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <RouterLink
          to="/register"
          class="flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-white px-[22px] text-[15px] font-black text-[#2563eb] shadow-[0_14px_15px_rgba(0,0,0,0.15)] hover:bg-[#eef2ff]"
        >
          {{ t('landing.cta.primary') }}
          <img :src="arrowRightBlueIcon" alt="" width="18" height="18" />
        </RouterLink>
        <a
          href="#how-it-works"
          class="flex h-[52px] items-center justify-center gap-2.5 rounded-full border border-white/40 px-[18px] text-[15px] font-extrabold text-white hover:bg-white/10"
        >
          <img :src="playWhiteIcon" alt="" width="18" height="18" />
          {{ t('landing.cta.secondary') }}
        </a>
      </div>
      <ul class="flex flex-wrap items-center justify-center gap-4 opacity-90">
        <li v-for="item in ctaTrust" :key="item.key" class="flex items-center gap-2">
          <img :src="item.icon" alt="" width="16" height="16" />
          <span class="text-[13px] text-white">{{ t(`landing.cta.${item.key}`) }}</span>
        </li>
      </ul>
    </section>

    <!-- Footer -->
    <footer id="footer" class="flex flex-col gap-10 bg-[#111827] px-5 pt-14 pb-10 lg:px-20">
      <div class="flex flex-col justify-between gap-10 md:flex-row">
        <div class="flex max-w-[360px] flex-col gap-3">
          <AppLogo theme="dark" :tagline="false" :size="28" />
          <p class="text-sm leading-[1.5] text-white/70">
            {{ t('landing.footer.description') }}
          </p>
        </div>
        <div class="flex flex-wrap gap-16">
          <div v-for="col in footerColumns" :key="col.key" class="flex flex-col gap-2.5">
            <p class="text-xs font-extrabold text-white/40 uppercase">{{ t(`landing.footer.${col.key}`) }}</p>
            <a
              v-for="link in col.links"
              :key="link.key"
              :href="link.href"
              class="text-sm whitespace-nowrap text-white/80 hover:text-white"
            >
              {{ t(`landing.footer.${link.key}`) }}
            </a>
          </div>
        </div>
      </div>
      <div class="h-px w-full bg-white/12" />
      <div class="flex flex-wrap items-center justify-between gap-4 text-[13px] text-white/50">
        <p>{{ t('landing.footer.copyright', { year }) }}</p>
        <div class="flex items-center gap-4">
          <a href="#" class="hover:text-white">{{ t('landing.footer.privacy') }}</a>
          <a href="#" class="hover:text-white">{{ t('landing.footer.terms') }}</a>
        </div>
      </div>
    </footer>
  </div>
</template>
