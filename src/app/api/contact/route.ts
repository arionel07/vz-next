import { NextResponse } from 'next/server'

import { db } from '@/db'
import { getContactPage } from '@/lib/contacts'
import { sendContactNotification } from '@/lib/contact-delivery'
import { siteFeedback } from '../../../../drizzle/schema'

function text(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ message: 'Некорректная форма.' }, { status: 400 })
  }

  const submittedLocale = text(form.get('locale'))
  if (submittedLocale && submittedLocale !== 'ru' && submittedLocale !== 'ro') {
    return NextResponse.json({ message: 'Некорректный язык формы.' }, { status: 422 })
  }
  const locale = submittedLocale === 'ro' ? 'ro' : 'ru'
  const name = text(form.get('name'))
  const phone = text(form.get('phone'))
  const email = text(form.get('email'))
  const comments = text(form.get('comments'))
  const copy = locale === 'ro'
    ? {
        required: 'Completează câmpurile obligatorii.',
        email: 'Introdu o adresă de email validă.',
        length: 'Verifică lungimea câmpurilor completate.',
        unavailable: 'Mesajul nu a putut fi salvat. Încearcă din nou.',
        sent: 'Mesajul a fost trimis. Te vom contacta în curând.',
        saved: 'Mesajul a fost salvat, dar notificarea către echipă nu a fost trimisă. Contactează-ne prin Telegram sau telefon.',
      }
    : {
        required: 'Заполните обязательные поля.',
        email: 'Введите корректный адрес электронной почты.',
        length: 'Проверьте длину заполненных полей.',
        unavailable: 'Не удалось сохранить сообщение. Попробуйте ещё раз.',
        sent: 'Сообщение отправлено. Вскоре с вами свяжутся.',
        saved: 'Сообщение сохранено, но команду не удалось уведомить. Напишите нам в Telegram или позвоните.',
      }

  if (!name || !phone || !email) {
    return NextResponse.json({ message: copy.required }, { status: 422 })
  }

  if (name.length > 255 || phone.length > 64 || email.length > 255 || comments.length > 5000) {
    return NextResponse.json({ message: copy.length }, { status: 422 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: copy.email }, { status: 422 })
  }

  try {
    const contact = await getContactPage(locale)
    const pagePath = locale === 'ro' ? '/ro/contacte' : '/ru/kontaktyi'
    const feedbackMessage = locale === 'ro'
      ? [`Nume: ${name}`, `Telefon: ${phone}`, `Email: ${email}`, `Mesaj: ${comments || '—'}`].join('\n')
      : [`Имя: ${name}`, `Телефон: ${phone}`, `Email: ${email}`, `Сообщение: ${comments || '—'}`].join('\n')

    await db.insert(siteFeedback).values({
      feedbackType: 'question',
      message: feedbackMessage,
      pagePath,
      locale,
      status: 'new',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })

    const notification = await sendContactNotification({
      to: contact.email,
      replyTo: email,
      locale,
      name,
      phone,
      email,
      comments,
    })

    return NextResponse.json({ ok: true, notified: notification.sent, message: notification.sent ? copy.sent : copy.saved })
  } catch {
    return NextResponse.json({ message: copy.unavailable }, { status: 503 })
  }
}
