import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentAdmin } from '@/lib/admin-auth'
import { syncProductsToMeilisearch } from '@/lib/admin-meilisearch-catalog-sync'
import { getTouchedProductIdsInBatches, runProductImport, type ProductImportFeedSelection } from '@/lib/product-import'

function validSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

const bodySchema = z.object({
  mode: z.enum(['preview', 'apply']),
  feeds: z.object({
    products: z.boolean().default(true),
    prices: z.boolean().default(true),
    seo: z.boolean().default(true),
  }),
})

export async function POST(request: Request) {
  if (!validSameOrigin(request)) return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 })
  if (!await getCurrentAdmin()) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ message: 'Некорректные параметры импорта.' }, { status: 400 })
  }

  const selection: ProductImportFeedSelection = body.feeds
  const dryRun = body.mode === 'preview'

  try {
    const result = await runProductImport(selection, dryRun)

    if (!dryRun && result.touchedProductIds.length) {
      const batches = await getTouchedProductIdsInBatches(result.touchedProductIds)
      for (const batch of batches) {
        await syncProductsToMeilisearch(batch).catch((error) => console.error('Meilisearch sync failed after product import', error))
      }
    }

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Product import failed', error)
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Импорт не удался.' }, { status: 500 })
  }
}
