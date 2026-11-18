import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { brands, categories, products, productCategories, productsVariable } from '../../drizzle/schema'

/**
 * Product import from 1C feeds, for vz-next's admin panel.
 *
 * Re-implements legacy's Import::import() / import_variable() / update_price()
 * / update_seo() (application/controllers/Import.php) against the Drizzle
 * schema, reading the same feed files from the same shared directory
 * (public/import/*.json, resolved the same way LEGACY_ASSET_ROOT already
 * resolves the rest of the shared /public tree).
 *
 * Deliberate differences from legacy, per the audit in
 * docs/workapp-1c-observed-contract.md / docs/legacy-1c-import-forensic-audit.md:
 *
 * 1. Orphan variant fallback FIXED. Legacy falls back to product_id = 1 when
 *    updating an existing variant whose parent SKU can no longer be matched
 *    — silently reassigning a real variant to an arbitrary wrong product.
 *    Here: an update never touches product_id when no parent match is
 *    found (keeps whatever it already pointed to) and a brand-new variant
 *    with no resolvable parent is skipped entirely and reported, never
 *    attached to product_id 0 or 1.
 * 2. SEO import actually applies. Legacy's update_seo() reads JobVN.json,
 *    builds the update array, and never calls $this->db->update() — it's
 *    dead code (dumps to screen only). Rebuilt here to actually write
 *    seoTitleRu/Ro, seoKeywordsRu/Ro, seoDescRu/Ro, matching the same field
 *    mapping and the same guard (SeoHeaderRO must be non-empty).
 * 3. Every run can be previewed with dryRun: true first — computes the same
 *    plan/stats without writing anything, for the admin preview-before-apply
 *    UI. dryRun and apply share this exact code path so preview accurately
 *    predicts apply.
 * 4. Category auto-creation stays disabled (legacy's import_categories_off()
 *    is dead/disabled code — a confirmed route/controller mismatch, not
 *    something to silently re-enable here). Unmatched category names are
 *    reported as mismatches; existing category relations are left alone,
 *    exactly like legacy's categoryMappingComplete guard.
 */

export type ProductImportFeedSelection = {
  products: boolean
  prices: boolean
  seo: boolean
}

type ProductFeedRow = {
  ID_nom: number | string
  WarehouseName?: string
  Barcode?: string
  Brand?: string
  ColorVar?: string
  ColorVarMD?: string
  VolumeVar?: string
  Sex?: string
  VariativeNomenclature?: string
  VariativeName?: string
  VariativeNameMD?: string
  NomenclatureCategory1?: string
  NomenclatureCategory2?: string
  QuantityBalance?: number
  BalMall?: number
  Price?: number
  PriceWH?: number
  ShortDescriptionRus?: string
  ShortDescriptionMD?: string
  FullDescriptionRus?: string
  FullDescriptionMD?: string
  InstructionRU?: string
  InstructionMD?: string
  componentsRu?: string
  componentsMD?: string
  SeoHeaderRU?: string
  SeoHeaderRO?: string
  SeoDescriptionRU?: string
  SeoDescriptionRO?: string
}

type PriceFeedRow = {
  ID_nom: number | string
  Price?: number
  DiscountPrice?: number
}

type SeoFeedRow = {
  ID_nom: number | string
  SeoHeaderRU?: string
  SeoHeaderRO?: string
  SeoKeyWordsRU?: string
  SeoKeyWordsRO?: string
  SeoDescriptionRU?: string
  SeoDescriptionRO?: string
}

export type ImportStats = {
  productsAdded: number
  productsUpdated: number
  productsUnchanged: number
  productsSkippedEmpty: number
  brandsCreated: number
  categoryMismatches: number
  variantsAdded: number
  variantsUpdated: number
  variantsOrphanSkipped: number
  variantsOrphanKeptExistingParent: number
  pricesUpdatedOnProducts: number
  pricesUpdatedOnVariants: number
  pricesNotMatched: number
  seoUpdated: number
  seoSkippedNoProduct: number
}

