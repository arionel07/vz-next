'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { useState } from 'react'

import type { StoreLocale } from '@/lib/locale-routing'

import { GiftCardsMiniHeader } from './gift-cards-page'

const denominationOptions = [200, 300, 500, 1000] as const
const certificateImage = '/legacy-assets/app/b2b/img/certificate-main.png'

function formatAmount(value: number, locale: StoreLocale) {
  return `${new Intl.NumberFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU').format(value)} MDL`
}

export function GiftCardPage({ locale = 'ru' }: { locale?: StoreLocale }) {
  const [amount, setAmount] = useState<number>(denominationOptions[0])
  const [quantity, setQuantity] = useState(1)
  const base = locale === 'ro' ? '/ro/card-cadou' : '/ru/podarochnaya-karta'
  const text = locale === 'ro'
    ? {
        back: 'Înapoi', title: 'Card cadou',
        description: 'Un cadou simplu pentru alegerea produselor preferate de frumusețe și parfumerie.', amount: 'Alege valoarea',
        quantity: 'Cantitate', decrease: 'Scade cantitatea', increase: 'Mărește cantitatea', total: 'Total',
        buy: 'Cumpără cardul cadou', validity: 'Perioada de valabilitate poate fi confirmată la serviciul de suport.',
        usage: 'Cardul poate fi folosit pentru cumpărături la Vizaje-Nica.', preview: 'Previzualizarea cardului cadou fizic',
        payment: 'Plata online nu este încă disponibilă.',
      }
    : {
        back: 'Назад', title: 'Подарочный сертификат',
        description: 'Подарок, с которым легко выбрать любимую косметику и парфюмерию.', amount: 'Выберите номинал',
        quantity: 'Количество', decrease: 'Уменьшить количество', increase: 'Увеличить количество', total: 'Итого',
        buy: 'Купить сертификат', validity: 'Срок действия можно уточнить у службы поддержки.',
        usage: 'Карту можно использовать для покупок в Vizaje-Nica.', preview: 'Предпросмотр физического подарочного сертификата',
        payment: 'Онлайн-оплата пока не подключена.',
      }

  return (
    <main className="min-h-svh bg-white text-[#111]">
      <GiftCardsMiniHeader locale={locale} suffix="/plastic" />
      <div className="grid w-full grid-cols-1 lg:min-h-[calc(100svh-68px)] lg:grid-cols-2">
        <section className="order-1 px-6 pb-12 pt-7 sm:px-10 sm:pb-16 sm:pt-10 lg:px-[clamp(40px,8vw,128px)] lg:py-14 xl:py-[9vh]">
          <Link href={base} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/20 px-4 text-sm text-black/70 transition-colors hover:border-black hover:text-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-black">
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.7} />{text.back}
          </Link>
          <h1 className="mt-10 max-w-[620px] text-[clamp(36px,5vw,62px)] font-medium leading-[0.98] tracking-[-0.055em] sm:mt-14">{text.title}</h1>
          <p className="mt-5 max-w-[520px] text-sm leading-6 text-black/60 sm:text-base sm:leading-7">{text.description}</p>

          <fieldset className="mt-9 border-0 p-0 sm:mt-12">
            <legend className="text-sm font-medium">{text.amount}</legend>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {denominationOptions.map((option) => {
                const selected = amount === option
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAmount(option)}
                    className={`flex min-h-[62px] items-center justify-center gap-1 rounded-[12px] border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-black ${selected ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-black hover:bg-[#fafafa]'}`}
                  >
                    <span>{new Intl.NumberFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU').format(option)}</span>
                    <span>MDL</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-7 sm:mt-9">
            <span className="text-sm font-medium">{text.quantity}</span>
            <div className="inline-flex min-h-12 items-center gap-5 rounded-full border border-black/15 px-3" aria-label={text.quantity}>
              <button type="button" aria-label={text.decrease} disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid size-8 place-items-center rounded-full transition-colors hover:bg-[#f2f2f2] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-black"><Minus size={15} /></button>
              <output aria-live="polite" className="min-w-4 text-center text-sm tabular-nums">{quantity}</output>
              <button type="button" aria-label={text.increase} onClick={() => setQuantity((current) => current + 1)} className="grid size-8 place-items-center rounded-full transition-colors hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-black"><Plus size={15} /></button>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <span className="text-sm text-black/55">{text.total}</span>
            <strong aria-live="polite" className="text-[26px] font-medium leading-none tracking-[-0.04em]">{formatAmount(amount * quantity, locale)}</strong>
          </div>
          <button type="button" className="mt-7 min-h-14 w-full rounded-full bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">{text.buy}</button>
          <p className="mt-3 text-center text-xs leading-5 text-black/45">{text.payment}</p>

          <ul className="mt-8 space-y-4 text-sm leading-6 text-black/65 sm:mt-10">
            <li className="flex gap-3"><span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-black/50" /><span>{text.validity}</span></li>
            <li className="flex gap-3"><span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-black/50" /><span>{text.usage}</span></li>
          </ul>
        </section>

        <aside className="order-2 flex min-h-[360px] flex-col items-center justify-center bg-[linear-gradient(180deg,#f2f5f5_0%,#e2f5f8_100%)] px-6 py-10 sm:px-10 lg:min-h-[calc(100svh-68px)] lg:px-12 lg:py-12">
          <div className="relative mx-auto aspect-[1.43/1] w-full max-w-[720px]">
            <Image
              src={certificateImage}
              alt={text.preview}
              fill
              sizes="(max-width: 1023px) 90vw, 50vw"
              priority
              unoptimized
              className="object-contain"
            />
          </div>
        </aside>
      </div>
    </main>
  )
}
