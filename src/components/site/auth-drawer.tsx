'use client'

import { ArrowLeft, Eye, EyeOff, X } from 'lucide-react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import type { AuthUser } from '@/lib/auth-types'
import type { StoreLocale } from '@/lib/locale-routing'
import { useAccessibleDialog } from '@/lib/use-accessible-dialog'
import { usePortalRoot } from '@/lib/use-portal-root'
import { DrawerViewTransition } from './drawer-view-transition'

type AuthMode = 'login' | 'phone' | 'login-sms' | 'register' | 'forgot' | 'sms' | 'reset' | 'account'
type SmsPurpose = 'register' | 'login'

const authModeDepth: Record<AuthMode, number> = {
  login: 0,
  account: 0,
  phone: 1,
  'login-sms': 1,
  register: 1,
  forgot: 2,
  sms: 2,
  reset: 3,
}

type AuthDrawerProps = {
  open: boolean
  onClose: () => void
  drawerTargetId?: string
  locale?: StoreLocale
  initialMode?: AuthMode
  user?: AuthUser | null
  onAuthenticated?: (user: AuthUser) => void
  onLoggedOut?: () => void
}

type AuthResponse = {
  success?: boolean
  user?: AuthUser
  phone?: string
  devCode?: string
  devResetToken?: string
  welcomeOfferExpiresAt?: number
  error?: string
}

function AppleProviderIcon() {
  return (
    <svg aria-hidden="true" className="size-[50px]" fill="none" stroke="none" viewBox="0 0 50 50">
      <path fill="#fff" d="M26.035 14.127C27.647 12.01 29.888 12 29.888 12s.333 1.99-1.268 3.908c-1.71 2.047-3.653 1.712-3.653 1.712s-.365-1.61 1.068-3.493Zm-.863 4.887c.829 0 2.368-1.136 4.371-1.136 3.449 0 4.805 2.445 4.805 2.445s-2.653 1.351-2.653 4.631c0 3.7 3.305 4.975 3.305 4.975s-2.31 6.48-5.431 6.48c-1.433 0-2.548-.963-4.058-.963-1.54 0-3.066.998-4.061.998-2.85 0-6.45-6.146-6.45-11.087 0-4.86 3.047-7.41 5.906-7.41 1.858 0 3.3 1.067 4.266 1.067Z" />
    </svg>
  )
}

function GoogleProviderIcon() {
  return (
    <svg aria-hidden="true" className="size-[50px]" fill="none" stroke="none" viewBox="0 0 50 50">
      <path fill="#fff" d="M25.204 23.571V27h5.787c-.233 1.471-1.749 4.314-5.787 4.314-3.484 0-6.326-2.828-6.326-6.314s2.842-6.314 6.326-6.314c1.983 0 3.31.828 4.067 1.543l2.77-2.615C30.262 15.986 27.959 15 25.204 15 19.563 15 15 19.471 15 25s4.563 10.204 10.204 10C31.094 35 35 30.943 35 25.229c0-.658-.073-1.158-.16-1.658h-9.636Z" />
    </svg>
  )
}

