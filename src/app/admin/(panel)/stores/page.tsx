import { getAdminStoreList, type AdminStoreStatus } from '@/lib/admin-stores'
import { AdminStoresManager } from '@/components/admin/admin-stores-manager'

const statuses: AdminStoreStatus[] = ['all', 'shown', 'hidden']

export default async function AdminStoresPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const status = statuses.includes(params.status as AdminStoreStatus) ? params.status as AdminStoreStatus : 'all'
  const requestedPage = Number(params.page) > 0 ? Math.floor(Number(params.page)) : 1
  const firstResult = await getAdminStoreList({ query, status, page: requestedPage })
  const page = Math.min(requestedPage, firstResult.pageCount)
  const data = page === requestedPage ? firstResult : await getAdminStoreList({ query, status, page })

  return <AdminStoresManager initialData={data} query={query} status={status} />
}
