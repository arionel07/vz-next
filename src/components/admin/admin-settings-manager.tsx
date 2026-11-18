'use client'

import { Check, ChevronLeft, ChevronRight, Languages, LoaderCircle, Save, Search, Settings2 } from 'lucide-react'
import { useState } from 'react'

import {
  ADMIN_SETTING_GROUP_LABELS,
  ADMIN_SETTING_GROUPS,
  type AdminSettingGroup,
} from '@/lib/admin-settings-shared'

type SettingRow = {
  id: number
  name: string | null
  description: string | null
  ru: string | null
  ro: string
  fieldType: number
  group: AdminSettingGroup
}

type SettingDraft = { ru: string; ro: string }
type SettingDraftMap = Record<number, SettingDraft>

type AdminSettingsData = {
  rows: SettingRow[]
  total: number
  page: number
  pageCount: number
  pageSize: number
}

type AdminSettingsManagerProps = {
  data: AdminSettingsData
  query: string
  group: AdminSettingGroup | ''
}

function pageHref(page: number, query: string, group: AdminSettingGroup | '') {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (group) params.set('group', group)
  if (page > 1) params.set('page', String(page))
  return `/admin/settings${params.size ? `?${params.toString()}` : ''}`
}

export function AdminSettingsManager({ data, query, group }: AdminSettingsManagerProps) {
  const initialValues = Object.fromEntries(data.rows.map((row) => [row.id, {
    ru: row.ru ?? '',
    ro: row.ro ?? '',
  }])) as SettingDraftMap
  const [drafts, setDrafts] = useState(initialValues)
  const [savedValues, setSavedValues] = useState(initialValues)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [savedIds, setSavedIds] = useState<number[]>([])
  const [error, setError] = useState('')
  const firstItem = data.total ? (data.page - 1) * data.pageSize + 1 : 0
  const lastItem = Math.min(data.page * data.pageSize, data.total)

  function updateDraft(id: number, locale: 'ru' | 'ro', value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [locale]: value },
    }))
    setSavedIds((current) => current.filter((savedId) => savedId !== id))
  }

  async function saveRow(row: SettingRow) {
    setSavingId(row.id)
    setError('')
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, ...drafts[row.id] }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Не удалось сохранить настройку.')
      setSavedValues((current) => ({ ...current, [row.id]: { ...drafts[row.id] } }))
      setSavedIds((current) => [...current.filter((id) => id !== row.id), row.id])
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить настройку.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#eef5ff] text-[#0062CC]"><Settings2 aria-hidden="true" size={19} /></span>
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">Управление</p>
            <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[30px]">Настройки сайта</h1>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e6e8] bg-white px-3 py-2 text-[11px] text-[#60666b]">
          <Languages aria-hidden="true" size={14} /> Русский и румынский
        </span>
      </header>

      <section className="grid overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white sm:grid-cols-3" aria-label="Сводка настроек">
        {[
          { label: 'Всего текстов', value: data.total.toLocaleString('ru-RU') },
          { label: 'Группы legacy', value: ADMIN_SETTING_GROUPS.length },
          { label: 'Страница', value: `${data.page} / ${data.pageCount}` },
        ].map((item, index) => (
          <div className={`px-5 py-4 ${index ? 'border-t border-[#eceeef] sm:border-t-0 sm:border-l' : ''}`} key={item.label}>
            <p className="text-[11px] text-[#777b7e]">{item.label}</p>
            <p className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[#202223]">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
        <form action="/admin/settings" className="flex flex-col gap-3 border-b border-[#e7e9eb] p-4 sm:flex-row sm:items-center sm:px-5">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Поиск по настройкам</span>
            <Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={16} />
            <input className="h-10 w-full rounded-xl border border-[#dfe2e4] bg-white pr-3 pl-9 text-[12px] outline-none transition-colors placeholder:text-[#969a9d] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15" defaultValue={query} name="q" placeholder="Название, описание или текст" type="search" />
          </label>
          <label className="sm:w-[230px]">
            <span className="sr-only">Группа настроек</span>
            <select className="h-10 w-full rounded-xl border border-[#dfe2e4] bg-white px-3 text-[12px] text-[#303438] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15" defaultValue={group} name="group">
              <option value="">Все группы</option>
              {ADMIN_SETTING_GROUPS.map((value) => <option key={value} value={value}>{ADMIN_SETTING_GROUP_LABELS[value]}</option>)}
            </select>
          </label>
          <button className="h-10 shrink-0 rounded-xl bg-[#202223] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" type="submit">Показать</button>
        </form>

        {error ? <p className="border-b border-[#f2d0d0] bg-[#fff7f7] px-5 py-3 text-[12px] text-[#b42318]" role="alert">{error}</p> : null}

        {data.rows.length ? (
          <div className="divide-y divide-[#eceeef]">
            {data.rows.map((row) => {
              const draft = drafts[row.id] ?? { ru: row.ru ?? '', ro: row.ro ?? '' }
              const saved = savedValues[row.id] ?? { ru: row.ru ?? '', ro: row.ro ?? '' }
              const changed = draft.ru !== saved.ru || draft.ro !== saved.ro
              const useDate = row.fieldType === 4
              const useTextArea = row.fieldType === 1 || row.fieldType === 2 || row.fieldType > 4
              const inputClass = 'mt-1.5 w-full rounded-xl border border-[#dfe2e4] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#202223] outline-none transition-colors focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'

              return (
                <article className="px-4 py-4 sm:px-5 sm:py-5" key={row.id}>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="break-words text-[13px] font-semibold text-[#202223]">{row.name || `Текст #${row.id}`}</h2>
                      {row.description ? <p className="mt-0.5 text-[11px] text-[#777b7e]">{row.description}</p> : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f3f4f5] px-2.5 py-1 text-[10px] text-[#62666a]">{ADMIN_SETTING_GROUP_LABELS[row.group] ?? row.group}</span>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {(['ru', 'ro'] as const).map((locale) => (
                      <label className="block text-[10px] font-semibold tracking-[0.06em] text-[#62666a] uppercase" key={locale}>
                        {locale === 'ru' ? 'Русский · RU' : 'Română · RO'}
                        {useTextArea ? (
                          <textarea className={`${inputClass} min-h-24 resize-y`} maxLength={200000} onChange={(event) => updateDraft(row.id, locale, event.target.value)} value={draft[locale]} />
                        ) : (
                          <input className={inputClass} maxLength={200000} onChange={(event) => updateDraft(row.id, locale, event.target.value)} type={useDate ? 'date' : 'text'} value={draft[locale]} />
                        )}
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-[#969a9d]">ID {row.id}{row.fieldType === 2 ? ' · HTML-текст' : ''}</span>
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#202223] px-3.5 text-[11px] font-medium text-white transition-colors hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:cursor-not-allowed disabled:bg-[#f1f2f3] disabled:text-[#777b7e]"
                      disabled={!changed || savingId !== null}
                      onClick={() => void saveRow(row)}
                      type="button"
                    >
                      {savingId === row.id ? <LoaderCircle aria-hidden="true" className="animate-spin" size={14} /> : savedIds.includes(row.id) && !changed ? <Check aria-hidden="true" size={14} /> : <Save aria-hidden="true" size={14} />}
                      {savingId === row.id ? 'Сохраняем…' : savedIds.includes(row.id) && !changed ? 'Сохранено' : 'Сохранить'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center px-6 py-12 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f1f2f3] text-[#707477]"><Settings2 aria-hidden="true" size={20} /></span>
              <h2 className="mt-4 text-[15px] font-medium text-[#202223]">Настройки не найдены</h2>
              <p className="mt-1 text-[12px] text-[#777b7e]">Измените поисковый запрос или выберите другую группу.</p>
            </div>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceeef] px-4 py-3 text-[10px] text-[#777b7e] sm:px-5">
          <span>Показано {firstItem}–{lastItem} из {data.total}</span>
          {data.pageCount > 1 ? (
            <nav aria-label="Страницы настроек" className="flex items-center gap-1">
              <a aria-disabled={data.page <= 1} className={`inline-flex size-8 items-center justify-center rounded-lg border border-[#e2e4e6] ${data.page <= 1 ? 'pointer-events-none text-[#b9bdc0]' : 'text-[#303438] hover:bg-[#f7f8f8]'}`} href={pageHref(Math.max(1, data.page - 1), query, group)}><ChevronLeft aria-hidden="true" size={15} /><span className="sr-only">Предыдущая</span></a>
              <span className="min-w-14 text-center">{data.page} / {data.pageCount}</span>
              <a aria-disabled={data.page >= data.pageCount} className={`inline-flex size-8 items-center justify-center rounded-lg border border-[#e2e4e6] ${data.page >= data.pageCount ? 'pointer-events-none text-[#b9bdc0]' : 'text-[#303438] hover:bg-[#f7f8f8]'}`} href={pageHref(Math.min(data.pageCount, data.page + 1), query, group)}><ChevronRight aria-hidden="true" size={15} /><span className="sr-only">Следующая</span></a>
            </nav>
          ) : null}
        </footer>
      </section>
    </div>
  )
}
