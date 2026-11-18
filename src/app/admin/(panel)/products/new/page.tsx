import { AdminProductForm } from '@/components/admin/admin-product-form'
import { getAdminProductEditorOptions } from '@/lib/admin-products'

export default async function AdminNewProductPage() {
  const options = await getAdminProductEditorOptions()
  return <AdminProductForm product={null} categoryIds={[]} images={[]} variants={[]} {...options} />
}
