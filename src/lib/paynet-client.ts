import { createHash } from 'node:crypto'

/**
 * Paynet (paynet.md) ecommerce acquiring client for vz-next.
 *
 * Re-implements the parts of legacy's PaynetEcomAPI
 * (application/libraries/paynet/paynet/PaynetAPI.php) actually used by the
 * order-payment flow (Paynet.php's client_server()/paynet_callback()):
 * building the redirect-to-Paynet payment form, and verifying a payment
 * server-side via PaymentGet after the webhook fires. The gift-certificate
 * callback branch (PaymentReg/server_server, WorkApp PostSalesLog/
 * GetNewDigitalCertificateWNominal) is NOT ported — there is no
 * gift-certificate backend in vz-next yet (see
 * src/lib/gift-certificate-delivery.ts's own docstring).
 *
 * SECURITY NOTE (found while porting this, 2026-11-17): legacy's merchant
 * credentials were hardcoded in plaintext in
 * application/libraries/paynet/paynet/PaynetConfig.php, committed to git,
 * pushed to the repo's GitHub remote. The user was told to rotate them.
 * This client takes credentials ONLY from environment variables — never
 * hardcode a merchant code/secret key/API user/password here.
 *
 * Trust model (unchanged from legacy, and worth keeping): the incoming
 * webhook body is never trusted on its own — after it claims a payment is
 * PAID, this client re-queries Paynet's own API (getPayment) for the
 * authoritative status before marking anything paid. Legacy has no
 * webhook-signature check either; neither does this — Paynet's docs don't
 * describe one for this flow, so re-querying is the only verification.
 */

const PAYNET_CURRENCY_MDL = 498
const PAYNET_STATUS_COMPLETED = 4

function paynetApiBaseUrl() {
  return process.env.PAYNET_API_BASE_URL ?? 'https://ecom-api.paynet.md'
}

function paynetFormBaseUrl() {
  return process.env.PAYNET_FORM_BASE_URL ?? 'https://paynet.md/acquiring/setecom'
}

export function isPaynetEnabled() {
  return process.env.PAYNET_ENABLED === 'true'
}

function requireCredentials() {
  const merchantCode = process.env.PAYNET_MERCHANT_CODE
  const secretKey = process.env.PAYNET_MERCHANT_SECRET_KEY
  const apiUser = process.env.PAYNET_MERCHANT_USER
  const apiPassword = process.env.PAYNET_MERCHANT_USER_PASSWORD
  if (!merchantCode || !secretKey || !apiUser || !apiPassword) {
    throw new Error('Paynet credentials are not configured (PAYNET_MERCHANT_CODE/PAYNET_MERCHANT_SECRET_KEY/PAYNET_MERCHANT_USER/PAYNET_MERCHANT_USER_PASSWORD).')
  }
  return { merchantCode, secretKey, apiUser, apiPassword }
}