export type ImportSample = {
  category: 'product-added' | 'product-updated' | 'brand-created' | 'category-mismatch' | 'variant-added' | 'variant-updated' | 'variant-orphan' | 'price-updated' | 'seo-updated'
  guid?: string
  sku?: string
  title?: string
  detail?: string
}

export type ProductImportResult = {
  dryRun: boolean
  stats: ImportStats
  samples: ImportSample[]
  touchedProductIds: number[]
  errors: string[]
}

const SAMPLE_LIMIT_PER_CATEGORY = 40

function emptyStats(): ImportStats {
  return {
    productsAdded: 0,
    productsUpdated: 0,
    productsUnchanged: 0,
    productsSkippedEmpty: 0,
    brandsCreated: 0,
    categoryMismatches: 0,
    variantsAdded: 0,
    variantsUpdated: 0,
    variantsOrphanSkipped: 0,
    variantsOrphanKeptExistingParent: 0,
    pricesUpdatedOnProducts: 0,
    pricesUpdatedOnVariants: 0,
    pricesNotMatched: 0,
    seoUpdated: 0,
    seoSkippedNoProduct: 0,
  }
}

function importFeedRoot() {
  const configuredRoot = process.env.LEGACY_ASSET_ROOT
  return configuredRoot ? resolve(configuredRoot) : resolve(process.cwd(), '..', '..', 'public')
}

function feedPath(filename: string) {
  return join(importFeedRoot(), 'import', filename)
}

async function readFeed<T>(filename: string): Promise<T[]> {
  const path = feedPath(filename)
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch {
    throw new Error(`Не удалось прочитать файл фида: ${path}`)
  }
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) throw new Error('not an array')
    return parsed as T[]
  } catch {
    throw new Error(`Файл фида повреждён или не является JSON-массивом: ${path}`)
  }
}

function trimmed(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function toNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

type ProductRow = typeof products.$inferSelect
type VariantRow = typeof productsVariable.$inferSelect

type ProductIndex = {
  byGuid: Map<string, ProductRow>
  bySku: Map<string, ProductRow>
}

async function loadProductIndex(): Promise<ProductIndex> {
  const rows = await db.select().from(products)
  const byGuid = new Map<string, ProductRow>()
  const bySku = new Map<string, ProductRow>()
  for (const row of rows) {
    if (row.guid) byGuid.set(row.guid, row)
    if (row.sku) bySku.set(row.sku, row)
  }
  return { byGuid, bySku }
}

async function loadVariantIndex() {
  const rows = await db.select().from(productsVariable)
  const bySku = new Map<string, VariantRow>()
  for (const row of rows) {
    if (row.sku) bySku.set(row.sku, row)
  }
  return bySku
}

async function loadCategoryIndex() {
  const rows = await db.select({ id: categories.id, titleRu: categories.titleRu, titleRo: categories.titleRo }).from(categories)
  const byTitle = new Map<string, number>()
  const nameById = new Map<number, string>()
  for (const row of rows) {
    if (row.titleRo) byTitle.set(row.titleRo.trim(), row.id)
    if (row.titleRu) {
      byTitle.set(row.titleRu.trim(), row.id)
      if (!nameById.has(row.id)) nameById.set(row.id, row.titleRu.trim())
    }
    if (!nameById.has(row.id) && row.titleRo) nameById.set(row.id, row.titleRo.trim())
  }
  return { byTitle, nameById }
}

async function loadBrandIndex() {
  const rows = await db.select({ id: brands.id, title: brands.title }).from(brands)
  const byTitle = new Map<string, number>()
  for (const row of rows) {
    if (row.title) byTitle.set(row.title.trim(), row.id)
  }
  return byTitle
}

async function loadProductCategoryIndex() {
  const rows = await db.select({ productId: productCategories.productId, categoryId: productCategories.categoryId }).from(productCategories)
  const byProductId = new Map<number, number[]>()
  for (const row of rows) {
    const list = byProductId.get(row.productId) ?? []
    list.push(row.categoryId)
    byProductId.set(row.productId, list)
  }
  return byProductId
}

function categoryNamesFor(ids: number[], nameById: Map<number, string>) {
  const names = ids.map((id) => nameById.get(id) ?? `Категория #${id}`)
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'ru'))
}

