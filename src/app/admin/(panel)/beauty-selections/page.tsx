import { AdminBeautySelectionsManager } from '@/components/admin/admin-beauty-selections-manager'
import { getAdminBeautySelectionList, type AdminContentStatus } from '@/lib/admin-editorial-content'

const statuses: AdminContentStatus[] = ['all', 'shown', 'hidden']

export default async function AdminBeautySelectionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const status = statuses.includes(params.status as AdminContentStatus) ? params.status as AdminContentStatus : 'all'
  const initialData = await getAdminBeautySelectionList({ query, status, page: Number(params.page) || 1 })
  return <AdminBeautySelectionsManager initialData={initialData} query={query} status={status} />
}