/** Formats `now + hours` as Paynet's "YYYY-MM-DDTHH:mm:ss" in Europe/Chisinau local time. */
function paynetTimestamp(hoursFromNow: number) {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Chisinau',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

type PaynetProductLine = {
  lineNo: number
  code: string
  barcode: string
  name: string
  description: string
  /** Quantity scaled x100 (Paynet's fixed-point convention — 100 = 1 unit). */
  quantity: number
  /** Unit price scaled x100 (100 = 1 MDL). */
  unitPrice: number
}

export type PaynetPaymentRequest = {
  externalId: string
  linkSuccess: string
  linkCancel: string
  lang: 'ru' | 'ro'
  serviceName: string
  serviceDescription: string
  /** Total amount scaled x100, matching the sum of (price * qty * 100) over products. */
  amountCents: number
  products: PaynetProductLine[]
  customer: { code: string; name: string; surname: string; address: string; phone: string }
}

function signaturePayload(request: PaynetPaymentRequest, merchantCode: string, secretKey: string, expiryDate: string) {
  return (
    String(PAYNET_CURRENCY_MDL) +
    request.customer.address + request.customer.code + request.customer.name +
    expiryDate + request.externalId + merchantCode +
    String(request.amountCents) + request.serviceName + request.serviceDescription +
    secretKey
  )
}

function htmlAttr(value: string) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Builds the auto-submitting HTML form that redirects the browser to
 * Paynet's hosted payment page — the direct equivalent of legacy's
 * PaynetEcomAPI::FormCreate(). This never calls Paynet's API: the
 * signature is computed locally and Paynet verifies it when the form is
 * submitted to them.
 */
export function buildPaynetPaymentForm(request: PaynetPaymentRequest) {
  const { merchantCode, secretKey } = requireCredentials()
  const expiryDate = paynetTimestamp(4)
  const externalDate = paynetTimestamp(0)
  const signature = createHash('md5').update(signaturePayload(request, merchantCode, secretKey, expiryDate), 'utf8').digest('base64')

  const productInputs = request.products.map((item) => [
    `<input type="hidden" name="Services[0][Products][${item.lineNo}][LineNo]" value="${htmlAttr(String(item.lineNo + 1))}"/>`,
    `<input type="hidden" name="Services[0][Products][${item.lineNo}][Code]" value="${htmlAttr(item.code)}"/>`,
    `<input type="hidden" name="Services[0][Products][${item.lineNo}][BarCode]" value="${htmlAttr(item.barcode)}"/>`,
    `<input type="hidden" name="Services[0][Products][${item.lineNo}][Name]" value="${htmlAttr(item.name)}"/>`,
    `<input type="hidden" name="Services[0][Products][${item.lineNo}][Description]" value="${htmlAttr(item.description)}"/>`,
    `<input type="hidden" name="Services[0][Products][${item.lineNo}][Quantity]" value="${item.quantity}"/>`,
    `<input type="hidden" name="Services[0][Products][${item.lineNo}][UnitPrice]" value="${item.unitPrice}"/>`,
  ].join('')).join('')

  const html = `<form method="POST" id="pay_form" action="${paynetFormBaseUrl()}">` +
    `<input type="hidden" name="ExternalID" value="${htmlAttr(request.externalId)}"/>` +
    `<input type="hidden" name="Services[0][Description]" value="${htmlAttr(request.serviceDescription)}"/>` +
    `<input type="hidden" name="Services[0][Name]" value="${htmlAttr(request.serviceName)}"/>` +
    `<input type="hidden" name="Services[0][Amount]" value="${request.amountCents}"/>` +
    productInputs +
    `<input type="hidden" name="Currency" value="${PAYNET_CURRENCY_MDL}"/>` +
    `<input type="hidden" name="Merchant" value="${htmlAttr(merchantCode)}"/>` +
    `<input type="hidden" name="Customer.Code" value="${htmlAttr(request.customer.code)}"/>` +
    `<input type="hidden" name="Customer.Name" value="${htmlAttr(request.customer.name)}"/>` +
    `<input type="hidden" name="Customer.Address" value="${htmlAttr(request.customer.address)}"/>` +
    `<input type="hidden" name="Payer.Email" value="${htmlAttr(request.customer.code)}"/>` +
    `<input type="hidden" name="Payer.Name" value="${htmlAttr(request.customer.name)}"/>` +
    `<input type="hidden" name="Payer.Surname" value="${htmlAttr(request.customer.surname)}"/>` +
    `<input type="hidden" name="Payer.Mobile" value="${htmlAttr(request.customer.phone)}"/>` +
    `<input type="hidden" name="ExternalDate" value="${externalDate}"/>` +
    `<input type="hidden" name="LinkUrlSuccess" value="${htmlAttr(request.linkSuccess)}"/>` +
    `<input type="hidden" name="LinkUrlCancel" value="${htmlAttr(request.linkCancel)}"/>` +
    `<input type="hidden" name="ExpiryDate" value="${expiryDate}"/>` +
    `<input type="hidden" name="Signature" value="${htmlAttr(signature)}"/>` +
    `<input type="hidden" name="Lang" value="${htmlAttr(request.lang)}"/>` +
    `<input type="hidden" name="SaleAreaCode" value="https_vizaje-nica_com"/>` +
    '</form>'

  return html
}

type PaynetTokenResult = { ok: true; accessToken: string } | { ok: false; error: string }

async function getAccessToken(): Promise<PaynetTokenResult> {
  const { apiUser, apiPassword } = requireCredentials()
  try {
    const response = await fetch(`${paynetApiBaseUrl()}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grantType: 'password', username: apiUser, password: apiPassword }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.access_token) return { ok: false, error: data?.Message ?? data?.error ?? `HTTP ${response.status}` }
    return { ok: true, accessToken: data.access_token }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'network error' }
  }
}

export type PaynetPaymentStatus = { ok: true; status: number | null; raw: unknown } | { ok: false; error: string }

/**
 * Re-queries Paynet for the authoritative payment status by externalId —
 * the equivalent of legacy's PaynetEcomAPI::PaymentGet(), called from the
 * webhook handler to confirm a payment before trusting it.
 * PAYNET_STATUS_COMPLETED (4) is the "paid" status, matching legacy.
 */
export async function getPaynetPaymentStatus(externalId: string): Promise<PaynetPaymentStatus> {
  const token = await getAccessToken()
  if (!token.ok) return { ok: false, error: token.error }

  try {
    const response = await fetch(`${paynetApiBaseUrl()}/api/order/merchant/${encodeURIComponent(externalId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token.accessToken}` },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` }

    const status = Array.isArray(data) ? Number(data[0]?.Status) : typeof data?.status === 'number' ? data.status : Number(data?.Status)
    return { ok: true, status: Number.isFinite(status) ? status : null, raw: data }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'network error' }
  }
}

export function isPaynetPaymentCompleted(status: number | null) {
  return status === PAYNET_STATUS_COMPLETED
}
