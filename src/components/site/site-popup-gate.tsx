import { cookies } from 'next/headers'

import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { getActiveSitePopup } from '@/lib/site-popups'
import { SitePopupDialog } from './site-popup-dialog'

export async function SitePopupGate() {
  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  const popup = await getActiveSitePopup(Boolean(user))
  if (!popup) return null
  return <SitePopupDialog popup={popup} />
}
