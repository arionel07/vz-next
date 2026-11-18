'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { showCartToast, showToast } from '@/lib/toast'

export type CartItem = {
  id: number
  variantId?: number | null
  title: string
  variantLabel?: string | null
  brand: string
  price: number | null
  originalPrice?: number | null
  image: string | null
  quantity: number
  maxQuantity?: number | null
  unavailableMessage?: string | null
  isGift?: boolean
  giftPromotionId?: number | null
  giftPromotionTitle?: string | null
  giftVariantOptions?: Array<{ id: number; label: string; stock: number }>
  giftVariantRequired?: boolean
  rouletteGiftId?: number | null
}

export type CartPromo = {
  id: number
  code: string
  name: string
  type: 'percentage' | 'fixed'
  value: number
  discount: number
  subtotal: number
  eligibleSubtotal: number
  total: number
}

export type CartDiscountChoice = 'promo' | 'roulette' | 'none'

type CartState = {
  items: CartItem[]
  promoCode: string
  promo: CartPromo | null
  discountChoice: CartDiscountChoice
  hasHydrated: boolean
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  decreaseItem: (id: number, variantId?: number | null) => void
  removeItem: (id: number, variantId?: number | null) => void
  setPromoCode: (value: string) => void
  setPromo: (value: CartPromo | null) => void
  clearPromo: () => void
  setDiscountChoice: (value: CartDiscountChoice) => void
  clear: () => void
  setItems: (items: CartItem[]) => void
  setGiftVariant: (giftPromotionId: number | null, rouletteGiftId: number | null, variantId: number | null) => void
  setHasHydrated: (value: boolean) => void
}

function itemKey(item: Pick<CartItem, 'id' | 'variantId' | 'giftPromotionId' | 'rouletteGiftId' | 'isGift'>) {
  return `${item.id}:${item.variantId ?? 0}:${item.isGift ? `${item.giftPromotionId ?? 0}:${item.rouletteGiftId ?? 0}` : 'paid'}`
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      promoCode: '',
      promo: null,
      discountChoice: 'promo',
      hasHydrated: false,
      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((cartItem) => itemKey(cartItem) === itemKey(item))

          if (existing) {
            return {
              items: state.items.map((cartItem) =>
                itemKey(cartItem) === itemKey(item)
                  ? { ...cartItem, ...item, quantity: cartItem.quantity + 1 }
                  : cartItem,
              ),
            }
          }

          return { items: [...state.items, { ...item, quantity: 1 }] }
        })
        showCartToast(item)
      },
      decreaseItem: (id, variantId = null) => {
        const item = useCartStore.getState().items.find((cartItem) => itemKey(cartItem) === itemKey({ id, variantId, isGift: false }))
        set((state) => ({
          items: state.items
            .map((item) =>
              itemKey(item) === itemKey({ id, variantId, isGift: false })
                ? { ...item, quantity: item.quantity - 1 }
                : item,
            )
            .filter((item) => item.quantity > 0),
        }))
        if (item) showToast(item.quantity <= 1 ? `Удалено из корзины: ${item.title}` : `Количество уменьшено: ${item.title}`, 'info')
      },
      removeItem: (id, variantId = null) => {
        const item = useCartStore.getState().items.find((cartItem) => itemKey(cartItem) === itemKey({ id, variantId, isGift: false }))
        set((state) => ({
          items: state.items.filter((item) => itemKey(item) !== itemKey({ id, variantId, isGift: false })),
        }))
        if (item) showToast(`Удалено из корзины: ${item.title}`, 'info')
      },
      setPromoCode: (value) => set({ promoCode: value.trim().toUpperCase(), promo: null }),
      setPromo: (value) => set({ promo: value }),
      clearPromo: () => set({ promoCode: '', promo: null }),
      setDiscountChoice: (value) => set({ discountChoice: value }),
      clear: () => {
        const hadItems = useCartStore.getState().items.length > 0
        set({ items: [], promoCode: '', promo: null, discountChoice: 'promo' })
        if (hadItems) showToast('Корзина очищена', 'info')
      },
      setItems: (items) => set({ items }),
      setGiftVariant: (giftPromotionId, rouletteGiftId, variantId) => set((state) => ({
        items: state.items.map((item) => {
          const matchesGift = Boolean(item.isGift)
            && (giftPromotionId ? item.giftPromotionId === giftPromotionId : item.rouletteGiftId === rouletteGiftId)
          if (!matchesGift) return item
          const selected = item.giftVariantOptions?.find((option) => option.id === variantId)
          return {
            ...item,
            variantId: selected?.id ?? null,
            variantLabel: selected?.label ?? null,
            price: 1,
            giftVariantRequired: Boolean(item.giftVariantOptions?.length && !selected),
          }
        }),
      })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'vizaje-cart',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({ items: state.items, promoCode: state.promoCode, promo: state.promo, discountChoice: state.discountChoice }),
    },
  ),
)
