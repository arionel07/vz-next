'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const standaloneRoutes = [
  '/ru/checkout',
  '/ru/b2b',
  '/ru/podarochnaya-karta',
  '/ru/card-cadou',
  '/ru/podarochnyie-sertifikatyi',
  '/ru/sertifikatyi',
]

export function StorefrontChromeVisibility({ children }: { children: ReactNode }) {
  const pathname = (usePathname() ?? '').replace(/^\/(?:ru|ro)(?=\/|$)/, '/ru')

  if (standaloneRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return null

  return children
}
