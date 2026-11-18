'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const hiddenHeaderRoutes = [
  '/ru/admin',
  '/admin',
  '/ru/checkout',
  '/ru/b2b',
  '/ru/podarochnaya-karta',
  '/ru/card-cadou',
  '/ru/podarochnyie-sertifikatyi',
  '/ru/sertifikatyi',
]

export function StorefrontHeaderVisibility({ children }: { children: ReactNode }) {
  const pathname = (usePathname() ?? '').replace(/^\/(?:ru|ro)(?=\/|$)/, '/ru')
  if (hiddenHeaderRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return null
  return children
}
