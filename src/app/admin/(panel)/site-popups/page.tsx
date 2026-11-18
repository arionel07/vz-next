import { desc, asc } from 'drizzle-orm'

import { db } from '@/db'
import { AdminSitePopupsManager } from '@/components/admin/admin-site-popups-manager'
import { sitePopups } from '../../../../../drizzle/schema'

export default async function AdminSitePopupsPage() {
  const popups = await db.select().from(sitePopups).orderBy(desc(sitePopups.sorder), asc(sitePopups.id))
  return <AdminSitePopupsManager initialPopups={popups} />
}
