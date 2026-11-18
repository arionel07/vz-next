'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Gift,
  Mail,
  Phone,
  UserRound,
  X,
} from 'lucide-react'

import type { StoreLocale } from '@/lib/locale-routing'
import { GiftCardsMiniHeader } from '@/components/site/gift-cards-page'
import { SliderArrowIcon } from '@/components/site/content-slider'

import './electronic-gift-card.css'

type GiftCardDesign = {
  id: string
  title: string
  theme: string
  background: string
  accent: string
  mark: string
}

type RecipientData = {
  firstName: string
  lastName: string
  phone: string
  email: string
  message: string
}

const designs: GiftCardDesign[] = [
  { id: 'classic', title: 'Классический', theme: 'classic', background: '#eee9df', accent: '#ab8a73', mark: 'V' },
  { id: 'bloom', title: 'Цветочный', theme: 'bloom', background: '#f1e1dc', accent: '#b87972', mark: '✳' },
  { id: 'soft', title: 'Нежный', theme: 'soft', background: '#e5ece8', accent: '#718b7c', mark: 'V' },
  { id: 'gold', title: 'Золотой', theme: 'gold', background: '#e8dfca', accent: '#977747', mark: '✦' },
  { id: 'night', title: 'Вечерний', theme: 'night', background: '#262626', accent: '#d0b99b', mark: 'V' },
]

const initialRecipient: RecipientData = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  message: '',
}

function formatAmount(amount: number, locale: StoreLocale) {
  const formatted = new Intl.NumberFormat(locale === 'ro' ? 'ro-MD' : 'ru-MD', {
    maximumFractionDigits: 0,
  }).format(amount)
  return `${formatted} MDL`
}

function formatPhone(phone: string) {
  const first = phone.slice(0, 2)
  const second = phone.slice(2, 5)
  const third = phone.slice(5, 8)
  return ['+373', first, second, third].filter(Boolean).join(' ')
}

function maskPhone(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('373')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 8)
}

function GiftCardArtwork({
  design,
  amount,
  locale,
  compact = false,
}: {
  design: GiftCardDesign
  amount: number
  locale: StoreLocale
  compact?: boolean
}) {
  const style = {
    '--egc-card-bg': design.background,
    '--egc-card-accent': design.accent,
  } as CSSProperties

  return (
    <div
      className={`egc-card-art egc-card-art--${design.theme}${compact ? ' egc-card-art--compact' : ''}`}
      style={style}
      role="img"
      aria-label={`${locale === 'ro' ? 'Card cadou' : 'Подарочный сертификат'} ${formatAmount(amount, locale)}`}
    >
      <div className="egc-card-art__top">
        <span>VIZAJE-NICA</span>
        <span className="egc-card-art__seal" aria-hidden="true">{design.mark}</span>
      </div>
      <div className="egc-card-art__center">
        <span>{locale === 'ro' ? 'UN CADOU PENTRU TINE' : 'ПОДАРОЧНЫЙ СЕРТИФИКАТ'}</span>
        <strong>{formatAmount(amount, locale)}</strong>
      </div>
      <div className="egc-card-art__bottom">
        <span>{locale === 'ro' ? 'CU DRAG' : 'С ТЕПЛОМ'}</span>
        <span>GIFT CARD</span>
      </div>
    </div>
  )
}

