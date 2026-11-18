import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'

import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { authPasswordResetTokens, authSessions, authVerificationCodes, clients } from '../../drizzle/schema'
import type { AuthUser } from './auth-types'

export const AUTH_SESSION_COOKIE = 'vz_auth_session'
export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 30

function mysqlDate(value = new Date()) {
  return value.toISOString().slice(0, 19).replace('T', ' ')
}

export function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

export function normalizePhone(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 8) return `+373${digits}`
  if (digits.length === 9 && digits.startsWith('0')) return `+373${digits.slice(1)}`
  if (digits.length === 11 && digits.startsWith('373')) return `+${digits}`
  return ''
}

export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function createNumericCode() {
  return String(randomInt(100000, 1000000))
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const digest = scryptSync(password, salt, 64).toString('base64url')
  return `scrypt$${salt}$${digest}`
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false

  if (/^[a-f0-9]{40}$/i.test(storedHash)) {
    const expected = Buffer.from(storedHash.toLowerCase(), 'hex')
    const actual = createHash('sha1').update(password).digest()
    return expected.length === actual.length && timingSafeEqual(actual, expected)
  }

  const [algorithm, salt, encodedDigest] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !encodedDigest) return false

  try {
    const expected = Buffer.from(encodedDigest, 'base64url')
    const actual = scryptSync(password, salt, expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export function isLegacyPasswordHash(storedHash: string | null) {
  return Boolean(storedHash && /^[a-f0-9]{40}$/i.test(storedHash))
}

export function toAuthUser(row: typeof clients.$inferSelect): AuthUser {
  return {
    id: row.id,
    name: row.name || '',
    surname: row.surname ?? null,
    email: row.email ?? '',
    phone: row.phone ?? null,
    isB2B: row.isb2B === 1,
    isCreator: row.isCreator === 1,
  }
}

export async function findClientByIdentity(identity: string) {
  const email = normalizeEmail(identity)
  const phone = normalizePhone(identity)
  const conditions = []
  if (email) conditions.push(eq(clients.email, email))
  if (phone) conditions.push(eq(clients.phone, phone))
  if (!conditions.length) return null

  const rows = await db.select().from(clients).where(or(...conditions)).limit(1)
  return rows[0] ?? null
}

export async function findClientByEmail(email: string) {
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  const rows = await db.select().from(clients).where(eq(clients.email, normalized)).limit(1)
  return rows[0] ?? null
}

export async function findClientById(clientId: number) {
  const [row] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1)
  return row ?? null
}

export async function createSession(clientId: number) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_MAX_AGE * 1000)

  await db.insert(authSessions).values({
    tokenHash: hashToken(token),
    clientId,
    expiresAt: mysqlDate(expiresAt),
    createdAt: mysqlDate(now),
  })

  return token
}

export async function getUserBySessionToken(token: string | undefined) {
  if (!token) return null

  const now = mysqlDate()
  const [session] = await db
    .select({ client: clients })
    .from(authSessions)
    .innerJoin(clients, eq(authSessions.clientId, clients.id))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, now)))
    .limit(1)

  if (!session?.client || session.client.active !== 1 || session.client.code !== 1) return null
  return toAuthUser(session.client)
}

export async function deleteSession(token: string | undefined) {
  if (!token) return
  await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)))
}

export async function invalidateClientSessions(clientId: number) {
  await db.delete(authSessions).where(eq(authSessions.clientId, clientId))
}

export async function createVerificationCode(clientId: number, purpose: 'register' | 'login') {
  const now = new Date()
  const recentCodes = await db
    .select({ createdAt: authVerificationCodes.createdAt })
    .from(authVerificationCodes)
    .where(and(
      eq(authVerificationCodes.clientId, clientId),
      eq(authVerificationCodes.purpose, purpose),
      gt(authVerificationCodes.createdAt, mysqlDate(new Date(now.getTime() - 60 * 60 * 1000))),
    ))
    .orderBy(desc(authVerificationCodes.createdAt))
    .limit(5)

  if (recentCodes.length >= 5) {
    throw new VerificationRateLimitError('Слишком много запросов кода. Попробуйте позже.')
  }

  const lastCodeAt = recentCodes[0]?.createdAt
  if (lastCodeAt) {
    const lastCodeTime = Date.parse(`${lastCodeAt.replace(' ', 'T')}Z`)
    if (Number.isFinite(lastCodeTime) && now.getTime() - lastCodeTime < 45_000) {
      throw new VerificationRateLimitError('Подождите 45 секунд перед повторной отправкой кода.')
    }
  }

  const code = createNumericCode()
  await db.update(authVerificationCodes)
    .set({ usedAt: mysqlDate(now) })
    .where(and(
      eq(authVerificationCodes.clientId, clientId),
      eq(authVerificationCodes.purpose, purpose),
      isNull(authVerificationCodes.usedAt),
    ))

  await db.insert(authVerificationCodes).values({
    clientId,
    purpose,
    codeHash: hashToken(code),
    expiresAt: mysqlDate(new Date(now.getTime() + 10 * 60 * 1000)),
    createdAt: mysqlDate(now),
  })
  return code
}

