import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'

import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import { getBlogPage } from '@/lib/blog'
import type { StoreLocale } from '@/lib/locale-routing'


function plainText(value: string | null) {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDate(value: string, locale: StoreLocale) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export async function BlogPage({ page, locale = 'ru' }: { page: number; locale?: StoreLocale }) {
  await connection()
  const result = await getBlogPage(page, locale)
  const text = locale === 'ro'
    ? { title: 'Blog', intro: 'Idei de frumusețe, produse preferate și noutăți din lumea Vizaje-Nica', article: 'ARTICOL', emptyTitle: 'Nu există articole publicate', empty: 'Pregătim materiale noi despre frumusețe și îngrijire.', pages: 'Pagini blog' }
    : { title: 'Блог', intro: 'Идеи для красоты, любимые средства и новости мира Vizaje-Nica', article: 'СТАТЬЯ', emptyTitle: 'Пока нет опубликованных статей', empty: 'Мы готовим новые материалы о красоте и уходе.', pages: 'Страницы блога' }
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))

  return (
    <main className="site-shell blog-index-page">
      <section className="blog-index" aria-labelledby="blog-title">
        <div className="blog-index-heading">
          <div>
            <p className="eyebrow">Vizaje-Nica</p>
            <h1 id="blog-title">{text.title} <span>/ {result.total}</span></h1>
          </div>
          <p>{text.intro}</p>
        </div>

        {result.articles.length ? (
          <div className="blog-index-grid">
            {result.articles.map((article, index) => {
              const image = legacyAssetIfExists(article.image, 'articles')
              const description = plainText(article.description)
              return (
                <article className="blog-index-item" key={article.id}>
                  <Link className="blog-index-card" href={`/ru/blog/${article.uri}`} aria-label={article.title ?? (locale === 'ro' ? 'Articol' : 'Статья')}>
                    <span className="blog-index-picture">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={article.title ?? (locale === 'ro' ? 'Articol' : 'Статья')} loading={index < 3 ? 'eager' : 'lazy'} />
                      ) : <span>Vizaje-Nica</span>}
                    </span>
                    <span className="blog-index-shade" aria-hidden="true" />
                    <time className="blog-index-date" dateTime={article.date}>{formatDate(article.date, locale)}</time>
                    <span className="blog-index-copy">
                      <span className="blog-index-kind">#{text.article}</span>
                      <strong>{article.title ?? (locale === 'ro' ? 'Articol Vizaje-Nica' : 'Статья Vizaje-Nica')}</strong>
                      {description ? <span className="blog-index-excerpt">{description}</span> : null}
                    </span>
                  </Link>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="blog-index-empty">
            <h2>{text.emptyTitle}</h2>
            <p>{text.empty}</p>
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="blog-pagination" aria-label={text.pages}>
            {page > 1 ? <Link href={`/ru/blog?page=${page - 1}`}>←</Link> : <span>←</span>}
            <strong>{page} / {totalPages}</strong>
            {page < totalPages ? <Link href={`/ru/blog?page=${page + 1}`}>→</Link> : <span>→</span>}
          </nav>
        ) : null}
      </section>
    </main>
  )
}
