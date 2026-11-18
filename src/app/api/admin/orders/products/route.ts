import { and, asc, eq, inArray, like, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { legacyAsset } from '@/lib/legacy-assets'
import { brands, products, productsImg, productsVariable } from '../../../../../../drizzle/schema'

function amount(value: string | number | null | undefined) {
  const normalized = String(value ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100) ?? ''
  if (query.length < 2) return NextResponse.json({ products: [] }, { headers: { 'Cache-Control': 'no-store' } })
  const pattern = `%${query}%`
  const rows = await db.select({
    id: products.id,
    title: products.titleRu,
    titleRo: products.titleRo,
    sku: products.sku,
    brand: brands.title,
    price: products.price,
    discountPrice: products.discountPrice,
  }).from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(
      eq(products.isShown, 1),
      eq(products.isGift, 0),
      or(like(products.titleRu, pattern), like(products.titleRo, pattern), like(products.sku, pattern), like(brands.title, pattern)),
    ))
    .orderBy(asc(products.sorder), asc(products.id))
    .limit(12)

  const ids = rows.map((row) => row.id)
  const [images, variantRows] = ids.length ? await Promise.all([
    db.select({ productId: productsImg.productId, image: productsImg.img })
      .from(productsImg)
      .where(and(inArray(productsImg.productId, ids), eq(productsImg.isShown, 1)))
      .orderBy(asc(productsImg.sorder), asc(productsImg.id)),
    db.select({
      id: productsVariable.id,
      productId: productsVariable.productId,
      title: productsVariable.titleRu,
      titleRo: productsVariable.titleRo,
      volume: productsVariable.volumeVar,
      color: productsVariable.colorRu,
      price: productsVariable.price,
      discountPrice: productsVariable.discountPrice,
      isShown: productsVariable.isShown,
    }).from(productsVariable)
      .where(and(inArray(productsVariable.productId, ids), eq(productsVariable.isShown, 1)))
      .orderBy(asc(productsVariable.sorder), asc(productsVariable.id)),
  ]) : [[], []]

  const imageByProduct = new Map<number, string>()
  for (const row of images) if (!imageByProduct.has(row.productId)) imageByProduct.set(row.productId, row.image)
  const variantsByProduct = new Map<number, typeof variantRows>()
  for (const row of variantRows) {
    const variants = variantsByProduct.get(row.productId) ?? []
    variants.push(row)
    variantsByProduct.set(row.productId, variants)
  }

  const result = rows.map((row) => {
    const variants = (variantsByProduct.get(row.id) ?? []).map((variant) => {
      const originalPrice = amount(variant.price)
      const price = amount(variant.discountPrice) ?? originalPrice
      return {
        id: variant.id,
        title: variant.title || variant.titleRo || variant.volume || variant.color || `Вариант ${variant.id}`,
        price,
      }
    }).filter((variant): variant is typeof variant & { price: number } => variant.price !== null)
    const basePrice = amount(row.discountPrice) ?? amount(row.price)
    if (!basePrice && !variants.length) return null
    const image = imageByProduct.get(row.id)
    return {
      id: row.id,
      title: row.title || row.titleRo || `Товар #${row.id}`,
      sku: row.sku,
      brand: row.brand ?? '',
      image: image ? legacyAsset(image) : null,
      price: basePrice,
      variants,
    }
  }).filter((row) => Boolean(row))

  return NextResponse.json({ products: result }, { headers: { 'Cache-Control': 'no-store' } })
}
