import type { CatalogProduct } from '@/lib/catalog'
import { ProductCard } from './product-card'

export function BlogArticleContent({ html, products }: { html: string; products: CatalogProduct[] }) {
  const productById = new Map(products.map((product) => [product.id, product]))
  const parts = html.split(/(\[\[ARTICLE_PRODUCT:\d+\]\])/g)

  return (
    <div className="blog-article-content">
      {parts.map((part, index) => {
        const match = part.match(/^\[\[ARTICLE_PRODUCT:(\d+)\]\]$/)
        if (match) {
          const product = productById.get(Number(match[1]))
          return product ? <div className="my-8 w-full max-w-[320px]" key={`product-${product.id}-${index}`}><ProductCard product={product} /></div> : null
        }

        return part.trim() ? (
          <div key={`html-${index}`} dangerouslySetInnerHTML={{ __html: part }} />
        ) : null
      })}
    </div>
  )
}
