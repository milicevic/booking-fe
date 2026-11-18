import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import AddToCalendar from '@/components/booking/AddToCalendar.vue'

const calendar = { google_url: 'https://calendar.google.com/calendar/render?action=TEMPLATE', ics_url: 'https://api.example/api/bookings/tok/calendar.ics' }

function mountWith(userAgent: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  return mount(AddToCalendar, { props: { calendar }, global: { plugins: [i18n] } })
}

afterEach(() => vi.restoreAllMocks())

describe('AddToCalendar', () => {
  it('opens Google Calendar on Android and the web, with .ics as an alternative', () => {
    const wrapper = mountWith('Mozilla/5.0 (Linux; Android 14)')
    const links = wrapper.findAll('a')

    expect(links[0]!.attributes('href')).toBe(calendar.google_url)
    expect(links[0]!.text()).toContain('Google Calendar')
    expect(links[1]!.attributes('href')).toBe(calendar.ics_url)
  })

  it('downloads the .ics file on iPhone', () => {
    const wrapper = mountWith('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    const links = wrapper.findAll('a')

    expect(links).toHaveLength(1)
    expect(links[0]!.attributes('href')).toBe(calendar.ics_url)
  })
})
