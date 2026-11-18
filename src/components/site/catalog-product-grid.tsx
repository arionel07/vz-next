import type { CatalogProduct } from '@/lib/catalog'
import type { CatalogView } from '@/lib/catalog-view'

import { ProductCard } from './product-card'

function gridClass(view: CatalogView) {
  if (view === 'featured') {
    return 'grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4 xl:gap-x-6 lg:[grid-auto-flow:dense]'
  }
  return 'grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 min-[1024px]:grid-cols-4 min-[1024px]:gap-x-2 min-[1024px]:gap-y-12'
}

export function CatalogProductGrid({ products, view }: { products: CatalogProduct[]; view: CatalogView }) {
  return (
    <div className={`${gridClass(view)} max-[767px]:-mx-5 max-[767px]:w-[calc(100%+40px)]`}>
      {products.map((product, index) => {
        const featured = view === 'featured' && index % 3 === 2
        return (
          <div className={featured ? 'col-span-2 lg:col-span-2 lg:row-span-2' : undefined} key={product.id}>
            <ProductCard product={product} featured={featured} catalog />
          </div>
        )
      })}
    </div>
  )
}
