'use client'

import { Inbox, MessageSquareText, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  ADMIN_FEEDBACK_STATUS_LABELS,
  ADMIN_FEEDBACK_STATUSES,
  ADMIN_FEEDBACK_TYPE_LABELS,
  type AdminFeedbackStatus,
} from '@/lib/admin-feedback-shared'

type FeedbackItem = {
  id: number
  feedbackType: keyof typeof ADMIN_FEEDBACK_TYPE_LABELS
  message: string
  pagePath: string | null
  referenceUrl: string | null
  locale: string | null
  status: AdminFeedbackStatus
  createdAt: string
  updatedAt: string | null
}

type FeedbackData = {
  rows: FeedbackItem[]
  total: number
  page: number
  pageCount: number
  pageSize: number
  counts: Record<'all' | AdminFeedbackStatus, number>
}

const statusStyles: Record<AdminFeedbackStatus, string> = {
  new: 'bg-[#eaf3ff] text-[#175cd3]',
  in_progress: 'bg-[#fff4d6] text-[#8a5a00]',
  done: 'bg-[#eaf7ee] text-[#217346]',
  rejected: 'bg-[#f1f2f3] text-[#65696c]',
}

function feedbackHref(query: string, status: AdminFeedbackStatus | '', page: number) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (status) params.set('status', status)
  if (page > 1) params.set('page', String(page))
  return `/admin/feedback${params.size ? `?${params.toString()}` : ''}`
}

