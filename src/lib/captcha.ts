// Zaštita javnih formi od botova (Cloudflare Turnstile) je uključena samo kad postoji ključ sajta
export function captchaEnabled(): boolean {
  return !!import.meta.env.VITE_TURNSTILE_SITE_KEY
}
