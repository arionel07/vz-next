export function legacyAsset(path: string | null | undefined, directory = 'products') {
  if (!path) return null

  if (path.startsWith('/legacy-assets/') || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.replace(/^\/+/, '')
  return `/legacy-assets/${directory}/${normalizedPath}`
}
