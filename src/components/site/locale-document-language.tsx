'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { getPathLocale } from '@/lib/locale-routing'

export function LocaleDocumentLanguage() {
  const locale = getPathLocale(usePathname())

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
