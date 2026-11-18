import Script from 'next/script'

import type { CookieConsentState } from '@/components/site/cookie-consent'

function getGtmId() {
  const value = process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? ''
  return /^GTM-[A-Z0-9]+$/i.test(value) ? value : ''
}

function getClarityId() {
  const value = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() ?? ''
  return /^[A-Z0-9_-]{4,64}$/i.test(value) ? value : ''
}

export function ConsentedAnalytics({ consent }: { consent: CookieConsentState | null }) {
  if (!consent?.analytics) return null

  const clarityId = getClarityId()
  const gtmId = consent.marketing ? getGtmId() : ''

  return (
    <>
      {clarityId ? (
        <Script src={`https://www.clarity.ms/tag/${clarityId}`} strategy="afterInteractive" />
      ) : null}
      {gtmId ? (
        <Script id="consented-gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!=='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      ) : null}
    </>
  )
}