function productSnapshot(row: { titleRu: string; titleRo: string; sku: string; brandTitle: string; volume: string; barcode: string; categoryIds: number[] }, nameById: Map<number, string>) {
  return {
    titleRu: row.titleRu.trim(),
    titleRo: row.titleRo.trim(),
    sku: row.sku.trim(),
    brand: row.brandTitle.trim(),
    volume: row.volume.trim(),
    barcode: row.barcode.trim(),
    categories: categoryNamesFor(row.categoryIds, nameById),
  }
}

function snapshotsDiffer(before: ReturnType<typeof productSnapshot>, after: ReturnType<typeof productSnapshot>) {
  return (
    before.titleRu !== after.titleRu ||
    before.titleRo !== after.titleRo ||
    before.sku !== after.sku ||
    before.brand !== after.brand ||
    before.volume !== after.volume ||
    before.barcode !== after.barcode ||
    JSON.stringify(before.categories) !== JSON.stringify(after.categories)
  )
}

async function runMainProductImport(dryRun: boolean, stats: ImportStats, samples: ImportSample[], touchedProductIds: Set<number>, errors: string[]) {
  const rows = await readFeed<ProductFeedRow>('products.json')
  const productIndex = await loadProductIndex()
  const brandIndex = await loadBrandIndex()
  const brandNameById = new Map<number, string>()
  for (const [title, id] of brandIndex.entries()) brandNameById.set(id, title)
  const { byTitle: categoryByTitle, nameById: categoryNameById } = await loadCategoryIndex()
  const productCategoryIndex = await loadProductCategoryIndex()
  const pendingNewBrands = new Set<string>()
  let nextSyntheticId = -1
  // Dry-run only: products.json has duplicate ID_nom rows in practice (confirmed
  // against the real feed — not a hypothetical). Without a synthetic id to put
  // in productIndex, a dry run would see every duplicate occurrence as "no
  // existing product" and report each one as a separate "added", instead of the
  // first as added and the rest as updates — exactly what actually happens when
  // applied. The synthetic id is negative so it can never collide with a real
  // (positive, autoincrement) id.
  function syntheticId() {
    return nextSyntheticId--
  }

  function pushSample(sample: ImportSample) {
    const count = samples.filter((item) => item.category === sample.category).length
    if (count < SAMPLE_LIMIT_PER_CATEGORY) samples.push(sample)
  }

  for (const row of rows) {
    const guid = String(row.ID_nom ?? '').trim()
    if (!guid) continue
    if (!trimmed(row.ShortDescriptionRus)) {
      stats.productsSkippedEmpty += 1
      continue
    }

    const category1Title = trimmed(row.NomenclatureCategory1)
    const category2Title = trimmed(row.NomenclatureCategory2)
    const category1 = category1Title ? categoryByTitle.get(category1Title) ?? 0 : 0
    const category2 = category2Title ? categoryByTitle.get(category2Title) ?? 0 : 0
    if (category1Title && !category1) {
      stats.categoryMismatches += 1
      pushSample({ category: 'category-mismatch', guid, detail: category1Title })
    }
    if (category2Title && !category2 && category2Title !== category1Title) {
      stats.categoryMismatches += 1
      pushSample({ category: 'category-mismatch', guid, detail: category2Title })
    }

    const brandTitle = trimmed(row.Brand)
    let brandId = 0
    if (brandTitle) {
      const existingBrandId = brandIndex.get(brandTitle)
      if (existingBrandId) {
        brandId = existingBrandId
      } else if (!dryRun) {
        const [inserted] = await db.insert(brands).values({
          guid: '',
          title: brandTitle,
          uri: guid,
          textRu: '',
          textRo: '',
          textEn: '',
          sorder: 0,
          top: 0,
          isShown: 1,
        })
        brandId = Number(inserted.insertId)
        brandIndex.set(brandTitle, brandId)
        brandNameById.set(brandId, brandTitle)
        stats.brandsCreated += 1
        pushSample({ category: 'brand-created', title: brandTitle })
      } else {
        // Dry run: give it a synthetic id too, so a later row referencing the
        // same new brand (or an existing product whose "before" brand we read
        // below) sees it consistently within this preview run.
        brandId = syntheticId()
        brandIndex.set(brandTitle, brandId)
        brandNameById.set(brandId, brandTitle)
        if (!pendingNewBrands.has(brandTitle)) {
          pendingNewBrands.add(brandTitle)
          stats.brandsCreated += 1
          pushSample({ category: 'brand-created', title: brandTitle })
        }
      }
    }

    const incomingCategoryIds = Array.from(new Set([category1, category2].filter((id) => id > 0)))
    const category1Provided = category1Title !== ''
    const category2Provided = category2Title !== ''
    const categoryMappingComplete = (!category1Provided || category1 > 0) && (!category2Provided || category2 > 0)
    const primaryCategoryId = category1 > 0 ? category1 : category2
    const incomingSku = trimmed(row.VariativeNomenclature) || guid
    const titleRu = trimmed(row.ShortDescriptionRus)
    const titleRo = trimmed(row.ShortDescriptionMD)
    const volume = trimmed(row.VolumeVar)
    const barcode = trimmed(row.Barcode)

    const seoFields: Record<string, string> = {}
    if (trimmed(row.SeoHeaderRU)) seoFields.seoTitleRu = trimmed(row.SeoHeaderRU)
    if (trimmed(row.SeoHeaderRO)) seoFields.seoTitleRo = trimmed(row.SeoHeaderRO)
    if (trimmed(row.SeoDescriptionRU)) seoFields.seoDescRu = trimmed(row.SeoDescriptionRU)
    if (trimmed(row.SeoDescriptionRO)) seoFields.seoDescRo = trimmed(row.SeoDescriptionRO)

    const existing = productIndex.byGuid.get(guid)

    if (!existing) {
      pushSample({ category: 'product-added', guid, sku: incomingSku, title: titleRu })
      stats.productsAdded += 1

      const insertValues = {
        guid,
        sku: incomingSku,
        titleRu,
        titleRo,
        titleEn: titleRo,
        descRu: '',
        descRo: '',
        descEn: '',
        volume,
        price: toNumber(row.Price),
        priceWh: toNumber(row.PriceWH),
        barcode,
        categoryId: primaryCategoryId,
        brandId,
        saleMdl: 0,
        salePercent: 0,
        stock: 0,
        bestSelling: 0,
        featureType: 0,
        reviews: '',
        variations: trimmed(row.VariativeNomenclature),
        order: 0,
        onStock: toNumber(row.QuantityBalance) + toNumber(row.BalMall),
        onStockWh: toNumber(row.QuantityBalance),
        warehouseName: trimmed(row.WarehouseName),
        sex: trimmed(row.Sex),
        textRu: trimmed(row.FullDescriptionRus),
        textRo: trimmed(row.FullDescriptionMD),
        textEn: trimmed(row.FullDescriptionMD),
        instructionRu: trimmed(row.InstructionRU),
        instructionRo: trimmed(row.InstructionMD),
        componentsRu: trimmed(row.componentsRu),
        componentsRo: trimmed(row.componentsMD),
        searchTeg: '',
        uriRu: guid,
        uriRo: guid,
        uriEn: guid,
        isShown: 1,
        ...seoFields,
      }

      let newProductId: number
      if (!dryRun) {
        const [insertedProduct] = await db.insert(products).values(insertValues)
        newProductId = Number(insertedProduct.insertId)
        const categoryRows = incomingCategoryIds.map((categoryId) => ({ productId: newProductId, categoryId }))
        if (categoryRows.length) await db.insert(productCategories).values(categoryRows)
        touchedProductIds.add(newProductId)
      } else {
        // See `syntheticId()` above: needed so a duplicate ID_nom later in
        // the SAME feed run is correctly treated as an update, not a
        // second "added" — this happens for real (confirmed against the
        // live feed, ~4% of rows share an ID_nom with another row).
        newProductId = syntheticId()
      }
      productIndex.byGuid.set(guid, { ...insertValues, id: newProductId } as unknown as ProductRow)
      productIndex.bySku.set(incomingSku, { ...insertValues, id: newProductId } as unknown as ProductRow)
      productCategoryIndex.set(newProductId, incomingCategoryIds)
      continue
    }

    const existingCategoryIds = productCategoryIndex.get(existing.id) ?? (existing.categoryId ? [existing.categoryId] : [])
    const beforeSnapshot = productSnapshot(
      { titleRu: existing.titleRu ?? '', titleRo: existing.titleRo ?? '', sku: existing.sku ?? '', brandTitle: existing.brandId ? brandNameById.get(existing.brandId) ?? '' : '', volume: existing.volume ?? '', barcode: existing.barcode ?? '', categoryIds: existingCategoryIds },
      categoryNameById,
    )
    const effectiveBrandTitle = brandId !== 0 ? brandTitle : beforeSnapshot.brand
    const effectiveCategoryIds = categoryMappingComplete && incomingCategoryIds.length ? incomingCategoryIds : existingCategoryIds
    const afterSnapshot = productSnapshot({ titleRu, titleRo, sku: incomingSku, brandTitle: effectiveBrandTitle, volume, barcode, categoryIds: effectiveCategoryIds }, categoryNameById)

    if (!snapshotsDiffer(beforeSnapshot, afterSnapshot) && Object.keys(seoFields).length === 0) {
      stats.productsUnchanged += 1
      continue
    }

    stats.productsUpdated += 1
    pushSample({ category: 'product-updated', guid, sku: incomingSku, title: titleRu })

    const updateValues: Record<string, unknown> = {
      price: toNumber(row.Price),
      priceWh: toNumber(row.PriceWH),
      volume,
      barcode,
      onStock: toNumber(row.QuantityBalance) + toNumber(row.BalMall),
      onStockWh: toNumber(row.QuantityBalance),
      titleRu,
      titleRo,
      titleEn: titleRo,
      sex: trimmed(row.Sex),
      warehouseName: trimmed(row.WarehouseName),
      textRu: trimmed(row.FullDescriptionRus),
      textRo: trimmed(row.FullDescriptionMD),
      textEn: trimmed(row.FullDescriptionMD),
      instructionRu: trimmed(row.InstructionRU),
      instructionRo: trimmed(row.InstructionMD),
      componentsRu: trimmed(row.componentsRu),
      componentsRo: trimmed(row.componentsMD),
      ...seoFields,
    }
    if (brandId !== 0) updateValues.brandId = brandId
    if (categoryMappingComplete && incomingCategoryIds.length) updateValues.categoryId = primaryCategoryId

    if (!dryRun) {
      await db.update(products).set(updateValues).where(eq(products.id, existing.id))

      if (categoryMappingComplete && incomingCategoryIds.length) {
        await db.delete(productCategories).where(eq(productCategories.productId, existing.id))
        if (incomingCategoryIds.length) await db.insert(productCategories).values(incomingCategoryIds.map((categoryId) => ({ productId: existing.id, categoryId })))
      }
    }
    if (categoryMappingComplete && incomingCategoryIds.length) {
      productCategoryIndex.set(existing.id, incomingCategoryIds)
    }
    // Refresh the in-memory record so a THIRD occurrence of the same ID_nom
    // later in this run (duplicates are confirmed to exist in the real feed)
    // diffs against this update, not the stale first-seen values.
    const refreshedProduct = { ...existing, ...updateValues, sku: incomingSku }
    productIndex.byGuid.set(guid, refreshedProduct as unknown as ProductRow)
    productIndex.bySku.set(incomingSku, refreshedProduct as unknown as ProductRow)
    touchedProductIds.add(existing.id)
  }

  return { productIndex }
}

