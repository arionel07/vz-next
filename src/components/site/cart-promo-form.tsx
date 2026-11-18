'use client'

import { ArrowRight, LoaderCircle, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'

import { formatPrice } from '@/lib/format'
import type { CartItem, CartPromo } from '@/store/cart-store'
import type { StoreLocale } from '@/lib/locale-routing'

type CartPromoFormProps = {
  items: CartItem[]
  promoCode: string
  promo: CartPromo | null
  onPromoCodeChange: (value: string) => void
  onPromoChange: (value: CartPromo | null) => void
  onClearPromo: () => void
  locale?: StoreLocale
}

function getItemsPayload(items: CartItem[]) {
  return items.filter((item) => !item.isGift).map((item) => ({
    id: item.id,
    variantId: item.variantId ?? null,
    quantity: item.quantity,
  }))
}

export function CartPromoForm({
  items,
  promoCode,
  promo,
  onPromoCodeChange,
  onPromoChange,
  onClearPromo,
  locale = 'ru',
}: CartPromoFormProps) {
  const text = locale === 'ro'
    ? { promo: 'Cod promoțional', remove: 'Elimină codul promoțional', placeholder: 'Introdu codul promoțional', pending: 'Se verifică codul promoțional', apply: 'Aplică codul promoțional', invalid: 'Codul promoțional nu a putut fi aplicat.', check: 'Codul promoțional nu a putut fi verificat. Încearcă din nou.', enter: 'Introdu codul promoțional.' }
    : { promo: 'Промокод', remove: 'Удалить промокод', placeholder: 'Введите промокод', pending: 'Проверяем промокод', apply: 'Применить промокод', invalid: 'Не удалось применить промокод.', check: 'Не удалось проверить промокод. Попробуйте ещё раз.', enter: 'Введите промокод.' }
  const inputId = useId()
  const messageId = `${inputId}-message`
  const [draft, setDraft] = useState(promoCode)
  const [message, setMessage] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [authRevision, setAuthRevision] = useState(0)
  const itemsSignature = JSON.stringify(getItemsPayload(items))

  useEffect(() => {
    const handleAuthChange = () => setAuthRevision((revision) => revision + 1)
    window.addEventListener('vz:auth-changed', handleAuthChange)
    return () => window.removeEventListener('vz:auth-changed', handleAuthChange)
  }, [])

  useEffect(() => {
    setDraft(promoCode)
  }, [promoCode])

  useEffect(() => {
    if (!promoCode || !items.length) {
      onPromoChange(null)
      setIsPending(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false

    async function validate() {
      setIsPending(true)
      setMessage('')
      onPromoChange(null)

      try {
        const response = await fetch('/api/promocode', {
          body: JSON.stringify({ code: promoCode, items: getItemsPayload(items) }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal: controller.signal,
        })
        const result = (await response.json()) as { promo?: CartPromo | null; message?: string }

        if (cancelled) return
        if (!response.ok || !result.promo) {
          setMessage(locale === 'ro' ? text.invalid : result.message ?? text.invalid)
          return
        }

        onPromoChange(result.promo)
      } catch (error) {
        if (!cancelled && error instanceof Error && error.name !== 'AbortError') {
          setMessage(text.check)
        }
      } finally {
        if (!cancelled) setIsPending(false)
      }
    }

    void validate()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [items, itemsSignature, locale, onPromoChange, promoCode, authRevision])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = draft.trim().toUpperCase()
    if (!normalized) {
      onClearPromo()
      setMessage(text.enter)
      return
    }

    setMessage('')
    onPromoCodeChange(normalized)
  }

  function handleClear() {
    setDraft('')
    setMessage('')
    onClearPromo()
  }

  return (
    <section className="border-b border-dashed border-[#eee] py-[26px] max-[767px]:py-[22px]">
      {promo ? (
        <>
          <div className="flex min-h-[58px] items-center justify-between gap-5 rounded-lg border border-dashed border-[#dcdcdc] bg-[#fafafa] px-[15px] py-[11px] max-[420px]:gap-3 max-[420px]:px-3" role="status">
            <div className="flex min-w-0 flex-col gap-[3px]">
              <span className="text-[11px] leading-[1.3] text-[#777]">{text.promo}</span>
              <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-semibold text-[#111]">{promo.code}</strong>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="whitespace-nowrap text-sm font-medium text-[#9f775f]">−{formatPrice(promo.discount)}</span>
              <button aria-label={text.remove} className="flex size-8 items-center justify-center rounded-full bg-[#eee] text-[#111] transition-[background-color,transform] hover:bg-[#e4e4e4] active:scale-95" onClick={handleClear} type="button"><X size={18} strokeWidth={1.4} /></button>
            </div>
          </div>
          {message ? <p className="mt-2 text-xs leading-[1.4] text-[#c33b3b]" id={messageId} role="alert">{message}</p> : null}
        </>
      ) : (
        <form className="m-0" onSubmit={handleSubmit}>
          <div className="flex min-h-[52px] items-center rounded-lg border border-dashed border-[#dcdcdc] bg-white transition-[border-color,box-shadow] focus-within:border-[#111] focus-within:shadow-[0_0_0_1px_#111]">
            <input
              aria-describedby={message ? messageId : undefined}
              autoComplete="off"
              className="h-[50px] min-w-0 flex-1 border-0 bg-transparent px-[14px] text-sm outline-none placeholder:text-[#8c8c8c]"
              id={inputId}
              maxLength={64}
              name="code"
              onChange={(event) => setDraft(event.target.value)}
              placeholder={text.placeholder}
              value={draft}
            />
            <button aria-label={isPending ? text.pending : text.apply} className="flex size-[50px] shrink-0 items-center justify-center border-0 text-xl transition-[opacity,transform] duration-200 hover:translate-x-0.5 disabled:cursor-default disabled:opacity-40 disabled:hover:translate-x-0" disabled={isPending || !items.length} type="submit">{isPending ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={21} strokeWidth={1.4} />}</button>
          </div>
          {message ? <p className="mt-2 mx-[2px] text-xs leading-[1.4] text-[#c33b3b]" id={messageId} role="alert">{message}</p> : null}
        </form>
      )}
    </section>
  )
}
