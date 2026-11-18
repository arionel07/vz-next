'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import type { AdminBeautySelection, AdminContentStatus, AdminSelectionProduct } from '@/lib/admin-editorial-content'

type SelectionList = { items: AdminBeautySelection[]; total: number; page: number; pageCount: number; pageSize: number }
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
  return `/admin/beauty-selections${params.size ? `?${params.toString()}` : ''}`
}

function productName(product: AdminSelectionProduct) {
  return product.titleRu || product.titleRo || `Товар #${product.id}`
}

export function AdminBeautySelectionsManager({ initialData, query, status }: { initialData: SelectionList; query: string; status: AdminContentStatus }) {
  const [data, setData] = useState(initialData)
  const [editing, setEditing] = useState<AdminBeautySelection | 'new' | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<AdminSelectionProduct[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [productMatches, setProductMatches] = useState<AdminSelectionProduct[]>([])
  const [productSearchPending, setProductSearchPending] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setSelectedProducts(editing && editing !== 'new' ? editing.products : [])
    setProductQuery('')
    setProductMatches([])
    setError('')
  }, [editing])

  useEffect(() => {
    const value = productQuery.trim()
    if (!editing || value.length < 2) {
      setProductMatches([])
      setProductSearchPending(false)
      return
    }
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setProductSearchPending(true)
      try {
        const response = await fetch(`/api/admin/beauty-selections?products=1&q=${encodeURIComponent(value)}`, { signal: controller.signal })
        const result = await response.json()
        if (response.ok) setProductMatches(result.products ?? [])
      } catch (searchError) {
        if (!(searchError instanceof DOMException && searchError.name === 'AbortError')) setProductMatches([])
      } finally {
        if (!controller.signal.aborted) setProductSearchPending(false)
      }
    }, 220)
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [productQuery, editing])

  async function saveSelection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setMessage('')
    const formData = new FormData(event.currentTarget)
    formData.set('productIds', JSON.stringify(selectedProducts.map((product) => product.id)))
    const isExisting = editing !== null && editing !== 'new'
    if (isExisting) {
      formData.set('id', String(editing.id))
      formData.set('imgRu', editing.imgRu ?? '')
      formData.set('imgRo', editing.imgRo ?? '')
    }
    try {
      const response = await fetch('/api/admin/beauty-selections', { method: isExisting ? 'PATCH' : 'POST', body: formData })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.selection) throw new Error(result?.message ?? 'Не удалось сохранить подборку.')
      const selection = result.selection as AdminBeautySelection
      setData((current) => ({ ...current, items: isExisting ? current.items.map((item) => item.id === selection.id ? selection : item) : [selection, ...current.items].slice(0, current.pageSize), total: isExisting ? current.total : current.total + 1 }))
      setEditing(null)
      setMessage(isExisting ? 'Изменения подборки сохранены.' : 'Подборка добавлена.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить подборку.')
    } finally {
      setPending(false)
    }
  }

  async function quickUpdate(item: AdminBeautySelection, patch: { isShown?: number; sorder?: number }) {
    const formData = new FormData()
    formData.set('id', String(item.id))
    formData.set('titleRu', item.titleRu)
    formData.set('titleRo', item.titleRo)
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
    formData.set('productIds', JSON.stringify(item.products.map((product) => product.id)))
    formData.set('imgRu', item.imgRu ?? '')
    formData.set('imgRo', item.imgRo ?? '')
    const response = await fetch('/api/admin/beauty-selections', { method: 'PATCH', body: formData })
    const result = await response.json().catch(() => null)
    if (!response.ok || !result?.selection) { setError(result?.message ?? 'Не удалось обновить подборку.'); return }
    setData((current) => ({ ...current, items: current.items.map((entry) => entry.id === item.id ? result.selection as AdminBeautySelection : entry) }))
  }

  async function deleteSelection(item: AdminBeautySelection) {
    if (!window.confirm(`Удалить подборку «${item.titleRu}»? Связи с товарами тоже будут удалены.`)) return
    setError('')
    const response = await fetch(`/api/admin/beauty-selections?id=${item.id}`, { method: 'DELETE' })
    const result = await response.json().catch(() => null)
    if (!response.ok) { setError(result?.message ?? 'Не удалось удалить подборку.'); return }
    setData((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id), total: Math.max(0, current.total - 1) }))
    setMessage('Подборка удалена.')
  }

  function addProduct(product: AdminSelectionProduct) {
    setSelectedProducts((items) => items.some((item) => item.id === product.id) ? items : [...items, product])
  }

  function moveProduct(index: number, offset: -1 | 1) {
    setSelectedProducts((items) => {
      const target = index + offset
      if (target < 0 || target >= items.length) return items
      const reordered = [...items]
      ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
      return reordered
    })
  }

  const isExisting = editing !== null && editing !== 'new'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Контент и сайт</p><h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Бьюти-подборки</h1><p className="mt-2 max-w-[640px] text-[13px] leading-5 text-[#707477]">Редактируйте страницы подборок и выбирайте товары для каждой из них.</p></div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" onClick={() => setEditing('new')} type="button"><Plus size={16} /> Добавить подборку</button>
      </header>
      <section className="rounded-2xl border border-[#e5e7e9] bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[15px] font-medium text-[#202223]">Все подборки <span className="ml-1 text-[12px] font-normal text-[#777b7e]">{data.total}</span></h2><p className="mt-1 text-[11px] text-[#777b7e]">Порядок товаров задаётся стрелками в форме редактирования.</p></div><form action="/admin/beauty-selections" className="flex w-full flex-wrap gap-2 sm:w-auto" method="get"><label className="relative min-w-[200px] flex-1 sm:w-[260px]"><Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={15} /><input aria-label="Поиск подборок" className={`${inputClass} pl-9`} defaultValue={query} name="q" placeholder="Название или ссылка" /></label><select aria-label="Фильтр публикации" className={`${inputClass} w-auto min-w-[132px]`} defaultValue={status} name="status"><option value="all">Все статусы</option><option value="shown">Показываются</option><option value="hidden">Скрыты</option></select><button className="h-10 rounded-lg border border-[#d9dcde] px-3 text-[11px] font-medium hover:bg-[#f5f6f7]" type="submit">Найти</button></form></div>
        {message ? <p aria-live="polite" className="mb-3 rounded-lg bg-[#eef8f1] px-3 py-2 text-[12px] text-[#24713b]">{message}</p> : null}{error && !editing ? <p aria-live="assertive" className="mb-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}
        <div className="overflow-x-auto rounded-xl border border-[#e5e7e9]"><table className="w-full min-w-[880px] border-collapse text-left"><thead className="bg-[#f7f7f7] text-[10px] font-medium tracking-[0.04em] text-[#6f7376] uppercase"><tr><th className="px-3 py-3">Подборка</th><th className="px-3 py-3">Товары</th><th className="px-3 py-3">Порядок</th><th className="px-3 py-3">Статус</th><th className="px-3 py-3 text-right">Действия</th></tr></thead><tbody className="divide-y divide-[#eceeef]">
          {data.items.map((item) => <tr className="text-[12px] text-[#34383b]" key={item.id}><td className="px-3 py-3"><div className="flex items-center gap-3"><div className="relative grid h-14 w-[84px] shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f1f2f3]">{item.imgRu ? <Image alt="" className="object-cover" fill sizes="84px" src={`/legacy-assets/beauty_selections/${encodeURIComponent(item.imgRu)}`} unoptimized /> : <ImagePlus aria-hidden="true" className="text-[#989da0]" size={18} />}</div><div className="min-w-0"><p className="max-w-[330px] truncate font-medium text-[#202223]">{item.titleRu}</p><p className="mt-1 max-w-[330px] truncate text-[10px] text-[#888d90]">RO: {item.titleRo} · /{item.uriRu}</p></div></div></td><td className="px-3 py-3">{item.products.length} товаров</td><td className="px-3 py-3"><input aria-label={`Порядок ${item.titleRu}`} className="h-8 w-16 rounded-md border border-[#d9dcde] px-2 text-center text-[12px] outline-none focus:border-[#007AFF]" defaultValue={item.sorder} min={0} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value !== item.sorder) void quickUpdate(item, { sorder: value }) }} type="number" /></td><td className="px-3 py-3"><button aria-pressed={item.isShown === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition ${item.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} onClick={() => void quickUpdate(item, { isShown: item.isShown === 1 ? 0 : 1 })} type="button">{item.isShown === 1 ? <Check size={12} /> : null}{item.isShown === 1 ? 'Показывается' : 'Скрыта'}</button></td><td className="px-3 py-3"><div className="flex justify-end gap-1"><a aria-label="Открыть подборку" className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#f1f2f3] hover:text-[#202223]" href={`/ru/beauty-selections/${encodeURIComponent(item.uriRu || item.id)}`} rel="noreferrer" target="_blank"><ExternalLink size={14} /></a><button aria-label={`Редактировать ${item.titleRu}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#e8f1ff] hover:text-[#005fc7]" onClick={() => setEditing(item)} type="button"><Pencil size={14} /></button><button aria-label={`Удалить ${item.titleRu}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#fff0f0] hover:text-[#a1262e]" onClick={() => void deleteSelection(item)} type="button"><Trash2 size={14} /></button></div></td></tr>)}
          {!data.items.length ? <tr><td className="px-4 py-12 text-center text-[12px] text-[#777b7e]" colSpan={5}>Подборки не найдены.</td></tr> : null}
        </tbody></table></div>
        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-[#777b7e]"><span>Страница {data.page} из {data.pageCount}</span><div className="flex gap-2"><Link aria-disabled={data.page <= 1} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#d9dcde] px-2.5 ${data.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-[#f7f7f7]'}`} href={queryHref(query, status, data.page - 1)}><ChevronLeft size={14} /> Назад</Link><Link aria-disabled={data.page >= data.pageCount} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#d9dcde] px-2.5 ${data.page >= data.pageCount ? 'pointer-events-none opacity-40' : 'hover:bg-[#f7f7f7]'}`} href={queryHref(query, status, data.page + 1)}>Дальше <ChevronRight size={14} /></Link></div></div>
      </section>

      {editing ? <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setEditing(null) }}><section aria-labelledby="selection-dialog-title" aria-modal="true" className="max-h-[94dvh] w-full max-w-[980px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6" role="dialog">
        <header className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#202223]" id="selection-dialog-title">{isExisting ? 'Редактировать подборку' : 'Новая подборка'}</h2><p className="mt-1 text-[11px] text-[#777b7e]">Русская и румынская версии, изображения, SEO и состав товаров.</p></div><button aria-label="Закрыть" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#65696c] hover:bg-[#f2f3f4]" disabled={pending} onClick={() => setEditing(null)} type="button"><X size={18} /></button></header>
        <form className="space-y-4" key={isExisting ? editing.id : 'new'} onSubmit={saveSelection}>
          <div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>Название RU *</span><input className={inputClass} defaultValue={isExisting ? editing.titleRu : ''} maxLength={255} name="titleRu" required /></label><label><span className={labelClass}>Название RO *</span><input className={inputClass} defaultValue={isExisting ? editing.titleRo : ''} maxLength={255} name="titleRo" required /></label><label><span className={labelClass}>Адрес RU</span><input className={inputClass} defaultValue={isExisting ? editing.uriRu : ''} maxLength={255} name="uriRu" placeholder="Создаётся из названия" /></label><label><span className={labelClass}>Адрес RO</span><input className={inputClass} defaultValue={isExisting ? editing.uriRo : ''} maxLength={255} name="uriRo" placeholder="Создаётся из названия" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>Краткое описание RU</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editorText(editing.descRu) : ''} name="descRu" /></label><label><span className={labelClass}>Краткое описание RO</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editorText(editing.descRo) : ''} name="descRo" /></label><label><span className={labelClass}>Текст страницы RU</span><textarea className={`${inputClass} h-32 resize-y py-2`} defaultValue={isExisting ? editorText(editing.textRu) : ''} name="textRu" /></label><label><span className={labelClass}>Текст страницы RO</span><textarea className={`${inputClass} h-32 resize-y py-2`} defaultValue={isExisting ? editorText(editing.textRo) : ''} name="textRo" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>SEO-заголовок RU</span><input className={inputClass} defaultValue={isExisting ? editing.seoTitleRu ?? '' : ''} maxLength={255} name="seoTitleRu" /></label><label><span className={labelClass}>SEO-заголовок RO</span><input className={inputClass} defaultValue={isExisting ? editing.seoTitleRo ?? '' : ''} maxLength={255} name="seoTitleRo" /></label><label><span className={labelClass}>SEO-описание RU</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editing.seoDescRu ?? '' : ''} name="seoDescRu" /></label><label><span className={labelClass}>SEO-описание RO</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editing.seoDescRo ?? '' : ''} name="seoDescRo" /></label></div>
          <div className="grid gap-3 sm:grid-cols-3"><label><span className={labelClass}>Главное изображение RU</span><input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2 file:py-1" name="imgRuFile" type="file" /></label><label><span className={labelClass}>Главное изображение RO</span><input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2 file:py-1" name="imgRoFile" type="file" /></label><div><label><span className={labelClass}>Порядок и публикация</span></label><div className="grid grid-cols-2 gap-2"><input aria-label="Порядок" className={inputClass} defaultValue={isExisting ? editing.sorder : 0} min={0} name="sorder" type="number" /><select aria-label="Статус" className={inputClass} defaultValue={isExisting ? String(editing.isShown) : '1'} name="isShown"><option value="1">Показывается</option><option value="0">Скрыта</option></select></div></div></div>
          {isExisting && (editing.imgRu || editing.imgRo) ? <div className="flex flex-wrap gap-3 rounded-lg bg-[#f7f7f7] p-2.5">{editing.imgRu ? <label className="flex items-center gap-2 text-[11px] text-[#555a5e]"><span className="relative size-12 overflow-hidden rounded bg-white"><Image alt="" className="object-cover" fill sizes="48px" src={`/legacy-assets/beauty_selections/${encodeURIComponent(editing.imgRu)}`} unoptimized /></span>RU: {editing.imgRu}<input name="removeImgRu" type="checkbox" value="1" /> Удалить</label> : null}{editing.imgRo ? <label className="flex items-center gap-2 text-[11px] text-[#555a5e]"><span className="relative size-12 overflow-hidden rounded bg-white"><Image alt="" className="object-cover" fill sizes="48px" src={`/legacy-assets/beauty_selections/${encodeURIComponent(editing.imgRo)}`} unoptimized /></span>RO: {editing.imgRo}<input name="removeImgRo" type="checkbox" value="1" /> Удалить</label> : null}</div> : null}

          <section className="rounded-xl border border-[#e5e7e9] p-3 sm:p-4"><div className="mb-3 flex items-baseline justify-between gap-3"><div><h3 className="text-[13px] font-medium text-[#202223]">Товары в подборке</h3><p className="mt-1 text-[10px] text-[#777b7e]">Порядок в списке станет порядком показа на странице.</p></div><span className="text-[10px] text-[#777b7e]">{selectedProducts.length} выбрано</span></div><label className="relative block"><Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={15} /><input aria-label="Найти товар для подборки" className={`${inputClass} pl-9`} onChange={(event) => setProductQuery(event.target.value)} placeholder="Введите название товара" value={productQuery} /></label>{productQuery.trim().length >= 2 ? <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-[#e5e7e9]">{productSearchPending ? <p className="px-3 py-2 text-[11px] text-[#777b7e]">Ищем товары…</p> : productMatches.length ? productMatches.map((product) => <div className="flex items-center justify-between gap-3 border-b border-[#f0f1f2] px-3 py-2 last:border-0" key={product.id}><span className="min-w-0 truncate text-[11px] text-[#45494c]">{productName(product)} <span className="text-[#92979a]">#{product.id}</span></span><button className="h-7 shrink-0 rounded-lg border border-[#d9dcde] px-2.5 text-[10px] font-medium hover:border-[#007AFF] hover:text-[#005fc7]" disabled={selectedProducts.some((item) => item.id === product.id)} onClick={() => addProduct(product)} type="button">{selectedProducts.some((item) => item.id === product.id) ? 'Добавлен' : 'Добавить'}</button></div>) : <p className="px-3 py-2 text-[11px] text-[#777b7e]">Подходящие товары не найдены.</p>}</div> : null}
            {selectedProducts.length ? <ol className="mt-3 space-y-1.5">{selectedProducts.map((product, index) => <li className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f7f7f7] px-2.5 py-2" key={product.id}><span className="w-5 shrink-0 text-[10px] tabular-nums text-[#777b7e]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-[11px] text-[#34383b]">{productName(product)} <span className="text-[#92979a]">#{product.id}</span></span><button aria-label={`Поднять ${productName(product)}`} className="grid size-7 place-items-center rounded-md text-[#686d70] hover:bg-white disabled:opacity-30" disabled={index === 0} onClick={() => moveProduct(index, -1)} type="button"><ArrowUp size={14} /></button><button aria-label={`Опустить ${productName(product)}`} className="grid size-7 place-items-center rounded-md text-[#686d70] hover:bg-white disabled:opacity-30" disabled={index === selectedProducts.length - 1} onClick={() => moveProduct(index, 1)} type="button"><ArrowDown size={14} /></button><button aria-label={`Убрать ${productName(product)}`} className="grid size-7 place-items-center rounded-md text-[#777b7e] hover:bg-[#fff0f0] hover:text-[#a1262e]" onClick={() => setSelectedProducts((items) => items.filter((entry) => entry.id !== product.id))} type="button"><X size={14} /></button></li>)}</ol> : <p className="mt-3 rounded-lg bg-[#f7f7f7] px-3 py-4 text-center text-[11px] text-[#777b7e]">Пока товары не добавлены.</p>}</section>
          {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}<footer className="flex justify-end gap-2 border-t border-[#eceeef] pt-4"><button className="h-9 rounded-lg border border-[#d9dcde] px-3.5 text-[11px] font-medium text-[#45494c] hover:bg-[#f7f7f7]" disabled={pending} onClick={() => setEditing(null)} type="button">Отмена</button><button className="h-9 rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-[#007AFF] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? 'Сохраняем…' : isExisting ? 'Сохранить' : 'Добавить подборку'}</button></footer>
        </form>
      </section></div> : null}
    </div>
  )
}
