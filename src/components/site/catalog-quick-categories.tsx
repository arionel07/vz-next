import type { StoreLocale } from '@/lib/locale-routing'
import { LocalizedLink as Link } from './localized-link'

export type CatalogQuickCategory = {
  id: number
  title: string | null
  uri?: string | null
  image?: string | null
  count?: number
}

type Props = {
  categories: CatalogQuickCategory[]
  locale: StoreLocale
  selectedIds?: Set<number>
  hrefForCategory: (category: CatalogQuickCategory) => string
  label?: string
}

export function CatalogQuickCategories({ categories, locale, selectedIds = new Set(), hrefForCategory, label }: Props) {
  if (!categories.length) return null

  const orderedCategories = categories
    .map((category, index) => ({ category, index }))
    .sort((left, right) => {
      const discountPattern = /скид|reduc|discount|sale/i
      const leftIsDiscount = discountPattern.test(`${left.category.title ?? ''} ${left.category.uri ?? ''}`)
      const rightIsDiscount = discountPattern.test(`${right.category.title ?? ''} ${right.category.uri ?? ''}`)
      return Number(rightIsDiscount) - Number(leftIsDiscount) || left.index - right.index
    })
    .map(({ category }) => category)

  return (
    <nav className="mb-7 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] sm:mb-8 sm:gap-3" aria-label={label ?? (locale === 'ro' ? 'Categorii rapide' : 'Быстрые категории')}>
      {orderedCategories.map((category) => {
        const selected = selectedIds.has(category.id)
        const title = category.title ?? (locale === 'ro' ? 'Categorie' : 'Категория')
        return (
          <Link
            key={category.id}
            aria-current={selected ? 'true' : undefined}
            className={`group inline-flex min-h-12 shrink-0 items-center rounded-full border border-[#000000] px-5 text-[15px] font-normal transition-colors ${selected ? 'bg-[#f7f7f7] text-[#141414]' : 'bg-white text-[#141414] hover:bg-[#f7f7f7] hover:text-[#141414]'}`}
            href={hrefForCategory(category)}
          >
            <span className="min-w-0 whitespace-nowrap">{title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