const authText = {
  ru: {
    mode: {
      login: { title: 'Войти в личный кабинет', description: 'Выберите удобный способ входа.' },
      phone: { title: 'Войти или зарегистрироваться', description: 'Введите номер телефона и пароль.' },
      loginSms: { title: 'Вход по SMS-коду', description: 'Введите номер телефона — мы отправим код для входа.' },
      register: { title: 'Создать аккаунт', description: 'Создайте аккаунт, чтобы быстрее оформлять заказы и управлять профилем.' },
      forgot: { title: 'Восстановить доступ', description: 'Введите email — мы отправим инструкции для восстановления пароля.' },
    },
    close: 'Закрыть авторизацию', account: 'Личный кабинет', accountTitle: 'Ваш аккаунт', phoneConfirm: 'Подтверждение телефона',
    newPassword: 'Новый пароль', welcome: 'Вы вошли как', logout: 'Выйти из аккаунта', logoutBusy: 'Выходим…',
    tabs: 'Тип аккаунта', login: 'Войти', register: 'Регистрация', backLogin: 'Вернуться ко входу', changeData: 'Изменить данные',
    smsSent: 'Мы отправили шестизначный код на номер', resetDescription: 'Введите новый пароль для вашего аккаунта.',
    phoneOrEmail: 'Телефон или email', password: 'Пароль', hidePassword: 'Скрыть пароль', showPassword: 'Показать пароль',
    forgot: 'Забыли пароль?', phone: 'Номер телефона', email: 'Email', name: 'Имя', yourName: 'Ваше имя', repeatPassword: 'Повторите пароль',
    termsPrefix: 'Соглашаюсь с ', privacy: 'политикой конфиденциальности', smsCode: 'Код из SMS', newPasswordField: 'Новый пароль',
    wait: 'Подождите…', loginSubmit: 'Войти', registerSubmit: 'Зарегистрироваться', confirmPhone: 'Подтвердить телефон',
    sendInstructions: 'Отправить инструкции', savePassword: 'Сохранить пароль', resend: 'Отправить код ещё раз',
    loginWithSms: 'Войти по SMS-коду', requestCode: 'Получить код', resendWait: 'Отправить код повторно через {time}',
    marketing: 'Получать новости и предложения по email',
    noAccount: 'Нет аккаунта?', hasAccount: 'Уже есть аккаунт?', openAccount: 'Открыть личный кабинет',
    loginSuccess: 'Вы вошли в личный кабинет.', localCode: 'Код для локальной проверки: ', smsSentSuccess: 'Код подтверждения отправлен на ваш телефон.',
    provider: 'через сервис', apple: 'Apple', google: 'Google', phoneEntry: 'По номеру телефона', createAccount: 'Создать аккаунт', providerUnavailable: 'Вход через {provider} пока не подключён.',
    privacyConsent: 'При входе и регистрации я даю согласие на обработку персональных данных в соответствии с',
    accountConfirmed: 'Аккаунт подтверждён. Добро пожаловать!', localReset: 'Локальный режим: можно сразу задать новый пароль.',
    resetSent: 'Если аккаунт существует, инструкции уже отправлены на email.', passwordUpdated: 'Пароль обновлён. Теперь можно войти.',
    newLocalCode: 'Новый код для локальной проверки: ', newCodeSent: 'Новый код отправлен на ваш телефон.',
    logoutSuccess: 'Вы вышли из личного кабинета.', requestError: 'Не удалось выполнить запрос.', resendError: 'Не удалось отправить код.', logoutError: 'Не удалось выйти из аккаунта.',
  },
  ro: {
    mode: {
      login: { title: 'Autentificare în cont', description: 'Alege metoda de autentificare.' },
      phone: { title: 'Autentificare sau înregistrare', description: 'Introdu numărul de telefon și parola.' },
      loginSms: { title: 'Autentificare prin SMS', description: 'Introdu numărul de telefon — îți vom trimite un cod de autentificare.' },
      register: { title: 'Creează un cont', description: 'Creează un cont pentru a plasa mai repede comenzile și a-ți gestiona profilul.' },
      forgot: { title: 'Recuperarea accesului', description: 'Introdu adresa de email și îți vom trimite instrucțiunile de resetare a parolei.' },
    },
    close: 'Închide fereastra de autentificare', account: 'Contul meu', accountTitle: 'Contul tău', phoneConfirm: 'Confirmarea telefonului',
    newPassword: 'Parolă nouă', welcome: 'Ești autentificat ca', logout: 'Deconectare', logoutBusy: 'Se deconectează…',
    tabs: 'Tipul contului', login: 'Autentificare', register: 'Înregistrare', backLogin: 'Înapoi la autentificare', changeData: 'Modifică datele',
    smsSent: 'Am trimis un cod din șase cifre la numărul', resetDescription: 'Introdu o parolă nouă pentru contul tău.',
    phoneOrEmail: 'Telefon sau email', password: 'Parolă', hidePassword: 'Ascunde parola', showPassword: 'Arată parola',
    forgot: 'Ai uitat parola?', phone: 'Număr de telefon', email: 'Email', name: 'Nume', yourName: 'Numele tău', repeatPassword: 'Repetă parola',
    termsPrefix: 'Sunt de acord cu ', privacy: 'politica de confidențialitate', smsCode: 'Codul SMS', newPasswordField: 'Parolă nouă',
    wait: 'Se procesează…', loginSubmit: 'Autentificare', registerSubmit: 'Creează contul', confirmPhone: 'Confirmă telefonul',
    sendInstructions: 'Trimite instrucțiunile', savePassword: 'Salvează parola', resend: 'Trimite din nou codul',
    loginWithSms: 'Autentificare prin SMS', requestCode: 'Primește codul', resendWait: 'Retrimite codul peste {time}',
    marketing: 'Primește noutăți și oferte prin email',
    noAccount: 'Nu ai cont?', hasAccount: 'Ai deja un cont?', openAccount: 'Deschide contul',
    loginSuccess: 'Te-ai autentificat în cont.', localCode: 'Cod pentru verificare locală: ', smsSentSuccess: 'Codul de confirmare a fost trimis pe telefon.',
    provider: 'prin serviciu', apple: 'Apple', google: 'Google', phoneEntry: 'Cu numărul de telefon', createAccount: 'Creează cont', providerUnavailable: 'Autentificarea prin {provider} nu este încă activă.',
    privacyConsent: 'Prin autentificare sau înregistrare, sunt de acord cu prelucrarea datelor personale conform',
    accountConfirmed: 'Contul a fost confirmat. Bine ai venit!', localReset: 'Mod local: poți seta imediat o parolă nouă.',
    resetSent: 'Dacă există un cont, instrucțiunile au fost trimise prin email.', passwordUpdated: 'Parola a fost actualizată. Te poți autentifica.',
    newLocalCode: 'Cod nou pentru verificare locală: ', newCodeSent: 'Codul nou a fost trimis pe telefon.',
    logoutSuccess: 'Te-ai deconectat din cont.', requestError: 'Cererea nu a putut fi procesată.', resendError: 'Codul nu a putut fi trimis.', logoutError: 'Deconectarea nu a reușit.',
  },
} as const

