'use client'

import { LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export function AdminLoginForm() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', login, password }),
      })
      const result = await response.json() as { error?: string }

      if (!response.ok) {
        setError(result.error ?? 'Не удалось выполнить вход.')
        return
      }

      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Сервис входа временно недоступен.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-[14px] font-medium text-[#303438]" htmlFor="admin-login">
          Логин
        </label>
        <input
          autoComplete="username"
          className="h-14 w-full rounded-[10px] border border-[#d8dadd] bg-white px-4 text-[15px] text-[#202223] outline-none transition-[border-color,box-shadow] placeholder:text-[#747a78] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 disabled:bg-[#f6f6f7]"
          id="admin-login"
          maxLength={50}
          name="login"
          onChange={(event) => setLogin(event.target.value)}
          required
          value={login}
        />
      </div>

      <div>
        <label className="mb-2 block text-[14px] font-medium text-[#303438]" htmlFor="admin-password">
          Пароль
        </label>
        <input
          autoComplete="current-password"
          className="h-14 w-full rounded-[10px] border border-[#d8dadd] bg-white px-4 text-[15px] text-[#202223] outline-none transition-[border-color,box-shadow] placeholder:text-[#747a78] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 disabled:bg-[#f6f6f7]"
          id="admin-password"
          maxLength={256}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      {error ? (
        <p aria-live="polite" className="rounded-lg border border-[#8e1f2d]/25 bg-[#8e1f2d]/[.04] px-3 py-2.5 text-[13px] leading-5 text-[#8e1f2d]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="mt-1 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-[#111111] px-4 text-[15px] font-medium text-white transition-colors hover:bg-[#2b2b2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:cursor-wait disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : null}
        {submitting ? 'Входим…' : 'Войти'}
      </button>
    </form>
  )
}
