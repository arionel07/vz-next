import { and, asc, eq, gt, inArray, ne, sql } from 'drizzle-orm'

import { db } from '@/db'
import { legacyAsset } from '@/lib/legacy-assets'
import type { CatalogCardVariant, CatalogProduct } from '@/lib/catalog'
import { products, productsImg, productsVariable, productsVariableImg } from '../../drizzle/schema'

function positiveNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

/** Add shared card gallery, stock and variant data to product lists with batched queries. */
export async function enrichCatalogProducts<T extends CatalogProduct>(items: T[]): Promise<Array<T & Pick<CatalogProduct, 'gallery' | 'stock' | 'variants' | 'volume' | 'hasBasePrice'>>> {
  const ids = [...new Set(items.map((product) => product.id))]
  if (!ids.length) return items

  const [galleryRows, productRows, variantRows] = await Promise.all([
    db.select({ productId: productsImg.productId, image: productsImg.img })
      .from(productsImg)
      .where(and(inArray(productsImg.productId, ids), eq(productsImg.isShown, 1), sql`TRIM(${productsImg.img}) <> ''`))
      .orderBy(asc(productsImg.sorder), asc(productsImg.id)),
    db.select({ id: products.id, stock: products.onStock, volume: products.volume })
      .from(products)
      .where(inArray(products.id, ids)),
    db.select({
      id: productsVariable.id,
      productId: productsVariable.productId,
      volume: productsVariable.volumeVar,
      color: productsVariable.color,
      colorHex: productsVariable.colorHex,
      colorData: productsVariable.colorData,
      price: productsVariable.price,
      discountPrice: productsVariable.discountPrice,
      quantity: productsVariable.qty,
    }).from(productsVariable)
      .where(and(inArray(productsVariable.productId, ids), eq(productsVariable.isShown, 1), gt(productsVariable.price, 0)))
      .orderBy(asc(productsVariable.sorder), asc(productsVariable.id)),
  ])

  const variantIds = variantRows.map((variant) => variant.id)
  const variantImageRows = variantIds.length
    ? await db.select({ variantId: productsVariableImg.variableId, image: productsVariableImg.img })
        .from(productsVariableImg)
        .where(and(inArray(productsVariableImg.variableId, variantIds), eq(productsVariableImg.isShown, 1), sql`TRIM(${productsVariableImg.img}) <> ''`))
        .orderBy(asc(productsVariableImg.sorder), asc(productsVariableImg.id))
    : []

  const galleryByProduct = new Map<number, string[]>()
  for (const row of galleryRows) {
    const gallery = galleryByProduct.get(row.productId) ?? []
    if (gallery.length < 4 && !gallery.includes(row.image)) gallery.push(row.image)
    galleryByProduct.set(row.productId, gallery)
  }

  const productDetailsById = new Map(productRows.map((row) => [row.id, { stock: Number(row.stock ?? 0), volume: row.volume }]))
  const imagesByVariant = new Map<number, string[]>()
  for (const row of variantImageRows) {
    const images = imagesByVariant.get(row.variantId) ?? []
    if (images.length < 1 && !images.includes(row.image)) images.push(row.image)
    imagesByVariant.set(row.variantId, images)
  }

  const variantsByProduct = new Map<number, CatalogCardVariant[]>()
  for (const row of variantRows) {
    const variants = variantsByProduct.get(row.productId) ?? []
    variants.push({
      id: row.id,
      volume: row.volume?.trim() || null,
      color: row.color?.trim() || null,
      colorHex: row.colorHex?.trim() || null,
      colorData: row.colorData,
      price: positiveNumber(row.price),
      discountPrice: positiveNumber(row.price) ? positiveNumber(row.discountPrice) : null,
      quantity: Number(row.quantity ?? 0),
      images: (imagesByVariant.get(row.id) ?? []).map((image) => legacyAsset(image, 'products_variable_img') ?? image),
    })
    variantsByProduct.set(row.productId, variants)
  }

  return items.map((product) => {
    const gallery = galleryByProduct.get(product.id) ?? []
    const variants = (variantsByProduct.get(product.id) ?? []).filter((variant) => Boolean(variant.price && variant.images.length))
    const availableVariants = variants.filter((variant) => variant.quantity > 0 && variant.price)
    const hasBasePrice = Boolean(positiveNumber(product.price))
    const fallbackVariant = availableVariants[0]
    const fallbackVariantPrice = fallbackVariant?.price ?? null
    const fallbackVariantImage = fallbackVariant?.images[0] ?? variants[0]?.images[0] ?? null
    const cardImage = product.image ?? gallery[0] ?? fallbackVariantImage
    const cardGallery = gallery.length ? gallery : cardImage ? [cardImage] : []
    return {
      ...product,
      image: cardImage,
      gallery: cardGallery,
      volume: product.volume ?? productDetailsById.get(product.id)?.volume ?? null,
      hasBasePrice,
      stock: variants.length ? availableVariants.reduce((total, variant) => total + variant.quantity, 0) : (productDetailsById.get(product.id)?.stock ?? 0),
      variants,
      ...(!hasBasePrice && fallbackVariantPrice ? {
        price: fallbackVariant.price ?? fallbackVariantPrice,
        discountPrice: fallbackVariant.discountPrice ?? null,
      } : {}),
    } as T & Pick<CatalogProduct, 'gallery' | 'stock' | 'variants' | 'volume' | 'hasBasePrice'>
  }).filter((product) => Boolean(product.image && (product.hasBasePrice || (product.variants ?? []).some((variant) => variant.quantity > 0 && variant.price))))
}
