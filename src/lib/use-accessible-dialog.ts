'use client'

import { useEffect, useId, useRef, type RefObject } from 'react'

import { acquireBodyDrawerLock } from '@/lib/body-scroll-lock'

type DialogElementRef<T extends HTMLElement> = RefObject<T | null>

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const activeDialogScopes: string[] = []

export function useAccessibleDialog<T extends HTMLElement, I extends HTMLElement = HTMLElement>({
  open,
  rootRef,
  initialFocusRef,
  onClose,
}: {
  open: boolean
  rootRef: DialogElementRef<T>
  initialFocusRef?: DialogElementRef<I>
  onClose: () => void
}) {
  const scopeId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    const id = scopeId
    activeDialogScopes.push(id)
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const releaseScrollLock = acquireBodyDrawerLock()
    const getFocusableElements = () => Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    ).filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true')

    const frame = window.requestAnimationFrame(() => {
      if (activeDialogScopes.at(-1) !== id) return
      const initialTarget = initialFocusRef?.current
      const target = initialTarget?.getClientRects().length ? initialTarget : getFocusableElements()[0] ?? rootRef.current
      target?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeDialogScopes.at(-1) !== id) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const root = rootRef.current
      const focusable = getFocusableElements()
      if (!root || !focusable.length) {
        event.preventDefault()
        root?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      const wasTopScope = activeDialogScopes.at(-1) === id
      const index = activeDialogScopes.lastIndexOf(id)
      if (index >= 0) activeDialogScopes.splice(index, 1)
      releaseScrollLock()
      if (wasTopScope && previousFocus?.isConnected && previousFocus.getClientRects().length > 0) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [initialFocusRef, open, rootRef, scopeId])
}
