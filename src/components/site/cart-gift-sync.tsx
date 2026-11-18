'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import { showToast } from '@/lib/toast'
import { useCartStore } from '@/store/cart-store'
import type { CartItem } from '@/store/cart-store'

type GiftResponse = {
  gifts?: Array<Omit<CartItem, 'quantity'> & { quantity: 1; isGift: true; giftPromotionId: number }>
  rouletteGift?: Omit<CartItem, 'quantity'> & { quantity: 1; isGift: true; rouletteGiftId: number } | null
}

function giftKey(item: CartItem) {
  return `${item.id}:${item.variantId ?? 0}:${item.giftPromotionId ?? 0}:${item.rouletteGiftId ?? 0}`
}

export function CartGiftSync() {
  const pathname = usePathname() ?? '/ru'
  const locale = pathname.startsWith('/ro') ? 'ro' : 'ru'
  const items = useCartStore((state) => state.items)
  const hasHydrated = useCartStore((state) => state.hasHydrated)
  const setItems = useCartStore((state) => state.setItems)
  const discountChoice = useCartStore((state) => state.discountChoice)
  const [authRevision, setAuthRevision] = useState(0)
  const paidItems = items.filter((item) => !item.isGift)
  const paidSignature = JSON.stringify(paidItems.map(({ id, variantId, quantity }) => ({ id, variantId: variantId ?? null, quantity })))
  const giftSelectionSignature = JSON.stringify(items.filter((item) => item.isGift).map(({ giftPromotionId, rouletteGiftId, variantId }) => ({ giftPromotionId: giftPromotionId ?? null, rouletteGiftId: rouletteGiftId ?? null, variantId: variantId ?? null })))

  useEffect(() => {
    const handleAuthChange = () => setAuthRevision((revision) => revision + 1)
    window.addEventListener('vz:auth-changed', handleAuthChange)
    return () => window.removeEventListener('vz:auth-changed', handleAuthChange)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return

    const controller = new AbortController()
    let cancelled = false

    async function sync() {
      try {
        const response = await fetch('/api/gift-promotions', {
          body: JSON.stringify({
            items: paidItems.map(({ id, variantId, quantity }) => ({ id, variantId: variantId ?? null, quantity })),
            giftSelections: items.filter((item) => item.isGift).map(({ giftPromotionId, rouletteGiftId, variantId }) => ({ giftPromotionId: giftPromotionId ?? null, rouletteGiftId: rouletteGiftId ?? null, variantId: variantId ?? null })),
            discountChoice,
            locale,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal: controller.signal,
        })
        if (!response.ok) return
        const result = (await response.json()) as GiftResponse
        if (cancelled) return

        const nextGifts = [...(result.gifts ?? []), ...(result.rouletteGift ? [result.rouletteGift] : [])] as CartItem[]
        const previousGiftKeys = new Set(items.filter((item) => item.isGift).map(giftKey))
        const nextItems = [...paidItems, ...nextGifts]
        const currentSignature = JSON.stringify(items.map((item) => ({ ...item })))
        const nextSignature = JSON.stringify(nextItems.map((item) => ({ ...item })))
        if (currentSignature === nextSignature) return

        setItems(nextItems)
        for (const gift of nextGifts) {
          if (!gift.giftVariantRequired && !previousGiftKeys.has(giftKey(gift))) {
            showToast(`Подарок по акции добавлен: ${gift.title}`)
          }
        }
      } catch (error) {
        if (!cancelled && error instanceof Error && error.name !== 'AbortError') {
          console.error('Gift promotion sync failed', error)
        }
      }
    }

    void sync()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [hasHydrated, paidSignature, giftSelectionSignature, discountChoice, authRevision, locale])

  return null
}
