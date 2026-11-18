'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Check, ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import type { AdminContentStatus, AdminNewsItem } from '@/lib/admin-editorial-content'

type NewsList = { items: AdminNewsItem[]; total: number; page: number; pageCount: number; pageSize: number }
const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[13px] text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const labelClass = 'mb-1.5 block text-[11px] font-medium text-[#555a5e]'

function editorText(value: string | null | undefined) {
  return (value ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").trim()
}

function queryHref(query: string, status: AdminContentStatus, page: number) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (status !== 'all') params.set('status', status)
  if (page > 1) params.set('page', String(page))
  return `/admin/news${params.size ? `?${params.toString()}` : ''}`
}

export function AdminNewsManager({ initialData, query, status }: { initialData: NewsList; query: string; status: AdminContentStatus }) {
  const [data, setData] = useState(initialData)
  const [editing, setEditing] = useState<AdminNewsItem | 'new' | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function saveNews(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setMessage('')
    const formData = new FormData(event.currentTarget)
    const isExisting = editing !== null && editing !== 'new'
    if (isExisting) {
      formData.set('id', String(editing.id))
      formData.set('img', editing.img ?? '')
    }
    try {
      const response = await fetch('/api/admin/news', { method: isExisting ? 'PATCH' : 'POST', body: formData })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.item) throw new Error(result?.message ?? 'Не удалось сохранить новость.')
      const item = result.item as AdminNewsItem
      setData((current) => ({ ...current, items: isExisting ? current.items.map((row) => row.id === item.id ? item : row) : [item, ...current.items].slice(0, current.pageSize), total: isExisting ? current.total : current.total + 1 }))
      setEditing(null)
      setMessage(isExisting ? 'Изменения новости сохранены.' : 'Новость добавлена.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить новость.')
    } finally {
      setPending(false)
    }
  }

  async function quickUpdate(item: AdminNewsItem, patch: { isShown?: number; sorder?: number }) {
    const formData = new FormData()
    formData.set('id', String(item.id))
    formData.set('date', item.date)
    formData.set('titleRu', item.titleRu ?? '')
    formData.set('titleRo', item.titleRo ?? '')
    formData.set('uriRu', item.uriRu)
    formData.set('uriRo', item.uriRo)
    formData.set('descRu', editorText(item.descRu))
    formData.set('descRo', editorText(item.descRo))
    formData.set('textRu', editorText(item.textRu))
    formData.set('textRo', editorText(item.textRo))
    formData.set('seoTitleRu', item.seoTitleRu ?? '')
    formData.set('seoTitleRo', item.seoTitleRo ?? '')
    formData.set('seoDescRu', item.seoDescRu ?? '')
    formData.set('seoDescRo', item.seoDescRo ?? '')
    formData.set('isShown', String(patch.isShown ?? item.isShown))
    formData.set('sorder', String(patch.sorder ?? item.sorder))
    formData.set('img', item.img ?? '')
    const response = await fetch('/api/admin/news', { method: 'PATCH', body: formData })
    const result = await response.json().catch(() => null)
    if (!response.ok || !result?.item) {
      setError(result?.message ?? 'Не удалось обновить новость.')
      return
    }
    setData((current) => ({ ...current, items: current.items.map((row) => row.id === item.id ? result.item as AdminNewsItem : row) }))
  }

  async function deleteNews(item: AdminNewsItem) {
    if (!window.confirm(`Удалить новость «${item.titleRu || `#${item.id}`}»? Это действие нельзя отменить.`)) return
    setError('')
    const response = await fetch(`/api/admin/news?id=${item.id}`, { method: 'DELETE' })
    const result = await response.json().catch(() => null)
    if (!response.ok) { setError(result?.message ?? 'Не удалось удалить новость.'); return }
    setData((current) => ({ ...current, items: current.items.filter((row) => row.id !== item.id), total: Math.max(0, current.total - 1) }))
    setMessage('Новость удалена.')
  }

  const isExisting = editing !== null && editing !== 'new'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Контент и сайт</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Новости</h1>
          <p className="mt-2 max-w-[640px] text-[13px] leading-5 text-[#707477]">Публикации для русского и румынского разделов сайта. Материалы блога остаются в отдельном разделе.</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" onClick={() => { setError(''); setEditing('new') }} type="button"><Plus size={16} /> Добавить новость</button>
      </header>

      <section className="rounded-2xl border border-[#e5e7e9] bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-[15px] font-medium text-[#202223]">Все новости <span className="ml-1 text-[12px] font-normal text-[#777b7e]">{data.total}</span></h2><p className="mt-1 text-[11px] text-[#777b7e]">Порядок списка задаёт сортировку на странице новостей.</p></div>
          <form action="/admin/news" className="flex w-full flex-wrap gap-2 sm:w-auto" method="get">
            <label className="relative min-w-[200px] flex-1 sm:w-[260px]"><Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={15} /><input aria-label="Поиск новостей" className={`${inputClass} pl-9`} defaultValue={query} name="q" placeholder="Название или ссылка" /></label>
            <select aria-label="Фильтр публикации" className={`${inputClass} w-auto min-w-[132px]`} defaultValue={status} name="status"><option value="all">Все статусы</option><option value="shown">Показываются</option><option value="hidden">Скрыты</option></select>
            <button className="h-10 rounded-lg border border-[#d9dcde] px-3 text-[11px] font-medium hover:bg-[#f5f6f7]" type="submit">Найти</button>
          </form>
        </div>
        {message ? <p aria-live="polite" className="mb-3 rounded-lg bg-[#eef8f1] px-3 py-2 text-[12px] text-[#24713b]">{message}</p> : null}
        {error ? <p aria-live="assertive" className="mb-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}

        <div className="overflow-x-auto rounded-xl border border-[#e5e7e9]">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead className="bg-[#f7f7f7] text-[10px] font-medium tracking-[0.04em] text-[#6f7376] uppercase"><tr><th className="px-3 py-3">Новость</th><th className="px-3 py-3">Дата</th><th className="px-3 py-3">Порядок</th><th className="px-3 py-3">Статус</th><th className="px-3 py-3 text-right">Действия</th></tr></thead>
            <tbody className="divide-y divide-[#eceeef]">
              {data.items.map((item) => (
                <tr className="text-[12px] text-[#34383b]" key={item.id}>
                  <td className="px-3 py-3"><div className="flex items-center gap-3"><div className="relative grid h-14 w-[84px] shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f1f2f3]">{item.img ? <Image alt="" className="object-cover" fill sizes="84px" src={`/legacy-assets/articles/${encodeURIComponent(item.img)}`} unoptimized /> : <ImagePlus aria-hidden="true" className="text-[#989da0]" size={18} />}</div><div className="min-w-0"><p className="max-w-[330px] truncate font-medium text-[#202223]">{item.titleRu || `Новость #${item.id}`}</p><p className="mt-1 max-w-[330px] truncate text-[10px] text-[#888d90]">RO: {item.titleRo || '—'} · /{item.uriRu}</p></div></div></td>
                  <td className="px-3 py-3 tabular-nums">{item.date}</td>
                  <td className="px-3 py-3"><input aria-label={`Порядок ${item.titleRu ?? item.id}`} className="h-8 w-16 rounded-md border border-[#d9dcde] px-2 text-center text-[12px] outline-none focus:border-[#007AFF]" defaultValue={item.sorder} min={0} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value !== item.sorder) void quickUpdate(item, { sorder: value }) }} type="number" /></td>
                  <td className="px-3 py-3"><button aria-pressed={item.isShown === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition ${item.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} onClick={() => void quickUpdate(item, { isShown: item.isShown === 1 ? 0 : 1 })} type="button">{item.isShown === 1 ? <Check size={12} /> : null}{item.isShown === 1 ? 'Опубликована' : 'Скрыта'}</button></td>
                  <td className="px-3 py-3"><div className="flex justify-end gap-1"><a aria-label="Открыть новость" className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#f1f2f3] hover:text-[#202223]" href={`/ru/novosti/${encodeURIComponent(item.uriRu || item.id)}`} rel="noreferrer" target="_blank"><ExternalLink size={14} /></a><button aria-label={`Редактировать ${item.titleRu ?? item.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#e8f1ff] hover:text-[#005fc7]" onClick={() => { setError(''); setEditing(item) }} type="button"><Pencil size={14} /></button><button aria-label={`Удалить ${item.titleRu ?? item.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#fff0f0] hover:text-[#a1262e]" onClick={() => void deleteNews(item)} type="button"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
              {!data.items.length ? <tr><td className="px-4 py-12 text-center text-[12px] text-[#777b7e]" colSpan={5}>Новости не найдены.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-[#777b7e]"><span>Страница {data.page} из {data.pageCount}</span><div className="flex gap-2"><Link aria-disabled={data.page <= 1} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#d9dcde] px-2.5 ${data.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-[#f7f7f7]'}`} href={queryHref(query, status, data.page - 1)}><ChevronLeft size={14} /> Назад</Link><Link aria-disabled={data.page >= data.pageCount} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#d9dcde] px-2.5 ${data.page >= data.pageCount ? 'pointer-events-none opacity-40' : 'hover:bg-[#f7f7f7]'}`} href={queryHref(query, status, data.page + 1)}>Дальше <ChevronRight size={14} /></Link></div></div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setEditing(null) }}>
          <section aria-labelledby="news-dialog-title" aria-modal="true" className="max-h-[94dvh] w-full max-w-[900px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6" role="dialog">
            <header className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#202223]" id="news-dialog-title">{isExisting ? 'Редактировать новость' : 'Новая новость'}</h2><p className="mt-1 text-[11px] text-[#777b7e]">Поля русского и румынского языков. SEO-ключевые слова не используются.</p></div><button aria-label="Закрыть" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#65696c] hover:bg-[#f2f3f4]" disabled={pending} onClick={() => setEditing(null)} type="button"><X size={18} /></button></header>
            <form className="space-y-4" key={isExisting ? editing.id : 'new'} onSubmit={saveNews}>
              <div className="grid gap-3 sm:grid-cols-3">
                <label><span className={labelClass}>Заголовок RU *</span><input className={inputClass} defaultValue={isExisting ? editing.titleRu ?? '' : ''} maxLength={250} name="titleRu" required /></label>
                <label><span className={labelClass}>Заголовок RO *</span><input className={inputClass} defaultValue={isExisting ? editing.titleRo ?? '' : ''} maxLength={250} name="titleRo" required /></label>
                <label><span className={labelClass}>Дата публикации *</span><input className={inputClass} defaultValue={isExisting ? editing.date : ''} name="date" required type="date" /></label>
                <label><span className={labelClass}>Адрес RU</span><input className={inputClass} defaultValue={isExisting ? editing.uriRu : ''} maxLength={300} name="uriRu" placeholder="Создаётся из заголовка" /></label>
                <label><span className={labelClass}>Адрес RO</span><input className={inputClass} defaultValue={isExisting ? editing.uriRo : ''} maxLength={300} name="uriRo" placeholder="Создаётся из заголовка" /></label>
                <label><span className={labelClass}>Порядок</span><input className={inputClass} defaultValue={isExisting ? editing.sorder : 1} min={0} name="sorder" type="number" /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>Краткое описание RU</span><textarea className={`${inputClass} h-24 resize-y py-2`} defaultValue={isExisting ? editorText(editing.descRu) : ''} name="descRu" /></label>
                <label><span className={labelClass}>Краткое описание RO</span><textarea className={`${inputClass} h-24 resize-y py-2`} defaultValue={isExisting ? editorText(editing.descRo) : ''} name="descRo" /></label>
                <label><span className={labelClass}>Текст новости RU</span><textarea className={`${inputClass} h-40 resize-y py-2`} defaultValue={isExisting ? editorText(editing.textRu) : ''} name="textRu" /></label>
                <label><span className={labelClass}>Текст новости RO</span><textarea className={`${inputClass} h-40 resize-y py-2`} defaultValue={isExisting ? editorText(editing.textRo) : ''} name="textRo" /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>SEO-заголовок RU</span><input className={inputClass} defaultValue={isExisting ? editing.seoTitleRu ?? '' : ''} maxLength={250} name="seoTitleRu" /></label><label><span className={labelClass}>SEO-заголовок RO</span><input className={inputClass} defaultValue={isExisting ? editing.seoTitleRo ?? '' : ''} maxLength={250} name="seoTitleRo" /></label><label><span className={labelClass}>SEO-описание RU</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editing.seoDescRu ?? '' : ''} name="seoDescRu" /></label><label><span className={labelClass}>SEO-описание RO</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editing.seoDescRo ?? '' : ''} name="seoDescRo" /></label></div>
              <div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>Главное изображение</span><input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[11px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="imgFile" type="file" /></label><label><span className={labelClass}>Публикация</span><select className={inputClass} defaultValue={isExisting ? String(editing.isShown) : '1'} name="isShown"><option value="1">Опубликована</option><option value="0">Скрыта</option></select></label></div>
              {isExisting && editing.img ? <div className="flex items-center gap-3 rounded-lg bg-[#f7f7f7] p-2.5"><div className="relative h-14 w-20 overflow-hidden rounded-md bg-white"><Image alt="" className="object-cover" fill sizes="80px" src={`/legacy-assets/articles/${encodeURIComponent(editing.img)}`} unoptimized /></div><span className="min-w-0 flex-1 truncate text-[11px] text-[#777b7e]">{editing.img}</span><label className="flex items-center gap-2 text-[11px] text-[#555a5e]"><input name="removeImg" type="checkbox" value="1" /> Удалить изображение</label></div> : null}
              {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}
              <footer className="flex justify-end gap-2 border-t border-[#eceeef] pt-4"><button className="h-9 rounded-lg border border-[#d9dcde] px-3.5 text-[11px] font-medium text-[#45494c] hover:bg-[#f7f7f7]" disabled={pending} onClick={() => setEditing(null)} type="button">Отмена</button><button className="h-9 rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-[#007AFF] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? 'Сохраняем…' : isExisting ? 'Сохранить' : 'Добавить новость'}</button></footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}
