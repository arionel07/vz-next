'use client'

import { ArrowLeft, Check, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'

type ProductOption = {
  id: number
  title: string
  sku: string | null
  brand: string
  image: string | null
  price: number | null
  variants: { id: number; title: string; price: number }[]
}

type OrderLine = { product: ProductOption; variantId: number | null; quantity: number }
type PickupStore = { id: number; title: string; address: string }

function money(value: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} MDL`
}

function selectedPrice(line: OrderLine) {
  if (line.variantId !== null) return line.product.variants.find((variant) => variant.id === line.variantId)?.price ?? 0
  return line.product.price ?? 0
}

function lineKey(line: Pick<OrderLine, 'product' | 'variantId'>) {
  return `${line.product.id}:${line.variantId ?? 0}`
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block min-w-0 ${className}`}><span className="mb-1.5 block text-[11px] font-medium text-[#4f5457]">{label}</span>{children}</label>
}

const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[12px] text-[#202223] outline-none transition focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/15 placeholder:text-[#969a9d]'

export function AdminOrderCreateForm({ stores, freeShippingThreshold, shippingPrice }: { stores: PickupStore[]; freeShippingThreshold: number; shippingPrice: number }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductOption[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({})
  const [lines, setLines] = useState<OrderLine[]>([])
  const [delivery, setDelivery] = useState<'pickup' | 'delivery'>('pickup')
  const [storeId, setStoreId] = useState(stores[0]?.id.toString() ?? '')
  const [payment, setPayment] = useState<'later' | 'cash' | 'card'>('later')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customer, setCustomer] = useState({ name: '', surname: '', phone: '', email: '', city: '', street: '', house: '' })
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      fetch(`/api/admin/orders/products?q=${encodeURIComponent(term)}`, { cache: 'no-store', signal: controller.signal })
        .then(async (response) => {
          const data = await response.json() as { products?: ProductOption[]; message?: string }
          if (!response.ok) throw new Error(data.message || 'Не удалось найти товары.')
          setSearchResults(data.products ?? [])
          setSelectedVariants((current) => {
            const next = { ...current }
            for (const product of data.products ?? []) if (!(product.id in next) && product.variants[0]) next[product.id] = product.variants[0].id
            return next
          })
        })
        .catch((cause: unknown) => {
          if (cause instanceof DOMException && cause.name === 'AbortError') return
          setSearchResults([])
          setError(cause instanceof Error ? cause.message : 'Не удалось найти товары.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + selectedPrice(line) * line.quantity, 0), [lines])
  const deliveryCost = delivery === 'delivery' && freeShippingThreshold > 0 && subtotal < freeShippingThreshold ? shippingPrice : 0
  const total = subtotal + deliveryCost

  function addProduct(product: ProductOption) {
    const variantId = product.variants.length ? selectedVariants[product.id] ?? product.variants[0]?.id : null
    if (product.variants.length && variantId === undefined) {
      setError('Выберите вариант товара.')
      return
    }
    const line = { product, variantId: variantId ?? null, quantity: 1 }
    setLines((current) => {
      const key = lineKey(line)
      const existing = current.find((item) => lineKey(item) === key)
      if (existing) return current.map((item) => lineKey(item) === key ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item)
      return [...current, line]
    })
    setError('')
  }

  function updateQuantity(key: string, quantity: number) {
    setLines((current) => current.map((line) => lineKey(line) === key ? { ...line, quantity: Math.max(1, Math.min(99, quantity)) } : line))
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => lineKey(line) !== key))
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, delivery, storeId: delivery === 'pickup' ? Number(storeId) || null : null, payment, notes, items: lines.map((line) => ({ id: line.product.id, variantId: line.variantId, quantity: line.quantity })) }),
      })
      const data = await response.json() as { id?: number; message?: string }
      if (!response.ok || !data.id) throw new Error(data.message || 'Не удалось создать заказ.')
      window.dispatchEvent(new Event('vz:admin-order-created'))
      router.push(`/admin/orders/${data.id}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось создать заказ. Проверьте соединение и попробуйте ещё раз.')
      setSaving(false)
    }
  }

  return (
    <form className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]" onSubmit={submitOrder}>
      <div className="order-2 space-y-5 xl:order-1">
        <section className="rounded-2xl border border-[#e2e4e6] bg-white p-4 sm:p-5" aria-labelledby="create-products-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[14px] font-semibold text-[#202223]" id="create-products-title">Товары</h2>
            <span className="text-[10px] text-[#777b7e]">Цены пересчитываются при сохранении</span>
          </div>
          <label className="relative block">
            <span className="sr-only">Найти товар для заказа</span>
            <Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={17} />
            <input className={`${inputClass} pl-10`} onChange={(event) => { setQuery(event.target.value); setError('') }} placeholder="Найти товар по названию или артикулу" type="search" value={query} />
            {searching ? <LoaderCircle aria-label="Поиск" className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-[#777b7e]" size={16} /> : null}
          </label>

          {query.trim().length >= 2 && !searching ? (
            <div className="mt-2 max-h-[280px] divide-y divide-[#eceeef] overflow-y-auto rounded-xl border border-[#e5e7e9]">
              {searchResults.length ? searchResults.map((product) => {
                const variant = product.variants.find((item) => item.id === selectedVariants[product.id]) ?? product.variants[0]
                const shownPrice = variant?.price ?? product.price
                return (
                  <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap" key={product.id}>
                    <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f2f2f2]">
                      {product.image ? <img alt="" className="size-full object-contain mix-blend-multiply" src={product.image} /> : <span className="text-[9px] text-[#858a8d]">#{product.id}</span>}
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <p className="text-[11px] leading-4 font-medium text-[#303438]">{product.title}</p>
                      <p className="mt-0.5 text-[10px] text-[#777b7e]">{product.brand}{product.sku ? ` · ${product.sku}` : ''}</p>
                    </div>
                    {product.variants.length ? (
                      <label className="min-w-[130px] flex-1 sm:max-w-[190px]">
                        <span className="sr-only">Вариант товара {product.title}</span>
                        <select className={`${inputClass} h-9`} onChange={(event) => setSelectedVariants((current) => ({ ...current, [product.id]: Number(event.target.value) }))} value={variant?.id ?? ''}>
                          {product.variants.map((item) => <option key={item.id} value={item.id}>{item.title} · {money(item.price)}</option>)}
                        </select>
                      </label>
                    ) : null}
                    <strong className="min-w-[70px] text-right text-[11px] font-semibold text-[#202223]">{shownPrice === null ? '—' : money(shownPrice)}</strong>
                    <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d9dcde] px-3 text-[11px] font-medium text-[#303438] transition-colors hover:border-[#007aff] hover:text-[#0062cc] focus-visible:outline-2 focus-visible:outline-[#007aff]" onClick={() => addProduct(product)} type="button"><Plus aria-hidden="true" size={14} />Добавить</button>
                  </div>
                )
              }) : <p className="px-3 py-4 text-[11px] text-[#777b7e]">Товары не найдены.</p>}
            </div>
          ) : null}

          <div className="mt-4 divide-y divide-[#eceeef]">
            {lines.length ? lines.map((line) => {
              const key = lineKey(line)
              const variant = line.product.variants.find((item) => item.id === line.variantId)
              const price = selectedPrice(line)
              return (
                <article className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0 sm:flex-nowrap" key={key}>
                  <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f2f2f2]">
                    {line.product.image ? <img alt="" className="size-full object-contain mix-blend-multiply" src={line.product.image} /> : <span className="text-[9px] text-[#858a8d]">#{line.product.id}</span>}
                  </div>
                  <div className="min-w-[150px] flex-1">
                    <p className="text-[11px] leading-4 font-medium text-[#303438]">{line.product.title}</p>
                    <p className="mt-0.5 text-[10px] text-[#777b7e]">{variant?.title || line.product.brand || `Артикул ${line.product.sku ?? '—'}`}</p>
                  </div>
                  <span className="min-w-[68px] text-right text-[11px] text-[#0062cc]">{money(price)}</span>
                  <label className="w-[76px]">
                    <span className="sr-only">Количество: {line.product.title}</span>
                    <input className={`${inputClass} h-9 px-2 text-center`} max={99} min={1} onChange={(event) => updateQuantity(key, Number(event.target.value) || 1)} type="number" value={line.quantity} />
                  </label>
                  <strong className="min-w-[76px] text-right text-[11px] font-semibold text-[#303438]">{money(price * line.quantity)}</strong>
                  <button aria-label={`Удалить ${line.product.title}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-[#777b7e] transition-colors hover:bg-[#fce9e9] hover:text-[#8e1f2d] focus-visible:outline-2 focus-visible:outline-[#007aff]" onClick={() => removeLine(key)} type="button"><Trash2 aria-hidden="true" size={15} /></button>
                </article>
              )
            }) : <div className="grid min-h-[110px] place-items-center rounded-xl border border-dashed border-[#dfe2e4] px-4 text-center text-[11px] text-[#777b7e]">Найдите товар выше и добавьте его в заказ.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e2e4e6] bg-white p-4 sm:p-5" aria-labelledby="create-payment-title">
          <h2 className="mb-4 text-[14px] font-semibold text-[#202223]" id="create-payment-title">Оплата и доставка</h2>
          <div className="space-y-2 rounded-xl border border-[#e5e7e9] p-3 text-[11px]">
            <div className="flex justify-between gap-3 text-[#555a5d]"><span>Товары · {lines.reduce((sum, line) => sum + line.quantity, 0)} шт.</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between gap-3 text-[#555a5d]"><span>{delivery === 'pickup' ? 'Самовывоз' : 'Курьерская доставка'}</span><span>{deliveryCost ? money(deliveryCost) : 'Бесплатно'}</span></div>
            {delivery === 'delivery' && freeShippingThreshold > 0 && subtotal < freeShippingThreshold ? <p className="text-[10px] text-[#777b7e]">Бесплатная доставка от {money(freeShippingThreshold)}</p> : null}
            <div className="flex justify-between gap-3 border-t border-[#eceeef] pt-3 text-[14px] font-semibold text-[#202223]"><span>Итого</span><span>{money(total)}</span></div>
            <p className="border-t border-[#eceeef] pt-3 text-[10px] text-[#777b7e]">Налоги и скидки не рассчитаны. Промокод будет подключён отдельно.</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Способ доставки">
              <select className={inputClass} onChange={(event) => setDelivery(event.target.value as 'pickup' | 'delivery')} value={delivery}>
                <option value="pickup">Самовывоз из магазина</option><option value="delivery">Курьер</option>
              </select>
            </Field>
            <Field label="Способ оплаты">
              <select className={inputClass} onChange={(event) => setPayment(event.target.value as 'later' | 'cash' | 'card')} value={payment}>
                <option value="later">Оплата позднее</option><option value="cash">Наличными</option><option value="card">Картой курьеру</option>
              </select>
            </Field>
            {delivery === 'pickup' ? (
              <Field className="sm:col-span-2" label="Магазин самовывоза">
                <select className={inputClass} onChange={(event) => setStoreId(event.target.value)} required value={storeId}>
                  <option value="">Выберите магазин</option>
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.title}{store.address ? ` — ${store.address}` : ''}</option>)}
                </select>
              </Field>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e2e4e6] bg-white p-4 sm:p-5" aria-labelledby="create-notes-title">
          <h2 className="mb-3 text-[14px] font-semibold text-[#202223]" id="create-notes-title">Комментарий</h2>
          <textarea className="min-h-24 w-full resize-y rounded-lg border border-[#d9dcde] bg-white px-3 py-2.5 text-[12px] text-[#202223] outline-none transition focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/15 placeholder:text-[#969a9d]" maxLength={4000} onChange={(event) => setNotes(event.target.value)} placeholder="Комментарий к заказу" value={notes} />
        </section>
      </div>

      <aside className="order-1 space-y-5 xl:order-2">
        <section className="rounded-2xl border border-[#e2e4e6] bg-white p-4 sm:p-5" aria-labelledby="create-customer-title">
          <h2 className="mb-4 text-[14px] font-semibold text-[#202223]" id="create-customer-title">Покупатель</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Field label="Имя"><input autoComplete="given-name" className={inputClass} onChange={(event) => setCustomer((value) => ({ ...value, name: event.target.value }))} required value={customer.name} /></Field>
            <Field label="Фамилия"><input autoComplete="family-name" className={inputClass} onChange={(event) => setCustomer((value) => ({ ...value, surname: event.target.value }))} value={customer.surname} /></Field>
            <Field label="Телефон"><input autoComplete="tel" className={inputClass} onChange={(event) => setCustomer((value) => ({ ...value, phone: event.target.value }))} required type="tel" value={customer.phone} /></Field>
            <Field label="Email"><input autoComplete="email" className={inputClass} onChange={(event) => setCustomer((value) => ({ ...value, email: event.target.value }))} type="email" value={customer.email} /></Field>
            {delivery === 'delivery' ? <>
              <Field className="sm:col-span-2 xl:col-span-1" label="Город"><input autoComplete="address-level2" className={inputClass} onChange={(event) => setCustomer((value) => ({ ...value, city: event.target.value }))} required value={customer.city} /></Field>
              <Field label="Улица"><input autoComplete="address-line1" className={inputClass} onChange={(event) => setCustomer((value) => ({ ...value, street: event.target.value }))} required value={customer.street} /></Field>
              <Field label="Дом"><input className={inputClass} onChange={(event) => setCustomer((value) => ({ ...value, house: event.target.value }))} required value={customer.house} /></Field>
            </> : null}
          </div>
        </section>

      </aside>

      <div className="order-3 flex flex-wrap items-center justify-between gap-3 xl:col-span-2">
        {error ? <p aria-live="polite" className="basis-full rounded-xl border border-[#f1cccc] bg-[#fff6f6] px-3.5 py-3 text-[11px] leading-5 text-[#8e1f2d]">{error}</p> : null}
        <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9dcde] bg-white px-3.5 text-[11px] font-medium text-[#303438] transition-colors hover:bg-[#f7f8f8] focus-visible:outline-2 focus-visible:outline-[#007aff]" onClick={() => router.push('/admin/orders')} type="button"><ArrowLeft aria-hidden="true" size={14} /> К заказам</button>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white transition-colors hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007aff] disabled:cursor-not-allowed disabled:opacity-60" disabled={saving || !lines.length || (delivery === 'pickup' && !stores.length)} type="submit">
          {saving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : <Check aria-hidden="true" size={14} />}{saving ? 'Создаём…' : 'Создать заказ'}
        </button>
      </div>
    </form>
  )
}
