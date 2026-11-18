import { AdminNewsManager } from '@/components/admin/admin-news-manager'
import { getAdminNewsList, type AdminContentStatus } from '@/lib/admin-editorial-content'

const statuses: AdminContentStatus[] = ['all', 'shown', 'hidden']

export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const status = statuses.includes(params.status as AdminContentStatus) ? params.status as AdminContentStatus : 'all'
  const initialData = await getAdminNewsList({ query, status, page: Number(params.page) || 1 })
  return <AdminNewsManager initialData={initialData} query={query} status={status} />
}
