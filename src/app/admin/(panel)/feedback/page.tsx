import { AdminFeedbackManager } from '@/components/admin/admin-feedback-manager'
import { getAdminFeedbackList } from '@/lib/admin-feedback'
import { ADMIN_FEEDBACK_STATUSES, type AdminFeedbackStatus } from '@/lib/admin-feedback-shared'

export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim().slice(0, 120) ?? ''
  const status = ADMIN_FEEDBACK_STATUSES.includes(params.status as AdminFeedbackStatus) ? params.status as AdminFeedbackStatus : ''
  const requestedPage = Number(params.page) > 0 ? Math.floor(Number(params.page)) : 1
  const data = await getAdminFeedbackList({ query, status: status || undefined, page: requestedPage })

  return <AdminFeedbackManager key={`${query}:${status}:${data.page}`} data={data} query={query} status={status} />
}
