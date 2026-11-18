import { AdminSettingsManager } from '@/components/admin/admin-settings-manager'
import { getAdminSettingsList } from '@/lib/admin-settings'
import { ADMIN_SETTING_GROUPS, type AdminSettingGroup } from '@/lib/admin-settings-shared'

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ q?: string; group?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim().slice(0, 120) ?? ''
  const group = ADMIN_SETTING_GROUPS.includes(params.group as AdminSettingGroup) ? params.group as AdminSettingGroup : ''
  const requestedPage = Number(params.page) > 0 ? Math.floor(Number(params.page)) : 1
  const data = await getAdminSettingsList({ query, group: group || undefined, page: requestedPage })

  return <AdminSettingsManager key={`${group || 'all'}:${query}:${data.page}`} data={data} group={group} query={query} />
}
