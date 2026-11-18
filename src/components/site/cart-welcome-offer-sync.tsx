'use client'

import { useEffect } from 'react'

import { useCartStore } from '@/store/cart-store'

export function CartWelcomeOfferSync() {
  useEffect(() => {
    const activateOffer = () => {
      useCartStore.getState().setPromoCode('WELCOME18')
    }

    const clearWelcomeOfferOnLogout = (event: Event) => {
      const user = (event as CustomEvent<{ user?: unknown | null }>).detail?.user
      if (user) return
      if (useCartStore.getState().promoCode.toUpperCase() === 'WELCOME18') {
        useCartStore.getState().clearPromo()
      }
    }

    window.addEventListener('welcome-offer:activated', activateOffer)
    window.addEventListener('vz:auth-changed', clearWelcomeOfferOnLogout)
    return () => {
      window.removeEventListener('welcome-offer:activated', activateOffer)
      window.removeEventListener('vz:auth-changed', clearWelcomeOfferOnLogout)
    }
  }, [])

  return null
}
