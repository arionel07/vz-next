import { and, asc, desc, eq, gt } from 'drizzle-orm'

import { db } from '@/db'
import { localizedPath, type StoreLocale } from '@/lib/locale-routing'
import { categories, menu, products, productsImg } from '../../drizzle/schema'

export type StoreNavigationLink = {
  label: string
  href: string
  activePaths?: string[]
}

export type StoreNavigation = {
  desktop: StoreNavigationLink[]
  mobile: StoreNavigationLink[]
}

type NavigationRow = {
  id: number
  title: string | null
  uri: string | null
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().normalize('NFKC')
}

function isCertificate(title: string, uri: string) {
  const value = `${title} ${uri}`.toLocaleLowerCase()
  return /сертифик|certificat|carduri cadou|card cadou|gift card/.test(value)
}

function isPromotion(title: string, uri: string) {
  return /акци|promo|promot|akts|promotii/i.test(`${title} ${uri}`)
}

function isBeautySelection(title: string, uri: string) {
  return uri === 'beauty-selections'
    || uri === 'byuti-podborki'
    || /бьюти-подбор|beauty selections|selecții de frumusețe|selectii de frumusete/i.test(title)
}

function directPageHref(row: NavigationRow, locale: StoreLocale) {
  const uri = (row.uri ?? '').trim().replace(/^\/+|\/+$/g, '')
  if (isCertificate(row.title ?? '', uri)) {
    return locale === 'ro' ? '/ro/card-cadou' : '/ru/podarochnaya-karta'
  }

  const localized = localizedPath(`/${locale}/${uri}`, locale)
  return localized === `/${locale}` && uri ? `/${locale}/${uri}` : localized
}

function categoryHref(uri: string, locale: StoreLocale) {
  const catalogPath = locale === 'ro' ? '/ro/catalog' : '/ru/katalog'
  return `${catalogPath}/${encodeURIComponent(uri.trim().replace(/^\/+|\/+$/g, ''))}`
}

/** Build the same ordered header destinations as the legacy storefront. */
export async function getStoreNavigation(locale: StoreLocale): Promise<StoreNavigation> {
  const isRomanian = locale === 'ro'

  try {
    const [categoryRows, menuRows, productCategoryRows] = await Promise.all([
      db
        .select({
          id: categories.id,
          parentId: categories.parentId,
          title: isRomanian ? categories.titleRo : categories.titleRu,
          uri: isRomanian ? categories.uriRo : categories.uriRu,
          order: categories.sorder,
        })
        .from(categories)
        .where(eq(categories.isShown, 1))
        .orderBy(asc(categories.sorder), desc(categories.id)),
      db
        .select({
          id: menu.id,
          title: isRomanian ? menu.titleRo : menu.titleRu,
          uri: isRomanian ? menu.uriRo : menu.uriRu,
          order: menu.sorder,
        })
        .from(menu)
        .where(and(eq(menu.isShown, 1), eq(menu.onTop, 1)))
        .orderBy(asc(menu.sorder), desc(menu.id)),
      db
        .selectDistinct({ categoryId: products.categoryId })
        .from(products)
        .innerJoin(productsImg, eq(productsImg.productId, products.id))
        .where(and(eq(products.isShown, 1), gt(products.price, 0))),
    ])

    const categoriesById = new Map(categoryRows.map((row) => [row.id, row]))
    const categoriesWithProducts = new Set<number>()

    // Legacy only includes catalog categories that contain a visible product
    // with a price and an image, then keeps their visible parent categories.
    for (const productCategory of productCategoryRows) {
      let categoryId = productCategory.categoryId
      const visited = new Set<number>()
      while (categoryId && !visited.has(categoryId)) {
        const category = categoriesById.get(categoryId)
        if (!category) break
        visited.add(categoryId)
        categoriesWithProducts.add(categoryId)
        categoryId = category.parentId
      }
    }

    const certificateMenuItem = menuRows.find((row) =>
      row.title && row.uri && isCertificate(row.title, row.uri),
    )
    const registeredUris = new Set<string>()
    const registeredTitles = new Set<string>()
    const mobile: StoreNavigationLink[] = []

    const append = (item: StoreNavigationLink, uri: string, title: string) => {
      const uriKey = normalize(uri.replace(/^\/+|\/+$/g, ''))
      const titleKey = normalize(title)
      if (!uriKey || !titleKey || registeredUris.has(uriKey) || registeredTitles.has(titleKey)) return false
      registeredUris.add(uriKey)
      registeredTitles.add(titleKey)
      mobile.push(item)
      return true
    }

    for (const category of categoryRows) {
      const title = category.title?.trim()
      const uri = category.uri?.trim()
      if (!title || !uri || category.parentId !== 0 || !categoriesWithProducts.has(category.id)) continue

      if (isCertificate(title, uri) && certificateMenuItem?.title && certificateMenuItem.uri) {
        append(
          { label: certificateMenuItem.title, href: directPageHref(certificateMenuItem, locale) },
          uri,
          title,
        )
        registeredUris.add(normalize(certificateMenuItem.uri))
        continue
      }

      append({ label: title, href: categoryHref(uri, locale) }, uri, title)
    }

    for (const item of menuRows) {
      const title = item.title?.trim()
      const uri = item.uri?.trim()
      if (!title || !uri) continue
      append(
        { label: title, href: directPageHref(item, locale) },
        uri,
        title,
      )
    }

    const beautyTitle = isRomanian ? 'Selecții de frumusețe' : 'Бьюти-подборки'
    append({ label: beautyTitle, href: `/${locale}/beauty-selections` }, 'beauty-selections', beautyTitle)

    const desktop = mobile.filter((item) => {
      const uri = item.href.split('/').filter(Boolean).at(-1) ?? ''
      return !isPromotion(item.label, uri) && !isBeautySelection(item.label, uri)
    })

    return { desktop, mobile }
  } catch {
    return { desktop: [], mobile: [] }
  }
}
