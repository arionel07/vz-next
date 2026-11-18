import { AdminMeilisearchManager } from '@/components/admin/admin-meilisearch-manager'
import { isMeilisearchConfigured, meilisearchIndexName } from '@/lib/admin-meilisearch-client'
import { getSearchSynonymGroups, synonymStorageReady } from '@/lib/admin-meilisearch-synonyms'

export default async function AdminSearchPage() {
  const [groups, storageReady] = await Promise.all([getSearchSynonymGroups(), synonymStorageReady()])

  return (
    <AdminMeilisearchManager
      index={meilisearchIndexName()}
      configured={isMeilisearchConfigured()}
      initialSynonymGroupsText={groups.map((group) => group.join(' | ')).join('\n')}
      synonymStorageReady={storageReady}
    />
  )
}
