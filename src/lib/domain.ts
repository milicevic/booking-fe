// Glavna platforma (npr. slotres.click) — tu ide landing stranica umesto booking forme tenanta
export function isPlatformHost(): boolean {
  if (import.meta.env.VITE_TENANT_SUBDOMAIN) return false

  return isPlatformHostname(window.location.hostname)
}

// www.slotres.click je isto što i slotres.click, a ne salon sa poddomenom "www"
export function isPlatformHostname(hostname: string): boolean {
  const platformHost = import.meta.env.VITE_PLATFORM_HOST
  return !!platformHost && (hostname === platformHost || hostname === `www.${platformHost}`)
}

// Adresa sajta klijenta (npr. https://salon-ana.slotres.click). Port se zadržava zbog lokalnog dev servera.
export function tenantUrl(subdomain: string, path = ''): string {
  const platformHost = import.meta.env.VITE_PLATFORM_HOST || 'slotres.click'
  const { protocol, port } = window.location
  return `${protocol}//${subdomain}.${platformHost}${port ? `:${port}` : ''}${path}`
}
