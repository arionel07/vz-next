'use client'

import { LocalizedLink as Link } from '@/components/site/localized-link'
import { FormEvent, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { StoreLocale } from '@/lib/locale-routing'

export function ResetPasswordPage({ locale = 'ru' }: { locale?: StoreLocale }) {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const text = locale === 'ro'
    ? { account: 'Contul meu', title: 'Parolă nouă', intro: 'Introdu parola nouă pentru contul Vizaje-Nica.', missing: 'Linkul de resetare nu a fost găsit.', password: 'Parolă nouă', repeat: 'Confirmă parola', save: 'Salvează parola', saving: 'Se salvează…', success: 'Parola a fost actualizată. Te poți autentifica.', error: 'Parola nu a putut fi actualizată.', home: 'Înapoi la pagina principală' }
    : { account: 'Личный кабинет', title: 'Новый пароль', intro: 'Введите новый пароль для вашего аккаунта Vizaje-Nica.', missing: 'Ссылка восстановления не найдена.', password: 'Новый пароль', repeat: 'Повторите пароль', save: 'Сохранить пароль', saving: 'Сохраняем…', success: 'Пароль обновлён. Теперь можно войти в аккаунт.', error: 'Не удалось обновить пароль.', home: 'Вернуться на главную' }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset-password', token, password: form.get('password'), passwordCheck: form.get('password_check') }) })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || text.error)
      setMessage(text.success)
    } catch (caught) {
      const caughtMessage = caught instanceof Error ? caught.message : ''
      setError(locale === 'ro' && /[\u0400-\u04FF]/.test(caughtMessage) ? text.error : caughtMessage || text.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-[8%] pt-[12vh] pb-12">
      <div className="max-w-[520px]">
        <p className="eyebrow">{text.account}</p>
        <h1 className="mb-[18px] text-[clamp(42px,6vw,72px)] leading-[1.1] tracking-[-.06em]">{text.title}</h1>
        <p className="mb-[30px] leading-[1.6] text-graphite">{text.intro}</p>
        {!token ? <p className="m-0 bg-[rgba(142,31,45,0.08)] p-3 text-xs leading-[1.5] text-error">{text.missing}</p> : (
          <form className="flex flex-col gap-[17px]" onSubmit={submit}>
            <label className="flex flex-col gap-2"><span className="text-xs text-graphite">{text.password}</span><input className="min-h-12 w-full rounded-lg border border-midnight-ink/10 bg-white px-[14px] text-midnight-ink outline-none focus:border-hover-cream focus:ring-2 focus:ring-hover-cream/20" name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></label>
            <label className="flex flex-col gap-2"><span className="text-xs text-graphite">{text.repeat}</span><input className="min-h-12 w-full rounded-lg border border-midnight-ink/10 bg-white px-[14px] text-midnight-ink outline-none focus:border-hover-cream focus:ring-2 focus:ring-hover-cream/20" name="password_check" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></label>
            {error ? <p className="m-0 bg-[rgba(142,31,45,0.08)] p-3 text-xs leading-[1.5] text-error" role="alert">{error}</p> : null}
            {message ? <p className="m-0 bg-[rgba(205,187,176,0.22)] p-3 text-xs leading-[1.5] text-graphite" role="status">{message}</p> : null}
            <button className="mt-[5px] inline-flex min-h-[50px] w-full items-center justify-center rounded-lg bg-midnight-ink px-6 text-[13px] font-medium text-white transition-colors hover:bg-button-hover hover:text-midnight-ink disabled:cursor-wait disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 motion-reduce:transition-none" type="submit" disabled={loading}>{loading ? text.saving : text.save}</button>
          </form>
        )}
        <Link className="mt-[26px] inline-block border-b border-hover-cream pb-[3px] text-[13px] text-graphite hover:text-hover-cream" href={`/${locale}`}>{text.home}</Link>
      </div>
    </main>
  )
}
