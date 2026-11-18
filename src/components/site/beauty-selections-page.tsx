import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'

import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import { getBeautySelectionsPage } from '@/lib/beauty-selections'
import type { StoreLocale } from '@/lib/locale-routing'

export async function BeautySelectionsPage({ locale = 'ru' }: { locale?: StoreLocale }) {
  await connection()
  const selections = await getBeautySelectionsPage(locale)
  const text = locale === 'ro'
    ? { title: 'Selecții beauty', emptyTitle: 'Nu există selecții momentan', empty: 'Pregătim idei noi pentru frumusețe și îngrijire.' }
    : { title: 'Бьюти-подборки', emptyTitle: 'Подборок пока нет', empty: 'Мы готовим новые идеи для красоты и ухода.' }

  return (
    <main aria-labelledby="beauty-selections-title" className="mx-auto min-h-[900px] w-full max-w-[1920px] bg-white px-[5vw] pt-20 pb-32 text-[#111111] max-[900px]:px-4 max-[900px]:pt-14 max-[900px]:pb-20">
      <header className="mb-[60px] text-center max-[900px]:mb-10 max-[900px]:text-left">
        <h1 className="m-0 text-[clamp(62px,6vw,102px)] leading-[0.95] font-medium tracking-[-0.08em] text-[#111111] max-[900px]:text-[56px]">
          <span id="beauty-selections-title">{text.title}</span>{' '}
          <span aria-label={`${selections.length} ${locale === 'ro' ? 'selecții' : 'подборок'}`} className="align-[0.18em] text-[0.5em] tracking-[-0.05em] text-[#707070]">/ {selections.length}</span>
        </h1>
      </header>

      {selections.length ? (
        <div className="grid grid-cols-2 gap-x-[5.4vw] gap-y-[75px] max-[900px]:grid-cols-1 max-[900px]:gap-y-[55px]">
          {selections.map((selection, index) => {
            const slug = encodeURIComponent(selection.uri?.trim() || String(selection.id))
            const href = `/ru/beauty-selections/${slug}`
            const image = legacyAssetIfExists(selection.image, 'beauty_selections')

            return (
              <article className="group min-w-0" key={selection.id}>
                <Link aria-label={selection.title} className="relative mb-0 block aspect-[1.79/1] overflow-hidden bg-[#f2f2f2] max-[900px]:aspect-[1.32/1]" href={href}>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={selection.title} className="size-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.025]" loading={index < 2 ? 'eager' : 'lazy'} src={image} />
                  ) : <span className="absolute inset-0 grid place-items-center text-[20px] text-[#707070]">Vizaje-Nica</span>}
                </Link>
                <div className="relative z-[1] -mt-1 max-w-[90%] bg-white pl-11 max-[900px]:max-w-full max-[900px]:pl-0">
                  <h2 className="m-0 text-[clamp(32px,3.2vw,57px)] leading-[0.98] font-semibold tracking-[-0.07em] text-[#111111] max-[900px]:text-[34px]">
                    <Link className="transition-colors hover:text-[#ab8a73]" href={href}>{selection.title}</Link>
                  </h2>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="border-t border-[#dedede] py-[70px] text-center max-[900px]:py-12">
          <h2 className="mb-3 text-[24px] font-medium text-[#111111]">{text.emptyTitle}</h2>
          <p className="m-0 text-[14px] leading-6 text-[#707070]">{text.empty}</p>
        </div>
      )}
    </main>
  )
}