async function runVariantImport(dryRun: boolean, stats: ImportStats, samples: ImportSample[], touchedProductIds: Set<number>, productIndex: ProductIndex) {
  const rows = await readFeed<ProductFeedRow>('products.json')
  const variantIndex = await loadVariantIndex()

  function pushSample(sample: ImportSample) {
    const count = samples.filter((item) => item.category === sample.category).length
    if (count < SAMPLE_LIMIT_PER_CATEGORY) samples.push(sample)
  }

  for (const row of rows) {
    const variativeNomenclature = trimmed(row.VariativeNomenclature)
    if (!variativeNomenclature) continue

    const variantSku = String(row.ID_nom ?? '').trim()
    if (!variantSku) continue

    const parentProduct = productIndex.bySku.get(variativeNomenclature)
    const existingVariant = variantIndex.get(variantSku)
    const titleRu = trimmed(row.VariativeName)
    const titleRo = trimmed(row.VariativeNameMD)
    const qty = toNumber(row.QuantityBalance) + toNumber(row.BalMall)

    if (!existingVariant) {
      if (!parentProduct) {
        stats.variantsOrphanSkipped += 1
        pushSample({ category: 'variant-orphan', sku: variantSku, detail: `Родитель по SKU=${variativeNomenclature} не найден — вариант пропущен` })
        continue
      }

      stats.variantsAdded += 1
      pushSample({ category: 'variant-added', sku: variantSku, title: titleRu })

      let newVariantId: number
      if (!dryRun) {
        const [inserted] = await db.insert(productsVariable).values({
          productId: parentProduct.id,
          sku: variantSku,
          titleRu,
          titleRo,
          titleEn: titleRo,
          colorRu: trimmed(row.ColorVar),
          colorRo: trimmed(row.ColorVarMD),
          colorEn: trimmed(row.ColorVarMD),
          color: trimmed(row.ColorVarMD),
          volumeVar: trimmed(row.VolumeVar),
          priceWh: toNumber(row.PriceWH),
          discountPrice: '0',
          qty,
          qtyWh: toNumber(row.QuantityBalance),
          barcode: trimmed(row.Barcode),
          warehouseName: trimmed(row.WarehouseName),
          isShown: 1,
          sorder: 0,
        })
        newVariantId = Number(inserted.insertId)
      } else {
        // Same reasoning as the product-side synthetic id: products.json
        // can repeat a variant's own ID_nom, so a dry run needs to see its
        // own just-"added" variant as existing if that happens again.
        newVariantId = -(variantIndex.size + 1)
      }
      variantIndex.set(variantSku, { id: newVariantId, productId: parentProduct.id } as unknown as VariantRow)
      touchedProductIds.add(parentProduct.id)
      continue
    }

    // Existing variant: legacy falls back to product_id = 1 here when the
    // parent can't be resolved — fixed to keep the existing product_id
    // untouched instead (see module docstring, point 1).
    const resolvedProductId = parentProduct ? parentProduct.id : existingVariant.productId
    if (!parentProduct) {
      stats.variantsOrphanKeptExistingParent += 1
      pushSample({ category: 'variant-orphan', sku: variantSku, detail: `Родитель по SKU=${variativeNomenclature} не найден — product_id оставлен без изменений (${existingVariant.productId})` })
    }

    stats.variantsUpdated += 1
    pushSample({ category: 'variant-updated', sku: variantSku, title: titleRu })

    if (!dryRun) {
      await db.update(productsVariable).set({
        price: row.Price !== undefined ? toNumber(row.Price) : undefined,
        priceWh: toNumber(row.PriceWH),
        qty,
        qtyWh: toNumber(row.QuantityBalance),
        color: trimmed(row.ColorVarMD),
        titleRu,
        titleRo,
        titleEn: titleRo,
        colorRu: trimmed(row.ColorVar),
        colorRo: trimmed(row.ColorVarMD),
        colorEn: trimmed(row.ColorVarMD),
        volumeVar: trimmed(row.VolumeVar),
        warehouseName: trimmed(row.WarehouseName),
        barcode: trimmed(row.Barcode),
        isShown: 1,
        ...(parentProduct ? { productId: resolvedProductId } : {}),
      }).where(eq(productsVariable.id, existingVariant.id))
    }
    existingVariant.productId = resolvedProductId
    touchedProductIds.add(resolvedProductId)
  }
}