const authUi = {
  layer: 'fixed inset-0 z-[901]',
  overlay: 'absolute inset-0 w-full bg-[rgba(17,17,17,0.26)]',
  drawer: 'absolute inset-y-0 right-0 flex h-dvh w-[min(760px,100vw)] min-w-0 max-w-none flex-col bg-white shadow-[-12px_0_36px_rgba(17,17,17,0.12)] min-[992px]:w-[48vw] max-[767px]:w-full',
  close: 'absolute top-6 right-6 z-10 inline-flex size-10 items-center justify-center rounded-full bg-transparent text-midnight-ink transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 motion-reduce:transition-none max-[767px]:top-4 max-[767px]:right-4',
  body: 'min-h-0 flex-1 overflow-y-auto px-12 py-8 max-[767px]:px-6 max-[767px]:py-6',
  title: 'm-0 text-[28px] leading-[1.2] font-semibold tracking-[-.025em] text-midnight-ink max-[767px]:text-[25px]',
  description: 'mt-4 mb-7 max-w-[390px] text-sm leading-[1.55] text-graphite',
  back: 'mb-7 inline-flex items-center gap-2 rounded-full bg-transparent p-0 font-normal text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2',
  form: 'flex flex-col gap-[17px]',
  field: 'flex flex-col gap-2',
  fieldLabel: 'text-[13px] font-medium text-midnight-ink',
  input: 'min-h-[52px] w-full rounded-full border border-[#d6d6d6] bg-white px-[14px] text-midnight-ink outline-none placeholder:text-[#adadad] focus:border-midnight-ink focus:ring-1 focus:ring-midnight-ink/10',
  password: 'relative block',
  passwordInput: 'pr-12',
  passwordToggle: 'absolute top-0 right-0 inline-flex h-[52px] w-[46px] items-center justify-center rounded-full bg-transparent p-0 text-graphite transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[-3px]',
  textLink: 'inline-flex w-fit rounded-full border-0 border-b border-hover-cream bg-transparent p-0 pb-0.5 font-normal text-inherit transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2',
  submit: 'inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-midnight-ink px-6 text-[12px] font-normal tracking-[.08em] text-white uppercase transition-colors hover:bg-button-hover hover:text-midnight-ink disabled:cursor-wait disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 motion-reduce:transition-none',
  secondary: 'inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-midnight-ink bg-white px-6 text-[12px] font-normal tracking-[.08em] text-midnight-ink uppercase transition-colors hover:bg-midnight-ink hover:text-white focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 motion-reduce:transition-none',
  switch: 'mt-6 text-center text-[13px] text-graphite',
  account: 'flex flex-col gap-2 pt-2',
  accountWelcome: 'mb-1 text-[13px] text-graphite',
  accountName: 'text-[25px] font-medium',
  accountDetail: 'text-sm text-graphite',
  message: 'm-0 p-3 text-xs leading-[1.5]',
} as const

