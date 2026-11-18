export async function sendSmsCode(phone: string, code: string, locale: 'ru' | 'ro' = 'ru') {
  const username = process.env.SMS_USERNAME
  const password = process.env.SMS_PASSWORD

  if (!username || !password) {
    return { sent: false, configured: false }
  }

  const endpoint = new URL(process.env.SMS_API_URL ?? 'https://messages.inter-mob.com/sms.asp')
  endpoint.searchParams.set('username', username)
  endpoint.searchParams.set('password', password)
  endpoint.searchParams.set('from', process.env.SMS_FROM ?? 'Vizaje-Nica')
  endpoint.searchParams.set('to', phone)
  endpoint.searchParams.set('text', locale === 'ro'
    ? `Vizaje-Nica. Cod de autorizare: ${code}`
    : `Vizaje-Nica. Код подтверждения: ${code}`)
  endpoint.searchParams.set('coding', '2')
  endpoint.searchParams.set('charset', 'utf-8')

  try {
    const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    return { sent: response.ok, configured: true }
  } catch {
    return { sent: false, configured: true }
  }
}

export async function sendRegistrationWelcomeEmail(email: string, name: string, locale: 'ru' | 'ro' = 'ru') {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM
  if (!apiKey || !from) return { sent: false, configured: false }

  const copy = locale === 'ro'
    ? { subject: 'Bun venit la Vizaje-Nica', text: (greetName: string) => `${greetName ? `${greetName}, ` : ''}contul tău Vizaje-Nica a fost creat cu succes. Îți mulțumim că ai ales Vizaje-Nica!` }
    : { subject: 'Добро пожаловать в Vizaje-Nica', text: (greetName: string) => `${greetName ? `${greetName}, ` : ''}ваш аккаунт Vizaje-Nica успешно создан. Спасибо, что выбрали Vizaje-Nica!` }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [email], subject: copy.subject, text: copy.text(name.trim()) }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    return { sent: response.ok, configured: true }
  } catch {
    return { sent: false, configured: true }
  }
}

export async function sendPasswordResetEmail(email: string, token: string, locale: 'ru' | 'ro' = 'ru') {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000'
  const resetPath = locale === 'ro' ? '/ro/resetati-parola' : '/ru/password-reset'
  const resetUrl = `${baseUrl.replace(/\/$/, '')}${resetPath}?token=${encodeURIComponent(token)}`
  const copy = locale === 'ro'
    ? { subject: 'Recuperarea parolei Vizaje-Nica', intro: 'Pentru a seta o parolă nouă, accesează linkul:', validity: 'Linkul este valabil o oră.' }
    : { subject: 'Восстановление пароля Vizaje-Nica', intro: 'Чтобы создать новый пароль, перейдите по ссылке:', validity: 'Ссылка действительна один час.' }

  if (!apiKey || !from) return { sent: false, configured: false, resetUrl }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: copy.subject,
        html: `<p>${copy.intro}</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>${copy.validity}</p>`,
      }),
      cache: 'no-store',
    })

    return { sent: response.ok, configured: true, resetUrl }
  } catch {
    return { sent: false, configured: true, resetUrl }
  }
}
