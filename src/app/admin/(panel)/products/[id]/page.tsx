import { notFound } from 'next/navigation'

import { AdminProductForm } from '@/components/admin/admin-product-form'
import { getAdminProductEditorData } from '@/lib/admin-products'

export default async function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idValue } = await params
  const id = Number(idValue)
  if (!Number.isInteger(id) || id < 1) notFound()
  const data = await getAdminProductEditorData(id)
  if (!data) notFound()
  return <AdminProductForm
    product={data.product}
    categoryIds={data.categoryIds}
    categories={data.categories}
    brands={data.brands}
    images={data.images}
    variants={data.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku ?? '',
      titleRu: variant.titleRu ?? '',
      titleRo: variant.titleRo ?? '',
      titleEn: variant.titleEn ?? '',
      colorRu: variant.colorRu,
      colorRo: variant.colorRo,
      colorEn: variant.colorEn,
      colorHex: variant.colorHex ?? '',
      volume: variant.volume,
      price: variant.price === null ? '' : String(variant.price),
      discountPrice: variant.discountPrice ?? '',
      qty: String(variant.qty),
      sorder: String(variant.sorder),
      isShown: variant.isShown === 1,
      image: variant.image,
      imageFile: null,
    }))}
  />
}
