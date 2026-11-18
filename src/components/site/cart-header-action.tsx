'use client'

import * as React from 'react'

import type { StoreLocale } from '@/lib/locale-routing'
import type { CheckoutCustomerPrefill, CheckoutOptions } from '@/lib/checkout-options'
import { useCartStore } from '@/store/cart-store'

import { CartDrawer } from './cart-drawer'
import { CartIcon } from './cart-icon'

export function CartHeaderAction({ locale = 'ru', drawerTargetId, checkoutOptions, checkoutCustomer }: { locale?: StoreLocale; drawerTargetId?: string; checkoutOptions?: CheckoutOptions; checkoutCustomer?: CheckoutCustomerPrefill | null }) {
  const [isDrawerOpen, setDrawerOpen] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 601px)').matches)
  const openerRef = React.useRef<HTMLElement | null>(null)
  const items = useCartStore((state) => state.items)
  const itemCount = items.reduce((total, item) => total + item.quantity, 0)
  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 601px)')
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const closeDrawer = React.useCallback(() => {
    setDrawerOpen(false)
    window.dispatchEvent(new CustomEvent('vz:cart-drawer-state', { detail: { open: false } }))
  }, [])

  React.useEffect(() => {
    const openCart = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: HTMLElement }>).detail?.trigger
      if (trigger) openerRef.current = trigger
      setDrawerOpen(true)
      window.dispatchEvent(new CustomEvent('vz:cart-drawer-state', { detail: { open: true } }))
    }
    window.addEventListener('vz:open-cart', openCart)
    const closeCart = () => setDrawerOpen(false)
    window.addEventListener('vz:close-cart', closeCart)
    return () => {
      window.removeEventListener('vz:open-cart', openCart)
      window.removeEventListener('vz:close-cart', closeCart)
    }
  }, [])

  return (
    <>
      <button
        className="relative inline-flex size-10 shrink-0 items-center justify-center bg-transparent text-midnight-ink transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 motion-reduce:transition-none"
        type="button"
        onClick={(event) => {
          openerRef.current = event.currentTarget
          setDrawerOpen(true)
          window.dispatchEvent(new CustomEvent('vz:cart-drawer-state', { detail: { open: true } }))
        }}
        aria-label={`${locale === 'ro' ? 'Coș' : 'Корзина'}, ${locale === 'ro' ? 'produse' : 'товаров'}: ${itemCount}`}
        aria-haspopup="dialog"
        aria-expanded={isDrawerOpen}
        aria-controls="cart-drawer-panel"
        title={locale === 'ro' ? 'Coș' : 'Корзина'}
      >
        <CartIcon size={20} />
        {itemCount > 0 ? (
          <b className="absolute top-0 right-0 inline-flex size-[21px] min-w-[21px] items-center justify-center rounded-full border-2 border-white bg-[#8e1f2d] px-1 text-[9px] leading-none font-medium text-white" aria-label={locale === 'ro' ? `În coș sunt ${itemCount} produse` : `В корзине ${itemCount} товаров`}>
            {itemCount > 99 ? '99+' : itemCount}
          </b>
        ) : null}
      </button>
      <CartDrawer open={isDrawerOpen} onClose={closeDrawer} openerRef={openerRef} drawerTargetId={isDesktop ? drawerTargetId : undefined} locale={locale} checkoutOptions={checkoutOptions} checkoutCustomer={checkoutCustomer} />
    </>
  )
}

export function MobileCartTrigger({ locale = 'ru', active = false }: { locale?: StoreLocale; active?: boolean }) {
  const [isDrawerOpen, setDrawerOpen] = React.useState(false)
  const items = useCartStore((state) => state.items)
  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  React.useEffect(() => {
    const handleDrawerState = (event: Event) => {
      setDrawerOpen(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open))
    }
    window.addEventListener('vz:cart-drawer-state', handleDrawerState)
    return () => window.removeEventListener('vz:cart-drawer-state', handleDrawerState)
  }, [])

  return (
    <button
      className={`relative inline-flex min-h-[50px] min-w-0 w-full shrink-0 flex-col items-center justify-center gap-[2px] px-1 py-[3px] text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[-2px] ${active ? 'text-hover-cream' : ''}`}
      type="button"
      onClick={(event) => {
        setDrawerOpen(true)
        window.dispatchEvent(new CustomEvent('vz:open-cart', { detail: { trigger: event.currentTarget } }))
      }}
      aria-label={`${locale === 'ro' ? 'Coș' : 'Корзина'}, ${locale === 'ro' ? 'produse' : 'товаров'}: ${itemCount}`}
      aria-haspopup="dialog"
      aria-expanded={isDrawerOpen}
      aria-controls="cart-drawer-panel"
      aria-current={active ? 'page' : undefined}
      title={locale === 'ro' ? 'Coș' : 'Корзина'}
    >
      <span aria-hidden="true" className="block size-[29px] shrink-0 bg-current [mask-image:url('/legacy-assets/app/img/icons/mobile-tabbar-bag.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />
      <span className="text-[9px] leading-[1.1] font-medium whitespace-nowrap">{locale === 'ro' ? 'Coș' : 'Корзина'}</span>
      {itemCount > 0 ? <b className="absolute top-[1px] left-[calc(50%+8px)] inline-grid min-w-[18px] h-[18px] place-items-center rounded-full bg-[#8e1f2d] px-1 text-[9px] leading-none font-medium text-white" aria-label={locale === 'ro' ? `${itemCount} produse în coș` : `В корзине ${itemCount} товаров`}>{itemCount > 99 ? '99+' : itemCount}</b> : null}
    </button>
  )
}
