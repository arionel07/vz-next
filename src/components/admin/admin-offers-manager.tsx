'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import type { AdminOffer, AdminOfferProduct, AdminOfferStatus } from '@/lib/admin-offers'

type OfferList = { items: AdminOffer[]; total: number; page: number; pageCount: number; pageSize: number }
type ProductSearchResult = AdminOfferProduct[]

const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[13px] text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const labelClass = 'mb-1.5 block text-[11px] font-medium text-[#555a5e]'
const buttonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#d9dcde] bg-white px-3 text-[11px] font-medium text-[#34383b] transition hover:bg-[#f5f6f7] disabled:cursor-wait disabled:opacity-50'

function assetUrl(image: string) {
  return `/legacy-assets/offers/${encodeURIComponent(image)}`
}

function queryHref(query: string, status: AdminOfferStatus, page: number) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (status !== 'all') params.set('status', status)
  if (page > 1) params.set('page', String(page))
  return `/admin/offers${params.size ? `?${params.toString()}` : ''}`
}

function channelLabel(channel: number) {
  if (channel === 0) return 'Офлайн'
  if (channel === 2) return 'Онлайн и офлайн'
  return 'Онлайн'
}

function appendOfferFields(formData: FormData, offer: AdminOffer, patch: { isShown?: number; sorder?: number } = {}) {
  formData.set('dateFrom', offer.dateFrom)
  formData.set('dateTo', offer.dateTo)
  formData.set('titleRu', offer.titleRu ?? '')
  formData.set('titleRo', offer.titleRo ?? '')
  formData.set('uriRu', offer.uriRu ?? '')
  formData.set('uriRo', offer.uriRo ?? '')
  formData.set('descRu', offer.descRu)
  formData.set('descRo', offer.descRo)
  formData.set('sale', offer.sale)
  formData.set('isOnline', String(offer.isOnline))
  formData.set('progressMode', offer.progressMode)
  formData.set('locationRu', offer.locationRu)
  formData.set('locationRo', offer.locationRo)
  formData.set('seoTitleRu', offer.seoTitleRu ?? '')
  formData.set('seoTitleRo', offer.seoTitleRo ?? '')
  formData.set('seoDescRu', offer.seoDescRu ?? '')
  formData.set('seoDescRo', offer.seoDescRo ?? '')
  formData.set('viewHome', String(offer.viewHome))
  formData.set('isShown', String(patch.isShown ?? offer.isShown))
  formData.set('sorder', String(patch.sorder ?? offer.sorder))
  formData.set('productIds', JSON.stringify(offer.products.map((product) => product.id)))
  formData.set('imgRu', offer.imgRu)
  formData.set('imgRo', offer.imgRo)
  formData.set('imgBru', offer.imgBru)
  formData.set('imgBro', offer.imgBro)
}

