import { LocalizedLink as Link } from '@/components/site/localized-link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { getBlogArticle, getBlogProducts } from '@/lib/blog'
import { legacyAssetIfExists } from '@/lib/legacy-server-assets'
import type { StoreLocale } from '@/lib/locale-routing'

import { BlogArticleActions, BlogReadingProgress } from './blog-article-actions'
import { BlogArticleContent } from './blog-article-content'

function formatDate(value: string, locale: StoreLocale) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function getProductIds(value: string) {
  return [...value.matchAll(/\[\[ARTICLE_PRODUCT:(\d+)\]\]/g)].map((match) => Number(match[1]))
}

export async function BlogDetailPage({ uri, locale = 'ru' }: { uri: string; locale?: StoreLocale }) {
  await connection()
  const result = await getBlogArticle(uri, locale)
  if (!result) notFound()

  const { article, related } = result
  const articleImage = legacyAssetIfExists(article.image, 'articles')
  const embeddedProducts = await getBlogProducts(getProductIds(article.text), locale)
  const text = locale === 'ro'
    ? { home: 'Acasă', blog: 'Blog', article: 'ARTICOL', publication: 'VIZAJE-NICA · BLOG', more: 'Citește și' }
    : { home: 'Главная', blog: 'Блог', article: 'СТАТЬЯ', publication: 'VIZAJE-NICA · БЛОГ', more: 'Что ещё посмотреть' }
  const tags = article.tags.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean)

  return (
    <main className="site-shell blog-article-page">
      <BlogReadingProgress />
      <div className="product-breadcrumbs blog-breadcrumbs">
        <Link href="/ru">{text.home}</Link><span>/</span>
        <Link href="/ru/blog">{text.blog}</Link><span>/</span>
        <span>{article.title ?? (locale === 'ro' ? 'Articol' : 'Статья')}</span>
      </div>

      <section className="blog-article-hero" aria-labelledby="blog-article-title">
        <div className="blog-article-hero__image">
          {articleImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={articleImage} alt={article.title ?? (locale === 'ro' ? 'Articol' : 'Статья')} fetchPriority="high" />
          ) : <span>Vizaje-Nica</span>}
          <Link className="blog-article-hero__crumb" href="/ru/blog">← <span>{text.blog}</span></Link>
        </div>

        <header className="blog-article-hero__copy">
          <div className="blog-article-meta">
            <div className="blog-article-meta__labels">
              <time dateTime={article.date}>{formatDate(article.date, locale)}</time>
              {tags.map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
    <BlogArticleActions articleId={article.id} initialLikes={result.likes} locale={locale} />
          </div>
          <Link href="/ru/blog" className="blog-article-section-link">{text.publication}</Link>
          <h1 className="blog-article-hero__title" id="blog-article-title">{article.title ?? (locale === 'ro' ? 'Articol Vizaje-Nica' : 'Статья Vizaje-Nica')}</h1>
          {article.description ? <div className="blog-article-hero__lead" dangerouslySetInnerHTML={{ __html: article.description }} /> : null}
        </header>
      </section>

      <div className="blog-article-body">
        {article.text ? <BlogArticleContent html={article.text} products={embeddedProducts} /> : null}
        {related.length ? (
          <section className="blog-more-reading" aria-labelledby="blog-more-title">
            <h2 id="blog-more-title">{text.more}</h2>
            <div className="blog-more-reading__grid">
              {related.map((item) => {
                const image = legacyAssetIfExists(item.image, 'articles')
                return (
                  <Link className="blog-more-card" href={`/ru/blog/${item.uri}`} key={item.id}>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={item.title ?? (locale === 'ro' ? 'Articol' : 'Статья')} loading="lazy" />
                    ) : <span className="blog-more-card__placeholder">Vizaje-Nica</span>}
                    <span className="blog-more-card__copy">
                      <span>#{text.article}</span>
                      <strong>{item.title ?? (locale === 'ro' ? 'Articol Vizaje-Nica' : 'Статья Vizaje-Nica')}</strong>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}
