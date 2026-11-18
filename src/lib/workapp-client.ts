import { randomUUID } from 'node:crypto'

/**
 * Shared WorkApp/1C HTTP client for vz-next.
 *
 * This is step 1 of the WorkApp/1C sync (per explicit user decision,
 * 2026-11-17): a generic, typed client with timeout/retry/logging/
 * correlation-id handling, matching the *documented* legacy contract
 * (docs/workapp-1c-observed-contract.md) — no business logic (no writes to
 * `clients`, no wiring into login/registration/checkout) is attached yet.
 * That wiring is a separate, later step.
 *
 * Known, accepted risks carried over from legacy as-is (see
 * docs/workapp-1c-observed-contract.md §5 and the project memory on this
 * decision) — NOT fixed by this client, by explicit user choice:
 *   - the endpoint is plain HTTP on a non-standard port, not HTTPS;
 *   - legacy sends no authentication on these calls at all. This client
 *     supports an optional bearer token (WORKAPP_AUTH_TOKEN) so auth can be
 *     turned on later without further code changes, but nothing requires it.
 *
 * What this client DOES add on top of legacy's raw per-controller cURL calls:
 *   - a single place for base URL / timeout / retry / auth config;
 *   - retries (with backoff) only for transient failures (network errors,
 *     408/429/5xx) — never for 4xx, which are treated as permanent;
 *   - a correlation id per request, for tracing across logs — generated
 *     here, not something the WorkApp side necessarily understands;
 *   - phone numbers and customer codes are redacted before being logged,
 *     per the "no PII in logs" requirement in the observed-contract doc;
 *   - JSON parse failures are reported as a normal error result instead of
 *     throwing/crashing the caller.
 */

export type WorkAppResult<T> =
  | { ok: true; data: T; correlationId: string }
  | { ok: false; error: string; status: number | null; correlationId: string }

type WorkAppRequestOptions = {
  method: 'GET' | 'POST'
  path: string
  body?: unknown
  timeoutMs?: number
  maxRetries?: number
}

function baseUrl() {
  return (process.env.WORKAPP_BASE_URL ?? 'http://api.vizaje-nica.com:90/Vizaje-Nica/hs/WORKAPP').replace(/\/+$/, '')
}

export function isWorkAppEnabled() {
  return process.env.WORKAPP_ENABLED === 'true'
}

function redactPathSegment(segment: string) {
  if (segment.length <= 5) return '*'.repeat(segment.length)
  return `${segment.slice(0, 2)}${'*'.repeat(segment.length - 4)}${segment.slice(-2)}`
}

