'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'

import { getPathLocale } from '@/lib/locale-routing'
import { useAccessibleDialog } from '@/lib/use-accessible-dialog'
import { usePortalRoot } from '@/lib/use-portal-root'

export type SitePopupData = {
  id: number
  titleRu: string
  titleRo: string
  textRu: string
  textRo: string
  image: string | null
  ctaLabelRu: string
  ctaLabelRo: string
  ctaUrl: string
  reshowDays: number
}

const dismissKey = (id: number) => `vz-popup-dismissed-${id}`

function isDismissed(popup: SitePopupData) {
  try {
    const raw = window.localStorage.getItem(dismissKey(popup.id))
    if (!raw) return false
    const dismissedAt = Number(raw)
    if (!Number.isFinite(dismissedAt)) return false
    const reshowMs = popup.reshowDays * 24 * 60 * 60 * 1000
    return Date.now() - dismissedAt < reshowMs
  } catch {
    return false
  }
}

function markDismissed(popup: SitePopupData) {
  try {
    window.localStorage.setItem(dismissKey(popup.id), String(Date.now()))
  } catch {
    // Private browsing / storage disabled — the popup will just show again next visit.
  }
}

export function SitePopupDialog({ popup }: { popup: SitePopupData }) {
  const pathname = usePathname()
  const locale = getPathLocale(pathname ?? '/ru')
  const portalRoot = usePortalRoot()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isDismissed(popup)) return
    const timer = window.setTimeout(() => setOpen(true), 600)
    return () => window.clearTimeout(timer)
    // Intentionally runs once per mount (one popup is resolved server-side per page load).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => {
    markDismissed(popup)
    setOpen(false)
  }

  useAccessibleDialog({ open, rootRef: dialogRef, initialFocusRef: closeButtonRef, onClose: close })

  if (!portalRoot) return null

  const title = locale === 'ro' ? popup.titleRo : popup.titleRu
  const text = locale === 'ro' ? popup.textRo : popup.textRu
  const ctaLabel = locale === 'ro' ? popup.ctaLabelRo : popup.ctaLabelRu

  return createPortal((
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[1000003]" role="presentation">
          <motion.button
            aria-label={locale === 'ro' ? 'Închide' : 'Закрыть'}
            className="absolute inset-0 w-full bg-black/35"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            onClick={close}
            tabIndex={-1}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            type="button"
          />
          <motion.div
            ref={dialogRef}
            aria-labelledby="site-popup-title"
            aria-modal="true"
            className="absolute top-1/2 left-1/2 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] bg-white text-midnight-ink shadow-[0_24px_60px_rgb(0_0_0_/_22%)]"
            initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
            role="dialog"
            tabIndex={-1}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              ref={closeButtonRef}
              aria-label={locale === 'ro' ? 'Închide' : 'Закрыть'}
              className="absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-midnight-ink transition-colors hover:text-hover-cream"
              onClick={close}
              type="button"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            {popup.image ? (
              <div className="relative h-[180px] w-full bg-mist">
                <Image alt="" className="object-cover" fill sizes="420px" src={`/legacy-assets/popups/${encodeURIComponent(popup.image)}`} unoptimized />
              </div>
            ) : null}

            <div className="flex flex-col gap-3 p-7">
              <h2 className="m-0 text-[22px] leading-[1.2] font-semibold tracking-[-.02em]" id="site-popup-title">{title}</h2>
              <p className="m-0 text-sm leading-[1.55] whitespace-pre-line text-graphite">{text}</p>
              {ctaLabel && popup.ctaUrl ? (
                <Link
                  className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-midnight-ink px-6 text-[13px] font-medium text-white transition-colors hover:bg-button-hover hover:text-midnight-ink"
                  href={popup.ctaUrl}
                  onClick={close}
                >
                  {ctaLabel}
                </Link>
              ) : null}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  ), portalRoot)
}
