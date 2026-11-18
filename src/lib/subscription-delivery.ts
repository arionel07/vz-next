export async function sendSubscriptionWelcomeEmail(email: string, locale: 'ru' | 'ro') {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM
  if (!apiKey || !from) return { sent: false, configured: false }

  const message = locale === 'ro'
    ? {
        subject: 'Abonare la noutățile Vizaje-Nica',
        text: 'Îți mulțumim. Adresa ta a fost adăugată la lista de noutăți Vizaje-Nica.',
      }
    : {
        subject: 'Подписка на новости Vizaje-Nica',
        text: 'Спасибо. Ваш адрес добавлен в список новостей Vizaje-Nica.',
      }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [email], subject: message.subject, text: message.text }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    return { sent: response.ok, configured: true }
  } catch {
    return { sent: false, configured: true }
  }
}