function getMoldovanLocalDigits(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('00373')) digits = digits.slice(5)
  else if (digits.startsWith('373')) digits = digits.slice(3)
  else if (digits.length > 8 && digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 8)
}

function formatMoldovanLocalPhone(value: string) {
  const digits = getMoldovanLocalDigits(value)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
}

function MoldovanPhoneInput({
  name,
  inputRef,
  defaultValue = '',
  autoComplete = 'tel',
  required = false,
}: {
  name: string
  inputRef?: (element: HTMLInputElement | null) => void
  defaultValue?: string
  autoComplete?: string
  required?: boolean
}) {
  const [value, setValue] = useState(() => formatMoldovanLocalPhone(defaultValue))
  const elementRef = useRef<HTMLInputElement | null>(null)

  const updateValue = (input: HTMLInputElement) => {
    const rawBeforeCaret = input.value.slice(0, input.selectionStart ?? input.value.length)
    const localDigitsBeforeCaret = getMoldovanLocalDigits(rawBeforeCaret).length
    const nextValue = formatMoldovanLocalPhone(input.value)
    setValue(nextValue)
    window.requestAnimationFrame(() => {
      const element = elementRef.current
      if (!element) return
      let caret = 0
      let digitCount = 0
      while (caret < nextValue.length && digitCount < localDigitsBeforeCaret) {
        if (/\d/.test(nextValue[caret])) digitCount += 1
        caret += 1
      }
      element.setSelectionRange(caret, caret)
    })
  }

  return (
    <span className="flex min-h-[52px] w-full items-center rounded-full border border-[#d6d6d6] px-[14px] focus-within:border-midnight-ink focus-within:ring-1 focus-within:ring-midnight-ink/10">
      <span className="shrink-0 pr-3 text-midnight-ink">+373</span>
      <span className="h-6 w-px shrink-0 bg-[#d6d6d6]" aria-hidden="true" />
      <input
        ref={(element) => { elementRef.current = element; inputRef?.(element) }}
        className="h-[50px] min-w-0 flex-1 bg-transparent pl-3 text-midnight-ink outline-none placeholder:text-[#adadad]"
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        placeholder="00 000 000"
        value={value}
        onChange={(event) => updateValue(event.currentTarget)}
        required={required}
      />
    </span>
  )
}

async function authRequest(payload: Record<string, unknown>) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json() as AuthResponse
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос.')
  return data
}

function authErrorMessage(error: unknown, fallback: string, locale: StoreLocale) {
  if (!(error instanceof Error)) return fallback
  if (locale === 'ro' && /[\u0400-\u04FF]/.test(error.message)) return fallback
  return error.message
}