async function runPriceImport(dryRun: boolean, stats: ImportStats, samples: ImportSample[], touchedProductIds: Set<number>) {
  const rows = await readFeed<PriceFeedRow>('pricevn.json')
  const productIndex = await loadProductIndex()
  const variantIndex = await loadVariantIndex()

  function pushSample(sample: ImportSample) {
    const count = samples.filter((item) => item.category === sample.category).length
    if (count < SAMPLE_LIMIT_PER_CATEGORY) samples.push(sample)
  }

  for (const row of rows) {
    const guid = String(row.ID_nom ?? '').trim()
    if (!guid) continue

    const price = toNumber(row.Price)
    const discountPrice = toNumber(row.DiscountPrice)
    let matched = false

    const product = productIndex.byGuid.get(guid)
    if (product) {
      matched = true
      stats.pricesUpdatedOnProducts += 1
      pushSample({ category: 'price-updated', guid, detail: `товар, price=${price}` })
      if (!dryRun) {
        await db.update(products).set({ price, discountPrice }).where(eq(products.id, product.id))
      }
      touchedProductIds.add(product.id)
    }

    const variant = variantIndex.get(guid)
    if (variant) {
      matched = true
      stats.pricesUpdatedOnVariants += 1
      pushSample({ category: 'price-updated', sku: guid, detail: `вариант, price=${price}` })
      if (!dryRun) {
        await db.update(productsVariable).set({ price, discountPrice: String(discountPrice) }).where(eq(productsVariable.id, variant.id))
      }
      touchedProductIds.add(variant.productId)
    }

    if (!matched) stats.pricesNotMatched += 1
  }
}