export class VerificationRateLimitError extends Error {}

export async function consumeVerificationCode(clientId: number, purpose: 'register' | 'login', code: string) {
  const [verification] = await db
    .select()
    .from(authVerificationCodes)
    .where(and(
      eq(authVerificationCodes.clientId, clientId),
      eq(authVerificationCodes.purpose, purpose),
      isNull(authVerificationCodes.usedAt),
      gt(authVerificationCodes.expiresAt, mysqlDate()),
    ))
    .orderBy(desc(authVerificationCodes.createdAt))
    .limit(1)

  if (!verification) return false

  const actualHash = Buffer.from(hashToken(code))
  const expectedHash = Buffer.from(verification.codeHash)
  if (actualHash.length !== expectedHash.length || !timingSafeEqual(actualHash, expectedHash)) {
    const [updated] = await db.update(authVerificationCodes)
      .set({ attemptCount: sql`${authVerificationCodes.attemptCount} + 1` })
      .where(and(
        eq(authVerificationCodes.id, verification.id),
        isNull(authVerificationCodes.usedAt),
        gt(authVerificationCodes.expiresAt, mysqlDate()),
      ))

    if (Number(updated.affectedRows) === 1) {
      const [latest] = await db.select({ attemptCount: authVerificationCodes.attemptCount })
        .from(authVerificationCodes)
        .where(eq(authVerificationCodes.id, verification.id))
        .limit(1)

      if (Number(latest?.attemptCount ?? 0) >= 5) {
        await db.update(authVerificationCodes)
          .set({ usedAt: mysqlDate() })
          .where(and(eq(authVerificationCodes.id, verification.id), isNull(authVerificationCodes.usedAt)))
      }
    }
    return false
  }

  const [result] = await db.update(authVerificationCodes)
    .set({ usedAt: mysqlDate() })
    .where(and(
      eq(authVerificationCodes.id, verification.id),
      isNull(authVerificationCodes.usedAt),
      gt(authVerificationCodes.expiresAt, mysqlDate()),
    ))

  return Number(result.affectedRows) === 1
}

export async function createPasswordResetToken(clientId: number) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  await db.insert(authPasswordResetTokens).values({
    tokenHash: hashToken(token),
    clientId,
    expiresAt: mysqlDate(new Date(now.getTime() + 60 * 60 * 1000)),
    createdAt: mysqlDate(now),
  })
  return token
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = hashToken(token)
  const now = mysqlDate()
  const passwordHash = hashPassword(password)

  return db.transaction(async (tx) => {
    const [resetToken] = await tx.select({ clientId: authPasswordResetTokens.clientId })
      .from(authPasswordResetTokens)
      .where(and(
        eq(authPasswordResetTokens.tokenHash, tokenHash),
        isNull(authPasswordResetTokens.usedAt),
        gt(authPasswordResetTokens.expiresAt, now),
      ))
      .limit(1)

    if (!resetToken) return false

    const [consumed] = await tx.update(authPasswordResetTokens)
      .set({ usedAt: now })
      .where(and(
        eq(authPasswordResetTokens.tokenHash, tokenHash),
        isNull(authPasswordResetTokens.usedAt),
        gt(authPasswordResetTokens.expiresAt, now),
      ))

    if (Number(consumed.affectedRows) !== 1) return false

    await tx.update(clients)
      .set({ password: passwordHash })
      .where(eq(clients.id, resetToken.clientId))
    await tx.update(authPasswordResetTokens)
      .set({ usedAt: now })
      .where(and(
        eq(authPasswordResetTokens.clientId, resetToken.clientId),
        isNull(authPasswordResetTokens.usedAt),
      ))
    await tx.delete(authSessions).where(eq(authSessions.clientId, resetToken.clientId))
    return true
  })
}
