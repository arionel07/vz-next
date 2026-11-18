'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3, ImagePlus, MapPin, Pencil, Plus, Search, Store, Trash2, Truck, X } from 'lucide-react'

type StoreImage = { id: number; storesId: number; img: string; sorder: number; isShown: number }
type AdminStore = {
  id: number
  titleRu: string | null
  titleRo: string | null
  phone: string | null
  coords: string | null
  descRu: string
  descRo: string
  textRu: string | null
  textRo: string | null
  iframeGoogle: string | null
  delivery: number
  isShown: number
  sorder: number
  onBottom: number
  images: StoreImage[]
}
type StoreListData = {
  rows: AdminStore[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  stats: { total: number; shown: number; hidden: number; delivery: number }
}
type StoreStatus = 'all' | 'shown' | 'hidden'

const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[12px] text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const textareaClass = 'w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const labelClass = 'mb-1.5 block text-[10px] font-medium text-[#555a5e]'

function pageHref(page: number, query: string, status: StoreStatus) {
  const search = new URLSearchParams()
  if (query) search.set('q', query)
  if (status !== 'all') search.set('status', status)
  if (page > 1) search.set('page', String(page))
  return `/admin/stores${search.size ? `?${search.toString()}` : ''}`
}

function coordsHref(coords: string | null) {
  if (!coords?.trim()) return null
  const values = coords.split(',')
  if (values.length !== 2 || values.some((value) => !value.trim())) return null
  const [lat, lng] = values.map((value) => Number(value.trim()))
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return null
  return `https://www.google.com/maps?q=${lat},${lng}`
}

function storeFormData(store: AdminStore) {
  const form = new FormData()
  form.set('id', String(store.id))
  form.set('titleRu', store.titleRu ?? '')
  form.set('titleRo', store.titleRo ?? '')
  form.set('phone', store.phone ?? '')
  form.set('coords', store.coords ?? '')
  form.set('descRu', store.descRu ?? '')
  form.set('descRo', store.descRo ?? '')
  form.set('textRu', store.textRu ?? '')
  form.set('textRo', store.textRo ?? '')
  form.set('iframeGoogle', store.iframeGoogle ?? '')
  form.set('delivery', String(store.delivery ?? 0))
  form.set('isShown', String(store.isShown ?? 1))
  form.set('sorder', String(store.sorder ?? 1))
  form.set('onBottom', String(store.onBottom ?? 0))
  return form
}

export function AdminStoresManager({ initialData, query, status }: { initialData: StoreListData; query: string; status: StoreStatus }) {
  const router = useRouter()
  const [rows, setRows] = useState(initialData.rows)
  const [editing, setEditing] = useState<AdminStore | 'new' | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => setRows(initialData.rows), [initialData.rows])

  function openEditor(store: AdminStore | 'new') {
    setError('')
    setMessage('')
    setEditing(store)
  }

  async function updateStore(store: AdminStore, patch: Partial<AdminStore>) {
    setBusyId(store.id)
    setError('')
    const form = storeFormData({ ...store, ...patch })
    try {
      const response = await fetch('/api/admin/stores', { method: 'PATCH', body: form })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось обновить магазин.')
      setRows((items) => items.map((item) => item.id === store.id ? { ...item, ...result.store } : item))
      setMessage('Изменения магазина сохранены.')
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось обновить магазин.')
    } finally {
      setBusyId(null)
    }
  }

  async function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setPending(true)
    setError('')
    setMessage('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const isExisting = editing !== 'new'
    if (isExisting) {
      form.set('id', String(editing.id))
      const imageOrder = editing.images.map((image) => ({
        id: image.id,
        sorder: Number(form.get(`image-order-${image.id}`) ?? image.sorder),
      }))
      form.set('imageOrder', JSON.stringify(imageOrder))
    }
    try {
      const response = await fetch('/api/admin/stores', { method: isExisting ? 'PATCH' : 'POST', body: form })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить магазин.')
      if (isExisting) setRows((items) => items.map((item) => item.id === editing.id ? result.store : item))
      else setRows((items) => [result.store, ...items].slice(0, initialData.pageSize))
      setEditing(null)
      setMessage(isExisting ? 'Изменения магазина сохранены.' : 'Магазин добавлен.')
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить магазин.')
    } finally {
      setPending(false)
    }
  }

  async function deleteStore(store: AdminStore) {
    const title = store.titleRu || `#${store.id}`
    if (!window.confirm(`Удалить магазин «${title}»? Связанные с заказами магазины удалить нельзя.`)) return
    setBusyId(store.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/stores?id=${store.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось удалить магазин.')
      setRows((items) => items.filter((item) => item.id !== store.id))
      setMessage('Магазин удалён.')
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить магазин.')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteImage(image: StoreImage, store: AdminStore) {
    if (!window.confirm('Убрать эту фотографию из магазина?')) return
    setBusyId(store.id)
    setError('')
    try {
      const params = new URLSearchParams({ id: String(image.id), storeId: String(store.id) })
      const response = await fetch(`/api/admin/stores/images?${params}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось убрать фотографию.')
      const nextStore = { ...store, images: store.images.filter((item) => item.id !== image.id) }
      setRows((items) => items.map((item) => item.id === store.id ? nextStore : item))
      setEditing(nextStore)
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось убрать фотографию.')
    } finally {
      setBusyId(null)
    }
  }

  const isEditing = editing !== null && editing !== 'new'
  const current = isEditing ? editing : null

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Контент и сайт</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Магазины</h1>
          <p className="mt-2 max-w-[650px] text-[13px] leading-5 text-[#707477]">Адреса, график, контакты, расположение на карте и доступность магазинов на сайте.</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" onClick={() => openEditor('new')} type="button">
          <Plus aria-hidden="true" size={16} /> Добавить магазин
        </button>
      </header>

      <section aria-label="Сводка магазинов" className="grid overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Всего магазинов', value: initialData.stats.total, icon: Store },
          { label: 'Показываются на сайте', value: initialData.stats.shown, icon: Check },
          { label: 'Скрыты', value: initialData.stats.hidden, icon: X },
          { label: 'Доступны для доставки', value: initialData.stats.delivery, icon: Truck },
        ].map(({ label, value, icon: Icon }, index) => (
          <div className={`flex min-h-[84px] items-center gap-3 px-5 py-4 ${index > 0 ? 'border-t border-[#eceeef] sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'xl:border-l' : ''}`} key={label}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f7f8f8] text-[#62666a]"><Icon aria-hidden="true" size={17} /></span>
            <div><p className="text-[11px] text-[#73777a]">{label}</p><p className="mt-0.5 text-[22px] leading-7 font-semibold tracking-[-0.03em] text-[#202223]">{value.toLocaleString('ru-RU')}</p></div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
        <form action="/admin/stores" className="flex flex-wrap items-center gap-2.5 border-b border-[#e5e7e9] p-3 sm:p-4" method="get">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Поиск магазинов</span><Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={16} />
            <input className={`${inputClass} pl-10`} defaultValue={query} name="q" placeholder="Название, адрес, телефон или ID" type="search" />
          </label>
          {status !== 'all' ? <input name="status" type="hidden" value={status} /> : null}
          <button className="h-10 rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white hover:bg-[#3a3d3f]" type="submit">Найти</button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceeef] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр видимости">
            {([['all', 'Все'], ['shown', 'Показываются'], ['hidden', 'Скрыты']] as const).map(([value, label]) => (
              <Link aria-current={status === value ? 'page' : undefined} className={`inline-flex h-8 items-center rounded-lg px-3 text-[10px] font-medium transition ${status === value ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f2f3f4] text-[#555a5e] hover:bg-[#e8e9ea]'}`} href={pageHref(1, query, value)} key={value}>{label}</Link>
            ))}
          </div>
          <p className="text-[10px] text-[#777b7e]">{initialData.total.toLocaleString('ru-RU')} магазинов в выборке</p>
        </div>

        {message ? <p aria-live="polite" className="mx-4 mt-3 rounded-lg bg-[#eef8f1] px-3 py-2 text-[11px] text-[#24713b] sm:mx-5">{message}</p> : null}
        {error ? <p aria-live="assertive" className="mx-4 mt-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-[11px] text-[#a1262e] sm:mx-5" role="alert">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead className="bg-[#f7f7f7] text-[10px] font-medium tracking-[0.04em] text-[#6f7376] uppercase">
              <tr><th className="px-4 py-3">Магазин</th><th className="px-3 py-3">Фотографии</th><th className="px-3 py-3">Порядок</th><th className="px-3 py-3">Доставка</th><th className="px-3 py-3">Статус</th><th className="px-4 py-3 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-[#eceeef]">
              {rows.map((store) => {
                const mapUrl = coordsHref(store.coords)
                return (
                  <tr className="text-[11px] text-[#34383b]" key={store.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f3f4f5] text-[#656a6d]"><MapPin size={17} /></span>
                        <div className="min-w-0"><p className="font-medium text-[#202223]">{store.titleRu || `Магазин #${store.id}`}</p><p className="mt-1 max-w-[420px] truncate text-[10px] text-[#858a8d]">{store.textRu || 'Адрес не заполнен'}{store.phone ? ` · ${store.phone}` : ''}</p><div className="mt-1 flex items-center gap-2 text-[9px] text-[#8a8f92]">{store.titleRo || 'Название RO не заполнено'}{mapUrl ? <a className="inline-flex items-center gap-1 text-[#005fc7] hover:underline" href={mapUrl} rel="noreferrer" target="_blank">Карта</a> : <span className="text-[#9a6800]">Координаты не заданы</span>}</div></div>
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{store.images.length}</td>
                    <td className="px-3 py-3"><input aria-label={`Порядок магазина ${store.titleRu ?? store.id}`} className="h-8 w-16 rounded-md border border-[#d9dcde] px-2 text-center text-[11px] outline-none focus:border-[#007AFF]" defaultValue={store.sorder} disabled={busyId === store.id} min={0} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value >= 0 && value !== store.sorder) void updateStore(store, { sorder: value }) }} type="number" /></td>
                    <td className="px-3 py-3"><button aria-pressed={store.delivery === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition disabled:opacity-50 ${store.delivery === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} disabled={busyId === store.id} onClick={() => void updateStore(store, { delivery: store.delivery === 1 ? 0 : 1 })} type="button">{store.delivery === 1 ? <Check size={12} /> : null}{store.delivery === 1 ? 'Да' : 'Нет'}</button></td>
                    <td className="px-3 py-3"><button aria-pressed={store.isShown === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition disabled:opacity-50 ${store.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} disabled={busyId === store.id} onClick={() => void updateStore(store, { isShown: store.isShown === 1 ? 0 : 1 })} type="button">{store.isShown === 1 ? <Check size={12} /> : null}{store.isShown === 1 ? 'Показывается' : 'Скрыт'}</button></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1"><button aria-label={`Редактировать ${store.titleRu ?? store.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#e8f1ff] hover:text-[#005fc7]" onClick={() => openEditor(store)} type="button"><Pencil size={14} /></button><button aria-label={`Удалить ${store.titleRu ?? store.id}`} className="grid size-8 place-items-center rounded-lg text-[#85898c] hover:bg-[#fff0f0] hover:text-[#a1262e] disabled:opacity-40" disabled={busyId === store.id} onClick={() => void deleteStore(store)} type="button"><Trash2 size={14} /></button></div></td>
                  </tr>
                )
              })}
              {rows.length === 0 ? <tr><td className="px-4 py-14 text-center text-[12px] text-[#777b7e]" colSpan={6}>Магазины не найдены.</td></tr> : null}
            </tbody>
          </table>
        </div>

        {initialData.pageCount > 1 ? <nav aria-label="Страницы магазинов" className="flex items-center justify-between border-t border-[#eceeef] px-4 py-3 sm:px-5"><span className="text-[10px] text-[#777b7e]">Страница {initialData.page} из {initialData.pageCount}</span><div className="flex gap-2"><Link aria-disabled={initialData.page <= 1} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#dfe2e4] px-2.5 text-[10px] ${initialData.page <= 1 ? 'pointer-events-none text-[#b5b9bc]' : 'text-[#45494c] hover:bg-[#f5f6f7]'}`} href={pageHref(Math.max(1, initialData.page - 1), query, status)}><ArrowLeft size={13} /> Назад</Link><Link aria-disabled={initialData.page >= initialData.pageCount} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#dfe2e4] px-2.5 text-[10px] ${initialData.page >= initialData.pageCount ? 'pointer-events-none text-[#b5b9bc]' : 'text-[#45494c] hover:bg-[#f5f6f7]'}`} href={pageHref(Math.min(initialData.pageCount, initialData.page + 1), query, status)}>Дальше <ArrowRight size={13} /></Link></div></nav> : null}
      </section>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setEditing(null) }}>
          <section aria-labelledby="store-dialog-title" aria-modal="true" className="max-h-[96dvh] w-full max-w-[900px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6" role="dialog">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div><p className="mb-1 text-[9px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Контент и сайт</p><h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#202223]" id="store-dialog-title">{isEditing ? 'Редактировать магазин' : 'Новый магазин'}</h2><p className="mt-1 text-[10px] text-[#777b7e]">Поля синхронизируются со структурой магазинов legacy.</p></div>
              <button aria-label="Закрыть" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#65696c] hover:bg-[#f2f3f4]" disabled={pending} onClick={() => setEditing(null)} type="button"><X size={18} /></button>
            </header>

            <form className="space-y-5" key={current?.id ?? 'new'} onSubmit={saveStore}>
              <section className="space-y-3">
                <h3 className="text-[11px] font-semibold text-[#34383b]">Название и адрес</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label><span className={labelClass}>Название · RU *</span><input className={inputClass} defaultValue={current?.titleRu ?? ''} maxLength={250} name="titleRu" required /></label>
                  <label><span className={labelClass}>Название · RO *</span><input className={inputClass} defaultValue={current?.titleRo ?? ''} maxLength={250} name="titleRo" required /></label>
                  <label><span className={labelClass}>Адрес · RU</span><textarea className={textareaClass} defaultValue={current?.textRu ?? ''} name="textRu" rows={3} /></label>
                  <label><span className={labelClass}>Адрес · RO</span><textarea className={textareaClass} defaultValue={current?.textRo ?? ''} name="textRo" rows={3} /></label>
                  <label><span className={labelClass}>График работы · RU</span><textarea className={textareaClass} defaultValue={current?.descRu ?? ''} name="descRu" rows={3} /></label>
                  <label><span className={labelClass}>График работы · RO</span><textarea className={textareaClass} defaultValue={current?.descRo ?? ''} name="descRo" rows={3} /></label>
                  <label><span className={labelClass}>Телефон</span><input className={inputClass} defaultValue={current?.phone ?? ''} maxLength={255} name="phone" type="tel" /></label>
                  <label><span className={labelClass}>Координаты · широта, долгота</span><input className={inputClass} defaultValue={current?.coords ?? ''} maxLength={255} name="coords" placeholder="47.0183674, 28.8516902" /><span className="mt-1 block text-[9px] text-[#888d90]">Формат: широта, долгота. Например: 47.0183674, 28.8516902.</span>{coordsHref(current?.coords ?? null) ? <a className="mt-1 inline-flex text-[10px] font-medium text-[#005fc7] hover:underline" href={coordsHref(current?.coords ?? null)!} rel="noreferrer" target="_blank">Открыть текущую точку в Google Maps</a> : null}</label>
                  <label className="sm:col-span-2"><span className={labelClass}>Google Maps iframe (если задан в legacy)</span><input className={inputClass} defaultValue={current?.iframeGoogle ?? ''} maxLength={1024} name="iframeGoogle" placeholder="Ссылка или код встраивания" /></label>
                </div>
              </section>

              <section className="space-y-3 border-t border-[#eceeef] pt-4">
                <h3 className="text-[11px] font-semibold text-[#34383b]">Фотографии магазина</h3>
                <label className="block"><span className={labelClass}>Добавить фотографии · JPG или PNG, до 2 МБ каждая</span><input accept="image/jpeg,image/png" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[10px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" multiple name="images" type="file" /></label>
                {current?.images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{current.images.map((image) => <div className="overflow-hidden rounded-xl border border-[#e4e6e8] bg-[#fafafa]" key={image.id}><div className="relative aspect-square bg-[#f1f2f3]"><img alt="Фото магазина" className="h-full w-full object-cover" src={`/legacy-assets/stores/${encodeURIComponent(image.img)}`} /><button aria-label="Удалить фото" className="absolute top-2 right-2 grid size-7 place-items-center rounded-lg bg-white/95 text-[#a1262e] shadow-sm hover:bg-[#fff0f0]" disabled={busyId === current.id} onClick={() => void deleteImage(image, current)} type="button"><Trash2 size={13} /></button></div><label className="flex items-center justify-between gap-2 px-2.5 py-2"><span className="text-[9px] text-[#777b7e]">Порядок</span><input aria-label={`Порядок фото ${image.id}`} className="h-7 w-16 rounded-md border border-[#d9dcde] px-2 text-center text-[10px] outline-none focus:border-[#007AFF]" defaultValue={image.sorder} min={0} name={`image-order-${image.id}`} type="number" /></label></div>)}</div> : <p className="flex items-center gap-2 rounded-lg bg-[#f7f8f8] px-3 py-3 text-[10px] text-[#777b7e]"><ImagePlus size={15} /> Фотографии пока не добавлены.</p>}
              </section>

              <section className="grid gap-3 border-t border-[#eceeef] pt-4 sm:grid-cols-4">
                <label><span className={labelClass}>Порядок показа</span><input className={inputClass} defaultValue={current?.sorder ?? initialData.total + 1} min={0} name="sorder" type="number" /></label>
                <label><span className={labelClass}>Доставка</span><select className={inputClass} defaultValue={String(current?.delivery ?? 0)} name="delivery"><option value="1">Доступна</option><option value="0">Не доступна</option></select></label>
                <label><span className={labelClass}>Показывать на сайте</span><select className={inputClass} defaultValue={String(current?.isShown ?? 1)} name="isShown"><option value="1">Да</option><option value="0">Нет</option></select></label>
                <label><span className={labelClass}>Показывать внизу сайта</span><select className={inputClass} defaultValue={String(current?.onBottom ?? 0)} name="onBottom"><option value="1">Да</option><option value="0">Нет</option></select></label>
              </section>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceeef] pt-4">
                <p className="inline-flex items-center gap-1.5 text-[9px] text-[#858a8d]"><Clock3 size={13} /> Используется и в выборе магазина при оформлении заказа.</p>
                <div className="flex justify-end gap-2"><button className="h-9 rounded-lg border border-[#d9dcde] px-3.5 text-[10px] font-medium text-[#45494c] hover:bg-[#f7f7f7] disabled:opacity-50" disabled={pending} onClick={() => setEditing(null)} type="button">Отмена</button><button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#202223] px-4 text-[10px] font-medium text-white hover:bg-[#3a3d3f] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit"><Check size={13} />{pending ? 'Сохраняем…' : isEditing ? 'Сохранить магазин' : 'Добавить магазин'}</button></div>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}
