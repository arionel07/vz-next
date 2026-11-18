'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

import { getPathLocale } from '@/lib/locale-routing'

export function OpenCartRoute() {
  const locale = getPathLocale(usePathname())

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('vz:open-cart'))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return <main className="site-shell min-h-[45vh]" aria-label={locale === 'ro' ? 'Coș' : 'Корзина'} />
}
