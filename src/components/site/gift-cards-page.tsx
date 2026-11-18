'use client'

import Image from 'next/image'
import Link from 'next/link'

import type { StoreLocale } from '@/lib/locale-routing'

const certificateImage = '/legacy-assets/app/b2b/img/certificate-main.png'

function giftCardsBase(locale: StoreLocale) {
  return locale === 'ro' ? '/ro/card-cadou' : '/ru/podarochnaya-karta'
}

export function GiftCardsMiniHeader({ locale, suffix = '' }: { locale: StoreLocale; suffix?: string }) {
  const base = giftCardsBase(locale)
  const label = locale === 'ro' ? 'Vizaje-Nica — pagina principală' : 'Vizaje-Nica — главная'

  return (
    <header className="flex h-[68px] items-center justify-between border-b border-black/10 bg-white px-5 sm:px-8 lg:px-12">
      <Link href={base} aria-label={label} className="inline-flex items-center">
        <Image
          src="/legacy-assets/app/img/next/header/logo_v.webp"
          alt="Vizaje-Nica"
          width={250}
          height={42}
          priority
          unoptimized
          className="h-[27px] w-[161px] object-contain object-left sm:h-[32px] sm:w-[190px]"
        />
      </Link>
      <nav aria-label={locale === 'ro' ? 'Limba paginii' : 'Язык страницы'} className="flex items-center gap-1 rounded-full border border-black/10 p-1 text-[11px] font-medium tracking-[0.08em]">
        <Link
          href={`/ru/podarochnaya-karta${suffix}`}
          aria-current={locale === 'ru' ? 'page' : undefined}
          className={`rounded-full px-3 py-2 transition-colors ${locale === 'ru' ? 'bg-black text-white' : 'text-black hover:bg-[#fafafa]'}`}
        >
          RU
        </Link>
        <Link
          href={`/ro/card-cadou${suffix}`}
          aria-current={locale === 'ro' ? 'page' : undefined}
          className={`rounded-full px-3 py-2 transition-colors ${locale === 'ro' ? 'bg-black text-white' : 'text-black hover:bg-[#fafafa]'}`}
        >
          RO
        </Link>
      </nav>
    </header>
  )
}

function ElectronicCardIllustration({ locale }: { locale: StoreLocale }) {
  return (
    <div aria-hidden="true" className="relative flex aspect-[1.45/1] w-full max-w-[420px] items-center justify-center">
      <div className="absolute left-[12%] top-[17%] h-[68%] w-[70%] -rotate-6 border border-black/10 bg-white transition-transform duration-500 group-hover:-rotate-3" />
      <div className="relative flex h-[68%] w-[70%] rotate-3 flex-col justify-between border border-black/15 bg-white p-5 shadow-[0_18px_48px_rgba(0,0,0,0.08)] transition-transform duration-500 group-hover:rotate-0 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tracking-[0.2em]">VIZAJE-NICA</span>
          <span className="grid size-8 place-items-center rounded-full border border-black/15 text-lg leading-none">+</span>
        </div>
        <div>
          <span className="block text-[9px] tracking-[0.18em] text-black/45">E-GIFT</span>
          <span className="mt-1 block text-[clamp(24px,4vw,40px)] font-medium tracking-[-0.06em]">{locale === 'ro' ? 'Pentru tine' : 'Для тебя'}</span>
        </div>
      </div>
    </div>
  )
}

export function GiftCardsPage({ locale = 'ru' }: { locale?: StoreLocale }) {
  const base = giftCardsBase(locale)
  const text = locale === 'ro'
    ? {
        title: 'Carduri cadou', electronic: 'Card electronic', electronicDescription: 'Un cadou digital, pregătit pentru a fi oferit.',
        plastic: 'Card cadou', plasticDescription: 'Un card fizic Vizaje-Nica, în format elegant.', choose: 'Alege', plasticAlt: 'Card cadou Vizaje-Nica de 200 MDL',
      }
    : {
        title: 'Подарочные сертификаты', electronic: 'Электронная карта', electronicDescription: 'Цифровой подарок, который удобно отправить близкому человеку.',
        plastic: 'Подарочная карта', plasticDescription: 'Физическая карта Vizaje-Nica в фирменном оформлении.', choose: 'Выбрать', plasticAlt: 'Подарочная карта Vizaje-Nica номиналом 200 MDL',
      }

  return (
    <main className="min-h-svh bg-white text-[#111]">
      <GiftCardsMiniHeader locale={locale} />
      <h1 className="sr-only">{text.title}</h1>
      <div className="grid min-h-[calc(100svh-68px)] grid-cols-1 md:grid-cols-2">
        <Link
          href={`${base}/electronic`}
          className="group flex min-h-[430px] flex-col px-6 py-8 transition-colors duration-300 hover:bg-[#fafafa] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-black sm:px-10 sm:py-10 md:min-h-[calc(100svh-68px)] md:px-12 md:py-12 lg:px-[8vw]"
        >
          <h2 className="text-[clamp(25px,3vw,42px)] font-medium leading-tight tracking-[-0.045em]">{text.electronic}</h2>
          <div className="flex flex-1 items-center justify-center py-7">
            <ElectronicCardIllustration locale={locale} />
          </div>
          <div className="flex items-end justify-between gap-5">
            <p className="max-w-[310px] text-sm leading-6 text-black/55">{text.electronicDescription}</p>
            <span className="shrink-0 border-b border-black pb-1 text-xs font-medium tracking-[0.08em]">{text.choose} <span aria-hidden="true">↗</span></span>
          </div>
        </Link>

        <Link
          href={`${base}/plastic`}
          className="group flex min-h-[430px] flex-col border-t border-black/10 px-6 py-8 transition-colors duration-300 hover:bg-[#fafafa] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-black sm:px-10 sm:py-10 md:min-h-[calc(100svh-68px)] md:border-l md:border-t-0 md:px-12 md:py-12 lg:px-[8vw]"
        >
          <h2 className="text-[clamp(25px,3vw,42px)] font-medium leading-tight tracking-[-0.045em]">{text.plastic}</h2>
          <div className="flex flex-1 items-center justify-center py-7">
            <div className="relative aspect-[1.43/1] w-full max-w-[520px] transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none">
              <Image src={certificateImage} alt={text.plasticAlt} fill sizes="(max-width: 767px) 88vw, 40vw" unoptimized className="object-contain" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-5">
            <p className="max-w-[310px] text-sm leading-6 text-black/55">{text.plasticDescription}</p>
            <span className="shrink-0 border-b border-black pb-1 text-xs font-medium tracking-[0.08em]">{text.choose} <span aria-hidden="true">↗</span></span>
          </div>
        </Link>
      </div>
    </main>
  )
}

