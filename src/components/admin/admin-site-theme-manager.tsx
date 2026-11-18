'use client'

import { Check, Palette, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

import { SITE_THEME_PRESETS, type SiteThemeKey } from '@/lib/site-theme-shared'

export function AdminSiteThemeManager() {
  const [themeKey, setThemeKey] = useState<SiteThemeKey>('default')
  const [savedThemeKey, setSavedThemeKey] = useState<SiteThemeKey>('default')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    void fetch('/api/admin/site-theme', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as { themeKey?: SiteThemeKey; message?: string }
        if (!response.ok) throw new Error(body.message || 'Не удалось загрузить тему сайта.')
        if (!cancelled && body.themeKey) {
          setThemeKey(body.themeKey)
          setSavedThemeKey(body.themeKey)
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить тему сайта.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  async function saveTheme() {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/site-theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeKey }),
      })
      const body = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) throw new Error(body.message || 'Не удалось сохранить тему сайта.')
      setSavedThemeKey(themeKey)
      setMessage('Тема сайта сохранена и будет применена на витрине.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить тему сайта.')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = themeKey !== savedThemeKey

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Контент и сайт</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Тема сайта</h1>
          <p className="mt-2 max-w-[680px] text-[12px] leading-5 text-[#707477]">Выберите сезонное оформление витрины. Каталог, цены и содержимое страниц останутся прежними.</p>
        </div>
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50" disabled={loading || saving || !hasChanges} onClick={() => void saveTheme()} type="button">
          <Save size={15} />{saving ? 'Сохраняем…' : 'Сохранить тему'}
        </button>
      </header>

      {error ? <div aria-live="polite" className="rounded-xl border border-[#f2d3d5] bg-[#fff6f6] px-4 py-3 text-[12px] leading-5 text-[#a1262e]" role="alert">{error}<span className="mt-1 block text-[11px] text-[#7b5558]">Если таблицы нет, примените SQL-патч <code>database/patches/2026-10-21-create-site-theme-settings.sql</code>.</span></div> : null}
      {message ? <div aria-live="polite" className="rounded-xl border border-[#d8e9ff] bg-[#f4f9ff] px-4 py-3 text-[12px] text-[#245a96]" role="status">{message}</div> : null}

      <section aria-label="Варианты темы сайта" className="grid gap-4 lg:grid-cols-3" role="radiogroup">
        {SITE_THEME_PRESETS.map((theme) => {
          const selected = themeKey === theme.key
          return (
            <button aria-checked={selected} className={`group overflow-hidden rounded-2xl border bg-white text-left transition ${selected ? 'border-[#202223] shadow-[0_0_0_1px_#202223]' : 'border-[#e5e7e9] hover:border-[#aeb2b5]'}`} disabled={loading || saving} key={theme.key} onClick={() => { setThemeKey(theme.key); setMessage('') }} role="radio" type="button">
              <span className={`block h-40 w-full ${theme.swatch}`} aria-hidden="true" />
              <span className="flex items-start justify-between gap-4 p-5">
                <span>
                  <span className="flex items-center gap-2 text-[15px] font-medium text-[#202223]">{theme.name}{selected ? <Check aria-hidden="true" className="text-[#2c6ecb]" size={16} /> : null}</span>
                  <span className="mt-2 block text-[12px] leading-5 text-[#707477]">{theme.description}</span>
                  <span className="mt-3 block text-[10px] font-medium tracking-[0.08em] text-[#858a8e] uppercase">{theme.preview}</span>
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f2f3f4] text-[#454a4e]"><Palette size={16} /></span>
              </span>
            </button>
          )
        })}
      </section>

      {loading ? <p className="text-[11px] text-[#777b7e]">Загружаем сохранённую тему…</p> : null}
    </div>
  )
}
