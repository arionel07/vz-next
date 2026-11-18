import { MysqlSearchProvider } from './mysql-provider'
import { createMeilisearchProvider } from './meilisearch-provider'

import type { SearchProvider } from './types'

// UI and page data depend on this contract, so switching engines only replaces the provider.
const mysqlSearchProvider = new MysqlSearchProvider()
export const searchProvider: SearchProvider = createMeilisearchProvider(mysqlSearchProvider) ?? mysqlSearchProvider

export { normalizeSearchQuery } from './types'
export type { SearchProviderSuggestions } from './types'
