import type { ReactNode } from 'react'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { StorefrontFooter } from '@/components/site/storefront-footer'
import { SiteHeader } from '@/components/site/site-header'
import { StorefrontChromeVisibility } from '@/components/site/storefront-chrome-visibility'
import { StorefrontHeaderVisibility } from '@/components/site/storefront-header-visibility'
import { StorefrontThemeSync } from '@/components/site/storefront-theme-sync'
import { SmoothScroll } from '@/components/site/smooth-scroll'
import { getStoreNavigation } from '@/lib/store-navigation'
import { getCheckoutCustomerPrefill, getCheckoutOptions } from '@/lib/checkout-options'

type StorefrontLayoutProps = {
  children: ReactNode
  locale?: 'ru' | 'ro'
}

async function StorefrontHeader({ locale }: { locale: 'ru' | 'ro' }) {
  await connection()
  const [navigation, checkoutOptions, checkoutCustomer] = await Promise.all([
    getStoreNavigation(locale),
    getCheckoutOptions(locale),
    getCheckoutCustomerPrefill(),
  ])

  return <SiteHeader navigationItems={navigation.desktop} mobileNavigationItems={navigation.mobile} checkoutOptions={checkoutOptions} checkoutCustomer={checkoutCustomer} />
}

export function StorefrontLayout({ children, locale = 'ru' }: StorefrontLayoutProps) {
  return (
    <>
      <SmoothScroll />
      <StorefrontThemeSync />
      <Suspense fallback={null}>
        <StorefrontHeaderVisibility>
          <StorefrontHeader locale={locale} />
        </StorefrontHeaderVisibility>
      </Suspense>
      {children}
      <Suspense fallback={null}>
        <StorefrontHeaderVisibility>
          <div className="h-[calc(102px_+_env(safe-area-inset-bottom))] min-[601px]:hidden" aria-hidden="true" />
        </StorefrontHeaderVisibility>
      </Suspense>
      <Suspense fallback={null}>
        <StorefrontChromeVisibility>
          <StorefrontFooter locale={locale} />
        </StorefrontChromeVisibility>
      </Suspense>
    </>
  )
}
