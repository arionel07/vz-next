'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'

import { getPathLocale, localizedPath } from '@/lib/locale-routing'

type Props = ComponentProps<typeof Link>

export function LocalizedLink({ href, ...props }: Props) {
  const pathname = usePathname()
  const locale = getPathLocale(pathname)
  const localizedHref = typeof href === 'string' ? localizedPath(href, locale) : href

  return <Link href={localizedHref} {...props} />
}
