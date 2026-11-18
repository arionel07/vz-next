import 'server-only'

import { and, asc, count, eq, like, or, type SQL } from 'drizzle-orm'

import { db } from '@/db'
import { constants } from '../../drizzle/schema'
import { ADMIN_SETTINGS_PAGE_SIZE, type AdminSettingGroup } from '@/lib/admin-settings-shared'

export async function getAdminSettingsList(options: {
  query?: string
  group?: AdminSettingGroup
  page?: number
}) {
  const query = options.query?.trim().slice(0, 120) ?? ''
  const filters: SQL[] = []

  if (options.group) filters.push(eq(constants.groupes, options.group))
  if (query) {
    const pattern = `%${query}%`
    filters.push(or(
      like(constants.name, pattern),
      like(constants.description, pattern),
      like(constants.ru, pattern),
      like(constants.ro, pattern),
    )!)
  }

  const where = filters.length ? and(...filters) : undefined
  const [totalRow] = await db.select({ value: count() }).from(constants).where(where)
  const total = Number(totalRow?.value ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_SETTINGS_PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.floor(options.page ?? 1)), pageCount)
  const rows = await db.select({
    id: constants.id,
    name: constants.name,
    description: constants.description,
    ru: constants.ru,
    ro: constants.ro,
    fieldType: constants.fieldType,
    group: constants.groupes,
  })
    .from(constants)
    .where(where)
    .orderBy(asc(constants.groupes), asc(constants.sorder), asc(constants.id))
    .limit(ADMIN_SETTINGS_PAGE_SIZE)
    .offset((page - 1) * ADMIN_SETTINGS_PAGE_SIZE)

  return { rows, total, page, pageCount, pageSize: ADMIN_SETTINGS_PAGE_SIZE }
}
