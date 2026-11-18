import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

import './globals.css'

import { CookieConsent, type CookieConsentState } from '@/components/site/cookie-consent'
import { ConsentedAnalytics } from '@/components/site/consented-analytics'
import { CartGiftSync } from '@/components/site/cart-gift-sync'
import { CartWelcomeOfferSync } from '@/components/site/cart-welcome-offer-sync'
import { JsonLd } from '@/components/site/json-ld'
import { LocaleDocumentLanguage } from '@/components/site/locale-document-language'
import { SitePopupGate } from '@/components/site/site-popup-gate'
import { StoreRuntimeGate } from '@/components/site/store-runtime-gate'
import { ToastProvider } from '@/components/site/toast-provider'
import { getSiteOrigin } from '@/lib/site-url'
import { organizationJsonLd } from '@/lib/structured-data'

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: 'Vizaje-Nica — косметика и парфюмерия',
  description: 'Новая версия магазина Vizaje-Nica',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body>
        <JsonLd data={organizationJsonLd()} />
        {children}
        <Suspense fallback={null}>
          <StoreRuntimeGate>
            <CartGiftSync />
            <CartWelcomeOfferSync />
            <LocaleDocumentLanguage />
            <ToastProvider />
            <CookieConsentGate />
            <SitePopupGate />
          </StoreRuntimeGate>
        </Suspense>
      </body>
    </html>
  )
}

async function CookieConsentGate() {
  const cookieStore = await cookies()
  const rawConsent = cookieStore.get('cookie_consent')?.value
  let initialConsent: CookieConsentState | null = null

  if (rawConsent) {
    try {
      const parsed = JSON.parse(rawConsent) as Partial<CookieConsentState>
      initialConsent = {
        functional: parsed.functional === true,
        analytics: parsed.analytics === true,
        marketing: parsed.marketing === true,
      }
    } catch {
      initialConsent = null
    }
  }

  return (
    <>
      <CookieConsent initialConsent={initialConsent} />
      <ConsentedAnalytics consent={initialConsent} />
    </>
  )
}
