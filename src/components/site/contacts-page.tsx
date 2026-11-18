'use client'

import { LocalizedLink as Link } from '@/components/site/localized-link'
import { ArrowRight, CheckCircle2, Clock3, Mail, MapPin, Phone, Send } from 'lucide-react'
import { FormEvent, useState } from 'react'

import type { ContactPageData } from '@/lib/contacts'
import type { StoreLocale } from '@/lib/locale-routing'


function ContactIcon({ type }: { type: 'address' | 'hours' | 'phone' | 'email' }) {
  if (type === 'address') return <MapPin size={21} strokeWidth={1.4} />
  if (type === 'hours') return <Clock3 size={21} strokeWidth={1.4} />
  if (type === 'phone') return <Phone size={21} strokeWidth={1.4} />
  return <Mail size={21} strokeWidth={1.4} />
}

function ContactDetail({ type, label, children }: { type: 'address' | 'hours' | 'phone' | 'email'; label: string; children: React.ReactNode }) {
  return (
    <article className="contact-detail">
      <div className="contact-detail__icon" aria-hidden="true"><ContactIcon type={type} /></div>
      <div className="contact-detail__content">
        <span className="contact-detail__label">{label}</span>
        <div className="contact-detail__value">{children}</div>
      </div>
    </article>
  )
}

