import { AdminOffersManager } from '@/components/admin/admin-offers-manager'
import { getAdminOfferList, type AdminOfferStatus } from '@/lib/admin-offers'

const statuses: AdminOfferStatus[] = ['all', 'shown', 'hidden']

export default async function AdminOffersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const status = statuses.includes(params.status as AdminOfferStatus) ? params.status as AdminOfferStatus : 'all'
  const initialData = await getAdminOfferList({ query, status, page: Number(params.page) || 1 })
  return <AdminOffersManager initialData={initialData} query={query} status={status} />
}
