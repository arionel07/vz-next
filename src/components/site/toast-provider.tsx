'use client'

import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { getPathLocale } from '@/lib/locale-routing'
import { formatPrice } from '@/lib/format'
import { legacyAsset } from '@/lib/legacy-assets'
import type { ToastDetail } from '@/lib/toast'

type ToastItem = ToastDetail & { id: string }

function localizeToastMessage(message: string, locale: 'ru' | 'ro') {
  if (locale === 'ru') return message

  const translations: [string, string][] = [
    ['Добавлено в корзину: ', 'Adăugat în coș: '],
    ['Количество увеличено: ', 'Cantitatea a fost mărită: '],
    ['Количество уменьшено: ', 'Cantitatea a fost redusă: '],
    ['Удалено из корзины: ', 'Eliminat din coș: '],
    ['Подарок по акции добавлен: ', 'Cadoul promoțional a fost adăugat: '],
    ['Корзина очищена', 'Coșul a fost golit'],
    ['Не удалось добавить товар в корзину.', 'Produsul nu a putut fi adăugat în coș.'],
    ['Не удалось проверить наличие товара. Попробуйте ещё раз.', 'Stocul nu a putut fi verificat. Încearcă din nou.'],
    ['Укажите количество от 1 до 99.', 'Alege o cantitate între 1 și 99.'],
    ['Не удалось изменить количество.', 'Cantitatea nu a putut fi modificată.'],
  ]

  const translation = translations.find(([source]) => message.startsWith(source))
  if (translation) return `${translation[1]}${message.slice(translation[0].length)}`
  if (/[А-Яа-яЁё]/.test(message)) return 'Acțiunea nu a putut fi finalizată. Încearcă din nou.'
  return message
}

export function ToastProvider() {
  const locale = getPathLocale(usePathname())
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<ToastDetail>).detail
      if (!detail?.message) return

      const id = detail.id ?? `${Date.now()}-${Math.random()}`
      const item = { ...detail, message: localizeToastMessage(detail.message, locale), id }
      setToasts((current) => [...current.filter((toast) => toast.message !== detail.message), item].slice(-3))
      const timeout = detail.kind === 'cart' ? 4600 : detail.kind === 'favorite' ? 3600 : 2800
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, timeout)
    }

    window.addEventListener('vz:toast', handleToast)
    return () => window.removeEventListener('vz:toast', handleToast)
  }, [locale])

  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483647]" aria-live="polite" aria-atomic="true">
      <div className="absolute right-6 bottom-6 flex max-w-[min(390px,calc(100vw-32px))] flex-col gap-2.5 max-[767px]:right-4 max-[767px]:bottom-[calc(84px_+_env(safe-area-inset-bottom))] max-[767px]:left-4 max-[767px]:max-w-none">
      {toasts.filter((toast) => !toast.kind || toast.kind === 'default').map((toast) => {
        return (
          <div className="pointer-events-auto flex min-h-12 w-[368px] max-w-full items-start gap-4 rounded-[2px] bg-[#333333] px-4 py-3 text-[14px] leading-[1.45] text-white shadow-[0_12px_32px_rgba(17,17,17,0.2)] animate-[toast-in_.22s_ease-out] max-[767px]:w-full max-[767px]:text-[13px]" key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'}>
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button className="inline-flex shrink-0 items-center justify-center bg-transparent p-0 text-white/90 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white" type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label={locale === 'ro' ? 'Închide notificarea' : 'Закрыть уведомление'}>
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        )
      })}
      </div>

      {toasts.filter((toast) => toast.kind === 'cart' && toast.product).map((toast) => {
        const product = toast.product!
        const image = product.image ? legacyAsset(product.image) : null
        return (
          <div className="pointer-events-auto fixed right-6 bottom-6 w-[620px] max-w-[calc(100vw-32px)] rounded-[16px] bg-black p-5 text-white shadow-[0_18px_48px_rgba(0,0,0,.24)] animate-[toast-in_.22s_ease-out] max-[767px]:right-4 max-[767px]:bottom-4 max-[767px]:left-4 max-[767px]:w-auto max-[600px]:rounded-[15px]" key={toast.id} role="status">
            <div className="flex items-center justify-between gap-4">
              <strong className="text-[18px] leading-6 font-medium">{locale === 'ro' ? 'Adăugat în coș' : 'Добавлено в корзину'}</strong>
              <button className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#303030] text-white transition-colors hover:bg-[#454545]" type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label={locale === 'ro' ? 'Închide notificarea' : 'Закрыть уведомление'}><X size={21} strokeWidth={1.2} /></button>
            </div>
            <div className="mt-4 grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-4 max-[600px]:grid-cols-[76px_minmax(0,1fr)] max-[600px]:gap-3">
              <div className="flex size-[84px] items-center justify-center bg-[#161616] max-[600px]:size-[76px]">
                {image ? <img className="size-full object-contain mix-blend-screen" src={image} alt="" /> : null}
              </div>
              <div className="min-w-0 text-[15px] leading-[1.45]">
                <p className="m-0 truncate text-[17px] font-medium">{product.title}</p>
                {product.brand ? <p className="m-0">{product.brand}</p> : null}
                {product.variantLabel ? <p className="m-0">{product.variantLabel}</p> : null}
              </div>
              {typeof product.price === 'number' ? <span className="self-start whitespace-nowrap pt-1 text-sm">{formatPrice(product.price)}</span> : null}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="min-h-[50px] rounded-full border border-white px-4 text-sm font-medium transition-colors hover:bg-white hover:text-black" type="button" onClick={() => { setToasts((current) => current.filter((item) => item.id !== toast.id)); window.dispatchEvent(new CustomEvent('vz:open-cart')) }}>{locale === 'ro' ? 'Coșul meu' : 'Корзина'}</button>
              <button className="min-h-[50px] rounded-full bg-white px-4 text-sm font-medium text-black transition-opacity hover:opacity-80" type="button" onClick={() => { setToasts((current) => current.filter((item) => item.id !== toast.id)); window.dispatchEvent(new CustomEvent('vz:open-cart')) }}>{locale === 'ro' ? 'Finalizare' : 'Оформить заказ'}</button>
            </div>
          </div>
        )
      })}

      {toasts.filter((toast) => toast.kind === 'favorite' && toast.product).map((toast) => {
        const product = toast.product!
        const image = product.image ? legacyAsset(product.image) : null
        return (
          <div className="pointer-events-auto fixed top-[78px] right-6 flex w-[445px] max-w-[calc(100vw-32px)] items-center gap-4 rounded-[3px] bg-white p-3 shadow-[0_8px_24px_rgba(17,17,17,.16)] animate-[toast-in_.22s_ease-out] max-[767px]:top-[calc(12px_+_env(safe-area-inset-top))] max-[767px]:right-4 max-[767px]:left-4 max-[767px]:w-auto" key={toast.id} role="status">
            <div className="flex size-[88px] shrink-0 items-center justify-center bg-[#f2f2f2] max-[600px]:size-[72px]">
              {image ? <img className="size-full object-contain mix-blend-multiply" src={image} alt="" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 line-clamp-2 text-[16px] leading-5 font-medium">{product.title}</p>
              <button className="mt-3 min-h-10 w-full rounded-full border border-black px-4 text-sm font-medium transition-colors hover:bg-black hover:text-white" type="button" onClick={() => { setToasts((current) => current.filter((item) => item.id !== toast.id)); window.location.assign(locale === 'ro' ? '/ro/favorite' : '/ru/izbrannyie') }}>{locale === 'ro' ? 'Vezi favoritele' : 'Перейти в избранное'}</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
