const STORAGE_KEY = 'vizaje-nica:recent-searches:v1'

export function readRecentSearches() {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 5)
      : []
  } catch {
    return []
  }
}

export function addRecentSearch(value: string) {
  const query = value.trim().replace(/\s+/gu, ' ').slice(0, 80)
  if ([...query].length < 2) return readRecentSearches()

  const next = [query, ...readRecentSearches().filter((item) => item.toLocaleLowerCase() !== query.toLocaleLowerCase())].slice(0, 5)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private browsing or storage limits may prevent local history from being saved.
  }
  return next
}

export function clearRecentSearches() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // History is optional and remains available only in this browser.
  }
}
