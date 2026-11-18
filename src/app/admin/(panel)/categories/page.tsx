import { AdminCategoriesManager, type CategoryStatus } from '@/components/admin/admin-categories-manager'
import { getAdminCategoryList, type AdminCategoryStatus } from '@/lib/admin-categories'

const statuses: AdminCategoryStatus[] = ['all', 'shown', 'hidden']

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const status = statuses.includes(params.status as AdminCategoryStatus) ? params.status as AdminCategoryStatus : 'all'
  const requestedPage = Number(params.page) > 0 ? Number(params.page) : 1
  const data = await getAdminCategoryList({ query, status, page: requestedPage })
  const page = Math.min(requestedPage, data.pageCount)
  const result = page === requestedPage ? data : await getAdminCategoryList({ query, status, page })

  return <AdminCategoriesManager initialData={result} query={query} status={status as CategoryStatus} />
}
