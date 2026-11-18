import { AdminBrandsManager } from '@/components/admin/admin-brands-manager'
import { getAdminBrandList, type AdminBrandStatus } from '@/lib/admin-brands'

const statuses: AdminBrandStatus[] = ['all', 'shown', 'hidden']

export default async function AdminBrandsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const status = statuses.includes(params.status as AdminBrandStatus) ? params.status as AdminBrandStatus : 'all'
  const requestedPage = Number(params.page) > 0 ? Number(params.page) : 1
  const data = await getAdminBrandList({ query, status, page: requestedPage })
  const page = Math.min(requestedPage, data.pageCount)
  const result = page === requestedPage ? data : await getAdminBrandList({ query, status, page })

  return <AdminBrandsManager initialData={result} query={query} status={status} />
}
