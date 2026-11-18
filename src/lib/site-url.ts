const FALLBACK_SITE_ORIGIN = 'https://vizaje-nica.com'

export function getSiteOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!configuredOrigin) return FALLBACK_SITE_ORIGIN

  try {
    const url = new URL(configuredOrigin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return FALLBACK_SITE_ORIGIN
    return url.origin
  } catch {
    return FALLBACK_SITE_ORIGIN
  }
}
