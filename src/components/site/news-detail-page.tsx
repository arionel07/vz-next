import { LocalizedLink as Link } from '@/components/site/localized-link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { getNewsArticle } from '@/lib/news'
import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import type { StoreLocale } from '@/lib/locale-routing'

function formatDate(value: string, locale: StoreLocale) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export async function NewsDetailPage({ uri, locale = 'ru' }: { uri: string; locale?: StoreLocale }) {
  await connection()
  const result = await getNewsArticle(uri, locale)
  if (!result) notFound()

  const { article } = result
  const image = legacyAssetIfExists(article.image, 'articles')
  const title = article.title ?? (locale === 'ro' ? 'Noutăți Vizaje-Nica' : 'Новости Vizaje-Nica')
  const text = locale === 'ro'
    ? { home: 'Acasă', news: 'Noutăți', breadcrumbs: 'Fir de navigare', back: '← Înapoi la noutăți', article: 'Noutăți Vizaje-Nica' }
    : { home: 'Главная', news: 'Новости', breadcrumbs: 'Хлебные крошки', back: '← Вернуться к новостям', article: 'Новости Vizaje-Nica' }
  const homePath = `/${locale}`
  const newsPath = locale === 'ro' ? '/ro/noutati' : '/ru/novosti'

  return (
    <main className="min-h-screen w-full bg-white pb-32 text-[#111111] max-[900px]:pb-20">
      <nav aria-label={text.breadcrumbs} className="mx-auto mb-12 flex w-full max-w-[1600px] flex-wrap items-center gap-2 px-[5vw] pt-7 text-[12px] leading-5 text-[#707070] max-[900px]:mb-8 max-[900px]:px-4 max-[900px]:pt-5">
        <Link className="transition-colors hover:text-[#ab8a73]" href={homePath}>{text.home}</Link><span aria-hidden="true">/</span>
        <Link className="transition-colors hover:text-[#ab8a73]" href={newsPath}>{text.news}</Link><span aria-hidden="true">/</span>
        <span aria-current="page" className="text-[#111111]">{title}</span>
      </nav>

      <article className="mx-auto w-full max-w-[1600px] px-[5vw] max-[900px]:px-4">
        <header className="mx-auto mb-10 w-full max-w-[1180px] border-b border-[#dedede] pb-9 max-[700px]:mb-7 max-[700px]:pb-6">
          <div className="mb-5 flex items-center gap-4 text-[10px] font-semibold tracking-[0.18em] text-[#707070] uppercase">
            <span>{text.article}</span>
            <span aria-hidden="true" className="h-px w-10 bg-[#cdbbb0]" />
            <time className="tracking-normal" dateTime={article.date}>{formatDate(article.date, locale)}</time>
          </div>
          <h1 className="m-0 max-w-[1120px] text-[clamp(38px,5.3vw,76px)] leading-[0.96] font-medium tracking-[-0.067em] text-[#111111] max-[700px]:text-[38px]">{title}</h1>
          {article.description ? <div className="mt-6 max-w-[800px] text-[16px] leading-[1.65] text-[#555555] max-[700px]:mt-4 max-[700px]:text-[15px] [&_p]:my-2" dangerouslySetInnerHTML={{ __html: article.description }} /> : null}
        </header>

        {image ? (
          <figure className="mx-auto mb-0 aspect-[1.79/1] max-h-[760px] w-full max-w-[1440px] overflow-hidden bg-[#f2f2f2] max-[700px]:aspect-[1.32/1]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={title} className="size-full object-cover" decoding="async" fetchPriority="high" src={image} />
          </figure>
        ) : null}

        {article.text ? (
          <div className="mx-auto mt-14 max-w-[820px] text-[16px] leading-[1.8] text-[#292929] max-[700px]:mt-9 max-[700px]:text-[15px] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-[#ab8a73] [&_blockquote]:my-8 [&_blockquote]:border-l-2 [&_blockquote]:border-[#cdbbb0] [&_blockquote]:pl-5 [&_h1]:mt-12 [&_h1]:mb-5 [&_h1]:max-w-none [&_h1]:text-[36px] [&_h1]:leading-tight [&_h1]:font-medium [&_h1]:tracking-[-0.045em] [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:max-w-none [&_h2]:text-[30px] [&_h2]:leading-tight [&_h2]:font-medium [&_h2]:tracking-[-0.04em] [&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-[23px] [&_h3]:font-medium [&_h4]:mt-7 [&_h4]:mb-3 [&_h4]:text-[18px] [&_h4]:font-medium [&_hr]:my-9 [&_hr]:border-[#dedede] [&_img]:mx-auto [&_img]:my-9 [&_img]:h-auto [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-5 [&_table]:my-8 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#dedede] [&_td]:p-3 [&_th]:border [&_th]:border-[#dedede] [&_th]:bg-[#f2f2f2] [&_th]:p-3 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: article.text }} />
        ) : null}

        <footer className="mx-auto mt-14 max-w-[820px] border-t border-[#dedede] pt-6">
          <Link className="inline-flex min-h-11 items-center rounded-full border border-[#111111] px-5 text-[11px] font-semibold tracking-[0.1em] uppercase transition-colors hover:border-[#ab8a73] hover:text-[#ab8a73]" href={newsPath}>{text.back}</Link>
        </footer>
      </article>
    </main>
  )
}
