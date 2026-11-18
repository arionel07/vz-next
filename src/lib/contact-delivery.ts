type ContactNotification = {
  to: string
  replyTo: string
  locale: 'ru' | 'ro'
  name: string
  phone: string
  email: string
  comments: string
}

type PrivacyRequestNotification = {
  to: string
  replyTo: string
  locale: 'ru' | 'ro'
  clientId: number
  phone: string
  email: string
  requestType: string
  details: string
}

export async function sendContactNotification(input: ContactNotification) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM

  if (!apiKey || !from || !input.to) return { sent: false, configured: false }

  const copy = input.locale === 'ro'
    ? {
        subject: 'Solicitare de pe site Vizaje-Nica',
        heading: 'Solicitare nouă de pe site:',
        name: 'Nume',
        phone: 'Telefon',
        email: 'Email',
        comments: 'Mesaj',
      }
    : {
        subject: 'Обращение с сайта Vizaje-Nica',
        heading: 'Новое обращение с сайта:',
        name: 'Имя',
        phone: 'Телефон',
        email: 'Email',
        comments: 'Сообщение',
      }
  const text = [
    copy.heading,
    `${copy.name}: ${input.name}`,
    `${copy.phone}: ${input.phone}`,
    `${copy.email}: ${input.email}`,
    `${copy.comments}: ${input.comments || '—'}`,
  ].join('\n')

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [input.to], reply_to: input.replyTo, subject: copy.subject, text }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    return { sent: response.ok, configured: true }
  } catch {
    return { sent: false, configured: true }
  }
}

export async function sendPrivacyRequestNotification(input: PrivacyRequestNotification) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM

  if (!apiKey || !from || !input.to) return { sent: false, configured: false }

  const copy = input.locale === 'ro'
    ? { subject: 'Solicitare privind datele personale', heading: 'Solicitare privind datele personale:', client: 'ID client', phone: 'Telefon', email: 'Email', type: 'Tip', details: 'Detalii' }
    : { subject: 'Запрос по персональным данным', heading: 'Запрос по персональным данным:', client: 'ID клиента', phone: 'Телефон', email: 'Email', type: 'Тип запроса', details: 'Комментарий' }
  const text = [
    copy.heading,
    `${copy.client}: ${input.clientId}`,
    `${copy.email}: ${input.email}`,
    `${copy.phone}: ${input.phone}`,
    `${copy.type}: ${input.requestType}`,
    '',
    `${copy.details}:`,
    input.details,
  ].join('\n')

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [input.to], reply_to: input.replyTo, subject: copy.subject, text }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    return { sent: response.ok, configured: true }
  } catch {
    return { sent: false, configured: true }
  }
}
