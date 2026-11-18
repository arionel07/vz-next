import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'

import { getNewsPage } from '@/lib/news'
import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import type { StoreLocale } from '@/lib/locale-routing'

function formatDate(value: string, locale: StoreLocale) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export async function NewsPage({ page, locale = 'ru' }: { page: number; locale?: StoreLocale }) {
  await connection()
  const result = await getNewsPage(page, locale)
  const text = locale === 'ro'
    ? { title: 'Noutăți', emptyTitle: 'Nu există noutăți publicate', empty: 'Pregătim noutăți despre Vizaje-Nica.', pages: 'Pagini de noutăți' }
    : { title: 'Новости', emptyTitle: 'Пока нет опубликованных новостей', empty: 'Мы готовим новые материалы о Vizaje-Nica.', pages: 'Страницы новостей' }
  const pageTitle = result.title || text.title
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))

  return (
    <main aria-labelledby="news-title" className="mx-auto min-h-screen w-full max-w-[1920px] bg-white px-[5vw] pt-20 pb-32 text-[#111111] max-[900px]:px-4 max-[900px]:pt-14 max-[900px]:pb-20">
      <header className="mx-auto mb-[60px] w-full max-w-[1600px] text-center max-[900px]:mb-10 max-[900px]:text-left">
        <h1 className="m-0 w-full max-w-none text-[clamp(62px,6vw,102px)] leading-[0.95] font-medium tracking-[-0.08em] text-[#111111] max-[900px]:text-[56px]">
          <span id="news-title">{pageTitle}</span>{' '}
          <span aria-label={`${result.total} ${locale === 'ro' ? 'noutăți' : 'новостей'}`} className="align-[0.18em] text-[0.5em] tracking-[-0.05em] text-[#707070]">/ {result.total}</span>
        </h1>
      </header>

      {result.articles.length ? (
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-2 gap-x-[5.4vw] gap-y-[75px] max-[900px]:grid-cols-1 max-[900px]:gap-y-[55px]">
          {result.articles.map((article, index) => {
            const image = legacyAssetIfExists(article.image, 'articles')
            const slug = encodeURIComponent(article.uri?.trim() || String(article.id))
            const href = `/ru/novosti/${slug}`
            const title = article.title ?? (locale === 'ro' ? 'Noutăți Vizaje-Nica' : 'Новости Vizaje-Nica')

            return (
              <article className="group min-w-0" key={article.id}>
                <Link aria-label={title} className="relative mb-0 block aspect-[1.79/1] overflow-hidden bg-[#f2f2f2] max-[900px]:aspect-[1.32/1]" href={href}>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={title} className="size-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.025]" loading={index < 2 ? 'eager' : 'lazy'} src={image} />
                  ) : <span className="absolute inset-0 grid place-items-center text-[20px] text-[#707070]">Vizaje-Nica</span>}
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                  <time className="absolute right-[4%] bottom-5 text-[clamp(14px,1.1vw,18px)] font-medium text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.5)] max-[900px]:bottom-4 max-[900px]:text-[14px]" dateTime={article.date}>{formatDate(article.date, locale)}</time>
                </Link>
                <div className="relative z-[1] -mt-1 max-w-[90%] bg-white pl-11 pr-4 pt-1 max-[900px]:max-w-full max-[900px]:pl-0 max-[900px]:pr-0">
                  <h2 className="m-0 line-clamp-2 max-w-none text-[clamp(32px,3.2vw,57px)] leading-[0.98] font-semibold tracking-[-0.07em] text-[#111111] max-[900px]:text-[34px]">
                    <Link className="transition-colors duration-200 hover:text-[#ab8a73]" href={href}>{title}</Link>
                  </h2>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1600px] border-y border-[#dedede] py-[70px] text-center max-[900px]:py-12">
          <span aria-hidden="true" className="mx-auto mb-6 block h-px w-12 bg-[#cdbbb0]" />
          <h2 className="mb-3 max-w-none text-[clamp(24px,3vw,38px)] font-medium tracking-[-0.04em] text-[#111111]">{text.emptyTitle}</h2>
          <p className="m-0 text-[14px] leading-6 text-[#707070]">{text.empty}</p>
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label={text.pages} className="mx-auto mt-16 flex w-full max-w-[1600px] items-center justify-center gap-4 border-t border-[#dedede] pt-8 max-[900px]:mt-12">
          {page > 1 ? <Link aria-label={locale === 'ro' ? 'Pagina anterioară' : 'Предыдущая страница'} className="grid size-11 place-items-center rounded-full border border-[#dedede] transition-colors hover:border-[#ab8a73] hover:text-[#ab8a73]" href={`${locale === 'ro' ? '/ro/noutati' : '/ru/novosti'}?page=${page - 1}`}>←</Link> : <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border border-[#ededed] text-[#b3b3b3]">←</span>}
          <strong className="px-2 text-[13px] font-medium tabular-nums">{page} / {totalPages}</strong>
          {page < totalPages ? <Link aria-label={locale === 'ro' ? 'Pagina următoare' : 'Следующая страница'} className="grid size-11 place-items-center rounded-full border border-[#dedede] transition-colors hover:border-[#ab8a73] hover:text-[#ab8a73]" href={`${locale === 'ro' ? '/ro/noutati' : '/ru/novosti'}?page=${page + 1}`}>→</Link> : <span aria-hidden="true" className="grid size-11 place-items-center rounded-full border border-[#ededed] text-[#b3b3b3]">→</span>}
        </nav>
      ) : null}
    </main>
  )
}
