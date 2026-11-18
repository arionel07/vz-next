'use client'

import { Heart } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { showFavoriteToast } from '@/lib/toast'

type FavoriteToastProduct = { title: string; image?: string | null }

export function FavoriteToggle({ productId, className, locale = 'ru', toastProduct }: { productId: number; className?: string; locale?: 'ru' | 'ro'; toastProduct?: FavoriteToastProduct }) {
  const [favorite, setFavorite] = useState(false)
  const [isBusy, setBusy] = useState(false)
  const addAfterLoginRef = useRef(false)
  const labels = locale === 'ro'
    ? { add: 'Adaugă la favorite', remove: 'Elimină din favorite' }
    : { add: 'Добавить в избранное', remove: 'Убрать из избранного' }

  useEffect(() => {
    let active = true
    const readFavorite = async () => {
      try {
        const response = await fetch(`/api/account?productId=${productId}`, { cache: 'no-store' })
        const data = response.ok ? await response.json() as { favorite?: boolean } : null
        if (active && data) setFavorite(data.favorite === true)
      } catch {
        // Keep the local control usable if the status check is temporarily unavailable.
      }
    }
    const handleAuthChanged = async (event: Event) => {
      const user = (event as CustomEvent<{ user?: unknown | null }>).detail?.user
      if (!user) {
        addAfterLoginRef.current = false
        setFavorite(false)
        return
      }

      if (addAfterLoginRef.current) {
        addAfterLoginRef.current = false
        setBusy(true)
        try {
          const response = await fetch('/api/account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'favorite-toggle', productId }),
          })
          if (response.ok) {
            const result = await response.json() as { favorite?: boolean }
            if (active) {
              setFavorite(result.favorite === true)
              if (result.favorite === true && toastProduct) showFavoriteToast(toastProduct)
            }
          }
        } catch {
          // A later click can retry if this follow-up request fails.
        } finally {
          if (active) setBusy(false)
        }
        return
      }

      await readFavorite()
    }

    void readFavorite()
    window.addEventListener('vz:auth-changed', handleAuthChanged)
    return () => {
      active = false
      window.removeEventListener('vz:auth-changed', handleAuthChanged)
    }
  }, [productId])

  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (isBusy) return
    setBusy(true)
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'favorite-toggle', productId }),
      })
      if (response.status === 401) {
        addAfterLoginRef.current = true
        window.dispatchEvent(new CustomEvent('vz:open-auth'))
        return
      }
      if (response.ok) {
        const result = await response.json() as { favorite?: boolean }
        setFavorite(result.favorite === true)
        if (result.favorite === true && toastProduct) showFavoriteToast(toastProduct)
      }
    } catch {
      // Leave the saved state unchanged so the visitor can retry.
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className={className ?? "absolute top-3 right-3 inline-flex size-[34px] items-center justify-center rounded-full bg-white text-graphite transition-colors group-hover/product-card:text-hover-cream hover:text-hover-cream aria-pressed:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-65"} type="button" onClick={toggle} aria-label={favorite ? labels.remove : labels.add} aria-pressed={favorite} disabled={isBusy}>
      <Heart size={18} strokeWidth={1.35} fill={favorite ? 'currentColor' : 'none'} />
    </button>
  )
}
