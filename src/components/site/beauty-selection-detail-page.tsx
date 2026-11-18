import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'
import { notFound } from 'next/navigation'

import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import { getBeautySelectionPage } from '@/lib/beauty-selections'
import type { StoreLocale } from '@/lib/locale-routing'

import { ProductCard } from './product-card'

function plainText(value: string | null) {
  return (value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
}

export async function BeautySelectionDetailPage({ uri, locale = 'ru' }: { uri: string; locale?: StoreLocale }) {
  await connection()
  const result = await getBeautySelectionPage(uri, locale)
  if (!result) notFound()

  const { selection } = result
  const image = legacyAssetIfExists(selection.image, 'beauty_selections')
  const description = plainText(selection.description)
  const text = locale === 'ro'
    ? { home: 'Acasă', list: 'Selecții beauty', eyebrow: 'Selecție beauty', products: 'Produse din selecție', emptyTitle: 'Nu există produse momentan', empty: 'Nu sunt produse disponibile în această selecție.', breadcrumbs: 'Fir de navigare' }
    : { home: 'Главная', list: 'Бьюти-подборки', eyebrow: 'Бьюти-подборка', products: 'Товары из подборки', emptyTitle: 'Товаров пока нет', empty: 'В этой подборке пока нет доступных товаров.', breadcrumbs: 'Навигация' }

  return (
    <main className="mx-auto min-h-[900px] w-full max-w-[1920px] bg-white px-[5vw] pt-7 pb-32 text-[#111111] max-[900px]:px-4 max-[900px]:pt-5 max-[900px]:pb-20">
      <nav aria-label={text.breadcrumbs} className="mx-auto mb-12 flex w-full max-w-[1600px] flex-wrap items-center gap-2 text-[12px] leading-5 text-[#707070] max-[900px]:mb-8">
        <Link className="transition-colors hover:text-[#ab8a73]" href="/ru">{text.home}</Link><span aria-hidden="true">/</span>
        <Link className="transition-colors hover:text-[#ab8a73]" href="/ru/beauty-selections">{text.list}</Link><span aria-hidden="true">/</span>
        <span aria-current="page" className="text-[#111111]">{selection.title}</span>
      </nav>

      <article className="mx-auto w-full max-w-[1600px]">
        <header className="mx-auto mb-10 max-w-[980px] text-center max-[700px]:mb-7 max-[700px]:text-left">
          <p className="mb-4 text-[10px] font-semibold tracking-[0.18em] text-[#707070] uppercase">{text.eyebrow}</p>
          <h1 className="m-0 text-[clamp(36px,5vw,68px)] leading-[0.98] font-medium tracking-[-0.065em] text-[#111111]">{selection.title}</h1>
          {description ? <p className="mx-auto mt-5 max-w-[760px] text-[16px] leading-[1.65] text-[#555555] max-[700px]:text-[15px]">{description}</p> : null}
        </header>

        {image ? (
          <figure className="mx-auto mb-0 aspect-[1.79/1] max-h-[720px] w-full max-w-[1440px] overflow-hidden bg-[#f2f2f2] max-[700px]:aspect-[1.32/1]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={selection.title} className="size-full object-cover" decoding="async" fetchPriority="high" src={image} />
          </figure>
        ) : null}

        {selection.text ? (
          <div className="mx-auto mt-14 mb-16 max-w-[820px] text-[16px] leading-[1.8] text-[#292929] max-[700px]:mt-9 max-[700px]:mb-12 max-[700px]:text-[15px] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-[#ab8a73] [&_blockquote]:my-8 [&_blockquote]:border-l-2 [&_blockquote]:border-[#ab8a73] [&_blockquote]:pl-5 [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-[30px] [&_h2]:leading-tight [&_h2]:font-medium [&_h2]:tracking-[-0.04em] [&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-[23px] [&_h3]:font-medium [&_img]:mx-auto [&_img]:my-9 [&_img]:h-auto [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: selection.text }} />
        ) : null}

        {result.products.length ? (
          <section aria-labelledby="beauty-selection-products-title" className="mt-16 border-t border-[#dedede] pt-12 max-[700px]:mt-12 max-[700px]:pt-9">
            <h2 className="mb-9 text-[clamp(28px,3vw,46px)] leading-none font-medium tracking-[-0.06em] max-[700px]:mb-6">{text.products}</h2>
            <div aria-label={selection.title} className="mx-auto grid w-full grid-cols-2 gap-x-[18px] gap-y-[26px] min-[901px]:grid-cols-4 max-[560px]:gap-x-3 max-[560px]:gap-y-8">
              {result.products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        ) : (
          <div className="mt-14 border-t border-[#dedede] py-12 text-center max-[700px]:mt-10">
            <h2 className="mb-3 text-[24px] font-medium text-[#111111]">{text.emptyTitle}</h2>
            <p className="m-0 text-[14px] leading-6 text-[#707070]">{text.empty}</p>
          </div>
        )}
      </article>
    </main>
  )
}
