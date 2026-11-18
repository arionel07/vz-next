'use client'

import { showToast } from '@/lib/toast'
import { useCartStore, type CartItem } from '@/store/cart-store'

type ValidationResponse = {
  message?: string
  unitPrice?: number
  originalPrice?: number
  maxQuantity?: number | null
}

const pendingAdds = new Map<string, Promise<boolean>>()

function keyFor(item: Pick<CartItem, 'id' | 'variantId'>) {
  return `${item.id}:${item.variantId ?? 0}`
}

/** Validate the next quantity and current price against the database before changing local cart state. */
export function addValidatedCartItem(item: Omit<CartItem, 'quantity'>) {
  const key = keyFor(item)
  const previous = pendingAdds.get(key) ?? Promise.resolve()
  const current = previous.catch(() => false).then(async () => {
    const existing = useCartStore.getState().items.find((cartItem) =>
      !cartItem.isGift && keyFor(cartItem) === key,
    )
    const requestedQuantity = (existing?.quantity ?? 0) + 1

    try {
      const response = await fetch('/api/cart/item', {
        body: JSON.stringify({ id: item.id, variantId: item.variantId ?? null, quantity: requestedQuantity }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result = (await response.json()) as ValidationResponse

      if (!response.ok || typeof result.unitPrice !== 'number') {
        showToast(result.message ?? 'Не удалось добавить товар в корзину.', 'error')
        return false
      }

      useCartStore.getState().addItem({ ...item, price: result.unitPrice, originalPrice: result.originalPrice, maxQuantity: result.maxQuantity })
      return true
    } catch {
      showToast('Не удалось проверить наличие товара. Попробуйте ещё раз.', 'error')
      return false
    }
  })

  pendingAdds.set(key, current)
  void current.finally(() => {
    if (pendingAdds.get(key) === current) pendingAdds.delete(key)
  })
  return current
}

export async function changeValidatedCartQuantity(item: CartItem, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { ok: false as const, message: 'Укажите количество от 1 до 99.' }
  }
  try {
    const response = await fetch('/api/cart/item', {
      body: JSON.stringify({ id: item.id, variantId: item.variantId ?? null, quantity }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const result = await response.json() as ValidationResponse
    if (!response.ok || typeof result.unitPrice !== 'number') {
      return { ok: false as const, message: result.message ?? 'Не удалось изменить количество.' }
    }

    const state = useCartStore.getState()
    const key = keyFor(item)
    state.setItems(state.items.map((cartItem) =>
      !cartItem.isGift && keyFor(cartItem) === key
        ? { ...cartItem, quantity, price: result.unitPrice!, originalPrice: result.originalPrice ?? cartItem.originalPrice, maxQuantity: result.maxQuantity, unavailableMessage: null }
        : cartItem,
    ))
    return { ok: true as const }
  } catch {
    return { ok: false as const, message: 'Не удалось проверить наличие товара. Попробуйте ещё раз.' }
  }
}