export function ElectronicGiftCardPage({ locale = 'ru' }: { locale?: StoreLocale }) {
  const base = locale === 'ro' ? '/ro/card-cadou' : '/ru/podarochnaya-karta'
  const home = locale === 'ro' ? '/ro' : '/ru'
  const copy = locale === 'ro'
    ? {
        steps: ['Design', 'Valoare', 'Destinatar', 'Trimitere', 'Verificare', 'Confirmare'],
        titles: [
          'Alege designul cardului', 'Alege valoarea', 'Pentru cine este cadoul?',
          'Când trimitem cardul?', 'Verifică detaliile', 'Totul este pregătit',
        ],
        subtitles: [
          'Alege aspectul care se potrivește ocaziei.', 'Selectează o sumă sau introdu una proprie.',
          'Completează datele destinatarului.', 'Trimite cardul imediat sau programează livrarea.',
          'Verifică datele înainte de pasul demo.', '',
        ],
        next: 'Continuă', back: 'Înapoi', amount: 'Sumă proprie', amountHint: 'De la 200 până la 20 000 MDL',
        amountPlaceholder: 'Introdu suma', amountError: 'Introdu o sumă între 200 și 20 000 MDL.',
        designLabel: 'Design selectat', firstName: 'Prenume', lastName: 'Nume', phone: 'Telefon',
        recipientEmail: 'Email destinatar', optional: 'opțional', message: 'Mesaj de felicitare',
        preview: 'Previzualizare', recipient: 'Destinatar', phoneError: 'Introdu un număr complet +373.',
        nameError: 'Completează prenumele și numele.', emailError: 'Verifică adresa de email.',
        sendNow: 'Trimite imediat', nowDescription: 'Cardul va fi trimis după conectarea serviciului.',
        schedule: 'Alege data și ora', scheduleDescription: 'Programează trimiterea pentru mai târziu.',
        date: 'Data', time: 'Ora', receiptEmail: 'Email pentru bon',
        scheduleDialog: 'Programează trimiterea', scheduleHint: 'Alege data și ora preferate.',
        save: 'Salvează', cancel: 'Anulează', scheduleError: 'Alege data și ora trimiterii.',
        customer: 'Date cumpărător', receiver: 'Date destinatar', delivery: 'Trimitere',
        receiptMissing: 'Email pentru bon necompletat', edit: 'Modifică', amountLabel: 'Valoare card',
        total: 'Total', pay: 'Plătește online', paymentMethods: 'Metode de plată disponibile',
        demoNote: 'Mod demo: plata, comanda, SMS-ul și emailul nu sunt trimise.',
        successTitle: 'Mulțumim!', successText: 'Acesta este un ecran demonstrativ. Nicio plată sau trimitere nu a fost efectuată.',
        sentTo: 'Cardul este pregătit pentru', sentDate: 'Momentul trimiterii',
        home: 'Înapoi la pagina principală', restart: 'Creează încă un card',
        exit: 'Închide și mergi la pagina principală', chooseDesign: 'Selectează designul',
        selectDate: 'Selectează data și ora', sendDateNow: 'Imediat după achitarea comenzii',
        paymentCard: 'Card bancar', paymentOnline: 'Plată online',
      }
    : {
        steps: ['Дизайн', 'Номинал', 'Получатель', 'Отправка', 'Проверка', 'Готово'],
        titles: [
          'Выберите дизайн сертификата', 'Выберите номинал', 'Кому отправим подарок?',
          'Когда отправить сертификат?', 'Проверьте данные', 'Всё готово',
        ],
        subtitles: [
          'Выберите оформление, которое подходит к событию.', 'Выберите сумму или укажите свою.',
          'Заполните данные получателя.', 'Отправьте сразу или выберите дату и время.',
          'Проверьте данные перед демонстрационным подтверждением.', '',
        ],
        next: 'Далее', back: 'Назад', amount: 'Своя сумма', amountHint: 'От 200 до 20 000 MDL',
        amountPlaceholder: 'Введите сумму', amountError: 'Укажите сумму от 200 до 20 000 MDL.',
        designLabel: 'Выбранный дизайн', firstName: 'Имя', lastName: 'Фамилия', phone: 'Телефон',
        recipientEmail: 'Email получателя', optional: 'необязательно', message: 'Поздравительное сообщение',
        preview: 'Предпросмотр', recipient: 'Получатель', phoneError: 'Введите полный номер +373.',
        nameError: 'Заполните имя и фамилию.', emailError: 'Проверьте адрес email.',
        sendNow: 'Отправить сразу', nowDescription: 'Сертификат будет отправлен после подключения сервиса.',
        schedule: 'Выбрать дату и время', scheduleDescription: 'Запланировать отправку на будущее.',
        date: 'Дата', time: 'Время', receiptEmail: 'Email для чека',
        scheduleDialog: 'Запланировать отправку', scheduleHint: 'Выберите удобные дату и время.',
        save: 'Сохранить', cancel: 'Отмена', scheduleError: 'Выберите дату и время отправки.',
        customer: 'Данные покупателя', receiver: 'Данные получателя', delivery: 'Отправка',
        receiptMissing: 'Email для чека не указан', edit: 'Изменить', amountLabel: 'Номинал сертификата',
        total: 'Итого', pay: 'Оплатить онлайн', paymentMethods: 'Доступные способы оплаты',
        demoNote: 'Демо-режим: оплата, заказ, SMS и email никуда не отправляются.',
        successTitle: 'Спасибо!', successText: 'Это демонстрационный экран. Оплата и отправка не выполнялись.',
        sentTo: 'Сертификат подготовлен для', sentDate: 'Время отправки',
        home: 'Вернуться на главную', restart: 'Оформить ещё один',
        exit: 'Закрыть и перейти на главную', chooseDesign: 'Выбрать дизайн',
        selectDate: 'Выберите дату и время', sendDateNow: 'Сразу после оплаты',
        paymentCard: 'Банковская карта', paymentOnline: 'Онлайн-оплата',
      }

  const [step, setStep] = useState(1)
  const [designIndex, setDesignIndex] = useState(0)
  const [presetAmount, setPresetAmount] = useState<number | null>(200)
  const [customAmount, setCustomAmount] = useState('')
  const [recipient, setRecipient] = useState<RecipientData>(initialRecipient)
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now')
  const [sendDate, setSendDate] = useState('')
  const [sendTime, setSendTime] = useState('')
  const [receiptEmail, setReceiptEmail] = useState('')
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [validationError, setValidationError] = useState('')

  const design = designs[designIndex]
  const designNames = locale === 'ro'
    ? ['Clasic', 'Floral', 'Delicat', 'Auriu', 'De seară']
    : ['Классический', 'Цветочный', 'Нежный', 'Золотой', 'Вечерний']
  const designTitle = designNames[designIndex]
  const amount = presetAmount ?? Number(customAmount || 0)
  const fullName = `${recipient.firstName.trim()} ${recipient.lastName.trim()}`.trim()
  const scheduledLabel = sendMode === 'now'
    ? copy.sendDateNow
    : [sendDate.split('-').reverse().join('.'), sendTime].filter(Boolean).join(' · ')

  useEffect(() => {
    if (!scheduleDialogOpen) return
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setScheduleDialogOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [scheduleDialogOpen])

  function setRecipientField(field: keyof RecipientData, value: string) {
    setRecipient((current) => ({ ...current, [field]: value }))
    setValidationError('')
  }

  function moveDesign(direction: number) {
    setDesignIndex((current) => (current + direction + designs.length) % designs.length)
  }

  function validateCurrentStep() {
    setValidationError('')
    if (step === 2 && (!Number.isInteger(amount) || amount < 200 || amount > 20_000)) {
      setValidationError(copy.amountError)
      return false
    }
    if (step === 3) {
      if (!recipient.firstName.trim() || !recipient.lastName.trim()) {
        setValidationError(copy.nameError)
        return false
      }
      if (recipient.phone.length !== 8) {
        setValidationError(copy.phoneError)
        return false
      }
      if (recipient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
        setValidationError(copy.emailError)
        return false
      }
    }
    if (step === 4 && sendMode === 'scheduled' && (!sendDate || !sendTime)) {
      setScheduleDialogOpen(true)
      setValidationError(copy.scheduleError)
      return false
    }
    return true
  }

  function goNext() {
    if (validateCurrentStep()) setStep((current) => Math.min(5, current + 1))
  }

  function saveSchedule() {
    if (!sendDate || !sendTime) {
      setValidationError(copy.scheduleError)
      return
    }
    setValidationError('')
    setScheduleDialogOpen(false)
  }

  function restartWizard() {
    setStep(1)
    setDesignIndex(0)
    setPresetAmount(200)
    setCustomAmount('')
    setRecipient(initialRecipient)
    setSendMode('now')
    setSendDate('')
    setSendTime('')
    setReceiptEmail('')
    setValidationError('')
  }

  const stepsPanel = (
    <aside className={`electronic-gift-card-page__steps${step === 6 ? ' electronic-gift-card-page__steps--success' : ''}`} aria-label={locale === 'ro' ? 'Pașii certificatului' : 'Этапы оформления сертификата'}>
      <span className="electronic-gift-card-page__step-number">{String(step).padStart(2, '0')}</span>
      <ol className="electronic-gift-card-page__steps-list">
        {copy.steps.map((label, index) => {
          const itemStep = index + 1
          const stateClass = itemStep === step ? ' is-active' : itemStep < step ? ' is-complete' : ''
          return (
            <li key={label}>
              <button
                type="button"
                className={`electronic-gift-card-page__step-item${stateClass}`}
                aria-current={itemStep === step ? 'step' : undefined}
                disabled={itemStep >= step || step === 6}
                onClick={() => { setStep(itemStep); setValidationError('') }}
              >
                <span className={`electronic-gift-card-page__step-dot${itemStep > step ? ' is-muted' : ''}`} aria-hidden="true" />
                <span className="electronic-gift-card-page__step-number-label">{String(itemStep).padStart(2, '0')}</span>
                <span>{label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )

  return (
    <div className="egc-shell">
      <div className="egc-desktop-header">
        <GiftCardsMiniHeader locale={locale} suffix="/electronic" />
      </div>
      <main className={`electronic-gift-card-page${step === 6 ? ' electronic-gift-card-page--success' : ''}`}>
        <Link className="electronic-gift-card-page__close" href={home} aria-label={copy.exit} title={copy.exit}>
          <X size={25} strokeWidth={1.5} />
        </Link>

        <div className="electronic-gift-card-page__layout">
          {stepsPanel}
          {step !== 6 ? (
            <section className={`electronic-gift-card-page__content electronic-gift-card-page__content--${['design', 'amount', 'recipient', 'time', 'payment'][step - 1]}`}>
              <p className="electronic-gift-card-page__section-label egc-kicker">{copy.steps[step - 1]}</p>
              <h1 className="electronic-gift-card-page__title">{copy.titles[step - 1]}</h1>
              <p className="electronic-gift-card-page__subtitle">{copy.subtitles[step - 1]}</p>

              {step === 1 && (
                <>
                  <div className="electronic-gift-card-page__design-stage" aria-label={copy.chooseDesign}>
                    <button type="button" className="electronic-gift-card-page__design-side electronic-gift-card-page__design-side--previous" aria-label={locale === 'ro' ? 'Designul anterior' : 'Предыдущий дизайн'} onClick={() => moveDesign(-1)}>
                      <GiftCardArtwork design={designs[(designIndex + designs.length - 1) % designs.length]} amount={amount} locale={locale} compact />
                    </button>
                    <div className="electronic-gift-card-page__design-main" aria-live="polite">
                      <GiftCardArtwork design={design} amount={amount} locale={locale} />
                    </div>
                    <button type="button" className="electronic-gift-card-page__design-side electronic-gift-card-page__design-side--next" aria-label={locale === 'ro' ? 'Următorul design' : 'Следующий дизайн'} onClick={() => moveDesign(1)}>
                      <GiftCardArtwork design={designs[(designIndex + 1) % designs.length]} amount={amount} locale={locale} compact />
                    </button>
                    <button type="button" className="electronic-gift-card-page__design-arrow electronic-gift-card-page__design-arrow--previous" aria-label={locale === 'ro' ? 'Designul anterior' : 'Предыдущий дизайн'} onClick={() => moveDesign(-1)}><SliderArrowIcon direction="left" className="h-5 w-[30px]" /></button>
                    <button type="button" className="electronic-gift-card-page__design-arrow electronic-gift-card-page__design-arrow--next" aria-label={locale === 'ro' ? 'Următorul design' : 'Следующий дизайн'} onClick={() => moveDesign(1)}><SliderArrowIcon direction="right" className="h-5 w-[30px]" /></button>
                  </div>
                  <div className="electronic-gift-card-page__design-dots" role="tablist" aria-label={copy.chooseDesign}>
                    {designs.map((item, index) => (
                      <button key={item.id} type="button" role="tab" aria-label={designNames[index]} aria-selected={index === designIndex} className={`electronic-gift-card-page__design-dot${index === designIndex ? ' is-active' : ''}`} onClick={() => setDesignIndex(index)} />
                    ))}
                  </div>
                  <p className="egc-center-note">{copy.designLabel}: <strong>{designTitle}</strong></p>
                </>
              )}

              {step === 2 && (
                <div className="electronic-gift-card-page__amount-workspace">
                  <div className="electronic-gift-card-page__amount-preview-wrap">
                    <div className="electronic-gift-card-page__amount-preview">
                      <GiftCardArtwork design={design} amount={amount} locale={locale} />
                    </div>
                  </div>
                  <div className="electronic-gift-card-page__amount-controls">
                    <p className="egc-control-heading">{locale === 'ro' ? 'Selectează suma' : 'Выберите сумму'}</p>
                    <div className="electronic-gift-card-page__amount-list">
                      {[200, 300, 500, 1000].map((value) => (
                        <button key={value} type="button" className={`electronic-gift-card-page__amount-button${presetAmount === value ? ' is-active' : ''}`} aria-pressed={presetAmount === value} onClick={() => { setPresetAmount(value); setCustomAmount(''); setValidationError('') }}>{formatAmount(value, locale)}</button>
                      ))}
                    </div>
                    <label className="electronic-gift-card-page__custom-amount">
                      <span className="electronic-gift-card-page__custom-copy"><strong>{copy.amount}</strong><span>{copy.amountHint}</span></span>
                      <input type="number" min="200" max="20000" step="1" inputMode="numeric" value={customAmount} placeholder={copy.amountPlaceholder} aria-label={copy.amount} aria-invalid={Boolean(validationError)} onChange={(event) => { setPresetAmount(null); setCustomAmount(event.target.value); setValidationError('') }} />
                    </label>
                    <div className="electronic-gift-card-page__hint"><Gift size={22} strokeWidth={1.6} /><span>{locale === 'ro' ? 'Valoarea totală a cardului' : 'Номинал сертификата'}</span><strong>{formatAmount(amount, locale)}</strong></div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="electronic-gift-card-page__recipient-workspace">
                  <div className="electronic-gift-card-page__form">
                    <div className="egc-field-row">
                      <label className="electronic-gift-card-page__field">
                        <span className="electronic-gift-card-page__field-label">{copy.firstName}</span>
                        <input className="electronic-gift-card-page__input" autoComplete="given-name" value={recipient.firstName} aria-invalid={Boolean(validationError && !recipient.firstName.trim())} onChange={(event) => setRecipientField('firstName', event.target.value)} />
                      </label>
                      <label className="electronic-gift-card-page__field">
                        <span className="electronic-gift-card-page__field-label">{copy.lastName}</span>
                        <input className="electronic-gift-card-page__input" autoComplete="family-name" value={recipient.lastName} aria-invalid={Boolean(validationError && !recipient.lastName.trim())} onChange={(event) => setRecipientField('lastName', event.target.value)} />
                      </label>
                    </div>
                    <label className="electronic-gift-card-page__field">
                      <span className="electronic-gift-card-page__field-label">{copy.phone}</span>
                      <span className="egc-input-with-icon"><Phone size={19} aria-hidden="true" /><input className="electronic-gift-card-page__input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+373  __ ___ ___" value={formatPhone(recipient.phone)} aria-invalid={Boolean(validationError && recipient.phone.length !== 8)} onChange={(event) => setRecipientField('phone', maskPhone(event.target.value))} /></span>
                    </label>
                    <label className="electronic-gift-card-page__field egc-optional-field">
                      <span className="electronic-gift-card-page__field-label">{copy.recipientEmail} <span className="electronic-gift-card-page__optional">({copy.optional})</span></span>
                      <input className="electronic-gift-card-page__input" type="email" autoComplete="email" value={recipient.email} aria-invalid={Boolean(validationError && recipient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email))} onChange={(event) => setRecipientField('email', event.target.value)} />
                    </label>
                    <label className="electronic-gift-card-page__field">
                      <span className="electronic-gift-card-page__field-label">{copy.message} <span className="electronic-gift-card-page__optional">({copy.optional})</span></span>
                      <textarea className="electronic-gift-card-page__textarea" maxLength={280} value={recipient.message} onChange={(event) => setRecipientField('message', event.target.value)} />
                    </label>
                    {validationError && <p className="egc-error" role="alert">{validationError}</p>}
                  </div>
                  <div>
                    <p className="egc-preview-label">{copy.preview}</p>
                    <div className="electronic-gift-card-page__recipient-preview">
                      <GiftCardArtwork design={design} amount={amount} locale={locale} />
                    </div>
                    <div className="electronic-gift-card-page__recipient-summary">
                      <span className="electronic-gift-card-page__recipient-icon"><UserRound size={27} strokeWidth={1.5} /></span>
                      <span className="electronic-gift-card-page__recipient-summary-copy"><strong>{fullName || copy.recipient}</strong><span>{recipient.email || formatPhone(recipient.phone) || '+373'}</span></span>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="electronic-gift-card-page__time-workspace">
                  <div>
                    <p className="electronic-gift-card-page__section-label">{locale === 'ro' ? 'Metoda de trimitere' : 'Способ отправки'}</p>
                    <div className="electronic-gift-card-page__delivery-options">
                      <button type="button" className={`electronic-gift-card-page__delivery-card${sendMode === 'now' ? ' is-active' : ''}`} onClick={() => { setSendMode('now'); setValidationError('') }}>
                        <span className={`electronic-gift-card-page__radio${sendMode === 'now' ? ' is-active' : ''}`}><span /></span>
                        <span className="electronic-gift-card-page__delivery-copy"><strong>{copy.sendNow}</strong><small>{copy.nowDescription}</small></span>
                      </button>
                      <button type="button" className={`electronic-gift-card-page__delivery-card${sendMode === 'scheduled' ? ' is-active' : ''}`} onClick={() => { setSendMode('scheduled'); setValidationError(''); setScheduleDialogOpen(true) }}>
                        <span className={`electronic-gift-card-page__radio${sendMode === 'scheduled' ? ' is-active' : ''}`}><span /></span>
                        <span className="electronic-gift-card-page__delivery-copy"><strong>{copy.schedule}</strong><small>{copy.scheduleDescription}</small></span>
                      </button>
                    </div>
                    <div className="electronic-gift-card-page__date-time">
                      <button type="button" className="electronic-gift-card-page__select-button" onClick={() => { setSendMode('scheduled'); setScheduleDialogOpen(true) }}>
                        <span className="electronic-gift-card-page__select-value"><CalendarDays size={20} />{sendDate && sendTime ? `${sendDate.split('-').reverse().join('.')} · ${sendTime}` : copy.selectDate}</span><ChevronDown size={19} />
                      </button>
                    </div>
                    {validationError && <p className="egc-error" role="alert">{validationError}</p>}
                    <label className="electronic-gift-card-page__receipt-field">
                      <span className="electronic-gift-card-page__field-label">{copy.receiptEmail} <span className="electronic-gift-card-page__optional">({copy.optional})</span></span>
                      <span className="electronic-gift-card-page__receipt-wrap"><span className="electronic-gift-card-page__receipt-icon"><Mail size={19} /></span><input className="electronic-gift-card-page__receipt-input" type="email" autoComplete="email" value={receiptEmail} onChange={(event) => { setReceiptEmail(event.target.value); setValidationError('') }} /></span>
                    </label>
                  </div>
                  <div className="electronic-gift-card-page__time-preview">
                    <GiftCardArtwork design={design} amount={amount} locale={locale} />
                    <div className="electronic-gift-card-page__calendar-ticket" aria-hidden="true"><CalendarDays size={25} /><strong>{sendDate ? sendDate.split('-').reverse().slice(0, 2).join('.') : '— —'}</strong><span>{sendTime || '—:—'}</span><span className="electronic-gift-card-page__calendar-ticket-line" /><span className="electronic-gift-card-page__calendar-ticket-grid"><i /><i /><i /><i /><i /><i /></span></div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="electronic-gift-card-page__payment-workspace">
                  <div className="electronic-gift-card-page__review-list">
                    <article className="electronic-gift-card-page__review-card">
                      <div className="electronic-gift-card-page__review-inner"><span className="electronic-gift-card-page__review-icon"><Mail size={21} /></span><div><h2>{copy.customer}</h2><p>{receiptEmail || copy.receiptMissing}</p></div><button type="button" className="electronic-gift-card-page__edit" onClick={() => setStep(4)}>{copy.edit}</button></div>
                    </article>
                    <article className="electronic-gift-card-page__review-card">
                      <div className="electronic-gift-card-page__review-inner"><span className="electronic-gift-card-page__review-icon"><UserRound size={21} /></span><div><h2>{copy.receiver}</h2><p>{fullName}<br />{formatPhone(recipient.phone)}{recipient.email ? <><br />{recipient.email}</> : null}{recipient.message ? <><br /><span className="egc-review-message">“{recipient.message}”</span></> : null}</p></div><button type="button" className="electronic-gift-card-page__edit" onClick={() => setStep(3)}>{copy.edit}</button></div>
                    </article>
                    <article className="electronic-gift-card-page__review-card">
                      <div className="electronic-gift-card-page__review-inner"><span className="electronic-gift-card-page__review-icon"><CalendarDays size={21} /></span><div><h2>{copy.delivery}</h2><p>{scheduledLabel}</p></div><button type="button" className="electronic-gift-card-page__edit" onClick={() => setStep(4)}>{copy.edit}</button></div>
                    </article>
                  </div>
                  <aside className="electronic-gift-card-page__payment-summary" aria-label={copy.total}>
                    <div className="electronic-gift-card-page__payment-product">
                      <div className="electronic-gift-card-page__payment-product-media"><GiftCardArtwork design={design} amount={amount} locale={locale} /></div>
                      <div className="electronic-gift-card-page__payment-product-copy"><p>{designTitle}</p><strong>{formatAmount(amount, locale)}</strong><small>{copy.amountLabel}</small></div>
                    </div>
                    <div className="electronic-gift-card-page__payment-total"><div className="electronic-gift-card-page__payment-total-head"><strong>{copy.total}</strong><strong>{formatAmount(amount, locale)}</strong></div></div>
                    <p className="egc-prototype-note">{copy.demoNote}</p>
                    <button type="button" className="electronic-gift-card-page__pay-button" onClick={() => setStep(6)}>{copy.pay}<ArrowRight size={20} /></button>
                    <div className="egc-methods-heading">{copy.paymentMethods}</div>
                    <div className="electronic-gift-card-page__payment-methods" aria-label={copy.paymentMethods}>
                      <span className="electronic-gift-card-page__payment-method electronic-gift-card-page__payment-method--visa">VISA</span>
                      <span className="electronic-gift-card-page__payment-method electronic-gift-card-page__payment-method--mastercard"><span /><span /></span>
                      <span className="electronic-gift-card-page__payment-method egc-payment-wordmark">{copy.paymentCard}</span>
                      <span className="electronic-gift-card-page__payment-method egc-payment-wordmark">{copy.paymentOnline}</span>
                    </div>
                  </aside>
                </div>
              )}

              {validationError && step !== 4 && <p className="egc-error" role="alert">{validationError}</p>}
            </section>
          ) : (
            <section className="electronic-gift-card-page__success-content" aria-live="polite">
              <div className="electronic-gift-card-page__success-visual"><div><GiftCardArtwork design={design} amount={amount} locale={locale} /></div><span className="electronic-gift-card-page__success-check"><Check size={34} strokeWidth={1.6} /></span></div>
              <h1 className="electronic-gift-card-page__success-title">{copy.successTitle}</h1>
              <p className="electronic-gift-card-page__success-subtitle">{copy.successText}</p>
              <div className="electronic-gift-card-page__success-contact">
                <div className="electronic-gift-card-page__success-contact-item"><span className="electronic-gift-card-page__success-icon"><Mail size={25} /></span><span>{copy.sentTo}<br /><strong>{recipient.email || fullName}</strong></span></div>
                <span className="electronic-gift-card-page__success-divider" />
                <div className="electronic-gift-card-page__success-contact-item"><span className="electronic-gift-card-page__success-icon"><Clock3 size={25} /></span><span>{copy.sentDate}<br /><strong>{scheduledLabel}</strong></span></div>
              </div>
              <p className="egc-prototype-note egc-prototype-note--success">{copy.demoNote}</p>
              <div className="electronic-gift-card-page__success-actions">
                <Link href={home} className="electronic-gift-card-page__button electronic-gift-card-page__button--next"><ArrowLeft size={19} />{copy.home}</Link>
                <button type="button" className="electronic-gift-card-page__button electronic-gift-card-page__button--back" onClick={restartWizard}><span className="electronic-gift-card-page__success-plus">+</span>{copy.restart}</button>
              </div>
            </section>
          )}
        </div>

        {step !== 6 && (
          <footer className="electronic-gift-card-page__footer">
            <p className="electronic-gift-card-page__footer-step">{String(step).padStart(2, '0')} <span>/ 06</span></p>
            <div className="electronic-gift-card-page__footer-actions">
              {step === 1 ? (
                <Link href={base} className="electronic-gift-card-page__button electronic-gift-card-page__button--back"><ArrowLeft size={18} />{copy.back}</Link>
              ) : (
                <button type="button" className="electronic-gift-card-page__button electronic-gift-card-page__button--back" onClick={() => { setStep((current) => current - 1); setValidationError('') }}><ArrowLeft size={18} />{copy.back}</button>
              )}
              <button type="button" className="electronic-gift-card-page__button electronic-gift-card-page__button--next" onClick={goNext}>{copy.next}<ArrowRight size={19} /></button>
            </div>
          </footer>
        )}

        {scheduleDialogOpen && (
          <div className="electronic-gift-card-page__dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setScheduleDialogOpen(false) }}>
            <section className="electronic-gift-card-page__dialog" role="dialog" aria-modal="true" aria-labelledby="egc-schedule-title">
              <div className="electronic-gift-card-page__dialog-head"><div><h2 id="egc-schedule-title">{copy.scheduleDialog}</h2><p>{copy.scheduleHint}</p></div><button type="button" className="electronic-gift-card-page__dialog-close" aria-label={copy.cancel} onClick={() => setScheduleDialogOpen(false)}><X size={22} /></button></div>
              <div className="electronic-gift-card-page__dialog-fields">
                <label><span>{copy.date}</span><input type="date" value={sendDate} onChange={(event) => { setSendDate(event.target.value); setValidationError('') }} /></label>
                <label><span>{copy.time}</span><input type="time" value={sendTime} onChange={(event) => { setSendTime(event.target.value); setValidationError('') }} /></label>
              </div>
              {validationError && <p className="egc-error" role="alert">{validationError}</p>}
              <div className="electronic-gift-card-page__dialog-actions"><button type="button" className="electronic-gift-card-page__dialog-cancel" onClick={() => setScheduleDialogOpen(false)}>{copy.cancel}</button><button type="button" className="electronic-gift-card-page__dialog-save" onClick={saveSchedule}>{copy.save}</button></div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
