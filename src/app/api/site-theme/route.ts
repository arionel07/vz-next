import { NextResponse } from 'next/server'

import { db } from '@/db'
import { isSiteThemeKey } from '@/lib/site-theme-shared'
import { siteThemeSettings } from '../../../../drizzle/schema'

export async function GET() {
  try {
    const [setting] = await db.select({ themeKey: siteThemeSettings.themeKey }).from(siteThemeSettings).limit(1)
    const themeKey = setting?.themeKey && isSiteThemeKey(setting.themeKey) ? setting.themeKey : 'default'
    return NextResponse.json({ themeKey }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // The storefront remains usable with its default appearance if the setting table is not installed yet.
    return NextResponse.json({ themeKey: 'default' }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
