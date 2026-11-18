import { AdminBannersManager } from '@/components/admin/admin-banners-manager'
import { getAdminBanners } from '@/lib/admin-content'

export default async function AdminBannersPage() {
  const banners = await getAdminBanners()
  return <AdminBannersManager initialBanners={banners} />
}
