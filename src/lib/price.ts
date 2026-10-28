// Cena dolazi sa backenda kao decimal string ("1200.00"); prikazujemo je bez nepotrebnih decimala, sa valutom firme ("1.200 RSD")
export function formatPrice(price: string | number, locale: string, currency?: string | null): string {
  const amount = new Intl.NumberFormat(locale === 'sr' ? 'sr-Latn-RS' : 'en-US', { maximumFractionDigits: 2 }).format(Number(price))
  return currency ? `${amount} ${currency}` : amount
}

export const CURRENCIES = ['RSD', 'EUR', 'BAM', 'MKD', 'USD', 'GBP', 'CHF'] as const
