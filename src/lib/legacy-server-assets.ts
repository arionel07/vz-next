import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { legacyAsset } from './legacy-assets'

export function legacyAssetIfExists(path: string | null | undefined, directory: string) {
  if (!path) return null

  const normalizedPath = path.replace(/^\/+/, '')
  const configuredRoot = process.env.LEGACY_ASSET_ROOT
  const roots = configuredRoot
    ? [resolve(configuredRoot)]
    : [resolve(process.cwd(), '..', '..', 'public'), resolve(process.cwd(), 'public')]

  if (!roots.some((root) => existsSync(resolve(root, directory, normalizedPath)))) return null
  return legacyAsset(normalizedPath, directory)
}