export function AuthDrawer({ open, onClose, drawerTargetId, initialMode = 'login', user, onAuthenticated, onLoggedOut, locale = 'ru' }: AuthDrawerProps) {
  const t = authText[locale]
  const portalRoot = usePortalRoot()
  const dialogRef = useRef<HTMLElement | null>(null)
  const initialFocusRef = useRef<HTMLElement | null>(null)
  const [mode, setMode] = useState<AuthMode>(user ? 'account' : initialMode)
  const [forgotReturnMode, setForgotReturnMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showRegisterPasswordCheck, setShowRegisterPasswordCheck] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pendingPhone, setPendingPhone] = useState('')
  const [smsPurpose, setSmsPurpose] = useState<SmsPurpose>('register')
  const [resendCountdown, setResendCountdown] = useState(0)
  const [resetToken, setResetToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(open)
  const modeDirection = useRef(1)
  const reduceMotion = useReducedMotion()

  useAccessibleDialog({ open: open && portalRoot !== null, rootRef: dialogRef, initialFocusRef, onClose })

  useEffect(() => {
    if (!open) return

    setMode(user ? 'account' : initialMode)
    setMessage('')
    setError('')
    setResetToken('')
    setPendingPhone('')
    setSmsPurpose('register')
    setResendCountdown(0)
    setForgotReturnMode('login')
  }, [initialMode, onClose, open, user])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [mode, open])

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }

    const timer = window.setTimeout(() => setMounted(false), 480)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'sms' || resendCountdown <= 0) return
    const timer = window.setTimeout(() => setResendCountdown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [mode, open, resendCountdown])

  if (!mounted || (!portalRoot && !drawerTargetId)) return null

  const changeMode = (nextMode: AuthMode, direction?: number) => {
    modeDirection.current = direction ?? (nextMode === 'login' || authModeDepth[nextMode] < authModeDepth[mode] ? -1 : 1)
    if (nextMode === 'forgot' || nextMode === 'reset') {
      setForgotReturnMode(mode === 'phone' ? 'phone' : 'login')
    }
    setMode(nextMode)
    setMessage('')
    setError('')
    setShowPassword(false)
    setShowRegisterPassword(false)
    setShowRegisterPasswordCheck(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    const values = new FormData(event.currentTarget)

    try {
      if (mode === 'phone') {
        const data = await authRequest({ action: 'login', identity: values.get('identity'), password: values.get('password') })
        if (data.user) onAuthenticated?.(data.user)
        modeDirection.current = -1
        setMode('account')
        setMessage(t.loginSuccess)
      } else if (mode === 'login-sms') {
        const data = await authRequest({ action: 'request-login-code', phone: values.get('identity'), locale })
        setPendingPhone(data.phone ?? String(values.get('identity') ?? ''))
        setSmsPurpose('login')
        setResendCountdown(45)
        modeDirection.current = 1
        setMode('sms')
        setMessage(data.devCode ? `${t.localCode}${data.devCode}` : t.smsSentSuccess)
      } else if (mode === 'register') {
        const data = await authRequest({
          action: 'register',
          locale,
          termsAccepted: values.get('terms') === '1',
          phone: values.get('phone'),
          email: values.get('email'),
          name: values.get('name'),
          password: values.get('password'),
          passwordCheck: values.get('password_check'),
          mailSubscribe: values.get('mail_subscribe') === '1',
        })
        setPendingPhone(data.phone ?? String(values.get('phone') ?? ''))
        setSmsPurpose('register')
        setResendCountdown(45)
        modeDirection.current = 1
        setMode('sms')
        setMessage(data.devCode ? `${t.localCode}${data.devCode}` : t.smsSentSuccess)
      } else if (mode === 'sms') {
        const data = await authRequest({ action: 'verify-sms', phone: pendingPhone, code: values.get('code'), purpose: smsPurpose, locale })
        if (data.user) onAuthenticated?.(data.user)
        if (data.welcomeOfferExpiresAt) {
          window.dispatchEvent(new CustomEvent('welcome-offer:activated', { detail: { expiresAt: data.welcomeOfferExpiresAt } }))
        }
        modeDirection.current = -1
        setMode('account')
        setMessage(t.accountConfirmed)
      } else if (mode === 'forgot') {
        const data = await authRequest({ action: 'forgot-password', email: values.get('email'), locale })
        if (data.devResetToken) {
          setResetToken(data.devResetToken)
          modeDirection.current = 1
          setMode('reset')
          setMessage(t.localReset)
        } else {
          setMessage(t.resetSent)
        }
      } else if (mode === 'reset') {
        await authRequest({ action: 'reset-password', token: resetToken, password: values.get('password'), passwordCheck: values.get('password_check') })
        modeDirection.current = -1
        setMode(forgotReturnMode)
        setMessage(t.passwordUpdated)
      }
    } catch (caught) {
      setError(authErrorMessage(caught, t.requestError, locale))
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const data = await authRequest({ action: 'resend-sms', phone: pendingPhone, purpose: smsPurpose, locale })
      setResendCountdown(45)
      setMessage(data.devCode ? `${t.newLocalCode}${data.devCode}` : t.newCodeSent)
    } catch (caught) {
      setError(authErrorMessage(caught, t.resendError, locale))
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await authRequest({ action: 'logout' })
      onLoggedOut?.()
      modeDirection.current = -1
      setMode('login')
      setMessage(t.logoutSuccess)
    } catch (caught) {
      setError(authErrorMessage(caught, t.logoutError, locale))
    } finally {
      setLoading(false)
    }
  }

  const isAccount = mode === 'account'
  const copy = mode === 'register' || mode === 'forgot' ? t.mode[mode] : null

  const embeddedTarget = drawerTargetId && typeof document !== 'undefined' ? document.getElementById(drawerTargetId) : null
  const portalTarget = drawerTargetId ? embeddedTarget : portalRoot
  if (!portalTarget) return null

  return createPortal((
    <div className={drawerTargetId ? 'relative h-full w-full' : authUi.layer} role="presentation">
      <AnimatePresence>
        {open ? (
          <>
            {!drawerTargetId ? <motion.button
              key="auth-overlay"
              className={authUi.overlay}
              type="button"
              onClick={onClose}
              aria-label={t.close}
              aria-hidden="true"
              tabIndex={-1}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            /> : null}
            <motion.aside
              key="auth-drawer"
              id="auth-drawer"
              ref={dialogRef}
              className={drawerTargetId ? 'relative flex h-full w-full flex-col bg-white' : authUi.drawer}
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-drawer-title"
              tabIndex={-1}
              initial={reduceMotion || drawerTargetId ? { x: 0 } : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reduceMotion || drawerTargetId ? { x: 0 } : { x: '100%' }}
              transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
            >
        <button className={authUi.close} type="button" onClick={onClose} aria-label={t.close}><X size={25} strokeWidth={1.3} /></button>
        <div className={authUi.body}>
          <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col">
            <DrawerViewTransition viewKey={isAccount ? 'account' : mode} direction={modeDirection.current} className="w-full">
            {isAccount && user ? (
              <div className="my-auto flex flex-col gap-2">
                <h2 className={authUi.title} id="auth-drawer-title">{t.accountTitle}</h2>
                <p className="mt-3 text-[13px] text-graphite">{t.welcome}</p>
                <strong className="text-[25px] font-medium">{user.name}{user.surname ? ` ${user.surname}` : ''}</strong>
                <span className="text-sm text-graphite">{user.email}</span>
                {user.phone ? <span className="text-sm text-graphite">{user.phone}</span> : null}
                <Link className={`${authUi.submit} mt-7`} href={`/${locale}/${locale === 'ro' ? 'contul-meu' : 'account'}`} onClick={onClose}>{t.openAccount}</Link>
                <button className={`${authUi.submit} mt-2`} type="button" onClick={logout} disabled={loading}>{loading ? t.logoutBusy : t.logout}</button>
              </div>
            ) : mode === 'login' ? (
              <>
                <section className="my-auto flex w-full flex-col items-center py-12 text-center">
                  <h2 className={authUi.title} id="auth-drawer-title">{t.mode.login.title}</h2>
                  <p className="mt-16 mb-0 text-[15px] font-medium">{t.provider}</p>
                  <div className="mt-7 flex items-start justify-center gap-8">
                    <button className="group flex min-w-[76px] flex-col items-center gap-2 text-[12px] font-normal" type="button" onClick={() => setMessage(t.providerUnavailable.replace('{provider}', t.apple))}>
                      <span className="grid size-[72px] place-items-center rounded-full bg-black text-white transition-transform group-hover:scale-[1.04]"><AppleProviderIcon /></span>
                      <span>{t.apple}</span>
                    </button>
                    <button className="group flex min-w-[76px] flex-col items-center gap-2 text-[12px] font-normal" type="button" onClick={() => setMessage(t.providerUnavailable.replace('{provider}', t.google))}>
                      <span className="grid size-[72px] place-items-center rounded-full bg-[conic-gradient(from_220deg,#4285F4_0deg,#34A853_90deg,#FBBC05_180deg,#EA4335_270deg,#4285F4_360deg)] transition-transform group-hover:scale-[1.04]"><GoogleProviderIcon /></span>
                      <span>{t.google}</span>
                    </button>
                  </div>
                  {message ? <p className="mt-5 text-xs text-graphite" role="status">{message}</p> : null}
                  <div className="mt-14 flex w-full flex-col gap-3">
                    <button className="min-h-[50px] w-full rounded-full border border-midnight-ink px-5 text-[11px] font-normal tracking-[.12em] uppercase transition-colors hover:bg-midnight-ink hover:text-white focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2" type="button" onClick={() => changeMode('phone')}>{t.phoneEntry}</button>
                    <button className={authUi.secondary} type="button" onClick={() => changeMode('register')}>{t.createAccount}</button>
                  </div>
                </section>
                <p className="mt-auto pb-2 text-[11px] leading-[1.5] text-[#999]">{t.privacyConsent} <a className="underline underline-offset-2" href={`/${locale}/${locale === 'ro' ? 'politica-de-confidentialitate-si-cookies' : 'politika-konfidentsialnosti-i-cookies'}`} target="_blank" rel="noreferrer">{t.privacy}</a>.</p>
              </>
            ) : (
              <section className="w-full pt-[max(12vh,72px)] pb-8 max-[767px]:pt-[max(10vh,56px)]">
                <button className={authUi.back} type="button" onClick={() => changeMode(mode === 'forgot' || mode === 'reset' ? forgotReturnMode : mode === 'sms' ? (smsPurpose === 'login' ? 'login-sms' : 'register') : 'login', -1)} aria-label={t.backLogin}>
                  <ArrowLeft size={21} strokeWidth={1.5} />
                </button>
                <h2 className={authUi.title} id="auth-drawer-title">{mode === 'phone' ? t.mode.phone.title : mode === 'login-sms' ? t.mode.loginSms.title : mode === 'sms' ? t.phoneConfirm : mode === 'reset' ? t.newPassword : copy?.title}</h2>
                {mode === 'phone' ? <p className={authUi.description}>{t.mode.phone.description}</p> : null}
                {mode === 'login-sms' ? <p className={authUi.description}>{t.mode.loginSms.description}</p> : null}
                {mode === 'register' && copy ? <p className={authUi.description}>{copy.description}</p> : null}
                {mode === 'forgot' && copy ? <p className={authUi.description}>{copy.description}</p> : null}
                {mode === 'sms' ? <p className={authUi.description}>{t.smsSent} <strong>{pendingPhone}</strong>.</p> : null}
                {mode === 'reset' ? <p className={authUi.description}>{t.resetDescription}</p> : null}

                <form className={authUi.form} onSubmit={handleSubmit}>
                  {mode === 'phone' ? (
                    <>
                      <label className={authUi.field}><span className={authUi.fieldLabel}>{t.phone}</span><MoldovanPhoneInput inputRef={(element) => { initialFocusRef.current = element }} defaultValue={pendingPhone} name="identity" required /></label>
                      <label className={authUi.field}><span className={authUi.fieldLabel}>{t.password}</span><span className={authUi.password}><input className={`${authUi.input} ${authUi.passwordInput}`} name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" maxLength={256} required /><button className={authUi.passwordToggle} type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t.hidePassword : t.showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
                    </>
                  ) : null}

                  {mode === 'login-sms' ? (
                    <label className={authUi.field}><span className={authUi.fieldLabel}>{t.phone}</span><MoldovanPhoneInput inputRef={(element) => { initialFocusRef.current = element }} defaultValue={pendingPhone} name="identity" required /></label>
                  ) : null}

                  {mode === 'register' ? (
                    <>
                      <label className={authUi.field}><span className={authUi.fieldLabel}>{t.phone}</span><MoldovanPhoneInput inputRef={(element) => { initialFocusRef.current = element }} name="phone" required /></label>
                      <label className={authUi.field}><span className={authUi.fieldLabel}>{t.email}</span><input className={authUi.input} name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
                      <label className={authUi.field}><span className={authUi.fieldLabel}>{t.name}</span><input className={authUi.input} name="name" type="text" autoComplete="given-name" placeholder={t.yourName} required /></label>
                      <label className={authUi.field}><span className={authUi.fieldLabel}>{t.password}</span><span className={authUi.password}><input className={`${authUi.input} ${authUi.passwordInput}`} name="password" type={showRegisterPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required /><button className={authUi.passwordToggle} type="button" onClick={() => setShowRegisterPassword((value) => !value)} aria-label={showRegisterPassword ? t.hidePassword : t.showPassword}>{showRegisterPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
                      <label className={authUi.field}><span className={authUi.fieldLabel}>{t.repeatPassword}</span><span className={authUi.password}><input className={`${authUi.input} ${authUi.passwordInput}`} name="password_check" type={showRegisterPasswordCheck ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required /><button className={authUi.passwordToggle} type="button" onClick={() => setShowRegisterPasswordCheck((value) => !value)} aria-label={showRegisterPasswordCheck ? t.hidePassword : t.showPassword}>{showRegisterPasswordCheck ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
                      <label className="flex items-start gap-[9px] text-xs leading-[1.45] text-graphite"><input className="mt-0.5 shrink-0 accent-midnight-ink" type="checkbox" name="terms" value="1" required /><span>{t.termsPrefix}<a className="border-b border-hover-cream" href={`/${locale}/${locale === 'ro' ? 'politica-de-confidentialitate-si-cookies' : 'politika-konfidentsialnosti-i-cookies'}`} target="_blank" rel="noreferrer">{t.privacy}</a>.</span></label>
                      <label className="flex items-start gap-[9px] text-xs leading-[1.45] text-graphite"><input className="mt-0.5 shrink-0 accent-midnight-ink" type="checkbox" name="mail_subscribe" value="1" /><span>{t.marketing}</span></label>
                    </>
                  ) : null}

                  {mode === 'sms' ? <label className={authUi.field}><span className={authUi.fieldLabel}>{t.smsCode}</span><input ref={(element) => { initialFocusRef.current = element }} className={authUi.input} name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required /></label> : null}
                  {mode === 'forgot' ? <label className={authUi.field}><span className={authUi.fieldLabel}>{t.email}</span><input ref={(element) => { initialFocusRef.current = element }} className={authUi.input} name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label> : null}
                  {mode === 'reset' ? <><label className={authUi.field}><span className={authUi.fieldLabel}>{t.newPasswordField}</span><input ref={(element) => { initialFocusRef.current = element }} className={authUi.input} name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label><label className={authUi.field}><span className={authUi.fieldLabel}>{t.repeatPassword}</span><input className={authUi.input} name="password_check" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label></> : null}

                  {error ? <p className={`${authUi.message} bg-[rgba(142,31,45,0.08)] text-error`} role="alert">{error}</p> : null}
                  {message ? <p className={`${authUi.message} bg-[rgba(205,187,176,0.22)] text-graphite`} role="status">{message}</p> : null}
                  <button className={`${authUi.submit} mt-[5px]`} type="submit" disabled={loading}>{loading ? t.wait : mode === 'phone' ? t.loginSubmit : mode === 'login-sms' ? t.requestCode : mode === 'register' ? t.registerSubmit : mode === 'sms' ? t.confirmPhone : mode === 'forgot' ? t.sendInstructions : t.savePassword}</button>
                </form>

                {mode === 'phone' ? <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[13px] text-graphite"><button className={authUi.textLink} type="button" onClick={() => changeMode('login-sms')}>{t.loginWithSms}</button><button className={authUi.textLink} type="button" onClick={() => changeMode('register')}>{t.createAccount}</button><button className={authUi.textLink} type="button" onClick={() => changeMode('forgot')}>{t.forgot}</button></div> : null}
                {mode === 'login-sms' ? <p className={authUi.switch}>{t.hasAccount} <button className={authUi.textLink} type="button" onClick={() => changeMode('phone', -1)}>{t.loginSubmit}</button></p> : null}
                {mode === 'register' ? <p className={authUi.switch}>{t.hasAccount} <button className={authUi.textLink} type="button" onClick={() => changeMode('phone', -1)}>{t.loginSubmit}</button></p> : null}
                {mode === 'sms' ? <button className={`${authUi.textLink} mx-auto mt-5`} type="button" onClick={resendCode} disabled={loading || resendCountdown > 0}>{resendCountdown > 0 ? t.resendWait.replace('{time}', `00:${String(resendCountdown).padStart(2, '0')}`) : t.resend}</button> : null}
              </section>
            )}
            </DrawerViewTransition>
          </div>
        </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  ), portalTarget)
}
