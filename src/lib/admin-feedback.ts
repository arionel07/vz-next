import 'server-only'

import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm'

import { db } from '@/db'
import { siteFeedback } from '../../drizzle/schema'
import type { AdminFeedbackStatus } from '@/lib/admin-feedback-shared'

export const ADMIN_FEEDBACK_PAGE_SIZE = 20

export async function getAdminFeedbackList(options: {
  query?: string
  status?: AdminFeedbackStatus
  page?: number
}) {
  const query = options.query?.trim().slice(0, 120) ?? ''
  const filters: SQL[] = []

  if (options.status) filters.push(eq(siteFeedback.status, options.status))
  if (query) {
    const pattern = `%${query}%`
    filters.push(or(
      like(siteFeedback.message, pattern),
      like(siteFeedback.pagePath, pattern),
      like(siteFeedback.referenceUrl, pattern),
    )!)
  }

  const where = filters.length ? and(...filters) : undefined
  const [[totalRow], statusRows] = await Promise.all([
    db.select({ value: count() }).from(siteFeedback).where(where),
    db.select({ status: siteFeedback.status, value: count() }).from(siteFeedback).groupBy(siteFeedback.status),
  ])
  const total = Number(totalRow?.value ?? 0)
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_FEEDBACK_PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.floor(options.page ?? 1)), pageCount)
  const rows = await db.select({
    id: siteFeedback.id,
    feedbackType: siteFeedback.feedbackType,
    message: siteFeedback.message,
    pagePath: siteFeedback.pagePath,
    referenceUrl: siteFeedback.referenceUrl,
    locale: siteFeedback.locale,
    status: siteFeedback.status,
    createdAt: siteFeedback.createdAt,
    updatedAt: siteFeedback.updatedAt,
  })
    .from(siteFeedback)
    .where(where)
    .orderBy(desc(siteFeedback.createdAt), desc(siteFeedback.id))
    .limit(ADMIN_FEEDBACK_PAGE_SIZE)
    .offset((page - 1) * ADMIN_FEEDBACK_PAGE_SIZE)

  const counts = { all: 0, new: 0, in_progress: 0, done: 0, rejected: 0 }
  for (const row of statusRows) counts[row.status] = Number(row.value)
  counts.all = Object.values(counts).reduce((sum, value) => sum + value, 0)

  return { rows, total, page, pageCount, pageSize: ADMIN_FEEDBACK_PAGE_SIZE, counts }
}