function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function AdminFeedbackManager({ data, query, status }: { data: FeedbackData; query: string; status: AdminFeedbackStatus | '' }) {
  const [rows, setRows] = useState(data.rows)
  const [counts, setCounts] = useState(data.counts)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pendingStatus, setPendingStatus] = useState<AdminFeedbackStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const selected = rows.find((item) => item.id === selectedId) ?? null
  const firstItem = data.total ? (data.page - 1) * data.pageSize + 1 : 0
  const lastItem = Math.min(data.page * data.pageSize, data.total)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  function openFeedback(item: FeedbackItem) {
    setSelectedId(item.id)
    setPendingStatus(item.status)
    setError('')
  }

  async function saveStatus() {
    if (!selected || !pendingStatus || pendingStatus === selected.status) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, status: pendingStatus }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Не удалось обновить обращение.')

      setRows((current) => current.map((item) => item.id === selected.id ? { ...item, status: pendingStatus } : item))
      setCounts((current) => ({
        ...current,
        [selected.status]: Math.max(0, current[selected.status] - 1),
        [pendingStatus]: current[pendingStatus] + 1,
      }))
      setSelectedId(null)
      setNotice(`Статус обращения #${selected.id} обновлён.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось обновить обращение.')
    } finally {
      setSaving(false)
    }
  }

  const statusTabs: { label: string; value: AdminFeedbackStatus | ''; count: number }[] = [
    { label: 'Все', value: '', count: counts.all },
    ...ADMIN_FEEDBACK_STATUSES.map((value) => ({ label: ADMIN_FEEDBACK_STATUS_LABELS[value], value, count: counts[value] })),
  ]

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#eef5ff] text-[#0062CC]"><MessageSquareText aria-hidden="true" size={19} /></span>
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">Управление</p>
            <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[30px]">Обратная связь</h1>
          </div>
        </div>
        <span className="rounded-full border border-[#e3e6e8] bg-white px-3 py-2 text-[11px] text-[#60666b]">Всего обращений: {counts.all}</span>
      </header>

      {notice ? <p aria-live="polite" className="rounded-xl border border-[#c9e8d2] bg-[#f1faf4] px-4 py-3 text-[12px] text-[#217346]" role="status">{notice}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
        <form action="/admin/feedback" className="flex flex-col gap-3 border-b border-[#e7e9eb] p-4 sm:flex-row sm:items-center sm:px-5">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Поиск по обращениям</span>
            <Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={16} />
            <input className="h-10 w-full rounded-xl border border-[#dfe2e4] bg-white pr-3 pl-9 text-[12px] outline-none transition-colors placeholder:text-[#969a9d] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15" defaultValue={query} name="q" placeholder="Текст обращения или страница" type="search" />
          </label>
          <button className="h-10 shrink-0 rounded-xl bg-[#202223] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" type="submit">Найти</button>
        </form>

        <nav aria-label="Фильтр по статусу" className="flex gap-1 overflow-x-auto border-b border-[#e7e9eb] px-3 pt-2 sm:px-5">
          {statusTabs.map((tab) => (
            <a aria-current={status === tab.value ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[11px] transition-colors ${status === tab.value ? 'border-[#202223] font-semibold text-[#202223]' : 'border-transparent text-[#6b7074] hover:text-[#202223]'}`} href={feedbackHref(query, tab.value, 1)} key={tab.value || 'all'}>
              {tab.label}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${status === tab.value ? 'bg-[#f0f1f2] text-[#303438]' : 'bg-[#f6f7f7] text-[#777b7e]'}`}>{tab.count}</span>
            </a>
          ))}
        </nav>

        {error && !selected ? <p className="border-b border-[#f2d0d0] bg-[#fff7f7] px-5 py-3 text-[12px] text-[#b42318]" role="alert">{error}</p> : null}

        {rows.length ? (
          <div className="divide-y divide-[#eceeef]">
            {rows.map((item) => (
              <button className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-[#fafbfb] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5" key={item.id} onClick={() => openFeedback(item)} type="button">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-semibold text-[#202223]">Обращение #{item.id}</span>
                    <span className="rounded-full bg-[#f3f4f5] px-2 py-0.5 text-[9px] text-[#62666a]">{ADMIN_FEEDBACK_TYPE_LABELS[item.feedbackType]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] ${statusStyles[item.status]}`}>{ADMIN_FEEDBACK_STATUS_LABELS[item.status]}</span>
                  </span>
                  <span className="mt-1.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#62666a]">{item.message}</span>
                </span>
                <span className="flex items-center justify-between gap-4 text-[10px] text-[#858a8d] sm:justify-end">
                  <span>{item.pagePath || item.referenceUrl || 'Страница не указана'}</span>
                  <time className="shrink-0" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f1f2f3] text-[#707477]"><Inbox aria-hidden="true" size={20} /></span>
              <h2 className="mt-4 text-[15px] font-medium text-[#202223]">Обращений пока нет</h2>
              <p className="mt-1 max-w-sm text-[12px] leading-5 text-[#777b7e]">Сообщения из форм сайта будут появляться здесь. Позже сюда можно подключить запросы из личного кабинета.</p>
            </div>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceeef] px-4 py-3 text-[10px] text-[#777b7e] sm:px-5">
          <span>Показано {firstItem}–{lastItem} из {data.total}</span>
          {data.pageCount > 1 ? (
            <nav aria-label="Страницы обращений" className="flex items-center gap-2">
              <a aria-disabled={data.page <= 1} className={`rounded-lg border border-[#e2e4e6] px-3 py-2 ${data.page <= 1 ? 'pointer-events-none text-[#b9bdc0]' : 'text-[#303438] hover:bg-[#f7f8f8]'}`} href={feedbackHref(query, status, Math.max(1, data.page - 1))}>Назад</a>
              <span>{data.page} / {data.pageCount}</span>
              <a aria-disabled={data.page >= data.pageCount} className={`rounded-lg border border-[#e2e4e6] px-3 py-2 ${data.page >= data.pageCount ? 'pointer-events-none text-[#b9bdc0]' : 'text-[#303438] hover:bg-[#f7f8f8]'}`} href={feedbackHref(query, status, Math.min(data.pageCount, data.page + 1))}>Далее</a>
            </nav>
          ) : null}
        </footer>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/35" onClick={() => setSelectedId(null)}>
          <section aria-labelledby="feedback-detail-title" aria-modal="true" className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog">
            <header className="flex items-start justify-between gap-4 border-b border-[#eceeef] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">{ADMIN_FEEDBACK_TYPE_LABELS[selected.feedbackType]} · {selected.locale?.toUpperCase() || 'язык не указан'}</p>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.025em] text-[#202223]" id="feedback-detail-title">Обращение #{selected.id}</h2>
                <p className="mt-1 text-[11px] text-[#777b7e]">{formatDate(selected.createdAt)}</p>
              </div>
              <button aria-label="Закрыть обращение" className="grid size-9 shrink-0 place-items-center rounded-lg text-[#65696c] transition-colors hover:bg-[#f2f3f4]" onClick={() => setSelectedId(null)} type="button"><X aria-hidden="true" size={18} /></button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div>
                <p className="mb-2 text-[10px] font-semibold tracking-[0.08em] text-[#777b7e] uppercase">Сообщение</p>
                <p className="whitespace-pre-wrap break-words rounded-xl border border-[#e7e9eb] bg-[#fafafa] p-4 text-[13px] leading-6 text-[#303438]">{selected.message}</p>
              </div>
              <dl className="divide-y divide-[#eceeef] rounded-xl border border-[#e7e9eb] px-4">
                <div className="flex justify-between gap-4 py-3 text-[11px]"><dt className="text-[#777b7e]">Страница</dt><dd className="break-all text-right text-[#303438]">{selected.pagePath || 'Не указана'}</dd></div>
                {selected.referenceUrl ? <div className="flex justify-between gap-4 py-3 text-[11px]"><dt className="text-[#777b7e]">Источник</dt><dd className="break-all text-right text-[#303438]">{selected.referenceUrl}</dd></div> : null}
                <div className="flex justify-between gap-4 py-3 text-[11px]"><dt className="text-[#777b7e]">Последнее изменение</dt><dd className="text-right text-[#303438]">{selected.updatedAt ? formatDate(selected.updatedAt) : 'Не изменялось'}</dd></div>
              </dl>
              <label className="block text-[11px] font-medium text-[#555a5e]">Статус
                <select className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe2e4] bg-white px-3 text-[12px] text-[#303438] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15" onChange={(event) => setPendingStatus(event.target.value as AdminFeedbackStatus)} value={pendingStatus ?? selected.status}>
                  {ADMIN_FEEDBACK_STATUSES.map((value) => <option key={value} value={value}>{ADMIN_FEEDBACK_STATUS_LABELS[value]}</option>)}
                </select>
              </label>
              {error ? <p className="rounded-lg bg-[#fff7f7] px-3 py-2 text-[12px] text-[#b42318]" role="alert">{error}</p> : null}
            </div>

            <footer className="border-t border-[#eceeef] p-4 sm:px-6">
              <button className="h-10 w-full rounded-xl bg-[#202223] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:cursor-not-allowed disabled:bg-[#f1f2f3] disabled:text-[#777b7e]" disabled={saving || !pendingStatus || pendingStatus === selected.status} onClick={() => void saveStatus()} type="button">{saving ? 'Сохраняем…' : 'Сохранить статус'}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  )
}
