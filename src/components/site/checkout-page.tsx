'use client'

import { LocalizedLink as Link } from '@/components/site/localized-link'
import NextLink from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Banknote, Check, CreditCard, Minus, Plus, Send, Store, Trash2, Truck, Zap } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'

import { formatPrice } from '@/lib/format'
import { legacyAsset } from '@/lib/legacy-assets'
import { addValidatedCartItem } from '@/lib/cart-actions'
import { useCartQuote } from '@/lib/use-cart-quote'
import { useCartStore } from '@/store/cart-store'
import { localeSwitchPath, localizedPath, type StoreLocale } from '@/lib/locale-routing'

type CheckoutStore = { id: number; title: string; address: string; schedule: string }
type CheckoutCustomer = { name: string; surname: string; phone: string; email: string }
type CheckoutPageProps = {
  locale?: StoreLocale
  pickupStores?: CheckoutStore[]
  expressDeliveryEnabled?: boolean
  expressDeliveryPrice?: number
  customer?: CheckoutCustomer | null
  embedded?: boolean
  onComplete?: () => void
}

export function CheckoutPage({ locale = 'ru', pickupStores = [], expressDeliveryEnabled = false, expressDeliveryPrice = 100, customer = null, embedded = false, onComplete }: CheckoutPageProps) {
  const router = useRouter()
  const items = useCartStore((state) => state.items)
  const hasHydrated = useCartStore((state) => state.hasHydrated)
  const decreaseItem = useCartStore((state) => state.decreaseItem)
  const removeItem = useCartStore((state) => state.removeItem)
  const clear = useCartStore((state) => state.clear)
  const promoCode = useCartStore((state) => state.promoCode)
  const promo = useCartStore((state) => state.promo)
  const discountChoice = useCartStore((state) => state.discountChoice)
  const setDiscountChoice = useCartStore((state) => state.setDiscountChoice)
  const formRef = useRef<HTMLFormElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRedirectingToPaynet, setIsRedirectingToPaynet] = useState(false)
  const [formReady, setFormReady] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [quoteRevision, setQuoteRevision] = useState(0)
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup' | 'express'>(pickupStores.length ? 'pickup' : 'delivery')
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(pickupStores[0]?.id ?? null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash')
  const [bonusAmount, setBonusAmount] = useState(0)
  const { quote, error: quoteError, isLoading: quoteLoading } = useCartQuote({ bonusAmount, deliveryMethod, refreshKey: quoteRevision })
  const text = locale === 'ro'
    ? { loading: 'Se încarcă coșul…', emptyTitle: 'Coșul este gol', empty: 'Adaugă produse pentru a continua comanda.', catalog: 'Înapoi la catalog', yourOrder: 'Comanda ta', checkout: 'Finalizarea comenzii', back: 'Înapoi la coș', completeDetails: 'Completează datele destinatarului', contact: 'Date de contact', name: 'Prenume', surname: 'Nume', phone: 'Telefon', yourName: 'Numele tău', receiving: 'Metoda de primire', delivery: 'Livrare', courier: 'Livrare prin curier', deliveryCost: 'Gratuită de la {amount}', express: 'Livrare expres', expressNote: 'Livrare în aproximativ 3 ore · {amount}', pickup: 'Ridicare din magazin', address: 'Adresa de livrare', city: 'Localitate', street: 'Stradă', house: 'Casă', entrance: 'Scară', apartment: 'Apartament', store: 'Magazin ales', selectStore: 'Alegeți magazinul', pickupNote: 'Ridicarea va fi disponibilă după confirmarea comenzii de către manager.', change: 'Schimbă', payment: 'Metoda de plată', cash: 'Numerar la primire', cashNote: 'Plata curierului sau în magazin', card: 'Card la primire', cardNote: 'Prin terminal', online: 'Card online', onlineNote: 'Plată securizată prin Paynet', redirecting: 'Se redirecționează către pagina de plată…', comment: 'Comentariu la comandă', commentPlaceholder: 'De exemplu, un interval potrivit pentru contact', creating: 'Se creează comanda…', confirm: 'Confirmă comanda', pieces: 'buc.', giftRoulette: 'Cadou câștigat la tombolă', giftOffer: 'Cadou promoțional', quantity: 'Cantitate: ', decrease: 'Micșorează', increase: 'Mărește', remove: 'Elimină produsul', discountChoice: 'Alege o singură ofertă', shipping: 'livrare gratuită', gift: 'cadou', bonuses: 'Folosește bonusuri', spend: 'Câte bonusuri dorești să folosești (maximum {amount})', bonusLimit: 'Pentru produsele eligibile poți folosi cel mult soldul disponibil; suma de plată trebuie să fie de minimum 1 MDL.', balance: 'Sold: {balance} · poți folosi până la {amount} pentru această comandă.', login: 'Autentifică-te', bonusHint: 'pentru a acumula și folosi bonusuri.', unavailable: 'Modifică cantitatea sau elimină produsele indisponibile pentru a continua.', items: 'Produse', discount: 'Reducere', free: 'Gratuit', calculating: 'Se calculează', usedBonus: 'Bonusuri folosite', earnedBonus: 'Bonusuri pentru cumpărături', total: 'Total', freeDelivery: 'Comanda beneficiază de livrare gratuită.', remaining: 'Mai adaugă {amount} pentru livrare gratuită.', createError: 'Comanda nu a putut fi creată. Încearcă din nou.', serviceError: 'Serviciul este temporar indisponibil. Încearcă din nou.', quoteError: 'Totalul nu a putut fi actualizat. Încearcă din nou.', promo: 'Reducere promoțională' }
    : { loading: 'Загружаем корзину…', emptyTitle: 'Корзина пуста', empty: 'Добавьте товары, чтобы перейти к оформлению заказа.', catalog: 'Вернуться в каталог', yourOrder: 'Ваш заказ', checkout: 'Оформление заказа', back: 'Вернуться в корзину', completeDetails: 'Заполните данные получателя', contact: 'Контактные данные', name: 'Имя', surname: 'Фамилия', phone: 'Телефон', yourName: 'Ваше имя', receiving: 'Доставка', delivery: 'Доставка', courier: 'Курьерская доставка', deliveryCost: 'Бесплатно от {amount}', express: 'Срочная доставка', expressNote: 'Доставка примерно в течение 3 часов · {amount}', pickup: 'Самовывоз из магазина', address: 'Адрес доставки', city: 'Населённый пункт', street: 'Улица', house: 'Дом', entrance: 'Подъезд', apartment: 'Квартира', store: 'Выбранный магазин', selectStore: 'Выберите магазин', pickupNote: 'Самовывоз будет доступен после подтверждения заказа менеджером.', change: 'Изменить', payment: 'Оплата', cash: 'Наличными при получении', cashNote: 'Оплата курьеру или в магазине', card: 'Картой при получении', cardNote: 'Оплата через терминал при получении заказа', online: 'Картой онлайн', onlineNote: 'Безопасная оплата через Paynet', redirecting: 'Переходим на страницу оплаты…', comment: 'Комментарий к заказу', commentPlaceholder: 'Например, позвоните перед доставкой', creating: 'Создаём заказ…', confirm: 'Подтвердить заказ', pieces: 'шт.', giftRoulette: 'Подарок за приз рулетки', giftOffer: 'Подарок по акции', quantity: 'Количество: ', decrease: 'Уменьшить', increase: 'Увеличить', remove: 'Удалить товар', discountChoice: 'Выберите одно предложение', shipping: 'бесплатная доставка', gift: 'подарок', bonuses: 'Списать бонусы', spend: 'Сколько списать (максимум {amount})', bonusLimit: 'На подходящие товары можно списать не больше баланса; после списания останется минимум 1 MDL к оплате.', balance: 'Баланс: {balance} · за этот заказ можно списать до {amount}.', login: 'Войдите', bonusHint: 'чтобы получать и использовать бонусы.', unavailable: 'Исправьте количество или удалите недоступный товар, чтобы оформить заказ.', items: 'Товары', discount: 'Скидка', free: 'Бесплатно', calculating: 'Рассчитывается', usedBonus: 'Списано бонусов', earnedBonus: 'Начислим бонусов', total: 'Итого', freeDelivery: 'Для этого заказа доступна бесплатная доставка.', remaining: 'До бесплатной доставки осталось {amount}.', createError: 'Не удалось создать заказ. Попробуйте ещё раз.', serviceError: 'Сервис временно недоступен. Попробуйте ещё раз.', quoteError: 'Не удалось обновить сумму. Попробуйте ещё раз.', promo: 'Промоакция' }

  const miniHeader = (
    <header className="grid h-[68px] grid-cols-[1fr_auto_1fr] items-center border-b border-[#e5e5e5] px-5 sm:px-8 lg:px-12">
      <Link className="inline-flex w-fit items-center gap-2 text-sm text-[#222] transition-opacity hover:opacity-60" href={localizedPath('/ru/cart', locale)}>
        <ArrowLeft size={19} strokeWidth={1.5} aria-hidden="true" />
        <span className="hidden sm:inline">{text.back}</span>
      </Link>
      <NextLink className="relative inline-flex h-9 w-[148px] items-center justify-center sm:w-[190px]" href={`/${locale}`} aria-label="Vizaje-Nica">
        <Image src="/legacy-assets/app/img/next/header/logo_v.webp" alt="Vizaje-Nica" width={250} height={42} priority unoptimized className="h-full w-full object-contain" />
      </NextLink>
      <nav className="flex items-center justify-end gap-2 text-xs" aria-label={locale === 'ro' ? 'Limba' : 'Язык'}>
        {(['ru', 'ro'] as const).map((language, index) => (
          <span className="inline-flex items-center gap-2" key={language}>
            {index ? <span aria-hidden="true" className="text-[#b7b7b7]">/</span> : null}
            <NextLink className={`px-1 py-2 transition-colors hover:text-[#777] ${locale === language ? 'font-semibold text-[#111]' : 'text-[#777]'}`} href={localeSwitchPath(`/${locale}/checkout`, language)} aria-current={locale === language ? 'page' : undefined}>{language.toUpperCase()}</NextLink>
          </span>
        ))}
      </nav>
    </header>
  )

  useEffect(() => {
    if (quote && bonusAmount > quote.bonuses.maxWriteoff) setBonusAmount(quote.bonuses.maxWriteoff)
  }, [quote, bonusAmount])

  useEffect(() => {
    setFormReady(formRef.current?.checkValidity() ?? false)
  }, [deliveryMethod, selectedStoreId, hasHydrated])

  const total = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * item.quantity,
    0,
  )
  const finalTotal = quote?.totals.total ?? Math.max(0, total - (promo?.discount ?? 0))
  const hasUnavailableItems = quote ? quote.items.some((item) => !item.available) : items.some((item) => Boolean(item.unavailableMessage))
  const canSubmit = formReady && !isSubmitting && !quoteLoading && Boolean(quote) && !quoteError && !hasUnavailableItems && !(deliveryMethod === 'pickup' && (!pickupStores.length || !selectedStoreId))
  const selectedStore = pickupStores.find((store) => store.id === selectedStoreId)
  const courierCost = quote ? (total >= quote.shipping.threshold ? text.free : formatPrice(quote.shipping.price)) : text.calculating

  function updateFormValidity() {
    setFormReady(formRef.current?.checkValidity() ?? false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quote || quoteLoading || quoteError || hasUnavailableItems) return
    if (deliveryMethod === 'pickup' && !selectedStoreId) {
      setSubmitError(locale === 'ro' ? 'Selectați magazinul pentru ridicare.' : 'Выберите магазин для самовывоза.')
      return
    }
    setSubmitError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const formValue = (name: string) => String(formData.get(name) ?? '')
    try {
      const response = await fetch('/api/orders', {
        body: JSON.stringify({
          customer: {
            name: formValue('name'),
            surname: formValue('surname'),
            phone: formValue('phone'),
            email: formValue('email'),
            city: formValue('city'),
            street: formValue('street'),
            house: formValue('house'),
            entrance: formValue('entrance'),
            apartment: formValue('apartment'),
          },
          delivery: deliveryMethod,
          storeId: deliveryMethod === 'pickup' ? selectedStoreId : null,
          payment: paymentMethod,
          comment: formValue('comment'),
          items: items.map((item) => ({ id: item.id, variantId: item.variantId ?? null, quantity: item.quantity, isGift: item.isGift ?? false, giftPromotionId: item.giftPromotionId ?? null, rouletteGiftId: item.rouletteGiftId ?? null })),
          promoCode: discountChoice === 'promo' && quote?.discount.choice === 'promo' ? promoCode : '',
          discountChoice,
          bonusAmount: quote?.totals.bonusUsed ?? 0,
          expectedTotal: quote.totals.total,
          locale,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const result = (await response.json()) as { message?: string; orderNumber?: number }

      if (!response.ok || !result.orderNumber) {
        setSubmitError(result.message ?? text.createError)
        if (response.status === 409) setQuoteRevision((revision) => revision + 1)
        return
      }

      if (paymentMethod === 'online') {
        setIsRedirectingToPaynet(true)
        const paynetResponse = await fetch('/api/payments/paynet/create', {
          body: JSON.stringify({ orderNumber: result.orderNumber, locale }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        const paynetResult = (await paynetResponse.json()) as { message?: string; formHtml?: string }
        if (!paynetResponse.ok || !paynetResult.formHtml) {
          // The order was created (pay on delivery can still be arranged manually);
          // only the redirect to Paynet failed.
          setSubmitError(paynetResult.message ?? text.serviceError)
          return
        }
        clear()
        const container = document.createElement('div')
        container.hidden = true
        container.innerHTML = paynetResult.formHtml
        document.body.appendChild(container)
        container.querySelector('form')?.submit()
        return
      }

      clear()
      onComplete?.()
      router.push(`/${locale}/order-success?order=${encodeURIComponent(String(result.orderNumber))}`)
    } catch {
      setSubmitError(text.serviceError)
    } finally {
      setIsSubmitting(false)
      setIsRedirectingToPaynet(false)
    }
  }

  if (!hasHydrated) {
    return (
      <div className={`${embedded ? 'min-h-full' : 'min-h-screen'} bg-white text-[#111]`}>
        {!embedded ? miniHeader : null}
        <main className={`mx-auto min-h-[60vh] max-w-[1240px] ${embedded ? 'px-5 py-8' : 'px-5 py-16 sm:px-8 lg:px-12'}`} aria-busy="true">
          <p className="text-sm text-[#777]">{text.loading}</p>
        </main>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className={`${embedded ? 'min-h-full' : 'min-h-screen'} bg-white text-[#111]`}>
        {!embedded ? miniHeader : null}
        <main className={`mx-auto min-h-[60vh] max-w-[1240px] ${embedded ? 'px-5 py-8' : 'px-5 py-16 sm:px-8 lg:px-12'}`}>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[.14em] text-[#777]">VIZAJE-NICA</p>
          <h1 className="mb-4 text-4xl font-medium tracking-[-.04em] sm:text-5xl">{text.emptyTitle}</h1>
          <p className="mb-8 max-w-lg text-sm leading-6 text-[#707070]">{text.empty}</p>
          <Link className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#111] px-6 text-sm font-medium text-white transition-colors hover:bg-[#333]" href={localizedPath('/ru/katalog', locale)}>
            {text.catalog}
          </Link>
        </main>
      </div>
    )
  }

  return (
      <div className={`${embedded ? 'min-h-full' : 'min-h-screen'} bg-white text-[#111]`}>
        {!embedded ? miniHeader : null}
        <main className={`mx-auto max-w-[1440px] ${embedded ? 'px-5 pt-6 pb-10' : 'px-5 pt-9 pb-16 sm:px-8 lg:px-12 lg:pt-12'}`} aria-labelledby="checkout-title">
          <div className={`border-b border-[#e5e5e5] pb-5 ${embedded ? 'mb-6' : 'mb-8 sm:mb-10'}`}>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[.14em] text-[#777]">{text.yourOrder}</p>
            <h1 id="checkout-title" className={`m-0 leading-[1.08] font-medium tracking-[-.045em] ${embedded ? 'text-[28px]' : 'text-[34px] sm:text-[42px]'}`}>{text.checkout}</h1>
          </div>

          <div className={`grid items-start ${embedded ? 'grid-cols-1 gap-8' : 'gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,390px)] lg:gap-16 xl:gap-24'}`}>
            <form ref={formRef} id="checkout-form" className={`min-w-0 ${embedded ? 'order-1' : 'order-2 lg:order-1'}`} onChange={updateFormValidity} onSubmit={handleSubmit}>
              <fieldset className="mb-9 min-w-0 border-0 border-t border-[#e5e5e5] p-0 pt-6">
                <legend className="mb-5 px-0 text-[20px] font-medium tracking-[-.02em]">{text.contact}</legend>
                <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                  <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070]">
                    <span>{text.name}</span>
                    <input className="min-h-12 w-full rounded-[8px] border border-[#d5d5d5] bg-white px-4 text-sm text-[#111] outline-none transition focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="name" required autoComplete="given-name" placeholder={text.yourName} defaultValue={customer?.name ?? ''} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070]">
                    <span>{text.surname}</span>
                    <input className="min-h-12 w-full rounded-[8px] border border-[#d5d5d5] bg-white px-4 text-sm text-[#111] outline-none transition focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="surname" autoComplete="family-name" defaultValue={customer?.surname ?? ''} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070] sm:col-span-2">
                    <span>{text.phone}</span>
                    <input className="min-h-12 w-full rounded-[8px] border border-[#d5d5d5] bg-white px-4 text-sm text-[#111] outline-none transition focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="phone" required autoComplete="tel" placeholder="+373 00 000 000" defaultValue={customer?.phone ?? ''} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070] sm:col-span-2">
                    <span>Email</span>
                    <input className="min-h-12 w-full rounded-[8px] border border-[#d5d5d5] bg-white px-4 text-sm text-[#111] outline-none transition focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="email" type="email" required autoComplete="email" placeholder="you@example.com" defaultValue={customer?.email ?? ''} />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070] sm:col-span-2">
                    <span>{text.comment}</span>
                    <textarea className="min-h-24 w-full resize-y rounded-[8px] border border-[#d5d5d5] bg-white px-4 py-3 text-sm text-[#111] outline-none transition focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="comment" rows={3} placeholder={text.commentPlaceholder} />
                  </label>
                </div>
              </fieldset>

              <fieldset className="mb-9 min-w-0 border-0 border-t border-[#e5e5e5] p-0 pt-6">
                <legend className="mb-2 px-0 text-[20px] font-medium tracking-[-.02em]">{text.receiving}</legend>
                <p className="mb-4 text-[10px] font-medium uppercase tracking-[.12em] text-[#858585]">{locale === 'ro' ? 'Metoda de livrare' : 'Способ доставки'}</p>
                <div className="grid gap-2.5">
                  {([
                    { value: 'pickup' as const, title: text.pickup, note: pickupStores.length === 1 ? pickupStores[0].title : locale === 'ro' ? 'Ridicare gratuită din magazinele Vizaje-Nica' : 'Бесплатно из магазинов Vizaje-Nica', price: text.free, Icon: Store, enabled: pickupStores.length > 0 },
                    { value: 'delivery' as const, title: text.courier, note: text.deliveryCost.replace('{amount}', formatPrice(quote?.shipping.threshold ?? 500)), price: courierCost, Icon: Truck, enabled: true },
                    ...(expressDeliveryEnabled ? [{ value: 'express' as const, title: text.express, note: text.expressNote.replace('{amount}', formatPrice(expressDeliveryPrice)), price: formatPrice(expressDeliveryPrice), Icon: Zap, enabled: true }] : []),
                  ]).filter((option) => option.enabled).map(({ value, title, note, price, Icon }) => {
                    const selected = deliveryMethod === value
                    return (
                      <label className={`flex min-h-[76px] cursor-pointer items-center gap-3 rounded-[8px] border px-3.5 py-3 transition-colors focus-within:ring-2 focus-within:ring-[#111] sm:gap-4 sm:px-5 ${selected ? 'border-[#111] bg-[#111] text-white' : 'border-[#d8d8d8] bg-white text-[#111] hover:border-[#111]'}`} key={value}>
                        <input className="sr-only" name="delivery" type="radio" value={value} checked={selected} onChange={() => setDeliveryMethod(value)} />
                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-white/15 text-white' : 'bg-[#f3f3f3] text-[#333]'}`}><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <strong className="text-sm font-medium">{title}</strong>
                          <small className={`text-xs leading-[1.4] ${selected ? 'text-white/70' : 'text-[#777]'}`}>{note}</small>
                        </span>
                        <span className="shrink-0 pl-2 text-xs font-medium sm:text-sm">{price}</span>
                        <span className={`ml-1 flex size-[18px] shrink-0 items-center justify-center rounded-full border ${selected ? 'border-white bg-white text-[#111]' : 'border-[#c9c9c9] text-transparent'}`} aria-hidden="true">{selected ? <Check size={12} strokeWidth={2.5} /> : null}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              {deliveryMethod !== 'pickup' ? (
                <fieldset className="mb-9 min-w-0 border-0 border-t border-[#e5e5e5] p-0 pt-6">
                  <legend className="mb-5 px-0 text-[20px] font-medium tracking-[-.02em]">{text.address}</legend>
                  <div className="grid gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-4">
                    <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070] sm:col-span-3"><span>{text.city}</span><input className="min-h-12 rounded-[8px] border border-[#d5d5d5] px-4 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="city" required autoComplete="address-level2" /></label>
                    <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070] sm:col-span-3"><span>{text.street}</span><input className="min-h-12 rounded-[8px] border border-[#d5d5d5] px-4 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="street" required autoComplete="address-line1" /></label>
                    <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070]"><span>{text.house}</span><input className="min-h-12 rounded-[8px] border border-[#d5d5d5] px-4 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="house" required /></label>
                    <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070]"><span>{text.entrance}</span><input className="min-h-12 rounded-[8px] border border-[#d5d5d5] px-4 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="entrance" /></label>
                    <label className="flex min-w-0 flex-col gap-2 text-xs text-[#707070]"><span>{text.apartment}</span><input className="min-h-12 rounded-[8px] border border-[#d5d5d5] px-4 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="apartment" autoComplete="address-line2" /></label>
                  </div>
                </fieldset>
              ) : (
                <section className="mb-9 rounded-[8px] border border-[#d8d8d8] p-4 sm:p-5" aria-label={text.store}>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="text-[10px] font-medium uppercase tracking-[.12em] text-[#858585]">{text.store}</span>
                    <Store size={17} className="text-[#555]" aria-hidden="true" />
                  </div>
                  {pickupStores.length ? <>
                    <label className="sr-only" htmlFor="checkout-store">{text.selectStore}</label>
                    <select id="checkout-store" className="min-h-12 w-full rounded-[8px] border border-[#d5d5d5] bg-white px-3 text-sm text-[#111] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]" name="storeId" onChange={(event) => setSelectedStoreId(Number(event.target.value) || null)} required value={selectedStoreId ?? ''}>
                      {pickupStores.map((store) => <option key={store.id} value={store.id}>{store.title}</option>)}
                    </select>
                    {selectedStore ? <div className="mt-3 space-y-1 text-sm"><strong className="block font-medium">{selectedStore.title}</strong>{selectedStore.address ? <p className="m-0 text-xs leading-5 text-[#777]">{selectedStore.address}</p> : null}{selectedStore.schedule ? <p className="m-0 text-xs leading-5 text-[#777]">{selectedStore.schedule}</p> : null}</div> : null}
                  </> : <strong className="text-sm font-medium">{text.selectStore}</strong>}
                  <p className="mb-0 mt-3 text-xs leading-5 text-[#777]">{text.pickupNote}</p>
                </section>
              )}

              <fieldset className="mb-6 min-w-0 border-0 border-t border-[#e5e5e5] p-0 pt-6">
                <legend className="mb-2 px-0 text-[20px] font-medium tracking-[-.02em]">{text.payment}</legend>
                <p className="mb-4 text-[10px] font-medium uppercase tracking-[.12em] text-[#858585]">{locale === 'ro' ? 'Metode de plată' : 'Способы оплаты'}</p>
                <div className="grid gap-2.5">
                  {([
                    { value: 'cash' as const, title: text.cash, note: text.cashNote, Icon: Banknote, disabled: false },
                    { value: 'card' as const, title: text.card, note: text.cardNote, Icon: CreditCard, disabled: false },
                    { value: 'online' as const, title: text.online, note: text.onlineNote, Icon: CreditCard, disabled: false },
                  ]).map(({ value, title, note, Icon, disabled }) => {
                    const selected = paymentMethod === value
                    return (
                      <label className={`flex min-h-[72px] items-center gap-3 rounded-[8px] border px-3.5 py-3 transition-colors sm:gap-4 sm:px-5 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${selected ? 'border-[#111] bg-[#111] text-white' : 'border-[#d8d8d8] bg-white text-[#111] hover:border-[#111]'}`} key={value}>
                        <input className="sr-only" name="payment" type="radio" value={value} checked={selected} disabled={disabled} onChange={() => setPaymentMethod(value)} />
                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-white/15 text-white' : 'bg-[#f3f3f3] text-[#333]'}`}><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1"><strong className="text-sm font-medium">{title}</strong><small className={`text-xs leading-[1.4] ${selected ? 'text-white/70' : 'text-[#777]'}`}>{note}</small></span>
                        <span className={`ml-auto flex size-[18px] shrink-0 items-center justify-center rounded-full border ${selected ? 'border-white bg-white text-[#111]' : 'border-[#c9c9c9] text-transparent'}`} aria-hidden="true">{selected ? <Check size={12} strokeWidth={2.5} /> : null}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <a className="group mt-7 flex w-fit max-w-full items-center gap-3 border-t border-[#e5e5e5] pt-5 text-[#111] transition-colors hover:text-[#666]" href="https://t.me/vizaje_nica_support_bot" target="_blank" rel="noopener noreferrer">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#229ed9] text-white"><Send size={17} fill="currentColor" aria-hidden="true" /></span>
                <span className="flex min-w-0 flex-col gap-1"><strong className="text-sm font-medium">{locale === 'ro' ? 'Suport pe Telegram' : 'Поддержка в Telegram'}</strong><small className="text-xs text-[#777]">@vizaje_nica_support_bot</small></span>
                <span aria-hidden="true" className="ml-3 text-lg">↗</span>
              </a>
            </form>

            <aside className={`self-start rounded-[12px] border border-[#dedede] bg-white p-5 sm:p-6 ${embedded ? 'order-2' : 'order-1 lg:sticky lg:top-6 lg:order-2'}`} aria-labelledby="summary-title">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 id="summary-title" className="m-0 text-[19px] font-medium tracking-[-.025em]">{text.yourOrder}</h2>
                <span className="text-xs text-[#777]">{items.reduce((sum, item) => sum + item.quantity, 0)} {text.pieces}</span>
              </div>

              <div className="mb-5 divide-y divide-[#e8e8e8] border-y border-[#e8e8e8]">
                {items.map((item) => {
                  const imageUrl = legacyAsset(item.image)
                  const availabilityMessage = quote?.items.find((row) => row.id === item.id && (row.variantId ?? null) === (item.variantId ?? null))?.availabilityMessage
                  return (
                    <div className={`grid grid-cols-[68px_minmax(0,1fr)] gap-3 py-4 ${item.isGift ? 'bg-[#f7f7f7]' : ''}`} key={`${item.id}:${item.variantId ?? 0}:${item.giftPromotionId ?? 0}:${item.rouletteGiftId ?? 0}`}>
                      <div className="flex aspect-square items-center justify-center overflow-hidden bg-[#f2f2f2]">
                        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply" /> : null}
                      </div>
                      <div className="min-w-0">
                        {item.brand ? <p className="mb-1 text-[9px] font-medium uppercase tracking-[.12em] text-[#777]">{item.brand}</p> : null}
                        <h3 className="mb-1 line-clamp-2 text-[13px] leading-[1.35] font-medium">{item.title}</h3>
                        {item.variantLabel ? <p className="mb-1 text-[11px] text-[#777]">{item.variantLabel}</p> : null}
                        {item.isGift ? <p className="mb-1 text-[10px] font-medium text-[#8e1f2d]">{item.rouletteGiftId ? text.giftRoulette : text.giftOffer}</p> : <strong className="text-[13px] font-medium">{formatPrice(item.price)}</strong>}
                        {availabilityMessage ? <p className="mb-0 mt-2 text-xs text-[#8e1f2d]" role="alert">{availabilityMessage}</p> : null}
                        {!item.isGift ? <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[#dedede] px-2" aria-label={`${text.quantity}${item.quantity}`}>
                            <button className="inline-flex size-6 items-center justify-center text-[#333] hover:text-[#888]" type="button" onClick={() => decreaseItem(item.id, item.variantId)} aria-label={text.decrease}><Minus size={13} /></button>
                            <span className="min-w-3 text-center text-xs">{item.quantity}</span>
                            <button className="inline-flex size-6 items-center justify-center text-[#333] hover:text-[#888]" type="button" onClick={() => void addValidatedCartItem(item)} aria-label={text.increase}><Plus size={13} /></button>
                          </div>
                          <button className="inline-flex size-8 items-center justify-center text-[#777] transition-colors hover:text-[#111]" type="button" onClick={() => removeItem(item.id, item.variantId)} aria-label={text.remove}><Trash2 size={15} /></button>
                        </div> : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              {(quote?.roulette.available || promo) ? <fieldset className="mb-4 space-y-2 border-0 p-0" aria-label={text.discountChoice}>
                <legend className="mb-2 text-xs font-medium text-[#555]">{text.discountChoice}</legend>
                {promo ? <label className="flex cursor-pointer items-start gap-2 text-xs"><input className="mt-0.5 accent-[#111]" type="radio" name="checkout-discount" checked={discountChoice === 'promo'} onChange={() => setDiscountChoice('promo')} /><span>{text.promo} · {promo.code}: −{formatPrice(promo.discount)}</span></label> : null}
                {quote?.roulette.available ? <label className="flex cursor-pointer items-start gap-2 text-xs"><input className="mt-0.5 accent-[#111]" type="radio" name="checkout-discount" checked={discountChoice === 'roulette'} onChange={() => setDiscountChoice('roulette')} /><span>{quote.roulette.title}{quote.roulette.discount > 0 ? `: −${formatPrice(quote.roulette.discount)}` : quote.roulette.freeShipping ? ` · ${text.shipping}` : quote.roulette.rewardType === 'gift' ? ` · ${text.gift}` : ''}</span></label> : null}
              </fieldset> : null}

              {quote?.bonuses.balance ? <div className="mb-4 rounded-[8px] border border-[#e3e3e3] p-3.5">
                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium"><input className="accent-[#111]" type="checkbox" checked={bonusAmount > 0} disabled={quote.bonuses.maxWriteoff <= 0} onChange={(event) => setBonusAmount(event.target.checked ? quote.bonuses.maxWriteoff : 0)} />{text.bonuses}</label>
                {bonusAmount > 0 ? <div className="mt-3 grid gap-2">
                  <label className="text-xs" htmlFor="checkout-bonus-amount">{text.spend.replace('{amount}', formatPrice(quote.bonuses.maxWriteoff))}</label>
                  <input className="min-h-10 w-full rounded-[8px] border border-[#d5d5d5] px-3 text-sm outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]" id="checkout-bonus-amount" inputMode="numeric" max={quote.bonuses.maxWriteoff} min={0} onChange={(event) => setBonusAmount(Math.min(quote.bonuses.maxWriteoff, Math.max(0, Math.floor(Number(event.target.value) || 0))))} type="number" value={bonusAmount} />
                  <p className="m-0 text-[11px] leading-4 text-[#777]">{text.bonusLimit}</p>
                </div> : <p className="mb-0 mt-2 text-[11px] leading-4 text-[#777]">{text.balance.replace('{balance}', formatPrice(quote.bonuses.balance)).replace('{amount}', formatPrice(quote.bonuses.maxWriteoff))}</p>}
              </div> : null}
              {quote?.bonuses.enabled && !quote.bonuses.authenticated ? <p className="mb-4 text-xs text-[#707070]"><button className="underline underline-offset-4 transition-colors hover:text-[#111]" type="button" onClick={() => window.dispatchEvent(new CustomEvent('vz:open-auth'))}>{text.login}</button> {text.bonusHint}</p> : null}
              {quoteError ? <p className="mb-3 text-xs text-[#8e1f2d]" role="alert">{locale === 'ro' ? text.quoteError : quoteError}</p> : null}
              {hasUnavailableItems ? <p className="mb-3 text-xs text-[#8e1f2d]" role="alert">{text.unavailable}</p> : null}

              <div className="space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between gap-4"><span className="text-[#666]">{text.items}</span><span>{formatPrice(quote?.totals.productsSubtotal ?? total)}</span></div>
                {quote?.totals.promoDiscount ? <div className="flex items-center justify-between gap-4 text-[#8e1f2d]"><span>{quote.discount.label ?? text.discount}</span><span>−{formatPrice(quote.totals.promoDiscount)}</span></div> : null}
                <div className="flex items-center justify-between gap-4"><span className="text-[#666]">{text.delivery}</span><span>{quote ? quote.totals.deliveryPrice ? formatPrice(quote.totals.deliveryPrice) : text.free : deliveryMethod === 'pickup' ? text.free : text.calculating}</span></div>
                {quote?.totals.bonusUsed ? <div className="flex items-center justify-between gap-4 text-[#8e1f2d]"><span>{text.usedBonus}</span><span>−{formatPrice(quote.totals.bonusUsed)}</span></div> : null}
                {quote?.bonuses.earned ? <div className="flex items-center justify-between gap-4"><span className="text-[#666]">{text.earnedBonus}</span><span>+{formatPrice(quote.bonuses.earned)}</span></div> : null}
                <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-[#e5e5e5] pt-4"><span className="font-medium">{text.total}</span><strong className="text-[23px] leading-none font-semibold tracking-[-.035em]">{formatPrice(finalTotal)}</strong></div>
              </div>
              {deliveryMethod === 'delivery' && quote?.shipping.threshold ? <p className="mb-0 mt-3 text-xs leading-5 text-[#777]">{quote.shipping.free ? text.freeDelivery : text.remaining.replace('{amount}', formatPrice(quote.shipping.remaining))}</p> : null}
              <button className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#111] px-5 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:bg-[#ededed] disabled:text-[#999]" disabled={!canSubmit} form="checkout-form" type="submit">
                {isRedirectingToPaynet ? text.redirecting : isSubmitting ? text.creating : text.confirm}
              </button>
              {!formReady ? <p className="mb-0 mt-2 text-center text-xs text-[#777]">{text.completeDetails}</p> : null}
              {submitError ? <p className="mb-0 mt-3 text-xs text-[#8e1f2d]" role="alert" aria-live="assertive">{submitError}</p> : null}
            </aside>
          </div>
        </main>
      </div>
  )
}
