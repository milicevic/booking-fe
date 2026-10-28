import { test, expect, type Page } from '@playwright/test'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Svi API pozivi su mockovani — e2e ne zavisi od pokrenutog backenda
async function mockApi(page: Page, { slotTaken = false } = {}) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (url.pathname === '/api/slots/available') {
      return route.fulfill({
        json: [
          {
            id: 1,
            worker_id: 1,
            date: today(),
            start_time: '09:00:00',
            end_time: '09:30:00',
            is_available: true,
            worker: { id: 1, name: 'Marko', services: [] },
          },
        ],
      })
    }
    if (url.pathname === '/api/bookings' && method === 'POST' && slotTaken) {
      return route.fulfill({ status: 409, json: { message: 'Slot taken' } })
    }
    if (url.pathname === '/api/bookings' && method === 'POST') {
      return route.fulfill({ status: 201, json: { token: 'tok-e2e' } })
    }
    if (url.pathname === '/api/auth/login') {
      return route.fulfill({ status: 422, json: { message: 'Invalid credentials' } })
    }
    return route.fulfill({ status: 404, json: {} })
  })
}

// sw.js bi u WebKit-u presretao zahteve mimo page.route mockova
test.use({ serviceWorkers: 'block' })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('locale', 'en'))
  await mockApi(page)
})

test('end user can book an available slot', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Book an appointment')

  await page.getByRole('button', { name: /Marko/ }).click()
  await page.getByRole('button', { name: String(new Date().getDate()), exact: true }).click()
  await page.getByRole('button', { name: /09:00/ }).click()

  await page.getByPlaceholder(/./).first().fill('Ana')
  await page.locator('input[type="tel"]').fill('+381601234567')
  await page.getByRole('button', { name: 'Confirm booking' }).click()

  await expect(page).toHaveURL(/\/confirmation\?token=tok-e2e/)
})

test('admin routes redirect to login when logged out', async ({ page }) => {
  await page.goto('/admin/workers')
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test('login shows an error for invalid credentials', async ({ page }) => {
  await page.goto('/admin/login')
  await page.locator('#email').fill('wrong@example.com')
  await page.locator('#password').fill('wrong')
  await page.getByRole('button', { name: /log in|sign in|login/i }).click()
  await expect(page.getByText('Invalid email or password')).toBeVisible()
})

test('shows a notification when the slot was just taken', async ({ page }) => {
  await page.unrouteAll()
  await mockApi(page, { slotTaken: true })

  await page.goto('/')
  await page.getByRole('button', { name: /Marko/ }).click()
  await page.getByRole('button', { name: String(new Date().getDate()), exact: true }).click()
  await page.getByRole('button', { name: /09:00/ }).click()
  await page.getByPlaceholder(/./).first().fill('Ana')
  await page.locator('input[type="tel"]').fill('+381601234567')
  await page.getByRole('button', { name: 'Confirm booking' }).click()

  await expect(page.getByRole('alert')).toContainText('This slot just became unavailable')
  await expect(page).toHaveURL(/\/$/)
})
