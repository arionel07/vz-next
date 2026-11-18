import { LocalizedLink as Link } from '@/components/site/localized-link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import { getOfferPage } from '@/lib/offers'
import type { StoreLocale } from '@/lib/locale-routing'

import { ProductCard } from './product-card'

function formatDate(value: string | null, locale: StoreLocale) {
  if (!value || value === '0000-00-00') return ''
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export async function OfferDetailPage({ uri, page, locale = 'ru' }: { uri: string; page: number; locale?: StoreLocale }) {
  await connection()
  const result = await getOfferPage(uri, page, locale)
  if (!result) notFound()

  const { offer } = result
  const offerFallback = locale === 'ro' ? 'Promoție Vizaje-Nica' : 'Акция Vizaje-Nica'
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const offerUri = encodeURIComponent(offer.uri?.trim() || String(offer.id))
  const offersPath = locale === 'ro' ? '/ro/promotii' : '/ru/aktsii'
  const offerUrl = (nextPage: number) =>
    `${offersPath}/${offerUri}${nextPage > 1 ? `?page=${nextPage}` : ''}`
  const text = locale === 'ro'
    ? { home: 'Acasă', offers: 'Promoții', promo: 'Oferta magazinului', from: 'De la', until: 'Până la', place: 'Locație', channel: 'Disponibilitate', online: 'Online', offline: 'Offline', both: 'Online și offline', products: 'Produse incluse în promoție', productsTitle: 'Produsele promoției', pages: 'Pagini de produse', previous: 'Înapoi', next: 'Înainte', emptyTitle: 'Produsele nu sunt disponibile', empty: 'Produsele promoției vor fi afișate aici.' }
    : { home: 'Главная', offers: 'Акции', promo: 'Предложение магазина', from: 'С', until: 'До', place: 'Место', channel: 'Доступность', online: 'Онлайн', offline: 'Офлайн', both: 'Онлайн и офлайн', products: 'Товары, участвующие в акции', productsTitle: 'Товары акции', pages: 'Страницы товаров акции', previous: 'Назад', next: 'Дальше', emptyTitle: 'Товары не найдены', empty: 'Товары акции появятся здесь.' }
  const desktopImage = legacyAssetIfExists(offer.desktopImage, 'offers') ?? legacyAssetIfExists(offer.mobileImage, 'offers')
  const mobileImage = legacyAssetIfExists(offer.mobileImage, 'offers') ?? desktopImage
  const title = offer.title ?? offerFallback
  const dateFrom = formatDate(offer.dateFrom, locale)
  const dateTo = formatDate(offer.dateTo, locale)
  const channel = offer.isOnline === 0 ? text.offline : offer.isOnline === 2 ? text.both : text.online

  return (
    <main className="min-h-screen bg-white pb-24 text-[#111111]">
      <nav aria-label={locale === 'ro' ? 'Fir de navigare' : 'Навигация'} className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-2 px-[5vw] pt-7 text-[12px] leading-5 text-[#707070] max-[900px]:px-4 max-[900px]:pt-5">
        <Link className="transition-colors hover:text-[#ab8a73]" href={`/${locale}`}>{text.home}</Link>
        <span aria-hidden="true">/</span>
        <Link className="transition-colors hover:text-[#ab8a73]" href={offersPath}>{text.offers}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#111111]" aria-current="page">{title}</span>
      </nav>

      <article className="mx-auto w-full max-w-[1600px] px-[5vw] pt-7 max-[900px]:px-4 max-[900px]:pt-5">
        <header className="mx-auto mb-9 max-w-[980px] text-center max-[700px]:mb-6 max-[700px]:text-left">
          <p className="mb-4 text-[10px] font-semibold tracking-[0.18em] text-[#707070] uppercase">{text.promo}</p>
          <h1 className="m-0 text-[clamp(36px,5vw,68px)] leading-[0.98] font-medium tracking-[-0.065em] text-[#111111]">{title}</h1>
        </header>

        {desktopImage ? (
          <div className="relative aspect-[1920/720] w-full overflow-hidden bg-[#f2f2f2] max-[700px]:aspect-[1.32/1]">
            <picture className="absolute inset-0 block size-full">
              {mobileImage ? <source media="(max-width: 700px)" srcSet={mobileImage} /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={title} className="size-full object-cover" decoding="async" fetchPriority="high" src={desktopImage} />
            </picture>
          </div>
        ) : null}

        <div className="mx-auto mt-12 grid max-w-[1120px] grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)] gap-16 max-[900px]:mt-8 max-[900px]:grid-cols-1 max-[900px]:gap-7">
          <dl className="m-0 border-t border-[#dedede]">
            {dateFrom ? <div className="flex flex-col gap-2 border-b border-[#dedede] py-5"><dt className="text-[11px] tracking-[0.1em] text-[#707070] uppercase">{text.from}</dt><dd className="m-0 text-[16px] font-medium">{dateFrom}</dd></div> : null}
            {dateTo ? <div className="flex flex-col gap-2 border-b border-[#dedede] py-5"><dt className="text-[11px] tracking-[0.1em] text-[#707070] uppercase">{text.until}</dt><dd className="m-0 text-[16px] font-medium">{dateTo}</dd></div> : null}
            {offer.location ? <div className="flex flex-col gap-2 border-b border-[#dedede] py-5"><dt className="text-[11px] tracking-[0.1em] text-[#707070] uppercase">{text.place}</dt><dd className="m-0 text-[16px] font-medium">{offer.location}</dd></div> : null}
            <div className="flex flex-col gap-2 border-b border-[#dedede] py-5"><dt className="text-[11px] tracking-[0.1em] text-[#707070] uppercase">{text.channel}</dt><dd className="m-0 text-[16px] font-medium">{channel}</dd></div>
          </dl>
          {offer.description ? (
            <div className="text-[15px] leading-[1.75] text-[#4b4b4b] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-[#ab8a73] [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-[24px] [&_h2]:leading-tight [&_h2]:font-medium [&_h2]:tracking-[-0.035em] [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:text-[19px] [&_h3]:font-medium [&_li]:my-1 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: offer.description }} />
          ) : null}
        </div>
      </article>

      <section aria-labelledby="offer-products-title" className="mt-20 border-t border-[#dedede] px-[5vw] pt-16 max-[900px]:mt-14 max-[900px]:px-4 max-[900px]:pt-10">
        <div className="mx-auto mb-9 flex w-full max-w-[1600px] items-end justify-between gap-5 max-[700px]:items-start">
          <div>
            <p className="mb-3 text-[10px] font-semibold tracking-[0.17em] text-[#707070] uppercase">{text.products}</p>
            <h2 className="m-0 text-[clamp(28px,3vw,42px)] leading-[1.05] font-medium tracking-[-0.05em]" id="offer-products-title">{text.productsTitle}</h2>
          </div>
          <span className="pb-1 text-[13px] text-[#707070]">{result.total}</span>
        </div>

        {result.products.length ? (
          <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-x-[18px] gap-y-[26px] min-[901px]:grid-cols-4 max-[560px]:gap-x-3 max-[560px]:gap-y-8">
            {result.products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[1600px] border-t border-[#dedede] py-16">
            <h3 className="mb-3 text-[22px] font-medium">{text.emptyTitle}</h3>
            <p className="m-0 text-[14px] leading-6 text-[#707070]">{text.empty}</p>
          </div>
        )}

        {totalPages > 1 ? (
          <nav aria-label={text.pages} className="mx-auto mt-14 flex w-full max-w-[1600px] items-center justify-center gap-7 text-[13px]">
            {page > 1 ? <Link className="border-b border-[#ab8a73] pb-1 transition-colors hover:text-[#ab8a73]" href={offerUrl(page - 1)}>{text.previous}</Link> : <span className="text-[#adadad]" aria-disabled="true">{text.previous}</span>}
            <strong className="font-normal">{page} / {totalPages}</strong>
            {page < totalPages ? <Link className="border-b border-[#ab8a73] pb-1 transition-colors hover:text-[#ab8a73]" href={offerUrl(page + 1)}>{text.next}</Link> : <span className="text-[#adadad]" aria-disabled="true">{text.next}</span>}
          </nav>
        ) : null}
      </section>
    </main>
  )
}
