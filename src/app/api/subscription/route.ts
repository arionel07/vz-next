import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { sendSubscriptionWelcomeEmail } from '@/lib/subscription-delivery'
import { subscriptions } from '../../../../drizzle/schema'

function value(form: FormData, key: string) {
  const field = form.get(key)
  return typeof field === 'string' ? field.trim() : ''
}

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ message: 'Некорректная форма.' }, { status: 400 })
  }

  const email = value(form, 'subscribe').toLowerCase()
  const submittedLocale = value(form, 'lang').toLowerCase()
  if (submittedLocale && submittedLocale !== 'ru' && submittedLocale !== 'ro') {
    return NextResponse.json({ message: 'Некорректный язык формы.' }, { status: 422 })
  }
  const locale = submittedLocale === 'ro' ? 'ro' : 'ru'
  const messages = locale === 'ro'
    ? {
        invalid: 'Introdu o adresă de email validă.',
        length: 'Adresa de email este prea lungă.',
        duplicate: 'Această adresă este deja abonată.',
        saved: 'Abonarea a fost salvată, dar emailul de bun venit nu a putut fi trimis.',
        success: 'Mulțumim. Te-ai abonat la noutățile Vizaje-Nica.',
        unavailable: 'Abonarea nu a putut fi salvată. Încearcă din nou.',
      }
    : {
        invalid: 'Введите корректный адрес электронной почты.',
        length: 'Адрес электронной почты слишком длинный.',
        duplicate: 'Этот адрес уже подписан на рассылку.',
        saved: 'Подписка сохранена, но приветственное письмо отправить не удалось.',
        success: 'Спасибо. Вы подписались на новости Vizaje-Nica.',
        unavailable: 'Не удалось сохранить подписку. Попробуйте ещё раз.',
      }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    return NextResponse.json({ message: messages.invalid }, { status: 422 })
  }
  if (email.length > 254) {
    return NextResponse.json({ message: messages.length }, { status: 422 })
  }

  try {
    const [existing] = await db.select({ id: subscriptions.id })
      .from(subscriptions)
      .where(sql`LOWER(${subscriptions.email}) = ${email}`)
      .limit(1)

    if (existing) return NextResponse.json({ message: messages.duplicate }, { status: 409 })

    await db.insert(subscriptions).values({ email, mailing: 1, isShown: 1 })
    const delivery = await sendSubscriptionWelcomeEmail(email, locale)
    return NextResponse.json({
      ok: true,
      emailSent: delivery.sent,
      message: delivery.sent ? messages.success : messages.saved,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ message: messages.unavailable }, { status: 503 })
  }
}