export function AdminOffersManager({ initialData, query, status }: { initialData: OfferList; query: string; status: AdminOfferStatus }) {
  const [data, setData] = useState(initialData)
  const [editing, setEditing] = useState<AdminOffer | 'new' | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<AdminOfferProduct[]>([])
  const [pending, setPending] = useState(false)
  const [pendingAction, setPendingAction] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function openEditor(offer: AdminOffer | 'new') {
    setError('')
    setSelectedProducts(offer === 'new' ? [] : offer.products)
    setEditing(offer)
  }

  async function saveOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setPending(true)
    setError('')
    setMessage('')
    const formData = new FormData(event.currentTarget)
    const isExisting = editing !== 'new'
    formData.set('productIds', JSON.stringify(selectedProducts.map((product) => product.id)))
    if (isExisting) {
      formData.set('id', String(editing.id))
      formData.set('imgRu', editing.imgRu)
      formData.set('imgRo', editing.imgRo)
      formData.set('imgBru', editing.imgBru)
      formData.set('imgBro', editing.imgBro)
    }
    try {
      const response = await fetch('/api/admin/offers', { method: isExisting ? 'PATCH' : 'POST', body: formData })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.offer) throw new Error(result?.message ?? 'Не удалось сохранить акцию.')
      const offer = result.offer as AdminOffer
      setData((current) => ({
        ...current,
        items: isExisting
          ? current.items.map((item) => item.id === offer.id ? offer : item)
          : [offer, ...current.items].slice(0, current.pageSize),
        total: isExisting ? current.total : current.total + 1,
      }))
      setEditing(null)
      setMessage(isExisting ? 'Изменения акции сохранены.' : 'Акция добавлена.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить акцию.')
    } finally {
      setPending(false)
    }
  }

  async function quickUpdate(offer: AdminOffer, patch: { isShown?: number; sorder?: number }) {
    setPendingAction(offer.id)
    setError('')
    const formData = new FormData()
    formData.set('id', String(offer.id))
    appendOfferFields(formData, offer, patch)
    try {
      const response = await fetch('/api/admin/offers', { method: 'PATCH', body: formData })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.offer) throw new Error(result?.message ?? 'Не удалось обновить акцию.')
      const updatedOffer = result.offer as AdminOffer
      setData((current) => ({ ...current, items: current.items.map((item) => item.id === offer.id ? updatedOffer : item) }))
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Не удалось обновить акцию.')
    } finally {
      setPendingAction(null)
    }
  }

  async function deleteOffer(offer: AdminOffer) {
    if (!window.confirm(`Удалить акцию «${offer.titleRu || `#${offer.id}`}»? Товары будут отвязаны, а правила подарков сохранятся.`)) return
    setError('')
    setPendingAction(offer.id)
    try {
      const response = await fetch(`/api/admin/offers?id=${offer.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось удалить акцию.')
      setData((current) => ({ ...current, items: current.items.filter((item) => item.id !== offer.id), total: Math.max(0, current.total - 1) }))
      setMessage('Акция удалена.')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Не удалось удалить акцию.')
    } finally {
      setPendingAction(null)
    }
  }

  const isExisting = editing !== null && editing !== 'new'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Продажи</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Акции и предложения</h1>
          <p className="mt-2 max-w-[680px] text-[13px] leading-5 text-[#707477]">Обычные акции, сроки, изображения и товары. Подарочные правила и промокоды редактируются в отдельном разделе.</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" onClick={() => openEditor('new')} type="button"><Plus size={16} /> Добавить акцию</button>
      </header>

      <section className="rounded-2xl border border-[#e5e7e9] bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-[15px] font-medium text-[#202223]">Все акции <span className="ml-1 text-[12px] font-normal text-[#777b7e]">{data.total}</span></h2><p className="mt-1 text-[11px] text-[#777b7e]">Управляйте публикацией и порядком отображения.</p></div>
          <form action="/admin/offers" className="flex w-full flex-wrap gap-2 sm:w-auto" method="get">
            <label className="relative min-w-[200px] flex-1 sm:w-[260px]"><Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={15} /><input aria-label="Поиск акций" className={`${inputClass} pl-9`} defaultValue={query} name="q" placeholder="Название, адрес или скидка" /></label>
            <select aria-label="Фильтр публикации" className={`${inputClass} w-auto min-w-[132px]`} defaultValue={status} name="status"><option value="all">Все статусы</option><option value="shown">Показываются</option><option value="hidden">Скрыты</option></select>
            <button className="h-10 rounded-lg border border-[#d9dcde] px-3 text-[11px] font-medium hover:bg-[#f5f6f7]" type="submit">Найти</button>
          </form>
        </div>
        {message ? <p aria-live="polite" className="mb-3 rounded-lg bg-[#eef8f1] px-3 py-2 text-[12px] text-[#24713b]">{message}</p> : null}
        {error && !editing ? <p aria-live="assertive" className="mb-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}

        <div className="overflow-x-auto rounded-xl border border-[#e5e7e9]">
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead className="bg-[#f7f7f7] text-[10px] font-medium tracking-[0.04em] text-[#6f7376] uppercase"><tr><th className="px-3 py-3">Акция</th><th className="px-3 py-3">Период</th><th className="px-3 py-3">Канал</th><th className="px-3 py-3">Товары</th><th className="px-3 py-3">Главная</th><th className="px-3 py-3">Порядок</th><th className="px-3 py-3">Статус</th><th className="px-3 py-3 text-right">Действия</th></tr></thead>
            <tbody className="divide-y divide-[#eceeef]">
              {data.items.map((offer) => (
                <tr className="text-[12px] text-[#34383b]" key={offer.id}>
                  <td className="px-3 py-3"><div className="flex items-center gap-3"><div className="relative grid h-14 w-[84px] shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f1f2f3]">{offer.imgRu ? <Image alt="" className="object-cover" fill sizes="84px" src={assetUrl(offer.imgRu)} unoptimized /> : <ImagePlus aria-hidden="true" className="text-[#989da0]" size={18} />}</div><div className="min-w-0"><p className="max-w-[300px] truncate font-medium text-[#202223]">{offer.titleRu || `Акция #${offer.id}`}</p><p className="mt-1 max-w-[300px] truncate text-[10px] text-[#888d90]">RO: {offer.titleRo || '—'} · /{offer.uriRu || '—'}</p><p className="mt-1 text-[10px] text-[#777b7e]">{offer.sale || 'Без отметки скидки'}</p></div></div></td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">{offer.dateFrom}<br /><span className="text-[#888d90]">до {offer.dateTo}</span></td>
                  <td className="px-3 py-3">{channelLabel(offer.isOnline)}</td>
                  <td className="px-3 py-3 tabular-nums">{offer.products.length}</td>
                  <td className="px-3 py-3">{offer.viewHome ? 'Да' : 'Нет'}</td>
                  <td className="px-3 py-3"><input aria-label={`Порядок ${offer.titleRu ?? offer.id}`} className="h-8 w-16 rounded-md border border-[#d9dcde] px-2 text-center text-[12px] outline-none focus:border-[#007AFF]" defaultValue={offer.sorder} min={0} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value !== offer.sorder) void quickUpdate(offer, { sorder: value }) }} type="number" /></td>
                  <td className="px-3 py-3"><button aria-pressed={offer.isShown === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition disabled:cursor-wait disabled:opacity-50 ${offer.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} disabled={pendingAction === offer.id} onClick={() => void quickUpdate(offer, { isShown: offer.isShown === 1 ? 0 : 1 })} type="button">{offer.isShown === 1 ? <Check size={12} /> : null}{offer.isShown === 1 ? 'Опубликована' : 'Скрыта'}</button></td>
                  <td className="px-3 py-3"><div className="flex justify-end gap-1"><a aria-label="Открыть акцию" className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#f1f2f3] hover:text-[#202223]" href={`/ru/aktsii/${encodeURIComponent(offer.uriRu || offer.id)}`} rel="noreferrer" target="_blank"><ExternalLink size={14} /></a><button aria-label={`Редактировать ${offer.titleRu ?? offer.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#e8f1ff] hover:text-[#005fc7] disabled:opacity-40" disabled={pendingAction === offer.id} onClick={() => openEditor(offer)} type="button"><Pencil size={14} /></button><button aria-label={`Удалить ${offer.titleRu ?? offer.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#fff0f0] hover:text-[#a1262e] disabled:opacity-40" disabled={pendingAction === offer.id} onClick={() => void deleteOffer(offer)} type="button"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
              {!data.items.length ? <tr><td className="px-4 py-12 text-center text-[12px] text-[#777b7e]" colSpan={8}>Акции не найдены.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-[#777b7e]"><span>Страница {data.page} из {data.pageCount}</span><div className="flex gap-2"><Link aria-disabled={data.page <= 1} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#d9dcde] px-2.5 ${data.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-[#f7f7f7]'}`} href={queryHref(query, status, data.page - 1)}><ChevronLeft size={14} /> Назад</Link><Link aria-disabled={data.page >= data.pageCount} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#d9dcde] px-2.5 ${data.page >= data.pageCount ? 'pointer-events-none opacity-40' : 'hover:bg-[#f7f7f7]'}`} href={queryHref(query, status, data.page + 1)}>Дальше <ChevronRight size={14} /></Link></div></div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setEditing(null) }}>
          <section aria-labelledby="offer-dialog-title" aria-modal="true" className="max-h-[96dvh] w-full max-w-[1050px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6" role="dialog">
            <header className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#202223]" id="offer-dialog-title">{isExisting ? 'Редактировать акцию' : 'Новая акция'}</h2><p className="mt-1 text-[11px] text-[#777b7e]">Поля сайта RU/RO. SEO-ключевые слова не используются.</p></div><button aria-label="Закрыть" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#65696c] hover:bg-[#f2f3f4]" disabled={pending} onClick={() => setEditing(null)} type="button"><X size={18} /></button></header>
            <form className="space-y-5" key={isExisting ? editing.id : 'new'} onSubmit={saveOffer}>
              <section className="space-y-3"><h3 className="text-[12px] font-semibold text-[#34383b]">Основное</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label><span className={labelClass}>Название RU *</span><input className={inputClass} defaultValue={isExisting ? editing.titleRu ?? '' : ''} maxLength={256} name="titleRu" required /></label>
                <label><span className={labelClass}>Название RO *</span><input className={inputClass} defaultValue={isExisting ? editing.titleRo ?? '' : ''} maxLength={256} name="titleRo" required /></label>
                <label><span className={labelClass}>Адрес RU</span><input className={inputClass} defaultValue={isExisting ? editing.uriRu ?? '' : ''} maxLength={256} name="uriRu" placeholder="Создаётся из названия" /></label>
                <label><span className={labelClass}>Адрес RO</span><input className={inputClass} defaultValue={isExisting ? editing.uriRo ?? '' : ''} maxLength={256} name="uriRo" placeholder="Создаётся из названия" /></label>
                <label><span className={labelClass}>Начало *</span><input className={inputClass} defaultValue={isExisting ? editing.dateFrom : ''} name="dateFrom" required type="date" /></label>
                <label><span className={labelClass}>Окончание *</span><input className={inputClass} defaultValue={isExisting ? editing.dateTo : ''} name="dateTo" required type="date" /></label>
                <label><span className={labelClass}>Отметка акции</span><input className={inputClass} defaultValue={isExisting ? editing.sale : ''} maxLength={32} name="sale" placeholder="Например, −20%" /></label>
                <label><span className={labelClass}>Порядок</span><input className={inputClass} defaultValue={isExisting ? editing.sorder : 0} min={0} name="sorder" type="number" /></label>
                <label><span className={labelClass}>Канал</span><select className={inputClass} defaultValue={isExisting ? String(editing.isOnline) : '1'} name="isOnline"><option value="1">Онлайн</option><option value="0">Офлайн</option><option value="2">Онлайн и офлайн</option></select></label>
                <label><span className={labelClass}>Окончание акции</span><select className={inputClass} defaultValue={isExisting ? editing.progressMode : 'time'} name="progressMode"><option value="time">По сроку</option><option value="stock">По остатку</option><option value="none">Без индикатора</option></select></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>Краткое описание RU</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editing.descRu : ''} maxLength={1024} name="descRu" /></label><label><span className={labelClass}>Краткое описание RO</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editing.descRo : ''} maxLength={1024} name="descRo" /></label><label><span className={labelClass}>Расположение RU</span><input className={inputClass} defaultValue={isExisting ? editing.locationRu : ''} maxLength={254} name="locationRu" placeholder="Например, все магазины" /></label><label><span className={labelClass}>Расположение RO</span><input className={inputClass} defaultValue={isExisting ? editing.locationRo : ''} maxLength={254} name="locationRo" placeholder="Например, toate magazinele" /></label></div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[#555a5e]"><label className="flex items-center gap-2"><input className="accent-[#007AFF]" defaultChecked={isExisting ? editing.viewHome > 0 : false} name="viewHome" type="checkbox" value="1" />Показывать товары этой акции на главной</label><label className="flex items-center gap-2"><input className="accent-[#007AFF]" defaultChecked={isExisting ? editing.isShown === 1 : true} name="isShown" type="checkbox" value="1" />Опубликована</label><input name="viewHome" type="hidden" value="0" /><input name="isShown" type="hidden" value="0" /></div>
              </section>

              <section className="space-y-3"><h3 className="text-[12px] font-semibold text-[#34383b]">Изображения</h3><p className="text-[10px] leading-4 text-[#777b7e]">Для карточки акции и страницы акции. Если румынское изображение не задано, будет использована русская версия.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {([
                  ['imgRuFile', 'Карточка RU', 'imgRu'], ['imgRoFile', 'Карточка RO', 'imgRo'],
                  ['imgBruFile', 'Страница RU', 'imgBru'], ['imgBroFile', 'Страница RO', 'imgBro'],
                ] as const).map(([field, title, imageKey]) => {
                  const image = isExisting ? editing[imageKey] : ''
                  return <label className="block" key={field}><span className={labelClass}>{title}{!isExisting && (field === 'imgRuFile' || field === 'imgBruFile') ? ' *' : ''}</span><input accept="image/avif,image/jpeg,image/png,image/webp" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[10px] text-[#555a5e] file:mr-2 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2 file:py-1.5 file:text-[10px]" name={field} required={!isExisting && (field === 'imgRuFile' || field === 'imgBruFile')} type="file" />{image ? <span className="mt-1 block truncate text-[9px] text-[#888d90]">Текущее: {image}</span> : null}</label>
                })}
              </div>
              {isExisting ? <div className="grid gap-3 sm:grid-cols-4">{([['Карточка RU', editing.imgRu], ['Карточка RO', editing.imgRo], ['Страница RU', editing.imgBru], ['Страница RO', editing.imgBro]] as const).map(([name, image]) => <div className="relative h-24 overflow-hidden rounded-lg bg-[#f1f2f3]" key={name}>{image ? <Image alt={name} className="object-contain" fill sizes="200px" src={assetUrl(image)} unoptimized /> : null}<span className="absolute right-1 bottom-1 left-1 rounded bg-white/90 px-1.5 py-1 text-[9px] text-[#555a5e]">{name}</span></div>)}</div> : null}
              </section>

              <section className="space-y-3"><div><h3 className="text-[12px] font-semibold text-[#34383b]">Товары акции</h3><p className="mt-1 text-[10px] text-[#777b7e]">Выбранные товары будут доступны на странице акции. Порядок можно изменить стрелками.</p></div><ProductPicker selected={selectedProducts} setSelected={setSelectedProducts} /></section>

              <section className="space-y-3"><h3 className="text-[12px] font-semibold text-[#34383b]">SEO</h3><div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>SEO-заголовок RU</span><input className={inputClass} defaultValue={isExisting ? editing.seoTitleRu ?? '' : ''} maxLength={255} name="seoTitleRu" /></label><label><span className={labelClass}>SEO-заголовок RO</span><input className={inputClass} defaultValue={isExisting ? editing.seoTitleRo ?? '' : ''} maxLength={255} name="seoTitleRo" /></label><label><span className={labelClass}>SEO-описание RU</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editing.seoDescRu ?? '' : ''} name="seoDescRu" /></label><label><span className={labelClass}>SEO-описание RO</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isExisting ? editing.seoDescRo ?? '' : ''} name="seoDescRo" /></label></div></section>

              {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}
              <footer className="flex justify-end gap-2 border-t border-[#eceeef] pt-4"><button className={buttonClass} disabled={pending} onClick={() => setEditing(null)} type="button">Отмена</button><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-[#007AFF] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? 'Сохраняем…' : isExisting ? 'Сохранить' : 'Добавить акцию'}</button></footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function ProductPicker({ selected, setSelected }: { selected: AdminOfferProduct[]; setSelected: (products: AdminOfferProduct[]) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductSearchResult>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const search = query.trim()
    if (search.length < 2) { setResults([]); setLoading(false); return }
    let current = true
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/offers?products=1&q=${encodeURIComponent(search)}`, { cache: 'no-store' })
        const result = await response.json().catch(() => null)
        if (current) setResults(Array.isArray(result?.products) ? result.products as ProductSearchResult : [])
      } catch {
        if (current) setResults([])
      } finally {
        if (current) setLoading(false)
      }
    }, 250)
    return () => { current = false; window.clearTimeout(timer) }
  }, [query])

  function addProduct(product: AdminOfferProduct) {
    if (!selected.some((item) => item.id === product.id)) setSelected([...selected, product])
    setQuery('')
    setResults([])
  }

  function move(index: number, offset: -1 | 1) {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= selected.length) return
    const next = [...selected]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    setSelected(next)
  }

  return <div className="space-y-3">
    <label className="relative block"><Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={15} /><input aria-label="Поиск товара" autoComplete="off" className={`${inputClass} pl-9`} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Найти по названию или артикулу" value={query} /></label>
    {query.trim().length >= 2 ? <div aria-live="polite" className="max-h-52 overflow-y-auto rounded-lg border border-[#e5e7e9]">{loading ? <p className="px-3 py-3 text-[11px] text-[#777b7e]">Ищем товары…</p> : results.length ? results.map((product) => { const added = selected.some((item) => item.id === product.id); return <button className="flex w-full items-center justify-between gap-3 border-b border-[#eceeef] px-3 py-2.5 text-left last:border-0 hover:bg-[#f7f8f9] disabled:cursor-default disabled:opacity-50" disabled={added} key={product.id} onClick={() => addProduct(product)} type="button"><span className="min-w-0"><span className="block truncate text-[11px] font-medium text-[#34383b]">{product.titleRu || product.titleRo}</span><span className="mt-0.5 block text-[10px] text-[#888d90]">{product.sku} · #{product.id}</span></span><span className="shrink-0 text-[10px] text-[#007AFF]">{added ? 'Добавлен' : 'Добавить'}</span></button> }) : <p className="px-3 py-3 text-[11px] text-[#777b7e]">Подходящие товары не найдены.</p>}</div> : <p className="text-[10px] text-[#888d90]">Введите минимум 2 символа.</p>}
    <div className="overflow-hidden rounded-lg border border-[#e5e7e9]">
      <div className="flex items-center justify-between bg-[#f7f7f7] px-3 py-2 text-[10px] text-[#777b7e]"><span>Добавлено товаров: {selected.length}</span>{selected.length ? <button className="text-[#a1262e] hover:underline" onClick={() => setSelected([])} type="button">Очистить список</button> : null}</div>
      {selected.length ? <ol className="divide-y divide-[#eceeef]">{selected.map((product, index) => <li className="flex items-center gap-2 px-3 py-2" key={product.id}><span className="w-6 shrink-0 text-center text-[10px] tabular-nums text-[#888d90]">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium text-[#34383b]">{product.titleRu || product.titleRo}</span><span className="mt-0.5 block text-[10px] text-[#888d90]">{product.sku} · #{product.id}</span></span><button aria-label={`Поднять ${product.titleRu || product.titleRo}`} className="grid size-7 place-items-center rounded-md text-[#65696c] hover:bg-[#f0f1f2] disabled:opacity-30" disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp size={13} /></button><button aria-label={`Опустить ${product.titleRu || product.titleRo}`} className="grid size-7 place-items-center rounded-md text-[#65696c] hover:bg-[#f0f1f2] disabled:opacity-30" disabled={index === selected.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown size={13} /></button><button aria-label={`Убрать ${product.titleRu || product.titleRo}`} className="grid size-7 place-items-center rounded-md text-[#65696c] hover:bg-[#fff0f0] hover:text-[#a1262e]" onClick={() => setSelected(selected.filter((item) => item.id !== product.id))} type="button"><X size={14} /></button></li>)}</ol> : <p className="px-3 py-4 text-center text-[11px] text-[#888d90]">К акции ещё не привязаны товары.</p>}
    </div>
  </div>
}
