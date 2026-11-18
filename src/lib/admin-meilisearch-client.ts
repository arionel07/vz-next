import 'server-only'

/**
 * Admin-only REST client for Meilisearch (health/stats/settings/tasks/
 * documents). Mirrors the legacy `Meilisearch_client` library
 * (application/libraries/Meilisearch_client.php) so the admin screen keeps
 * the same contract and failure behaviour. The admin key is read from the
 * server environment only and is never sent to the browser.
 */

export type MeilisearchTask = {
  uid?: number
  taskUid?: number
  status?: string
  error?: { message?: string } | null
}

export type MeilisearchIndexStats = {
  numberOfDocuments?: number
  isIndexing?: boolean
}

export type MeilisearchIndexSettings = {
  searchableAttributes: string[]
  filterableAttributes: string[]
  sortableAttributes: string[]
  pagination: { maxTotalHits: number }
  synonyms: Record<string, string[]>
  typoTolerance: {
    enabled: boolean
    minWordSizeForTypos: { oneTypo: number; twoTypos: number }
    disableOnAttributes: string[]
  }
}

export type MeilisearchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number }

function config() {
  const baseUrl = process.env.MEILISEARCH_URL?.trim().replace(/\/+$/u, '') ?? ''
  const index = process.env.MEILISEARCH_INDEX?.trim() || 'vizaje_nica_products'
  const searchKey = process.env.MEILISEARCH_SEARCH_KEY?.trim() ?? ''
  const adminKey = process.env.MEILISEARCH_ADMIN_KEY?.trim() ?? ''
  const timeoutMs = Math.max(250, Math.min(30_000, Number(process.env.MEILISEARCH_TIMEOUT_MS) || 2000))
  return { baseUrl, index, searchKey, adminKey, timeoutMs }
}

export function isMeilisearchConfigured() {
  return config().baseUrl !== ''
}

export function meilisearchIndexName() {
  return config().index
}

async function request<T>(method: string, path: string, payload: unknown, admin: boolean): Promise<MeilisearchResult<T>> {
  const { baseUrl, searchKey, adminKey, timeoutMs } = config()
  if (!baseUrl) return { ok: false, error: 'MEILISEARCH_URL is not configured.' }

  const key = admin ? adminKey : searchKey
  if (admin && !key) return { ok: false, error: 'MEILISEARCH_ADMIN_KEY is not configured.' }

  const headers = new Headers({ Accept: 'application/json' })
  if (payload !== undefined) headers.set('Content-Type', 'application/json')
  if (key) headers.set('Authorization', `Bearer ${key}`)

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    return { ok: false, error: 'Meilisearch connection failed.' }
  }

  let decoded: unknown = null
  try {
    const text = await response.text()
    decoded = text ? JSON.parse(text) : null
  } catch {
    decoded = null
  }

  if (!response.ok) {
    const message = decoded && typeof decoded === 'object' && 'message' in decoded && typeof decoded.message === 'string'
      ? decoded.message.slice(0, 300)
      : ''
    console.error('[admin-meilisearch] HTTP error', { status: response.status, path, message })
    return { ok: false, error: `Meilisearch returned HTTP ${response.status}.${message ? ` ${message}` : ''}`, status: response.status }
  }

  return { ok: true, data: decoded as T }
}

export function meilisearchHealth() {
  return request<{ status: string }>('GET', '/health', undefined, false)
}

export function meilisearchGetIndex(index: string) {
  return request<{ uid: string; primaryKey: string | null }>('GET', `/indexes/${encodeURIComponent(index)}`, undefined, true)
}

export function meilisearchGetIndexStats(index: string) {
  return request<MeilisearchIndexStats>('GET', `/indexes/${encodeURIComponent(index)}/stats`, undefined, true)
}

export function meilisearchCreateIndex(index: string, primaryKey = 'id') {
  return request<MeilisearchTask>('POST', '/indexes', { uid: index, primaryKey }, true)
}

export function meilisearchGetTask(taskUid: number | string) {
  return request<MeilisearchTask>('GET', `/tasks/${encodeURIComponent(String(taskUid))}`, undefined, true)
}

export function meilisearchUpdateDocuments(index: string, documents: Record<string, unknown>[], primaryKey = 'id') {
  if (!documents.length) return Promise.resolve<MeilisearchResult<MeilisearchTask>>({ ok: false, error: 'No documents to send.' })
  return request<MeilisearchTask>('POST', `/indexes/${encodeURIComponent(index)}/documents?primaryKey=${encodeURIComponent(primaryKey)}`, documents, true)
}

export function meilisearchUpdateSettings(index: string, settings: MeilisearchIndexSettings) {
  return request<MeilisearchTask>('PATCH', `/indexes/${encodeURIComponent(index)}/settings`, settings, true)
}

export function meilisearchDeleteDocuments(index: string, documentIds: number[]) {
  const ids = [...new Set(documentIds.filter((id) => Number.isInteger(id) && id > 0))]
  if (!ids.length) return Promise.resolve<MeilisearchResult<MeilisearchTask>>({ ok: false, error: 'No document ids to delete.' })
  return request<MeilisearchTask>('POST', `/indexes/${encodeURIComponent(index)}/documents/delete-batch`, { ids }, true)
}

/**
 * Ensures the configured index exists (creating it on a 404), waiting for
 * Meilisearch's own async task to settle. Mirrors legacy `ensureIndex()`.
 */
export async function meilisearchEnsureIndex(index: string): Promise<MeilisearchResult<true>> {
  const existing = await meilisearchGetIndex(index)
  if (existing.ok) return { ok: true, data: true }
  if (existing.status !== 404) return existing

  const created = await meilisearchCreateIndex(index, 'id')
  if (!created.ok) return created

  const taskUid = created.data.taskUid ?? created.data.uid
  if (taskUid === undefined) return { ok: true, data: true }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const task = await meilisearchGetTask(taskUid)
    if (!task.ok) return task
    if (task.data.status === 'succeeded') return { ok: true, data: true }
    if (task.data.status === 'failed') return { ok: false, error: 'Index creation task failed.' }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  const recheck = await meilisearchGetIndex(index)
  return recheck.ok ? { ok: true, data: true } : recheck
}
