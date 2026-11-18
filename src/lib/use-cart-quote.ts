'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import { useCartStore, type CartDiscountChoice } from '@/store/cart-store'

export type CartQuote = {
  items: Array<{ id: number; variantId: number | null; quantity: number; unitPrice: number; originalPrice: number; maxQuantity: number; available: boolean; availabilityMessage: string | null; subtotal: number; productDiscount: number; promoDiscount: number; discount: number; total: number }>
  totals: { productsSubtotal: number; productDiscount: number; promoDiscount: number; cartTotal: number; deliveryPrice: number; bonusUsed: number; total: number }
  shipping: { threshold: number; price: number; remaining: number; progress: number; free: boolean }
  bonuses: { enabled: boolean; authenticated: boolean; earned: number; balance: number; eligible: number; maxWriteoff: number }
  discount: { choice: CartDiscountChoice | 'none'; label: string | null; message: string | null }
  roulette: { available: boolean; title: string | null; expiresAt: string | null; rewardType: string | null; giftId: number | null; discount: number; freeShipping: boolean }
}

export function useCartQuote({ bonusAmount = 0, deliveryMethod = 'delivery', enabled = true, refreshKey = 0 }: { bonusAmount?: number; deliveryMethod?: 'delivery' | 'pickup' | 'express'; enabled?: boolean; refreshKey?: number } = {}) {
  const pathname = usePathname() ?? '/ru'
  const locale = pathname.startsWith('/ro') ? 'ro' : 'ru'
  const items = useCartStore((state) => state.items)
  const promoCode = useCartStore((state) => state.promoCode)
  const discountChoice = useCartStore((state) => state.discountChoice)
  const setDiscountChoice = useCartStore((state) => state.setDiscountChoice)
  const setItems = useCartStore((state) => state.setItems)
  const [quote, setQuote] = useState<CartQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [authRevision, setAuthRevision] = useState(0)
  const signature = useMemo(() => JSON.stringify(items.map(({ id, variantId, quantity, isGift, giftPromotionId, rouletteGiftId }) => ({
    id, variantId: variantId ?? null, quantity, isGift: Boolean(isGift),
    giftPromotionId: giftPromotionId ?? null, rouletteGiftId: rouletteGiftId ?? null,
  }))), [items])

  useEffect(() => {
    const handleAuthChange = () => setAuthRevision((revision) => revision + 1)
    window.addEventListener('vz:auth-changed', handleAuthChange)
    return () => window.removeEventListener('vz:auth-changed', handleAuthChange)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let cancelled = false

    async function refresh() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/cart/quote', {
          body: JSON.stringify({ items: JSON.parse(signature), promoCode, discountChoice, bonusAmount, deliveryMethod, locale }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal: controller.signal,
        })
        const result = await response.json() as CartQuote & { message?: string }
        if (!response.ok) throw new Error(result.message ?? 'Не удалось рассчитать корзину.')
        if (!cancelled) {
          setQuote(result)
          const currentItems = useCartStore.getState().items
          const nextItems = currentItems.map((item) => {
            if (item.isGift) return item
            const current = result.items.find((row) => row.id === item.id && (row.variantId ?? null) === (item.variantId ?? null))
            if (!current) return item
            if (current.unitPrice === item.price && current.originalPrice === item.originalPrice && current.maxQuantity === item.maxQuantity && (current.availabilityMessage ?? null) === (item.unavailableMessage ?? null)) return item
            return { ...item, price: current.unitPrice, originalPrice: current.originalPrice, maxQuantity: current.maxQuantity, unavailableMessage: current.availabilityMessage }
          })
          if (nextItems.some((item, index) => item !== currentItems[index])) setItems(nextItems)
          if (!promoCode && discountChoice === 'promo' && result.roulette.available) {
            setDiscountChoice('roulette')
          } else if (discountChoice === 'roulette' && !result.roulette.available) {
            setDiscountChoice(promoCode ? 'promo' : 'none')
          }
        }
      } catch (cause) {
        if (!cancelled && cause instanceof Error && cause.name !== 'AbortError') {
          setError(cause.message)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void refresh()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [signature, promoCode, discountChoice, bonusAmount, deliveryMethod, enabled, refreshKey, authRevision, setItems, setDiscountChoice, locale])

  return { quote, error, isLoading }
}
