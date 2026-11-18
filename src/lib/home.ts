import { access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { and, asc, desc, eq, exists, gt, inArray, lte, ne, or } from 'drizzle-orm'

import { db } from '@/db'
import { articles, brands, categories, homeBrandSectionProducts, homeBrandSections, homeCategories, homeProductItems, menu, products, productsImg, productsVariable, productsVariableImg, sliders } from '../../drizzle/schema'
import { fetchProducts, type CatalogProduct } from './catalog'
import { enrichCatalogProducts } from './catalog-card-data'
import { localizedPath, type StoreLocale } from './locale-routing'

export type HomeSlide = {
  id: number
  image: string
  mobileImage: string | null
  uri: string
  title: string
  youtube: string | null
}

export type HomeCategory = { id: number; title: string; image: string | null; url: string }
export type HomeArticle = { id: number; title: string; uri: string; description: string; image: string | null; date: string }
export type HomeBrandSection = { id: number; title: string; url: string; image: string | null; mobileImage: string | null; placement: 'after_new' | 'after_sale'; products: CatalogProduct[] }

function menuUrl(value: string | null | undefined, fallback: string, locale: StoreLocale) {
  const url = localUrl(value, locale)
  if (url === '#') return fallback
  if (url.startsWith('/')) return url
  return `/${locale}/${url}`
}

function articleExcerpt(value: string | null | undefined) {
  const text = (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 180 ? `${text.slice(0, 177).replace(/\s+\S*$/, '')}…` : text
}

function localUrl(value: string | null | undefined, locale: StoreLocale) {
  const uri = (value ?? '').trim()
  if (!uri) return '#'
  const localPath = uri.replace(/^https?:\/\/(?:www\.)?vizaje-nica\.(?:com|local)/i, '')
  if (/^https?:\/\//i.test(localPath)) return localPath
  if (localPath.startsWith('/')) return localizedPath(localPath, locale)
  return `/${locale}/${localPath.replace(/^(?:ru|ro)\//i, '')}`
}

async function legacyAssetExists(directory: string, fileName: string | null | undefined) {
  if (!fileName) return false
  const roots = process.env.LEGACY_ASSET_ROOT
    ? [resolve(process.env.LEGACY_ASSET_ROOT)]
    : [resolve(process.cwd(), '..', '..', 'public'), resolve(process.cwd(), 'public')]

  for (const root of roots) {
    try {
      await access(join(root, directory, fileName))
      return true
    } catch {
      // Try the next known workspace layout.
    }
  }

  return false
}

async function getProductsByIds(ids: number[], locale: StoreLocale) {
  const uniqueIds = [...new Set(ids.filter((id) => id > 0))]
  if (!uniqueIds.length) return new Map<number, CatalogProduct>()

  const rows = await db
    .select({ id: products.id, title: locale === 'ro' ? products.titleRo : products.titleRu, price: products.price, discountPrice: products.discountPrice, brand: brands.title, category: locale === 'ro' ? categories.titleRo : categories.titleRu, sku: products.sku })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(
      eq(products.isShown, 1),
      or(
        gt(products.price, 0),
        gt(products.discountPrice, 0),
        inArray(products.id, db.select({ productId: productsVariable.productId }).from(productsVariable).where(and(
          eq(productsVariable.isShown, 1), gt(productsVariable.price, 0), gt(productsVariable.qty, 0),
        ))),
      )!,
      inArray(products.id, uniqueIds),
      or(
        exists(db.select({ id: productsImg.id }).from(productsImg).where(and(
          eq(productsImg.productId, products.id), eq(productsImg.isShown, 1), ne(productsImg.img, ''),
        ))),
        exists(db.select({ id: productsVariableImg.id }).from(productsVariableImg).where(and(
          eq(productsVariableImg.productId, products.id), eq(productsVariableImg.isShown, 1), ne(productsVariableImg.img, ''),
        ))),
      )!,
    ))

  const productsWithImages = rows.map((row) => ({ ...row, image: null, locale } satisfies CatalogProduct))
  const enrichedProducts = await enrichCatalogProducts(productsWithImages)
  return new Map(enrichedProducts.map((product) => [product.id, product]))
}

export async function getHomeData(locale: StoreLocale = 'ru') {
  const today = new Date().toISOString().slice(0, 10)
  const isRomanian = locale === 'ro'
  const [slideRows, categoryRows, itemRows, sectionRows, sectionProductRows, articleRows, menuRows] = await Promise.all([
    db.select({ id: sliders.id, image: sliders.img, mobileImage: sliders.imgMob, uri: isRomanian ? sliders.uriRo : sliders.uriRu, title: isRomanian ? sliders.titleRo : sliders.titleRu, youtube: sliders.youtube }).from(sliders).where(eq(sliders.isShown, 1)).orderBy(asc(sliders.sorder), desc(sliders.id)),
    db.select({ id: homeCategories.id, title: isRomanian ? homeCategories.titleRo : homeCategories.titleRu, image: homeCategories.img, url: isRomanian ? homeCategories.urlRo : homeCategories.urlRu }).from(homeCategories).where(eq(homeCategories.isShown, 1)).orderBy(asc(homeCategories.sorder), asc(homeCategories.id)).limit(30),
    db.select({ sectionKey: homeProductItems.sectionKey, productId: homeProductItems.productId }).from(homeProductItems).where(eq(homeProductItems.isShown, 1)).orderBy(asc(homeProductItems.sectionKey), asc(homeProductItems.sorder), asc(homeProductItems.id)),
    db.select({ id: homeBrandSections.id, title: isRomanian ? homeBrandSections.titleRo : homeBrandSections.titleRu, url: isRomanian ? homeBrandSections.urlRo : homeBrandSections.urlRu, image: homeBrandSections.img, mobileImage: homeBrandSections.imgMob, placement: homeBrandSections.placement }).from(homeBrandSections).where(eq(homeBrandSections.isShown, 1)).orderBy(asc(homeBrandSections.sorder), asc(homeBrandSections.id)),
    db.select({ sectionId: homeBrandSectionProducts.sectionId, productId: homeBrandSectionProducts.productId }).from(homeBrandSectionProducts).where(eq(homeBrandSectionProducts.isShown, 1)).orderBy(asc(homeBrandSectionProducts.sorder), asc(homeBrandSectionProducts.id)),
    db.select({ id: articles.id, title: isRomanian ? articles.titleRo : articles.titleRu, uri: isRomanian ? articles.uriRo : articles.uriRu, description: isRomanian ? articles.descRo : articles.descRu, image: articles.img, date: articles.date }).from(articles).where(and(eq(articles.isShown, 1), eq(articles.isBlog, 1), lte(articles.date, today))).orderBy(desc(articles.date), desc(articles.id)).limit(5),
    db.select({ id: menu.id, title: isRomanian ? menu.titleRo : menu.titleRu }).from(menu).where(inArray(menu.id, [7, 34, 35, 36])),
  ])

  const [availableSlides, availableCategories] = await Promise.all([
    Promise.all(slideRows.map(async (slide) => ({ slide, available: await legacyAssetExists('sliders', slide.image) }))),
    Promise.all(categoryRows.map(async (category) => ({ category, available: await legacyAssetExists('home_categories', category.image) }))),
  ])

  const productMap = await getProductsByIds([...itemRows.map((item) => item.productId), ...sectionProductRows.map((item) => item.productId)], locale)
  const sections = sectionRows.map((section) => ({
    ...section,
    title: section.title ?? 'Подборка бренда',
    url: localUrl(section.url, locale),
    products: sectionProductRows.filter((item) => item.sectionId === section.id).map((item) => productMap.get(item.productId)).filter((product): product is CatalogProduct => Boolean(product)),
  })).filter((section) => section.products.length)

  const groupedProducts = new Map<string, CatalogProduct[]>()
  for (const item of itemRows) {
    const product = productMap.get(item.productId)
    if (!product) continue
    const list = groupedProducts.get(item.sectionKey) ?? []
    list.push(product)
    groupedProducts.set(item.sectionKey, list)
  }

  const menuEntry = (id: number) => menuRows.find((item) => item.id === id)
  const homeMenu = isRomanian
    ? {
        sale: { title: menuEntry(35)?.title || 'Reduceri', href: '/ro/reduceri' },
        new: { title: menuEntry(34)?.title || 'Noutăți', href: '/ro/nou' },
        hits: { title: menuEntry(36)?.title || 'Cele mai vândute', href: '/ro/top-vanzari' },
        stores: { title: menuEntry(7)?.title || 'Magazinele noastre', href: '/ro/magazinele' },
      }
    : {
        sale: { title: menuEntry(35)?.title || 'Скидки', href: '/ru/skidki' },
        new: { title: menuEntry(34)?.title || 'Новинки', href: '/ru/novinki' },
        hits: { title: menuEntry(36)?.title || 'Хиты', href: '/ru/top-prodaz' },
        stores: { title: menuEntry(7)?.title || 'Наши магазины', href: '/ru/magazinyi' },
      }

  const categories = availableCategories
    .filter(({ category, available }) => available && Boolean(category.title?.trim()) && Boolean(category.url?.trim()))
    .map(({ category }) => ({ ...category, title: category.title as string, image: category.image as string, url: menuUrl(category.url, `/${locale}/${isRomanian ? 'catalog' : 'katalog'}`, locale) }))
    .slice(0, 3)

  // Admin curation wins; an under-filled discount rail is topped up from real discounted/popular stock instead of staying sparse.
  const curatedSale = groupedProducts.get('sale') ?? []
  const saleProducts = curatedSale.length >= 8
    ? curatedSale
    : [
        ...curatedSale,
        ...(await fetchProducts({ collection: 'sale', sort: 'popular', pageSize: 12, excludeProductIds: curatedSale.map((product) => product.id) }, false, locale)).products,
      ].slice(0, 12)

  return {
    slides: availableSlides.filter(({ slide, available }) => available && Boolean(slide.image)).map(({ slide }) => ({ ...slide, image: slide.image as string, mobileImage: slide.mobileImage ?? null, uri: localUrl(slide.uri, locale), title: slide.title?.trim() || (isRomanian ? 'Campanie Vizaje-Nica' : 'Кампания Vizaje-Nica'), youtube: slide.youtube ?? null })) satisfies HomeSlide[],
    categories: categories satisfies HomeCategory[],
    products: { sale: saleProducts, new: groupedProducts.get('new') ?? [], hits: groupedProducts.get('hits') ?? [] },
    brandSections: {
      afterNew: sections.filter((section) => section.placement === 'after_new') satisfies HomeBrandSection[],
      afterSale: sections.filter((section) => section.placement === 'after_sale') satisfies HomeBrandSection[],
    },
    menu: homeMenu,
    articles: articleRows.filter((article): article is typeof article & { title: string; uri: string; description: string; date: string } => Boolean(article.title && article.uri)).map((article) => ({ ...article, title: article.title, uri: article.uri, description: articleExcerpt(article.description), date: article.date })) satisfies HomeArticle[],
  }
}