/** Redacts phone numbers / customer codes in a WorkApp path for safe logging. */
function redactPathForLogging(path: string) {
  const segments = path.split('/')
  return segments
    .map((segment) => (/^[+()0-9A-Za-z-]{4,}$/.test(segment) && segment !== 'GetCustomerByPhone' && segment !== 'GetBonusAccum' ? redactPathSegment(segment) : segment))
    .join('/')
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Low-level typed request helper. Not exported for direct ad-hoc use by
 * routes — use the typed wrappers below (getCustomerByPhone, etc.) so every
 * call site stays aligned with the documented WorkApp contract.
 */
async function workAppRequest<T>(options: WorkAppRequestOptions): Promise<WorkAppResult<T>> {
  const correlationId = randomUUID()
  const url = `${baseUrl()}${options.path}`
  const timeoutMs = options.timeoutMs ?? Number(process.env.WORKAPP_TIMEOUT_MS ?? 10_000)
  const maxRetries = options.maxRetries ?? Number(process.env.WORKAPP_MAX_RETRIES ?? 2)
  const authToken = process.env.WORKAPP_AUTH_TOKEN

  const headers: Record<string, string> = { 'X-Correlation-Id': correlationId }
  if (options.method === 'POST') headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  let lastError: { error: string; status: number | null } = { error: 'unknown error', status: null }

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        lastError = { error: `WorkApp responded with HTTP ${response.status}`, status: response.status }
        if (isRetryableStatus(response.status) && attempt < maxRetries) {
          console.warn(`[workapp] ${options.method} ${redactPathForLogging(options.path)} failed (status ${response.status}), retrying [${correlationId}]`)
          await delay(2 ** attempt * 300)
          continue
        }
        console.error(`[workapp] ${options.method} ${redactPathForLogging(options.path)} failed (status ${response.status}) [${correlationId}]`)
        return { ok: false, error: lastError.error, status: lastError.status, correlationId }
      }

      const text = await response.text()
      if (!text) return { ok: false, error: 'WorkApp returned an empty response body', status: response.status, correlationId }

      try {
        return { ok: true, data: JSON.parse(text) as T, correlationId }
      } catch {
        console.error(`[workapp] ${options.method} ${redactPathForLogging(options.path)} returned invalid JSON [${correlationId}]`)
        return { ok: false, error: 'WorkApp returned invalid JSON', status: response.status, correlationId }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'network error'
      lastError = { error: message, status: null }
      if (attempt < maxRetries) {
        console.warn(`[workapp] ${options.method} ${redactPathForLogging(options.path)} network error, retrying [${correlationId}]: ${message}`)
        await delay(2 ** attempt * 300)
        continue
      }
      console.error(`[workapp] ${options.method} ${redactPathForLogging(options.path)} network error [${correlationId}]: ${message}`)
      return { ok: false, error: message, status: null, correlationId }
    }
  }

  return { ok: false, error: lastError.error, status: lastError.status, correlationId }
}

function normalizePhoneForWorkApp(phone: string) {
  return phone.replace(/[+()]/g, '')
}

export type WorkAppCustomer = {
  Code?: string
  Name?: string
  Discount?: number
  [key: string]: unknown
}

export type WorkAppBonus = {
  Bonus?: number
  [key: string]: unknown
}

/**
 * GET GetCustomerByPhone/{phone}. Mirrors legacy's retry-with-0-prefix
 * fallback (legacy retries with the "373" country-code prefix replaced by a
 * local "0" prefix when the first response has no Discount field) — but
 * only that one documented fallback, nothing else.
 */
export async function getCustomerByPhone(phone: string): Promise<WorkAppResult<WorkAppCustomer>> {
  const international = normalizePhoneForWorkApp(phone)
  const first = await workAppRequest<WorkAppCustomer>({ method: 'GET', path: `/GetCustomerByPhone/${encodeURIComponent(international)}` })
  if (first.ok && first.data.Discount !== undefined && first.data.Discount !== null) return first

  const local = international.replace(/^373/, '0')
  if (local === international) return first
  return workAppRequest<WorkAppCustomer>({ method: 'GET', path: `/GetCustomerByPhone/${encodeURIComponent(local)}` })
}

/** GET GetBonusAccum/{code}. */
export async function getBonusAccum(code: string): Promise<WorkAppResult<WorkAppBonus>> {
  const trimmedCode = code.replace(/\s+/g, '')
  return workAppRequest<WorkAppBonus>({ method: 'GET', path: `/GetBonusAccum/${encodeURIComponent(trimmedCode)}` })
}

export type WorkAppCustomerInfo = {
  phone: string
  name?: string
  surname?: string
  /** ISO date (YYYY-MM-DD) or already-formatted YYYYMMDD; normalized below. */
  birthDate?: string
}

/** POST PostCustomerInfoByPhone. Applies the same defaults legacy applies when fields are missing. */
export async function postCustomerInfoByPhone(info: WorkAppCustomerInfo): Promise<WorkAppResult<unknown>> {
  const birthDate = info.birthDate
    ? info.birthDate.replace(/-/g, '').slice(0, 8).padEnd(8, '0')
    : '19950101'

  return workAppRequest({
    method: 'POST',
    path: '/PostCustomerInfoByPhone',
    body: {
      Phone: normalizePhoneForWorkApp(info.phone),
      Name: info.name?.trim() || 'Client',
      Surname: info.surname?.trim() || ' ',
      BirthDate: birthDate,
    },
  })
}
