import { LocalizedLink as Link } from '@/components/site/localized-link'

import type { ProductOffer } from '@/lib/offers'
import type { StoreLocale } from '@/lib/locale-routing'

export function ProductPromotion({ offer, locale = 'ru' }: { offer: ProductOffer; locale?: StoreLocale }) {
  const date = offer.dateTo && offer.dateTo !== '0000-00-00'
    ? new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU').format(new Date(`${offer.dateTo}T00:00:00`))
    : ''
  const href = offer.uri ? `/ru/aktsii/${encodeURIComponent(offer.uri)}` : '/ru/aktsii'
  const text = locale === 'ro'
    ? { offer: 'Promoție', gift: 'Cadou', giftCondition: `La cumpărarea a ${offer.conditionQty ?? 1} produse ale brandului`, remaining: `Au rămas: ${offer.remainingStock} buc.`, until: `Până la ${date}`, title: 'Ofertă specială', details: 'Vezi condițiile promoției' }
    : { offer: 'Акция', gift: 'Подарок', giftCondition: `От ${offer.conditionQty ?? 1} товаров бренда`, remaining: `Осталось: ${offer.remainingStock} шт.`, until: `До ${date}`, title: 'Специальное предложение', details: 'Узнать условия акции' }

  return (
    <section className="mb-6 max-w-[440px] border border-error/25 px-4 py-3.5" aria-label={text.offer}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-semibold tracking-[.14em] text-error uppercase">{offer.isGift ? text.gift : text.offer}</span>
        <small className="text-[11px] text-graphite">
          {offer.isGift ? text.giftCondition : offer.progressMode === 'stock' && offer.remainingStock > 0 ? text.remaining : date ? text.until : null}
        </small>
      </div>
      <Link className="mb-2 block text-sm leading-5 transition-colors hover:text-error" href={href}>
        {offer.title ?? text.title}
      </Link>
      <Link className="inline-flex items-center gap-1.5 border-b border-hover-cream pb-0.5 text-xs text-graphite transition-colors hover:text-error" href={href}>
        {text.details} <span aria-hidden="true">→</span>
      </Link>
    </section>
  )
}
