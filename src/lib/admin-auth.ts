import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { and, eq, gt, lt, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { db } from '@/db'
import { adminLoginAttempts, adminSessions, admins } from '../../drizzle/schema'

export const ADMIN_SESSION_COOKIE = 'vz_admin_session'
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8
export const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000
export const ADMIN_LOGIN_MAX_ATTEMPTS = 5

export type CurrentAdmin = {
  id: number
  login: string
}

function mysqlDate(value = new Date()) {
  return value.toISOString().slice(0, 19).replace('T', ' ')
}

export function hashAdminSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function getAdminLoginAttemptKey(login: string, remoteAddress: string) {
  return createHash('sha256')
    .update(`${login.trim().toLowerCase()}\0${remoteAddress.slice(0, 128)}`)
    .digest('hex')
}

export function verifyLegacyAdminPassword(password: string, storedHash: string) {
  const actual = createHash('sha256').update(password).digest()
  const expected = /^[a-f\d]{64}$/i.test(storedHash)
    ? Buffer.from(storedHash, 'hex')
    : Buffer.alloc(actual.length)

  return timingSafeEqual(actual, expected)
}

export async function createAdminSession(adminId: number) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()

  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, mysqlDate(now)))
  await db.insert(adminSessions).values({
    tokenHash: hashAdminSessionToken(token),
    adminId,
    expiresAt: mysqlDate(new Date(now.getTime() + ADMIN_SESSION_MAX_AGE * 1000)),
    createdAt: mysqlDate(now),
  })

  return token
}

export async function getAdminBySessionToken(token: string | undefined): Promise<CurrentAdmin | null> {
  if (!token) return null

  const [row] = await db
    .select({ id: admins.id, login: admins.login })
    .from(adminSessions)
    .innerJoin(admins, eq(adminSessions.adminId, admins.id))
    .where(and(
      eq(adminSessions.tokenHash, hashAdminSessionToken(token)),
      gt(adminSessions.expiresAt, mysqlDate()),
      eq(admins.status, 1),
    ))
    .limit(1)

  return row ?? null
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value
  return getAdminBySessionToken(token)
}

export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')
  return admin
}

export async function deleteAdminSession(token: string | undefined) {
  if (!token) return
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashAdminSessionToken(token)))
}

export async function countRecentAdminLoginAttempts(attemptKey: string) {
  const cutoff = mysqlDate(new Date(Date.now() - ADMIN_LOGIN_WINDOW_MS))
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(adminLoginAttempts)
    .where(and(
      eq(adminLoginAttempts.attemptKey, attemptKey),
      gt(adminLoginAttempts.createdAt, cutoff),
    ))

  return Number(row?.count ?? 0)
}

export async function recordFailedAdminLogin(attemptKey: string) {
  const now = new Date()
  await db
    .delete(adminLoginAttempts)
    .where(lt(adminLoginAttempts.createdAt, mysqlDate(new Date(now.getTime() - 24 * 60 * 60 * 1000))))
  await db.insert(adminLoginAttempts).values({ attemptKey, createdAt: mysqlDate(now) })
}

export async function clearAdminLoginAttempts(attemptKey: string) {
  await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.attemptKey, attemptKey))
}
