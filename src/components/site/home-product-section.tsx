import { LocalizedLink as Link } from '@/components/site/localized-link'

import type { CatalogProduct } from '@/lib/catalog'
import type { StoreLocale } from '@/lib/locale-routing'
import { ContentSlider } from './content-slider'
import { ProductCard } from './product-card'

export function HomeProductSection({ title, href, products, locale = 'ru' }: { title: string; href: string; products: CatalogProduct[]; locale?: StoreLocale }) {
  if (!products.length) return null
  const titleId = `home-${title.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section className="mx-auto w-[min(calc(100%-48px),1352px)] bg-white pt-9 pb-[76px] max-[767px]:w-full max-[767px]:pt-7 max-[767px]:pb-[50px]" aria-labelledby={titleId}>
      <ContentSlider
        label={title}
        variant="home"
        scrollStep="page"
        controlsClassName="gap-[25px]"
        arrowClassName="h-[15px] w-[25px]"
        headerClassName="max-[767px]:px-4"
        heading={<h2 className="m-0 text-[40px] leading-[1.1] font-medium tracking-[-.025em] text-midnight-ink max-[767px]:text-[28px]" id={titleId}>{title}</h2>}
        slideClassName="basis-[225px] md:basis-[calc(33.333%_-_12px)] lg:basis-[calc(25%_-_13.5px)]"
        pageClassName="relative grid min-w-full grid-cols-4 gap-[18px] md:mx-10"
        trackClassName="max-[767px]:px-4"
      >
        {products.map((product, index) => <ProductCard key={product.id} product={product} home firstHomeCard={index === 0} />)}
        <Link className="group flex aspect-square w-full flex-col items-center justify-center gap-3 text-center text-[13px] font-medium tracking-[.08em] text-midnight-ink uppercase transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-4" href={href}>
          <span>{locale === 'ro' ? 'Vezi produsele' : 'Перейти к товарам'}</span>
          <span className="text-2xl leading-none transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
        </Link>
      </ContentSlider>
    </section>
  )
}
