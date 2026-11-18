/**
 * Email senders for the electronic gift certificate flow, mirroring legacy's
 * Paynet.php gift_email.php (recipient delivery) and gift_receipt_email.php
 * (buyer receipt).
 *
 * NOT YET WIRED TO ANYTHING: `ElectronicGiftCardPage` (src/components/site/
 * electronic-gift-card-page.tsx) is still a client-only prototype — its "pay"
 * button just advances a local wizard step, nothing is persisted to the
 * database and no payment is taken (it says so explicitly in its own
 * `demoNote` copy). There is no gift-certificate table, order record, or
 * code-generation logic anywhere in vz-next yet.
 *
 * These two functions are the send-side, ready for whenever a real backend
 * purchase flow exists (which needs its own task: a DB table, a code
 * generator/redemption check, and an API route — none of that is implied by
 * having these senders ready). They deliberately take the certificate code
 * as a plain input rather than generating one, so they stay decoupled from
 * however that backend ends up creating/storing codes.
 */

type CertificateLocale = 'ru' | 'ro'

async function sendViaResend(params: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM
  if (!apiKey || !from) return { sent: false, configured: false }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [params.to], subject: params.subject, text: params.text }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    return { sent: response.ok, configured: true }
  } catch {
    return { sent: false, configured: true }
  }
}

function formatAmount(amount: number, locale: CertificateLocale) {
  return `${Math.round(amount)} MDL`
}

type GiftCertificateRecipientEmail = {
  recipientEmail: string
  recipientName: string
  senderName: string
  amount: number
  message: string
  code: string
  locale: CertificateLocale
}

export async function sendGiftCertificateRecipientEmail(input: GiftCertificateRecipientEmail) {
  const copy = input.locale === 'ro'
    ? {
        subject: 'Ai primit un card cadou Vizaje-Nica',
        intro: `${input.recipientName ? `${input.recipientName}, ` : ''}${input.senderName || 'Cineva'} ți-a trimis un card cadou Vizaje-Nica.`,
        amountLabel: 'Valoare',
        codeLabel: 'Cod card',
        useIt: 'Prezintă acest cod la casă sau la checkout online pentru a-l folosi.',
      }
    : {
        subject: 'Вам подарили сертификат Vizaje-Nica',
        intro: `${input.recipientName ? `${input.recipientName}, ` : ''}${input.senderName || 'Вам'} отправил(а) подарочный сертификат Vizaje-Nica.`,
        amountLabel: 'Номинал',
        codeLabel: 'Код сертификата',
        useIt: 'Назовите этот код на кассе или укажите при оплате на сайте.',
      }

  const lines = [
    copy.intro,
    '',
    `${copy.amountLabel}: ${formatAmount(input.amount, input.locale)}`,
    `${copy.codeLabel}: ${input.code}`,
  ]
  if (input.message) lines.push('', `"${input.message}"`)
  lines.push('', copy.useIt)

  return sendViaResend({ to: input.recipientEmail, subject: copy.subject, text: lines.join('\n') })
}

type GiftCertificatePurchaseReceiptEmail = {
  buyerEmail: string
  amount: number
  code: string
  orderNumber: string
  locale: CertificateLocale
}

export async function sendGiftCertificatePurchaseReceiptEmail(input: GiftCertificatePurchaseReceiptEmail) {
  const copy = input.locale === 'ro'
    ? {
        subject: `Chitanță card cadou Vizaje-Nica #${input.orderNumber}`,
        intro: 'Îți mulțumim pentru achiziție. Cardul cadou a fost trimis destinatarului.',
        amountLabel: 'Valoare',
        codeLabel: 'Cod card',
      }
    : {
        subject: `Чек за сертификат Vizaje-Nica #${input.orderNumber}`,
        intro: 'Спасибо за покупку. Сертификат отправлен получателю.',
        amountLabel: 'Номинал',
        codeLabel: 'Код сертификата',
      }

  const text = [
    copy.intro,
    '',
    `${copy.amountLabel}: ${formatAmount(input.amount, input.locale)}`,
    `${copy.codeLabel}: ${input.code}`,
  ].join('\n')

  return sendViaResend({ to: input.buyerEmail, subject: copy.subject, text })
}
