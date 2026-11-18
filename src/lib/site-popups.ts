import { and, desc, eq, or, isNull, lte, gte } from 'drizzle-orm'

import { db } from '@/db'
import { sitePopups } from '../../drizzle/schema'

export type ActiveSitePopup = {
  id: number
  titleRu: string
  titleRo: string
  textRu: string
  textRo: string
  image: string | null
  ctaLabelRu: string
  ctaLabelRo: string
  ctaUrl: string
  reshowDays: number
}

/**
 * Picks the single popup to show right now, given whether the visitor is
 * logged in. `audience: 'all'` matches everyone; `guest`/`authenticated`
 * only match the matching visitor state. Among several matching popups
 * (admin can leave more than one active), the highest `sorder` wins, then
 * the most recently created.
 */
export async function getActiveSitePopup(isAuthenticated: boolean): Promise<ActiveSitePopup | null> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const audienceMatch = isAuthenticated ? 'authenticated' : 'guest'

  const [popup] = await db
    .select({
      id: sitePopups.id,
      titleRu: sitePopups.titleRu,
      titleRo: sitePopups.titleRo,
      textRu: sitePopups.textRu,
      textRo: sitePopups.textRo,
      image: sitePopups.image,
      ctaLabelRu: sitePopups.ctaLabelRu,
      ctaLabelRo: sitePopups.ctaLabelRo,
      ctaUrl: sitePopups.ctaUrl,
      reshowDays: sitePopups.reshowDays,
    })
    .from(sitePopups)
    .where(and(
      eq(sitePopups.isShown, 1),
      or(eq(sitePopups.audience, 'all'), eq(sitePopups.audience, audienceMatch)),
      or(isNull(sitePopups.startAt), lte(sitePopups.startAt, now)),
      or(isNull(sitePopups.endAt), gte(sitePopups.endAt, now)),
    ))
    .orderBy(desc(sitePopups.sorder), desc(sitePopups.id))
    .limit(1)

  return popup ?? null
}
