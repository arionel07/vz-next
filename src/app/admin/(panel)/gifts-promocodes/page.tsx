import { AdminGiftsPromocodesManager } from '@/components/admin/admin-gifts-promocodes-manager'
import { getAdminGiftsPromocodesData } from '@/lib/admin-gifts-promocodes'

export default async function AdminGiftsPromocodesPage() {
  const initialData = await getAdminGiftsPromocodesData()
  return <AdminGiftsPromocodesManager initialData={initialData} />
}
