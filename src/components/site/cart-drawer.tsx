'use client'

import { usePathname } from 'next/navigation'
import { ArrowLeft, ArrowRight, LoaderCircle, Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { LocalizedLink as Link } from '@/components/site/localized-link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { changeValidatedCartQuantity } from '@/lib/cart-actions'
import { acquireBodyDrawerLock } from '@/lib/body-scroll-lock'
import { formatPrice } from '@/lib/format'
import { legacyAsset } from '@/lib/legacy-assets'
import { useCartQuote } from '@/lib/use-cart-quote'
import { useCartRecommendations } from '@/lib/use-cart-recommendations'
import { usePortalRoot } from '@/lib/use-portal-root'
import { useCartStore, type CartItem } from '@/store/cart-store'
import { getPathLocale, type StoreLocale } from '@/lib/locale-routing'
import type { CheckoutCustomerPrefill, CheckoutOptions } from '@/lib/checkout-options'

import { CartPromoForm } from './cart-promo-form'
import { DrawerViewTransition } from './drawer-view-transition'
import { CheckoutPage } from './checkout-page'
import { ProductCard } from './product-card'

type CartDrawerProps = {
  open: boolean
  onClose: () => void
  openerRef?: { current: HTMLElement | null }
  drawerTargetId?: string
  locale?: StoreLocale
  checkoutOptions?: CheckoutOptions
  checkoutCustomer?: CheckoutCustomerPrefill | null
}

function getLineKey(item: Pick<CartItem, 'id' | 'variantId' | 'giftPromotionId' | 'rouletteGiftId'>) {
  return `${item.id}:${item.variantId ?? 0}:${item.giftPromotionId ?? 0}:${item.rouletteGiftId ?? 0}`
}

function getDisplayTitle(item: CartItem) {
  if (item.variantLabel) return { title: item.title, variant: item.variantLabel }
  const separator = item.title.lastIndexOf(' · ')
  if (separator > 0) return { title: item.title.slice(0, separator), variant: item.title.slice(separator + 3) }
  return { title: item.title, variant: null }
}

function CartSkeleton({ locale = 'ru' }: { locale?: StoreLocale }) {
  const label = locale === 'ro' ? 'Se încarcă coșul' : 'Загружаем корзину'
  return (
    <div aria-label={label} aria-live="polite" className="flex flex-col px-7 py-[18px] max-[767px]:px-4 max-[767px]:py-3" role="status">
      {[0, 1].map((item) => (
        <div className="grid grid-cols-[106px_minmax(0,1fr)] gap-[18px] border-b border-[#eee] py-6 max-[767px]:grid-cols-[92px_minmax(0,1fr)] max-[767px]:gap-[14px] max-[767px]:py-5" key={item}>
          <span className="h-32 w-[106px] animate-pulse bg-[#f1f1f1] max-[767px]:h-[116px] max-[767px]:w-[92px]" />
          <span className="flex flex-col gap-[11px] pt-[3px]"><i className="h-3 w-[30%] animate-pulse bg-[#f1f1f1]" /><i className="h-3 w-[84%] animate-pulse bg-[#f1f1f1]" /><i className="h-3 w-[52%] animate-pulse bg-[#f1f1f1]" /></span>
        </div>
      ))}
    </div>
  )
}

export function CartDrawer({ open, onClose, openerRef, drawerTargetId, locale: localeProp, checkoutOptions, checkoutCustomer }: CartDrawerProps) {
  const portalRoot = usePortalRoot()
  const pathname = usePathname()
  const locale = localeProp ?? getPathLocale(pathname)
  const text = locale === 'ro'
    ? { close: 'Închide coșul', title: 'Coș', checkoutTitle: 'Finalizarea comenzii', pieces: 'buc.', signInTitle: 'Cumpără mai avantajos', signInDescription: 'Autentifică-te sau creează un cont pentru bonusuri și oferte personalizate.', signIn: 'Autentificare / Înregistrare', guest: 'Continuă ca vizitator', backCart: 'Înapoi la coș', emptyTitle: 'Coșul este gol', empty: 'Adaugă produsele pe care dorești să le cumperi.', catalog: 'Vezi catalogul', delivery: 'Livrare', paidDelivery: 'Livrare cu plată', freeDelivery: 'Livrare gratuită', rouletteGift: 'CADOU LA TOMBOLĂ', promoGift: 'CADOU PROMOȚIONAL', remove: 'Elimină produsul', actions: 'Acțiuni produs', decrease: 'Micșorează cantitatea', increase: 'Mărește cantitatea', gift: 'Cadou · 1 MDL', giftVariant: 'Varianta cadoului', selectGiftVariant: 'Alege varianta cadoului', discount: 'Reducere', rouletteApplied: 'Premiul la tombolă a fost aplicat', validUntil: 'Valabil până la', chooseDiscount: 'Alege o reducere', nonStackable: 'Reducerile nu se cumulează.', unavailable: 'Modifică cantitatea sau elimină produsele indisponibile.', totalTitle: 'Totalul comenzii', items: 'Produse', rouletteDiscount: 'Reducerea tombolei', promo: 'Cod promoțional', shipping: 'Livrare', free: 'Gratuit', calculating: 'Se calculează', total: 'Total', earned: 'Bonusuri acumulate', login: 'Autentifică-te', bonusHint: 'pentru a primi bonusuri.', checking: 'Se verifică…', checkout: 'Finalizează comanda', changeQuantity: 'Modifică cantitatea', delete: 'Elimină', noAuth: 'Nu am putut verifica autentificarea. Încearcă din nou.', quantityError: 'Cantitatea nu a putut fi modificată.', quoteError: 'Totalul nu a putut fi actualizat. Încearcă din nou.', boughtTogether: 'Cumpărate deseori împreună' }
    : { close: 'Закрыть корзину', title: 'Корзина', checkoutTitle: 'Оформление заказа', pieces: 'шт.', signInTitle: 'Покупайте с выгодой', signInDescription: 'Войдите или зарегистрируйтесь, чтобы получать бонусы и персональные предложения.', signIn: 'Войти / Зарегистрироваться', guest: 'Продолжить как гость', backCart: 'Вернуться в корзину', emptyTitle: 'Корзина пока пуста', empty: 'Добавьте товары, которые хотите купить.', catalog: 'Перейти в каталог', delivery: 'Доставка', paidDelivery: 'Платная доставка', freeDelivery: 'Бесплатная доставка', rouletteGift: 'ПОДАРОК РУЛЕТКИ', promoGift: 'ПОДАРОК АКЦИИ', remove: 'Удалить товар', actions: 'Действия с товаром', decrease: 'Уменьшить количество', increase: 'Увеличить количество', gift: 'Подарок · 1 MDL', giftVariant: 'Вариант подарка', selectGiftVariant: 'Выберите вариант подарка', discount: 'Скидка', rouletteApplied: 'Приз рулетки применён', validUntil: 'Действует до', chooseDiscount: 'Выберите одну скидку', nonStackable: 'Скидки не суммируются.', unavailable: 'Исправьте количество или удалите недоступный товар.', totalTitle: 'Сумма заказа', items: 'Товары', rouletteDiscount: 'Скидка рулетки', promo: 'Промокод', shipping: 'Доставка', free: 'Бесплатно', calculating: 'Рассчитывается', total: 'Итого', earned: 'Будет начислено бонусов', login: 'Войдите', bonusHint: 'в аккаунт, чтобы получать бонусы.', checking: 'Проверяем…', checkout: 'Оформить заказ', changeQuantity: 'Изменить количество', delete: 'Удалить', noAuth: 'Не удалось проверить авторизацию. Попробуйте ещё раз.', quantityError: 'Не удалось изменить количество.', quoteError: 'Не удалось обновить сумму. Попробуйте ещё раз.', boughtTogether: 'С этим часто покупают' }
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [checkoutPrompt, setCheckoutPrompt] = useState(false)
  const [checkoutView, setCheckoutView] = useState(false)
  const checkoutDirection = useRef(1)
  const [checkoutPending, setCheckoutPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingRows, setPendingRows] = useState<Record<string, boolean>>({})
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [activeSheetKey, setActiveSheetKey] = useState<string | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)
  const activeSheetKeyRef = useRef<string | null>(null)
  activeSheetKeyRef.current = activeSheetKey
  const items = useCartStore((state) => state.items)
  const hasHydrated = useCartStore((state) => state.hasHydrated)
  const removeItem = useCartStore((state) => state.removeItem)
  const setGiftVariant = useCartStore((state) => state.setGiftVariant)
  const promoCode = useCartStore((state) => state.promoCode)
  const promo = useCartStore((state) => state.promo)
  const setPromoCode = useCartStore((state) => state.setPromoCode)
  const setPromo = useCartStore((state) => state.setPromo)
  const clearPromo = useCartStore((state) => state.clearPromo)
  const discountChoice = useCartStore((state) => state.discountChoice)
  const setDiscountChoice = useCartStore((state) => state.setDiscountChoice)
  const { quote, error: quoteError, isLoading: quoteLoading } = useCartQuote({ enabled: open })
  const recommendedProducts = useCartRecommendations({
    productIds: items.filter((item) => !item.isGift).map((item) => item.id),
    locale,
    enabled: open,
  })
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const checkoutButtonRef = useRef<HTMLButtonElement>(null)
  const sheetTimerRef = useRef<number | null>(null)
  const sheetTriggerRef = useRef<HTMLElement | null>(null)
  const [showFixedCheckout, setShowFixedCheckout] = useState(false)
  const [fixedCheckoutMounted, setFixedCheckoutMounted] = useState(false)
  const [fixedCheckoutVisible, setFixedCheckoutVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      let secondFrame: number | null = null
      const frame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        window.cancelAnimationFrame(frame)
        if (secondFrame !== null) window.cancelAnimationFrame(secondFrame)
      }
    }

    setVisible(false)
    setSheetVisible(false)
    const timeout = window.setTimeout(() => {
      setMounted(false)
      setCheckoutPrompt(false)
      setCheckoutView(false)
      setActionError(null)
      setActiveSheetKey(null)
    }, 480)
    return () => window.clearTimeout(timeout)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    return acquireBodyDrawerLock()
  }, [mounted])

  const closeActionSheet = useCallback(() => {
    if (!activeSheetKeyRef.current) return
    setSheetVisible(false)
    if (sheetTimerRef.current !== null) window.clearTimeout(sheetTimerRef.current)
    sheetTimerRef.current = window.setTimeout(() => {
      activeSheetKeyRef.current = null
      setActiveSheetKey(null)
      if (sheetTriggerRef.current?.isConnected) sheetTriggerRef.current.focus()
      else closeButtonRef.current?.focus()
      sheetTriggerRef.current = null
    }, 480)
  }, [])

  function openActionSheet(item: CartItem, trigger: HTMLElement) {
    if (sheetTimerRef.current !== null) window.clearTimeout(sheetTimerRef.current)
    sheetTriggerRef.current = trigger
    const key = getLineKey(item)
    activeSheetKeyRef.current = key
    setActiveSheetKey(key)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setSheetVisible(true)))
  }

  useEffect(() => {
    if (!open) return
    const returnFocus = openerRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (activeSheetKeyRef.current) closeActionSheet()
        else onClose()
        return
      }
      if (event.key !== 'Tab') return
      const panel = document.getElementById('cart-drawer-panel')
      const actionSheet = activeSheetKeyRef.current ? panel?.querySelector<HTMLElement>('[data-cart-action-sheet]') : null
      const focusRoot = actionSheet ?? panel
      const focusable = Array.from(focusRoot?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []).filter((element) => element.getClientRects().length > 0)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (activeSheetKeyRef.current && actionSheet && !actionSheet.contains(document.activeElement)) {
        event.preventDefault()
        if (event.shiftKey) last.focus()
        else first.focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      if (returnFocus?.isConnected) returnFocus.focus()
    }
  }, [closeActionSheet, onClose, open, openerRef])

  useEffect(() => {
    if (!sheetVisible) return
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-cart-action-sheet] button:not([disabled])')?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [sheetVisible])

  useEffect(() => {
    if (!open || !mounted || checkoutPrompt || checkoutView || !bodyRef.current || !checkoutButtonRef.current || typeof IntersectionObserver === 'undefined') {
      setShowFixedCheckout(false)
      return
    }
    const observer = new IntersectionObserver(([entry]) => setShowFixedCheckout(!entry.isIntersecting), {
      root: bodyRef.current,
      threshold: 0.15,
    })
    observer.observe(checkoutButtonRef.current)
    return () => observer.disconnect()
  }, [checkoutPrompt, checkoutView, items.length, mounted, open, quote?.totals.total])

  useEffect(() => {
    if (showFixedCheckout) {
      setFixedCheckoutMounted(true)
      const frame = window.requestAnimationFrame(() => setFixedCheckoutVisible(true))
      return () => window.cancelAnimationFrame(frame)
    }

    setFixedCheckoutVisible(false)
    const timeout = window.setTimeout(() => setFixedCheckoutMounted(false), 240)
    return () => window.clearTimeout(timeout)
  }, [showFixedCheckout])

  const onPromoCodeChange = useCallback((value: string) => setPromoCode(value), [setPromoCode])
  const onPromoChange = useCallback((value: typeof promo) => setPromo(value), [setPromo])
  const onClearPromo = useCallback(() => clearPromo(), [clearPromo])
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + (item.isGift ? 0 : (item.price ?? 0) * item.quantity), 0)
  const deliveryProgress = Math.min(100, Math.max(0, quote?.shipping.progress ?? 0))
  const productDiscount = quote?.totals.productDiscount ?? 0
  const promoDiscount = quote?.totals.promoDiscount ?? promo?.discount ?? 0
  const combinedDiscount = productDiscount + promoDiscount
  const showDiscountChoice = Boolean(promo && quote?.roulette.available)
    || Boolean(promo && discountChoice !== 'promo')
    || Boolean(quote?.roulette.available && discountChoice !== 'roulette')
  const productsGross = quote
    ? quote.totals.productsSubtotal + quote.totals.productDiscount
    : items.reduce((sum, item) => sum + (item.isGift ? 0 : (item.originalPrice ?? item.price ?? 0) * item.quantity), 0) || total
  const finalTotal = quote?.totals.total ?? Math.max(0, total - (promo?.discount ?? 0))
  const hasUnavailableItems = items.some((item) => {
    if (item.isGift) return false
    const line = quote?.items.find((row) => row.id === item.id && (row.variantId ?? null) === (item.variantId ?? null))
    return line ? !line.available : Boolean(item.unavailableMessage)
  })
  const hasUnselectedGift = items.some((item) => item.isGift && item.giftVariantRequired)
  const canCheckout = items.some((item) => !item.isGift) && Boolean(quote) && !quoteLoading && !quoteError && !hasUnavailableItems && !hasUnselectedGift && !checkoutPending
  const activeSheetItem = activeSheetKey ? items.find((item) => getLineKey(item) === activeSheetKey) ?? null : null

  async function beginCheckout() {
    if (!canCheckout) return
    setActionError(null)
    setCheckoutPending(true)
    try {
      const response = await fetch('/api/auth?action=session', { cache: 'no-store' })
      const result = await response.json() as { user?: unknown }
      if (!response.ok) throw new Error(text.noAuth)
      if (result.user) {
        checkoutDirection.current = 1
        setCheckoutView(true)
        bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        checkoutDirection.current = 1
        setCheckoutPrompt(true)
        bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : text.noAuth)
    } finally {
      setCheckoutPending(false)
    }
  }

  async function changeQuantity(item: CartItem, nextQuantity: number) {
    if (nextQuantity < 1 || item.isGift) return
    const key = getLineKey(item)
    setActionError(null)
    setRowErrors((current) => ({ ...current, [key]: '' }))
    setPendingRows((current) => ({ ...current, [key]: true }))
    const result = await changeValidatedCartQuantity(item, nextQuantity)
    setPendingRows((current) => ({ ...current, [key]: false }))
    if (!result.ok) setRowErrors((current) => ({ ...current, [key]: locale === 'ro' ? text.quantityError : result.message ?? text.quantityError }))
  }

  function removeCartItem(item: CartItem) {
    if (item.isGift) return
    removeItem(item.id, item.variantId)
    closeActionSheet()
  }

  function continueAsGuest() {
    checkoutDirection.current = 1
    setCheckoutPrompt(false)
    setCheckoutView(true)
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function returnToCart() {
    checkoutDirection.current = -1
    setCheckoutView(false)
    setCheckoutPrompt(false)
  }

  function openLogin() {
    if (drawerTargetId) {
      window.dispatchEvent(new CustomEvent('vz:open-auth'))
      return
    }
    onClose()
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('vz:open-auth')), 0)
  }

  const embeddedTarget = drawerTargetId && typeof document !== 'undefined' ? document.getElementById(drawerTargetId) : null
  const portalTarget = drawerTargetId ? embeddedTarget : portalRoot
  if (!mounted || !portalTarget) return null

  return createPortal((
    <div aria-hidden={!visible} className={drawerTargetId ? `relative h-full w-full ${open ? 'pointer-events-auto' : 'pointer-events-none'}` : `fixed inset-0 z-[900] ${mounted ? 'visible' : 'invisible'} ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} data-cart-drawer>
      {!drawerTargetId ? <button
        aria-label={text.close}
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'} bg-[rgba(17,17,17,0.42)] max-[767px]:bg-[rgba(17,17,17,0.32)]`}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      /> : null}
      <aside
        aria-labelledby="cart-title"
        aria-modal="true"
        className={drawerTargetId ? 'relative flex h-full w-full flex-col overflow-hidden bg-white' : `absolute top-0 right-0 flex h-full w-[min(560px,100vw)] flex-col overflow-hidden bg-white shadow-[-20px_0_60px_rgba(17,17,17,0.1)] transition-transform duration-[480ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none min-[992px]:w-[48vw] max-[767px]:top-0 max-[767px]:right-0 max-[767px]:bottom-0 max-[767px]:left-0 max-[767px]:h-[100dvh] max-[767px]:w-full max-[767px]:translate-x-0 max-[767px]:shadow-none ${visible ? 'translate-x-0 max-[767px]:translate-y-0' : 'translate-x-full max-[767px]:translate-y-full'}`}
        id="cart-drawer-panel"
        role="dialog"
        tabIndex={-1}
      >
        <header className="relative z-[5] flex min-h-[92px] shrink-0 items-center justify-between gap-5 bg-white px-8 max-[991px]:px-6 max-[767px]:sticky max-[767px]:top-0 max-[767px]:min-h-[66px] max-[767px]:border-b max-[767px]:border-[#eee] max-[767px]:bg-[rgba(255,255,255,0.96)] max-[767px]:px-[18px] max-[767px]:pt-[max(6px,env(safe-area-inset-top))] max-[767px]:backdrop-blur-[14px] max-[420px]:px-[14px]">
          <div className="flex min-w-0 items-center gap-[9px]">
            {checkoutView ? <button className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[#111] transition-colors hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-[#111]" onClick={returnToCart} type="button" aria-label={text.backCart}><ArrowLeft size={20} strokeWidth={1.5} /></button> : null}
            <h2 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] max-[767px]:text-[21px]" id="cart-title">{checkoutView ? text.checkoutTitle : text.title}</h2>
            {!checkoutView && itemCount > 0 ? <span className="text-sm leading-[1.3] font-medium text-[#666] max-[767px]:text-[13px]">/ {itemCount} {text.pieces}</span> : null}
          </div>
          <button
            aria-label={text.close}
            className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-full bg-transparent text-[#111] transition-[background-color,transform] duration-200 hover:bg-[#f4f4f4] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-[#111] max-[767px]:size-9"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X size={24} strokeWidth={1.4} />
          </button>
        </header>

        <div
          aria-busy={!hasHydrated || quoteLoading}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-[max(18px,env(safe-area-inset-bottom))] [scrollbar-color:#d4d4d4_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#d4d4d4] [&::-webkit-scrollbar-track]:bg-transparent"
          data-cart-drawer-body
          ref={bodyRef}
        >
          {!hasHydrated ? (
            <CartSkeleton locale={locale} />
          ) : (
            <DrawerViewTransition viewKey={checkoutView ? 'checkout' : checkoutPrompt ? 'checkout-prompt' : 'cart'} direction={checkoutDirection.current} className="min-h-full">
            {checkoutView ? (
              <CheckoutPage
                embedded
                locale={locale}
                {...checkoutOptions}
                customer={checkoutCustomer}
                onComplete={onClose}
              />
            ) : checkoutPrompt ? (
            <section className="flex min-h-full items-center justify-center px-10 pt-12 pb-[72px] max-[767px]:items-start max-[767px]:px-5 max-[767px]:pt-10 max-[767px]:pb-[calc(40px_+_env(safe-area-inset-bottom))]" data-cart-checkout-gate>
              <div className="w-full max-w-[430px]">
                <h3 className="mb-4 text-[32px] leading-[1.05] font-semibold tracking-[-0.03em] text-[#111] max-[767px]:text-[28px]">{text.signInTitle}</h3>
                <p className="max-w-[390px] text-[15px] leading-[1.55] text-[#666]">{text.signInDescription}</p>
                <div className="mt-8 flex flex-col gap-[10px]">
                  <button className="flex min-h-[54px] w-full items-center justify-center rounded-full border border-[#111] bg-[#111] px-6 py-[14px] text-center text-[13px] leading-none font-medium tracking-[0.04em] text-white transition-colors hover:border-[#2a2a2a] hover:bg-[#2a2a2a] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#111]" onClick={openLogin} type="button">{text.signIn}</button>
                  <button className="flex min-h-[54px] w-full items-center justify-center rounded-full border border-[#111] bg-white px-6 py-[14px] text-center text-[13px] leading-none font-medium tracking-[0.04em] transition-colors hover:bg-[#f6f6f6] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#111]" onClick={continueAsGuest} type="button">{text.guest}</button>
                </div>
                <button className="mt-6 text-sm text-[#666] underline underline-offset-4 hover:text-[#ab8a73]" onClick={returnToCart} type="button">{text.backCart}</button>
              </div>
            </section>
          ) : items.length === 0 ? (
            <div className="flex min-h-[calc(100vh_-_78px)] flex-col items-center justify-center px-8 pt-[60px] pb-[90px] text-center max-[767px]:min-h-[calc(100dvh_-_66px_-_env(safe-area-inset-top))] max-[767px]:px-[22px] max-[767px]:pt-[54px] max-[767px]:pb-20">
              <span className="mb-6 flex size-[76px] items-center justify-center rounded-full bg-[#f6f6f6] text-[#111] max-[767px]:mb-5 max-[767px]:size-[68px]">
                <ShoppingBag aria-hidden="true" size={38} strokeWidth={1.3} />
              </span>
              <h3 className="text-[22px] leading-[1.3] font-medium tracking-[-0.02em] text-[#111] max-[767px]:text-xl">{text.emptyTitle}</h3>
              <p className="mt-[11px] max-w-[330px] text-sm leading-[1.55] text-[#777] max-[767px]:max-w-[290px] max-[767px]:text-[13px]">{text.empty}</p>
              <Link className="mt-[26px] flex min-h-[52px] w-[min(100%,310px)] items-center justify-center gap-2 rounded-full bg-[#111] px-[22px] py-3 text-sm leading-[1.3] font-medium text-white transition-[background-color,transform] duration-200 hover:bg-[#2a2a2a] active:scale-[0.99] max-[767px]:mt-[23px] max-[767px]:min-h-[50px] max-[767px]:w-[min(100%,290px)]" href="/ru/katalog" onClick={onClose}>
                {text.catalog} <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className={`px-7 pt-0 pb-[42px] max-[991px]:px-6 max-[767px]:px-4 max-[767px]:pb-[26px] ${fixedCheckoutMounted ? 'pb-[120px] max-[767px]:pb-[120px]' : ''}`}>
              {quote?.shipping.threshold ? (
                <section aria-label={text.delivery} className="border-b border-[#eee] pt-0 pb-[22px] max-[767px]:pt-[17px] max-[767px]:pb-[19px]">
                  {!quote.shipping.free ? (
                    <div>
                      <div className="mb-[9px] flex items-center justify-between gap-4 text-[13px] leading-[1.3] font-semibold">
                        <span>{text.paidDelivery}</span>
                        <span className="inline-flex min-h-[30px] items-center rounded-full bg-[#FDEEFE] px-[15px] py-1 text-center text-[13px] leading-none font-medium text-[#000000]">
                          {locale === 'ro' ? 'Livrare gratuită' : 'Бесплатная доставка'}
                        </span>
                      </div>
                      <div aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(deliveryProgress)} className="relative h-[2px] w-full bg-[#e5e5e5]" role="progressbar">
                        <span className="absolute top-0 left-0 block h-full bg-[#111] transition-[width] duration-300" style={{ width: `${deliveryProgress}%` }} />
                        <span aria-hidden="true" className="absolute top-1/2 left-0 size-[6px] -translate-y-1/2 rounded-full bg-[#111]" />
                        <span aria-hidden="true" className="absolute top-1/2 right-0 size-[6px] -translate-y-1/2 rounded-full bg-[#dedede]" />
                        <ArrowRight aria-hidden="true" className="absolute top-1/2 size-[12px] text-[#111] transition-[left] duration-300" style={{ left: `${deliveryProgress}%`, top: 'calc(50% + 2px)', transform: 'translate(-50%, -50%)' }} strokeWidth={2.4} />
                      </div>
                      <div className="mt-[9px] flex items-center justify-between gap-4 text-[13px] leading-none font-medium text-[#999]">
                        <span>0 MDL</span><span>{formatPrice(quote.shipping.threshold)}</span>
                      </div>
                    </div>
                  ) : (
                    <div aria-live="polite" className="inline-flex min-h-[34px] items-center gap-2 rounded-full bg-[#FDEEFE] px-[14px] py-[8px] text-[13px] leading-none font-medium text-[#000000]">{text.freeDelivery}</div>
                  )}
                </section>
              ) : null}

              <div className="flex flex-col" data-cart-products>
                {items.map((item) => {
                  const key = getLineKey(item)
                  const imageUrl = legacyAsset(item.image)
                  const title = getDisplayTitle(item)
                  const quoteLine = item.isGift ? undefined : quote?.items.find((row) => row.id === item.id && (row.variantId ?? null) === (item.variantId ?? null))
                  const rowBusy = Boolean(pendingRows[key])
                  const oldPrice = quoteLine?.originalPrice ?? item.originalPrice ?? null
                  const currentPrice = quoteLine?.unitPrice ?? item.price
                  const productDiscountForRow = quoteLine?.productDiscount ?? (oldPrice && currentPrice && oldPrice > currentPrice ? (oldPrice - currentPrice) * item.quantity : 0)
                  const unavailableMessage = quoteLine?.availabilityMessage ?? item.unavailableMessage
                  const maxQuantity = quoteLine?.maxQuantity ?? item.maxQuantity ?? 0
                  const productUrl = `/ru/katalog/product/${item.id}`

                  return (
                    <article aria-busy={rowBusy} className={`relative grid min-h-[154px] grid-cols-[88px_minmax(0,1fr)] gap-[14px] overflow-hidden border-b border-[#eee] py-4 max-[767px]:min-h-0 max-[767px]:grid-cols-[96px_minmax(0,1fr)] max-[767px]:gap-[18px] max-[767px]:py-[18px] ${rowBusy ? 'pointer-events-none opacity-60' : ''}`} data-cart-drawer-row key={key}>
                      <Link aria-label={title.title} className="flex h-24 w-[88px] items-center justify-center overflow-hidden bg-[#f7f7f7] max-[767px]:h-[99px] max-[767px]:w-24" href={productUrl}>
                        {imageUrl ? <img alt={title.title} className="block h-auto w-auto max-h-[90%] max-w-[90%] object-contain mix-blend-multiply" src={imageUrl} /> : <ShoppingBag className="text-[#999]" size={28} strokeWidth={1.2} />}
                      </Link>

                      <div className="flex min-w-0 flex-col justify-between">
                        <div className="flex items-start justify-between gap-[14px]">
                          <div className="min-w-0">
                            <p className="mb-[5px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-[1.25] font-medium tracking-[0.045em] text-[#777] uppercase max-[767px]:mb-[5px] max-[767px]:text-[10px]">{item.isGift ? (item.rouletteGiftId ? text.rouletteGift : text.promoGift) : item.brand}</p>
                            <Link className="block max-w-[380px] overflow-hidden text-ellipsis whitespace-nowrap text-[17px] leading-[1.3] font-medium tracking-[-0.01em] text-[#111] hover:underline hover:underline-offset-[3px] max-[767px]:max-w-[200px] max-[767px]:text-sm max-[767px]:leading-[1.35]" href={productUrl}>{title.title}</Link>
                            {title.variant ? <p className="mt-1.5 text-xs leading-[1.35] text-[#777]">{title.variant}</p> : null}
                            {item.isGift && item.giftPromotionTitle ? <p className="mt-1.5 text-xs text-[#777]">{item.giftPromotionTitle}</p> : null}
                            {item.isGift && item.giftVariantOptions?.length ? (
                              <label className="mt-2 block max-w-[250px] text-xs text-[#666]">
                                <span className="sr-only">{text.giftVariant}</span>
                                <select
                                  aria-label={text.giftVariant}
                                  className="min-h-9 w-full border border-[#dedede] bg-white px-2 text-xs text-[#111] focus-visible:outline-2 focus-visible:outline-[#ab8a73]"
                                  onChange={(event) => setGiftVariant(item.giftPromotionId ?? null, item.rouletteGiftId ?? null, event.target.value ? Number(event.target.value) : null)}
                                  value={item.variantId ?? ''}
                                >
                                  <option value="">{text.selectGiftVariant}</option>
                                  {item.giftVariantOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                                </select>
                              </label>
                            ) : null}
                            {item.giftVariantRequired ? <p className="mt-2 text-xs text-[#8e1f2d]" role="status">{text.selectGiftVariant}</p> : null}
                          </div>

                          <button aria-label={text.remove} className="-mt-[3px] mr-0.5 inline-flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#f7f7f7] text-[#111] transition-[background-color,transform] duration-200 hover:bg-[#eee] focus-visible:outline-2 focus-visible:outline-[#111] active:scale-[0.96] disabled:cursor-default disabled:opacity-40 max-[767px]:hidden" disabled={rowBusy || Boolean(item.isGift)} onClick={() => removeCartItem(item)} type="button"><X size={20} strokeWidth={1.4} /></button>
                          <button aria-label={text.actions} className="hidden size-[30px] shrink-0 flex-col items-center justify-center gap-[3px] rounded-full bg-transparent disabled:opacity-40 max-[767px]:inline-flex" disabled={rowBusy || Boolean(item.isGift)} onClick={(event) => openActionSheet(item, event.currentTarget)} type="button"><span className="size-[3px] rounded-full bg-[#777]" /><span className="size-[3px] rounded-full bg-[#777]" /><span className="size-[3px] rounded-full bg-[#777]" /></button>
                        </div>

                        <div className="mt-3 flex items-end justify-between gap-6 max-[767px]:mt-[10px] max-[767px]:w-full max-[767px]:justify-end max-[767px]:gap-0">
                          <div className="flex shrink-0 items-center gap-[10px] max-[767px]:hidden">
                            <button aria-label={text.decrease} className="flex size-8 shrink-0 items-center justify-center rounded-full text-[18px] leading-none font-normal transition-[background-color,opacity,transform] duration-200 active:scale-[0.94] disabled:cursor-default disabled:opacity-35" disabled={rowBusy || Boolean(item.isGift) || item.quantity <= 1} onClick={() => void changeQuantity(item, item.quantity - 1)} type="button"><Minus size={15} strokeWidth={1.4} /></button>
                            <span aria-live="polite" className="flex h-8 min-w-[18px] items-center justify-center text-[15px] leading-none font-medium text-[#111]">{rowBusy ? <LoaderCircle className="animate-spin" size={14} /> : item.quantity}</span>
                            <button aria-label={text.increase} className="flex size-8 shrink-0 items-center justify-center rounded-full text-[18px] leading-none font-normal transition-[background-color,opacity,transform] duration-200 active:scale-[0.94] disabled:cursor-default disabled:opacity-35" disabled={rowBusy || Boolean(item.isGift) || item.quantity >= Math.min(99, maxQuantity)} onClick={() => void changeQuantity(item, item.quantity + 1)} type="button"><Plus size={15} strokeWidth={1.4} /></button>
                          </div>

                          <div className="flex min-w-0 shrink-0 flex-col items-end gap-[3px] text-right max-[767px]:mr-4">
                            {item.isGift ? <span className="whitespace-nowrap text-[11px] leading-[1.2] font-normal text-[#a47c66]">{text.gift}</span> : productDiscountForRow > 0 ? <span className="whitespace-nowrap text-[11px] leading-[1.2] font-normal text-[#a47c66]">{text.discount} {formatPrice(productDiscountForRow)}</span> : null}
                            {!item.isGift ? (
                              <div className="flex items-baseline justify-end gap-[9px]">
                                {productDiscountForRow > 0 && oldPrice ? <span className="whitespace-nowrap text-xs leading-[1.2] font-normal text-[#999] line-through">{formatPrice(oldPrice * item.quantity)}</span> : null}
                                <strong className="whitespace-nowrap text-[17px] leading-[1.2] font-medium text-[#111] max-[767px]:text-[15px]">{formatPrice((currentPrice ?? 0) * item.quantity)}</strong>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {unavailableMessage ? <p className="mt-2 text-xs leading-5 text-[#c33b3b]" role="alert">{unavailableMessage}</p> : null}
                        {rowErrors[key] ? <p className="mt-2 text-xs leading-5 text-[#c33b3b]" role="alert">{rowErrors[key]}</p> : null}
                      </div>
                    </article>
                  )
                })}
              </div>

              {recommendedProducts.length ? (
                <section aria-label={text.boughtTogether} className="border-b border-[#eee] py-4">
                  <h2 className="m-0 mb-3 text-[13px] font-medium text-[#111]">{text.boughtTogether}</h2>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {recommendedProducts.map((product) => (
                      <div className="w-[148px] shrink-0" key={product.id}><ProductCard product={product} /></div>
                    ))}
                  </div>
                </section>
              ) : null}

              {quote?.roulette.available && discountChoice === 'roulette' ? (
                <div className="mb-3 flex min-h-[58px] items-center justify-between gap-5 border border-[#111] bg-white px-[15px] py-[11px]">
                  <div className="flex min-w-0 flex-col gap-[3px]">
                    <span className="text-[11px] leading-[1.3] text-[#777]">{text.rouletteApplied}</span>
                    <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold text-[#111]">{quote.roulette.title}</strong>
                    {quote.roulette.expiresAt ? <time className="text-xs font-semibold tabular-nums text-[#111]">{text.validUntil} {quote.roulette.expiresAt}</time> : null}
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-sm font-medium text-[#9f775f]">{quote.roulette.rewardType === 'gift' ? text.gift : quote.roulette.freeShipping ? text.freeDelivery : `−${formatPrice(quote.roulette.discount)}`}</span>
                </div>
              ) : null}

              {showDiscountChoice ? (
                <div aria-label={text.chooseDiscount} className="mb-[14px] grid gap-2" role="group">
                  <p className="m-0 text-xs leading-[1.4] text-[#777]">{text.chooseDiscount}</p>
                  {promo ? <button aria-pressed={discountChoice === 'promo'} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-[9px] text-left text-[13px] transition-colors ${discountChoice === 'promo' ? 'border-[#111] bg-[#f7f7f7]' : 'border-[#e2e2e2] bg-white'}`} onClick={() => setDiscountChoice('promo')} type="button"><span>{promo.code}</span><strong className="whitespace-nowrap">−{formatPrice(promo.discount)}</strong></button> : null}
                  {quote?.roulette.available ? <button aria-pressed={discountChoice === 'roulette'} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-[9px] text-left text-[13px] transition-colors ${discountChoice === 'roulette' ? 'border-[#111] bg-[#f7f7f7]' : 'border-[#e2e2e2] bg-white'}`} onClick={() => setDiscountChoice('roulette')} type="button"><span>{quote.roulette.title}</span><strong className="whitespace-nowrap">{quote.roulette.freeShipping ? text.freeDelivery : quote.roulette.rewardType === 'gift' ? text.gift : `−${formatPrice(quote.roulette.discount)}`}</strong></button> : null}
                  <p className="m-0 text-xs leading-[1.4] text-[#777]">{text.nonStackable}</p>
                </div>
              ) : null}

              <CartPromoForm items={items} locale={locale} onClearPromo={onClearPromo} onPromoChange={onPromoChange} onPromoCodeChange={onPromoCodeChange} promo={promo} promoCode={promoCode} />

              {quoteError ? <p className="my-3 text-xs leading-[1.4] text-[#c33b3b]" role="alert">{locale === 'ro' ? text.quoteError : quoteError}</p> : null}
              {hasUnavailableItems ? <p className="my-3 text-xs leading-[1.4] text-[#c33b3b]" role="alert">{text.unavailable}</p> : null}

              <section aria-label={text.totalTitle} aria-live="polite" className="pt-7 max-[767px]:pt-[23px]">
                <h3 className="mb-[23px] text-xl leading-[1.25] font-medium tracking-[-0.015em] text-[#111] max-[767px]:mb-5 max-[767px]:text-lg">{text.totalTitle}</h3>
                <div className="flex flex-col gap-[15px] max-[767px]:gap-[13px]">
                  <div className="flex items-start justify-between gap-5 text-sm leading-[1.4] font-normal text-[#555] max-[767px]:text-[13px]">
                    <span>{text.items} · <span data-cart-summary-count>{itemCount}</span></span>
                    <span className="shrink-0 text-right text-[#111]">{formatPrice(productsGross)}</span>
                  </div>
                  {productDiscount > 0 ? <div className="flex items-start justify-between gap-5 text-sm leading-[1.4] text-[#555] max-[767px]:text-[13px]"><span>{text.discount}</span><span className="shrink-0 text-right text-[#9f775f]">−{formatPrice(productDiscount)}</span></div> : null}
                  {promoDiscount > 0 ? <div className="flex items-start justify-between gap-5 text-sm leading-[1.4] text-[#555] max-[767px]:text-[13px]"><span>{discountChoice === 'roulette' ? quote?.roulette.title ?? text.rouletteDiscount : text.promo} {discountChoice === 'promo' && promo ? <span>{promo.code}</span> : null}</span><span className="shrink-0 text-right text-[#9f775f]">−{formatPrice(promoDiscount)}</span></div> : null}
                  <div className="flex items-start justify-between gap-5 text-sm leading-[1.4] font-normal text-[#555] max-[767px]:text-[13px]">
                    <span>{text.shipping}</span><span className="shrink-0 text-right text-[#111]">{quote ? quote.totals.deliveryPrice > 0 ? formatPrice(quote.totals.deliveryPrice) : text.free : text.calculating}</span>
                  </div>
                </div>
                <div className="mt-[22px] flex items-baseline justify-between gap-5 border-t border-[#dfdfdf] pt-5 text-lg leading-[1.3] font-medium text-[#111] max-[767px]:mt-[19px] max-[767px]:pt-[18px] max-[767px]:text-base">
                  <span>{text.total}</span><strong className="text-right text-[22px] font-medium tracking-[-0.02em] max-[767px]:text-xl">{formatPrice(finalTotal)}</strong>
                </div>

                {quote?.bonuses.earned ? <p className="mt-[14px] text-[13px] leading-[1.45] text-[#5f5f5f] max-[767px]:text-xs">{text.earned} +{formatPrice(quote.bonuses.earned)}</p> : null}
                {quote?.bonuses.enabled && !quote.bonuses.authenticated ? <p className="mt-[15px] text-[13px] leading-[1.45] text-[#6f6f6f] max-[767px]:text-xs"><button className="underline underline-offset-4 transition-colors hover:text-[#ab8a73]" onClick={openLogin} type="button">{text.login}</button> {text.bonusHint}</p> : null}
                {actionError ? <p className="mt-3 text-xs text-[#c33b3b]" role="alert">{actionError}</p> : null}

                <button className="mt-6 flex min-h-[54px] w-full items-center justify-center rounded-full bg-[#111] px-[22px] py-3 text-center text-[15px] leading-[1.3] font-medium text-white transition-[background-color,transform] duration-200 hover:bg-[#2a2a2a] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#d2d2d2] disabled:text-[#777] max-[767px]:mt-[22px]" disabled={!canCheckout} onClick={() => void beginCheckout()} ref={checkoutButtonRef} type="button">
                  {checkoutPending ? <LoaderCircle className="mr-2 animate-spin" size={16} /> : null}
                  {checkoutPending ? text.checking : text.checkout}
                </button>
              </section>
            </div>
          )}
            </DrawerViewTransition>
          )}
        </div>

        {fixedCheckoutMounted && items.length > 0 && !checkoutPrompt && !checkoutView ? (
          <div className={`absolute right-0 bottom-0 left-0 z-10 grid grid-cols-[auto_minmax(220px,280px)] items-center gap-6 border-t border-[#e8e8e8] bg-[rgba(255,255,255,0.97)] px-7 py-4 shadow-[0_-14px_34px_rgba(17,17,17,0.06)] backdrop-blur-[12px] transition-[transform,opacity] ease-out motion-reduce:transition-none max-[767px]:grid-cols-[1fr_auto] max-[767px]:gap-[14px] max-[767px]:px-4 max-[767px]:pt-3 max-[767px]:pb-[max(12px,env(safe-area-inset-bottom))] ${fixedCheckoutVisible ? 'pointer-events-auto translate-y-0 opacity-100 duration-[320ms]' : 'pointer-events-none translate-y-full opacity-0 duration-240'}`}>
            <div className="flex items-end gap-[22px]">
              {combinedDiscount > 0 ? <div className="mb-1 hidden flex-col gap-[3px] max-[767px]:hidden min-[768px]:flex"><span className="text-[11px] tracking-[0.06em] text-[#777] uppercase">{text.discount}</span><strong className="text-[17px] font-medium text-[#9f775f]">−{formatPrice(combinedDiscount)}</strong></div> : null}
              <div className="flex flex-col gap-[3px]"><span className="text-[11px] tracking-[0.06em] text-[#777] uppercase">{text.total}</span><strong className="whitespace-nowrap text-[22px] font-medium text-[#111] max-[767px]:text-[19px]">{formatPrice(finalTotal)}</strong></div>
            </div>
            <button className="flex min-h-[52px] items-center justify-center rounded-full bg-[#111] px-[22px] py-3 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:bg-[#d2d2d2] max-[767px]:min-h-[50px] max-[767px]:min-w-[190px]" disabled={!canCheckout} onClick={() => void beginCheckout()} type="button">{checkoutPending ? text.checking : text.checkout}</button>
          </div>
        ) : null}

        {activeSheetKey ? (
          <div aria-hidden={!sheetVisible} className={`absolute inset-0 z-40 min-[768px]:hidden ${sheetVisible ? 'visible' : 'invisible pointer-events-none'}`}>
            <button aria-label={text.close} className={`absolute inset-0 bg-[rgba(17,17,17,0.35)] transition-opacity duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${sheetVisible ? 'opacity-100' : 'opacity-0'}`} onClick={closeActionSheet} tabIndex={sheetVisible ? 0 : -1} type="button" />
            <div aria-modal="true" className={`absolute right-0 bottom-0 left-0 rounded-t-[18px] bg-white px-5 pt-[14px] pb-[max(20px,env(safe-area-inset-bottom))] transition-transform ease-[cubic-bezier(0.16,1,0.3,1)] ${sheetVisible ? 'duration-[480ms] translate-y-0' : 'duration-[320ms] translate-y-full'}`} data-cart-action-sheet role="dialog">
              <div className="mx-auto mb-7 h-1 w-[42px] rounded-full bg-[#dedede]" />
              {activeSheetItem ? (
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-6 border-b border-[#e8e8e8] pb-6">
                    <strong className="max-w-[150px] text-[19px] leading-[1.15] font-semibold">{text.changeQuantity}</strong>
                    <div className="flex items-center gap-3">
                      <button aria-label={text.decrease} className="flex size-[38px] items-center justify-center rounded-full bg-[#f7f7f7] text-xl disabled:opacity-40" disabled={Boolean(pendingRows[activeSheetKey]) || activeSheetItem.quantity <= 1} onClick={() => void changeQuantity(activeSheetItem, activeSheetItem.quantity - 1)} type="button"><Minus size={17} /></button>
                      <span aria-live="polite" className="min-w-5 text-center text-[17px] font-medium">{activeSheetItem.quantity}</span>
                      <button aria-label={text.increase} className="flex size-[38px] items-center justify-center rounded-full bg-[#f7f7f7] text-xl disabled:opacity-40" disabled={Boolean(pendingRows[activeSheetKey]) || activeSheetItem.quantity >= Math.min(99, quote?.items.find((row) => row.id === activeSheetItem.id && (row.variantId ?? null) === (activeSheetItem.variantId ?? null))?.maxQuantity ?? activeSheetItem.maxQuantity ?? 0)} onClick={() => void changeQuantity(activeSheetItem, activeSheetItem.quantity + 1)} type="button"><Plus size={17} /></button>
                    </div>
                  </div>
                  {rowErrors[activeSheetKey] ? <p className="mt-3 text-xs text-[#c33b3b]" role="alert">{rowErrors[activeSheetKey]}</p> : null}
                  <button className="mt-[10px] w-full border-0 bg-transparent py-[18px] text-left text-sm font-medium text-[#111]" onClick={() => removeCartItem(activeSheetItem)} type="button">{text.delete}</button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  ), portalTarget)
}
