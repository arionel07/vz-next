import { getPopularSearchQueries, getSearchSuggestions, recordSearchQuery } from '@/lib/catalog'
import { getPathLocale } from '@/lib/locale-routing'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const locale = getPathLocale(`/${url.searchParams.get('locale') ?? 'ru'}`)
  const query = url.searchParams.get('q') ?? ''

  try {
    if (query.trim().length >= 2) {
      return Response.json({ suggestions: await getSearchSuggestions(query, locale) })
    }
    return Response.json({ popular: await getPopularSearchQueries(8) })
  } catch {
    return Response.json({ error: 'Search is temporarily unavailable' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    const query = body && typeof body === 'object' && 'query' in body ? body.query : ''
    const recorded = await recordSearchQuery(typeof query === 'string' ? query : '')
    return Response.json({ recorded })
  } catch {
    return Response.json({ recorded: false }, { status: 503 })
  }
}