export function ContactsPage({ data, locale = 'ru' }: { data: ContactPageData; locale?: StoreLocale }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const text = locale === 'ro'
    ? { intro: 'Te ajutăm cu întrebări despre produse, comenzi, livrare și magazine.', info: 'Informații de contact', how: 'Cum ne poți contacta', telegram: 'Suport pe Telegram', request: 'Mesaj', write: 'Scrie-ne', formIntro: 'Completează formularul și îți vom răspunde în curând.', name: 'Nume', phone: 'Telefon', email: 'Email', message: 'Mesaj', sending: 'Se trimite…', send: 'Trimite', sent: 'Mesajul a fost trimis. Te vom contacta în curând.', savedWithoutNotification: 'Mesajul a fost salvat, dar notificarea către echipă nu a fost trimisă. Contactează-ne prin Telegram sau telefon.', error: 'Mesajul nu a putut fi trimis.', unavailable: 'Serviciul este temporar indisponibil. Încearcă din nou.', stores: 'Magazine Vizaje-Nica', nearest: 'Găsește cel mai apropiat magazin', allStores: 'Vezi toate magazinele' }
    : { intro: 'Мы готовы помочь с вопросами о товарах, заказах, доставке и магазинах.', info: 'Контактная информация', how: 'Как с нами связаться', telegram: 'Поддержка в Telegram', request: 'Обращение', write: 'Напишите нам', formIntro: 'Заполните форму, и мы ответим вам в ближайшее время.', name: 'Имя', phone: 'Телефон', email: 'Email', message: 'Сообщение', sending: 'Отправляем…', send: 'Отправить', sent: 'Сообщение было отправлено. Вскоре с вами свяжутся.', savedWithoutNotification: 'Сообщение сохранено, но команду не удалось уведомить. Напишите нам в Telegram или позвоните.', error: 'Не удалось отправить сообщение.', unavailable: 'Сервис временно недоступен. Попробуйте ещё раз.', stores: 'Магазины Vizaje-Nica', nearest: 'Найдите ближайший магазин', allStores: 'Посмотреть все магазины' }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setError('')
    setSent(false)
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/contact', { body: new FormData(form), method: 'POST' })
      const result = (await response.json()) as { message?: string; notified?: boolean }
      if (!response.ok) {
        setError(result.message ?? text.error)
        return
      }
      form.reset()
      setSuccessMessage(result.message ?? (result.notified === false ? text.savedWithoutNotification : text.sent))
      setSent(true)
    } catch {
      setError(text.unavailable)
    } finally {
      setIsSubmitting(false)
    }
  }

  const phoneHref = data.phone.replace(/[^\d+]/g, '')

  return (
    <main className="site-shell contacts-page">
      <div className="contacts-breadcrumbs"><Link href={`/${locale}`}>{locale === 'ro' ? 'Acasă' : 'Главная'}</Link><span>/</span><span>{data.title}</span></div>

      <section className="contacts" aria-labelledby="contacts-title">
        <header className="contacts__header">
          <p className="contacts__eyebrow">Vizaje-Nica</p>
          <h1 className="contacts__title" id="contacts-title">{data.title}</h1>
          <p className="contacts__intro">{text.intro}</p>
        </header>

        <div className="contacts__layout">
          <div className="contacts__main">
            <section className="contacts__information" aria-labelledby="contacts-info-title">
              <div className="contacts__section-head">
                <p className="contacts__section-eyebrow">{text.info}</p>
                <h2 className="contacts__section-title" id="contacts-info-title">{text.how}</h2>
              </div>
              <div className="contacts__details">
                {data.address ? <ContactDetail type="address" label={data.addressLabel}>{data.address}</ContactDetail> : null}
                {data.workingHours ? <ContactDetail type="hours" label={data.workingLabel}>{data.workingHours}</ContactDetail> : null}
                {data.phone ? <ContactDetail type="phone" label={data.phoneLabel}><a href={`tel:${phoneHref}`}>{data.phone}</a></ContactDetail> : null}
                {data.email ? <ContactDetail type="email" label={data.emailLabel}><a href={`mailto:${data.email}`}>{data.email}</a></ContactDetail> : null}
              </div>
            </section>

            <a className="vn-telegram-support vn-telegram-support--contact" href={data.telegramUrl} target="_blank" rel="noopener noreferrer">
              <span className="vn-telegram-support__icon" aria-hidden="true"><Send size={17} fill="currentColor" /></span>
              <span className="vn-telegram-support__body"><span className="vn-telegram-support__label">{text.telegram}</span><span className="vn-telegram-support__handle">{data.telegramHandle}</span></span>
              <span className="vn-telegram-support__arrow" aria-hidden="true">↗</span>
            </a>

            <section className="contacts__form-section" id="feedback" aria-labelledby="contacts-form-title">
              <div className="contacts__section-head">
                <p className="contacts__section-eyebrow">{text.request}</p>
                <h2 className="contacts__section-title" id="contacts-form-title">{text.write}</h2>
                <p className="contacts__section-text">{text.formIntro}</p>
              </div>

              {sent ? <div className="contacts__message contacts__message--success" role="status"><CheckCircle2 size={20} /><span>{successMessage || text.sent}</span></div> : null}
              {error ? <div className="contacts__message contacts__message--error" role="alert"><span>{error}</span></div> : null}

              <form className="contact-form" onSubmit={handleSubmit}>
                <input type="hidden" name="locale" value={locale} />
                <div className="contact-form__grid">
                  <label className="contact-form__field"><span className="contact-form__label">{text.name} <b aria-hidden="true">*</b></span><input name="name" autoComplete="name" required /></label>
                  <label className="contact-form__field"><span className="contact-form__label">{text.phone} <b aria-hidden="true">*</b></span><input name="phone" type="tel" autoComplete="tel" inputMode="tel" required /></label>
                  <label className="contact-form__field contact-form__field--full"><span className="contact-form__label">{text.email} <b aria-hidden="true">*</b></span><input name="email" type="email" autoComplete="email" inputMode="email" required /></label>
                  <label className="contact-form__field contact-form__field--full"><span className="contact-form__label">{text.message}</span><textarea name="comments" rows={6} /></label>
                </div>
                <button className="contact-form__submit" type="submit" disabled={isSubmitting}><span>{isSubmitting ? text.sending : text.send}</span><ArrowRight size={18} strokeWidth={1.4} /></button>
              </form>
            </section>
          </div>

          <aside className="contacts__aside">
            <div className="contacts__map"><iframe title="Карта Vizaje-Nica" src={data.mapUrl} loading="lazy" /></div>
            <div className="contacts__aside-note"><p className="contacts__aside-label">{text.stores}</p><h2 className="contacts__aside-title">{text.nearest}</h2><Link className="contacts__stores-link" href={locale === 'ro' ? '/ro/magazinele' : '/ru/magazinyi'}><span>{text.allStores}</span><ArrowRight size={18} strokeWidth={1.4} /></Link></div>
          </aside>
        </div>
      </section>
    </main>
  )
}
