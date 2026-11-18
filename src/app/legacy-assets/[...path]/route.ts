import { access, readFile } from 'node:fs/promises'
import { join, normalize, relative, resolve } from 'node:path'

const contentTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
}

const remoteProductImageDirectories = new Set(['products', 'products_variable_img'])
const remoteProductImageTypes = new Set(['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'])

async function getRemoteProductImage(pathSegments: string[]) {
  const [directory, fileName] = pathSegments
  if (
    pathSegments.length !== 2
    || !remoteProductImageDirectories.has(directory ?? '')
    || !/^[\da-z_-]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(fileName ?? '')
  ) {
    return null
  }

  try {
    const remoteUrl = `https://vizaje-nica.com/public/${directory}/${encodeURIComponent(fileName)}`
    const response = await fetch(remoteUrl, {
      cache: 'force-cache',
      next: { revalidate: 86_400 },
    })
    const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()

    if (!response.ok || !contentType || !remoteProductImageTypes.has(contentType)) return null

    return new Response(response.body, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Type': contentType,
      },
    })
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const configuredRoot = process.env.LEGACY_ASSET_ROOT
  const pathSegments = path.map((segment) => segment.replace(/[\\/]/g, ''))
  const publicDirectories = new Set(['offers', 'beauty_selections', 'brands', 'brand_certificates', 'categories', 'menu', 'banners', 'popups', 'articles', 'stores', 'products', 'products_variable_img', 'sliders', 'home_categories', 'home_brand_sections'])
  const hasWorkspacePrefix = pathSegments[0] === 'b2b'
  const hasAppPrefix = pathSegments[0] === 'app'
  const hasDirectoryPrefix = publicDirectories.has(pathSegments[0] ?? '')
  const candidateRoots = configuredRoot
    ? [resolve(configuredRoot)]
    : hasWorkspacePrefix
      ? [resolve(process.cwd(), '..', '..', 'app')]
      : hasAppPrefix
      ? [resolve(process.cwd(), '..', '..', 'app'), resolve(process.cwd(), 'public')]
      : hasDirectoryPrefix
      ? [resolve(process.cwd(), '..', '..', 'public'), resolve(process.cwd(), 'public')]
      : [
          resolve(process.cwd(), 'public', 'products'),
          resolve(process.cwd(), '..', '..', 'public', 'products'),
        ]
  let assetRoot = candidateRoots[0]

  for (const candidateRoot of candidateRoots) {
    try {
      await access(candidateRoot)
      assetRoot = candidateRoot
      break
    } catch {
      // Try the next known workspace layout.
    }
  }
  const assetPathSegments = hasWorkspacePrefix || hasAppPrefix ? pathSegments.slice(1) : pathSegments
  const filePath = resolve(assetRoot, normalize(join(...assetPathSegments)))

  if (relative(assetRoot, filePath).startsWith('..')) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const file = await readFile(filePath)
    const extension = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()

    return new Response(file, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
      },
    })
  } catch {
    if (remoteProductImageDirectories.has(pathSegments[0] ?? '')) {
      return await getRemoteProductImage(pathSegments) ?? new Response('Not found', { status: 404 })
    }

    return new Response('Not found', { status: 404 })
  }
}