async function runSeoImport(dryRun: boolean, stats: ImportStats, samples: ImportSample[], touchedProductIds: Set<number>) {
  const rows = await readFeed<SeoFeedRow>('JobVN.json')
  const productIndex = await loadProductIndex()

  function pushSample(sample: ImportSample) {
    const count = samples.filter((item) => item.category === sample.category).length
    if (count < SAMPLE_LIMIT_PER_CATEGORY) samples.push(sample)
  }

  for (const row of rows) {
    const guid = String(row.ID_nom ?? '').trim()
    // Matches legacy's own guard exactly: gated on SeoHeaderRO, not RU.
    if (!guid || !trimmed(row.SeoHeaderRO)) continue

    const product = productIndex.byGuid.get(guid)
    if (!product) {
      stats.seoSkippedNoProduct += 1
      continue
    }

    stats.seoUpdated += 1
    pushSample({ category: 'seo-updated', guid, title: trimmed(row.SeoHeaderRU) })

    if (!dryRun) {
      await db.update(products).set({
        seoTitleRu: trimmed(row.SeoHeaderRU),
        seoTitleRo: trimmed(row.SeoHeaderRO),
        seoKeywordsRu: trimmed(row.SeoKeyWordsRU),
        seoKeywordsRo: trimmed(row.SeoKeyWordsRO),
        seoDescRu: trimmed(row.SeoDescriptionRU),
        seoDescRo: trimmed(row.SeoDescriptionRO),
      }).where(eq(products.id, product.id))
    }
    touchedProductIds.add(product.id)
  }
}

export async function runProductImport(selection: ProductImportFeedSelection, dryRun: boolean): Promise<ProductImportResult> {
  const stats = emptyStats()
  const samples: ImportSample[] = []
  const touchedProductIds = new Set<number>()
  const errors: string[] = []

  try {
    if (selection.products) {
      const { productIndex } = await runMainProductImport(dryRun, stats, samples, touchedProductIds, errors)
      await runVariantImport(dryRun, stats, samples, touchedProductIds, productIndex)
    }
    if (selection.prices) {
      await runPriceImport(dryRun, stats, samples, touchedProductIds)
    }
    if (selection.seo) {
      await runSeoImport(dryRun, stats, samples, touchedProductIds)
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Неизвестная ошибка импорта')
  }

  return { dryRun, stats, samples, touchedProductIds: Array.from(touchedProductIds), errors }
}

export async function getTouchedProductIdsInBatches(ids: number[], batchSize = 500) {
  const batches: number[][] = []
  for (let i = 0; i < ids.length; i += batchSize) batches.push(ids.slice(i, i + batchSize))
  return batches
}

// Re-exported so the admin API routes don't need to import drizzle-orm's
// `inArray` directly just to batch Meilisearch sync calls.
export { inArray }
