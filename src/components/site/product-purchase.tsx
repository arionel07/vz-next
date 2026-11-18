'use client'

import { useEffect, useRef, useState } from 'react'
import { Coins, Minus, Plus } from 'lucide-react'

import { formatPrice } from '@/lib/format'
import { addValidatedCartItem } from '@/lib/cart-actions'
import { useCartStore } from '@/store/cart-store'
import type { StoreLocale } from '@/lib/locale-routing'

type ProductPurchaseProduct = {
  id: number
  variantId: number | null
  variantLabel: string | null
  title: string | null
  brand: string | null
  price: number | null
  discountPrice: number | null
  bonusRate: number
  bonusBalance: number
  image: string | null
  available: boolean
  locale?: StoreLocale
}

type ProductPurchaseProps = {
  isB2B?: boolean
  product: ProductPurchaseProduct
  showSummary?: boolean
  stickyOnMobile?: boolean
}

export function ProductPriceSummary({ product, isB2B = false }: { product: ProductPurchaseProduct; isB2B?: boolean }) {
  const locale = product.locale ?? 'ru'
  const text = locale === 'ro'
    ? { earn: 'Bonusuri acumulate', balance: 'Sold bonusuri', unnamed: 'Produs fără nume', add: 'Adaugă în coș', unavailable: 'Indisponibil', quantity: 'Cantitate în coș: ', decrease: 'Micșorează cantitatea', increase: 'Mărește cantitatea', pieces: 'buc.', discountNote: 'Pentru produsele reduse nu se acordă bonusuri', login: 'Autentifică-te pentru a acumula bonusuri' }
    : { earn: 'Бонусы к начислению', balance: 'Баланс бонусов', unnamed: 'Товар без названия', add: 'Добавить в корзину', unavailable: 'Нет в наличии', quantity: 'Количество в корзине: ', decrease: 'Уменьшить количество', increase: 'Увеличить количество', pieces: 'шт.', discountNote: 'На товары со скидкой бонусы не начисляются', login: 'Войдите, чтобы получать бонусы' }
  const currentPrice = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price
  const earnedBonus = !isB2B && !product.discountPrice && product.price && product.bonusRate > 0
    ? Math.round(product.price * product.bonusRate / 100)
    : 0
  const bonusBadges = isB2B ? [] : [
    ...(earnedBonus > 0 ? [{ value: earnedBonus, label: text.earn }] : []),
    ...(product.bonusBalance > 0 ? [{ value: product.bonusBalance, label: text.balance }] : []),
  ]

  return (
    <div className="max-w-[391px] text-[16px] leading-[22.4px] font-normal">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <strong className="inline-flex h-[30px] items-center text-[27px] leading-[30px] font-medium text-black min-[768px]:h-[28px] min-[768px]:text-[25px] min-[768px]:leading-[28px]">
          {formatPrice(currentPrice)}
        </strong>
        {product.discountPrice && product.discountPrice > 0 ? <span className="text-[25px] leading-[28px] font-medium text-[#b3b3b3] line-through">{formatPrice(product.price)}</span> : null}
      </div>
      {!isB2B && product.discountPrice && product.discountPrice > 0 ? (
        <p className="mt-2 mb-0 text-xs leading-5 text-graphite">{text.discountNote}</p>
      ) : !isB2B && product.bonusRate <= 0 ? (
        <p className="mt-2 mb-0 text-xs leading-5 text-graphite">
          <button className="underline underline-offset-4 transition-colors hover:text-hover-cream" type="button" onClick={() => window.dispatchEvent(new CustomEvent('vz:open-auth'))}>{text.login}</button>
        </p>
      ) : null}
      {bonusBadges.length ? (
        <div className="mt-3 flex min-h-[20px] items-center gap-1.5">
          {bonusBadges.map((badge) => (
            <span className="inline-flex h-[20px] min-w-[44px] max-w-[52px] items-center justify-center gap-1 overflow-hidden text-[14px] leading-[20px] font-normal text-midnight-ink" key={badge.label} aria-label={`${badge.label}: ${badge.value}`}>
              <Coins className="size-[13px] shrink-0 text-ash" strokeWidth={1.5} aria-hidden="true" />
              <span>+{new Intl.NumberFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU', { maximumFractionDigits: 0 }).format(badge.value)}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ProductPurchase({ product, isB2B = false, showSummary = true, stickyOnMobile = false }: ProductPurchaseProps) {
  const locale = product.locale ?? 'ru'
  const text = locale === 'ro'
    ? { unnamed: 'Produs fără nume', add: 'Adaugă în coș', unavailable: 'Indisponibil', quantity: 'Cantitate în coș: ', decrease: 'Micșorează cantitatea', increase: 'Mărește cantitatea', pieces: 'buc.' }
    : { unnamed: 'Товар без названия', add: 'Добавить в корзину', unavailable: 'Нет в наличии', quantity: 'Количество в корзине: ', decrease: 'Уменьшить количество', increase: 'Увеличить количество', pieces: 'шт.' }
  const purchaseRef = useRef<HTMLDivElement>(null)
  const stickyPanelRef = useRef<HTMLDivElement>(null)
  const defaultStickyBottomRef = useRef<number | null>(null)
  const pinnedTopRef = useRef<number | null>(null)
  const [showStickyPurchase, setShowStickyPurchase] = useState(false)
  const [pinnedTop, setPinnedTop] = useState<number | null>(null)
  const item = useCartStore((state) => state.items.find((cartItem) =>
    cartItem.id === product.id &&
    (cartItem.variantId ?? null) === product.variantId &&
    !cartItem.isGift,
  ))
  const decreaseItem = useCartStore((state) => state.decreaseItem)
  const currentPrice = product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price
  const cartItem = {
    id: product.id,
    variantId: product.variantId,
    title: product.title ?? text.unnamed,
    variantLabel: product.variantLabel,
    brand: product.brand ?? 'VIZAJE-NICA',
    price: currentPrice,
    image: product.image,
  }

  useEffect(() => {
    const target = purchaseRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      setShowStickyPurchase(!entry.isIntersecting && window.scrollY > 200)
    }, { threshold: 0.05 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!stickyOnMobile) return

    const mobile = window.matchMedia('(max-width: 600px)')
    if (!mobile.matches) return

    const footer = document.querySelector('footer')
    const panel = stickyPanelRef.current
    if (!footer || !panel) return

    let frame = 0
    const updatePosition = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight
        const footerRect = footer.getBoundingClientRect()
        const panelRect = panel.getBoundingClientRect()
        const mainRect = panel.closest('main')?.getBoundingClientRect()
        if (!mainRect) return

        if (defaultStickyBottomRef.current === null) {
          const computedBottom = Number.parseFloat(window.getComputedStyle(panel).bottom)
          defaultStickyBottomRef.current = Number.isFinite(computedBottom)
            ? computedBottom
            : viewportHeight - panelRect.bottom
        }

        const baseBottom = defaultStickyBottomRef.current
        const basePanelBottom = viewportHeight - baseBottom
        const footerTouchesPanel = footerRect.top < basePanelBottom

        if (pinnedTopRef.current === null) {
          if (!footerTouchesPanel) return

          const nextTop = footerRect.top - mainRect.top - panelRect.height - 12
          pinnedTopRef.current = nextTop
          setPinnedTop(nextTop)
          return
        }

        if (footerRect.top >= basePanelBottom + 12) {
          pinnedTopRef.current = null
          setPinnedTop(null)
          return
        }

        const nextTop = footerRect.top - mainRect.top - panelRect.height - 12
        pinnedTopRef.current = nextTop
        setPinnedTop((current) => current === nextTop ? current : nextTop)
      })
    }

    const observer = new ResizeObserver(updatePosition)
    observer.observe(footer)
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition)
    updatePosition()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [stickyOnMobile])

  const addButton = () => (
    <button
      className="inline-flex h-[50px] w-full items-center justify-center rounded-full bg-midnight-ink px-[15px] pt-[17px] pb-[16px] text-[11px] leading-[16.5px] font-medium text-white uppercase transition-colors hover:bg-button-hover hover:text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-fog disabled:text-graphite"
      type="button"
      onClick={() => void addValidatedCartItem(cartItem)}
      disabled={!product.available}
    >
      {product.available ? text.add : text.unavailable}
    </button>
  )

  const quantityControl = () => item ? (
    <div className="inline-flex h-[50px] w-full items-center justify-between rounded-full bg-midnight-ink px-[15px] text-white" aria-label={`${text.quantity}${item.quantity}`}>
      <button className="flex size-9 items-center justify-center rounded-full transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream" type="button" onClick={() => decreaseItem(product.id, product.variantId)} aria-label={text.decrease}><Minus className="size-[17px]" /></button>
      <span className="min-w-10 text-center text-sm font-medium tabular-nums">{item.quantity} {text.pieces}</span>
      <button className="flex size-9 items-center justify-center rounded-full transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream" type="button" onClick={() => void addValidatedCartItem(cartItem)} aria-label={text.increase}><Plus className="size-[17px]" /></button>
    </div>
  ) : addButton()

  return (
    <>
      <div ref={purchaseRef} className={`w-full ${stickyOnMobile ? 'max-[600px]:hidden' : ''}`}>
        {showSummary ? <div className="mb-6"><ProductPriceSummary product={product} isB2B={isB2B} /></div> : null}
        {quantityControl()}
      </div>

      {(stickyOnMobile || showStickyPurchase) ? (
        <div
          ref={stickyPanelRef}
          className={`z-[20] border-t border-fog bg-white px-4 py-2 min-[601px]:hidden ${pinnedTop === null ? 'fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))]' : 'absolute inset-x-0 max-[600px]:-right-5 max-[600px]:-left-5'}`}
          style={pinnedTop === null ? undefined : { top: `${pinnedTop}px` }}
        >
          <div className="mx-auto w-full max-w-[520px]">{quantityControl()}</div>
        </div>
      ) : null}
    </>
  )
}
