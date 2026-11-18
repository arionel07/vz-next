'use client'

import Image from 'next/image'
import { useMemo, useState, type FormEvent } from 'react'
import { Check, ExternalLink, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

type Banner = {
  id: number
  titleRu: string | null
  titleRo: string | null
  uriRu: string
  uriRo: string
  img: string | null
  imgMob: string
  isShown: number
  sorder: number
  colorText: string
  colorButton: string
  colorButtonText: string
}

const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[13px] text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const labelClass = 'mb-1.5 block text-[11px] font-medium text-[#555a5e]'

export function AdminBannersManager({ initialBanners }: { initialBanners: Banner[] }) {
  const [banners, setBanners] = useState(initialBanners)
  const [search, setSearch] = useState('')
  const [visibility, setVisibility] = useState<'all' | 'shown' | 'hidden'>('all')
  const [editing, setEditing] = useState<Banner | null | 'new'>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const visibleBanners = useMemo(() => banners.filter((banner) => {
    const query = search.trim().toLocaleLowerCase('ru')
    const matchesSearch = !query || `${banner.titleRu ?? ''} ${banner.titleRo ?? ''} ${banner.uriRu}`.toLocaleLowerCase('ru').includes(query)
    const matchesVisibility = visibility === 'all' || (visibility === 'shown' ? banner.isShown === 1 : banner.isShown !== 1)
    return matchesSearch && matchesVisibility
  }), [banners, search, visibility])

  async function updateBanner(id: number, patch: { isShown?: number; sorder?: number }) {
    setError('')
    const formData = new FormData()
    formData.set('id', String(id))
    const current = banners.find((banner) => banner.id === id)
    if (!current) return
    formData.set('titleRu', current.titleRu ?? '')
    formData.set('titleRo', current.titleRo ?? '')
    formData.set('uriRu', current.uriRu)
    formData.set('uriRo', current.uriRo)
    formData.set('colorText', current.colorText)
    formData.set('colorButton', current.colorButton)
    formData.set('colorButtonText', current.colorButtonText)
    formData.set('isShown', String(patch.isShown ?? current.isShown))
    formData.set('sorder', String(patch.sorder ?? current.sorder))
    formData.set('img', current.img ?? '')
    formData.set('imgMob', current.imgMob)

    const response = await fetch('/api/admin/banners', { method: 'PATCH', body: formData })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.message ?? 'Не удалось сохранить баннер.')
      return
    }
    setBanners((items) => items.map((item) => item.id === id ? result.banner as Banner : item).sort((a, b) => a.sorder - b.sorder || b.id - a.id))
  }

  async function saveBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setMessage('')
    const form = event.currentTarget
    const formData = new FormData(form)
    const currentBanner = editing && editing !== 'new' ? editing : null
    const isEditing = currentBanner !== null
    if (currentBanner) {
      formData.set('id', String(currentBanner.id))
      formData.set('img', currentBanner.img ?? '')
      formData.set('imgMob', currentBanner.imgMob)
    }

    try {
      const response = await fetch('/api/admin/banners', { method: isEditing ? 'PATCH' : 'POST', body: formData })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить баннер.')
      if (isEditing) {
        setBanners((items) => items.map((item) => item.id === currentBanner.id ? result.banner as Banner : item).sort((a, b) => a.sorder - b.sorder || b.id - a.id))
      } else {
        setBanners((items) => [...items, result.banner as Banner].sort((a, b) => a.sorder - b.sorder || b.id - a.id))
      }
      setEditing(null)
      setMessage(isEditing ? 'Изменения баннера сохранены.' : 'Баннер добавлен.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить баннер.')
    } finally {
      setPending(false)
    }
  }

  async function deleteBanner(banner: Banner) {
    if (!window.confirm(`Удалить баннер «${banner.titleRu || `#${banner.id}`}»?`)) return
    setError('')
    const response = await fetch(`/api/admin/banners?id=${banner.id}`, { method: 'DELETE' })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.message ?? 'Не удалось удалить баннер.')
      return
    }
    setBanners((items) => items.filter((item) => item.id !== banner.id))
    setMessage('Баннер удалён.')
  }

  const isEditing = editing && editing !== 'new'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Контент и сайт</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Баннеры</h1>
          <p className="mt-2 max-w-[600px] text-[13px] leading-5 text-[#707477]">Управляйте изображениями, ссылками и порядком показа баннеров на витрине.</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" onClick={() => { setError(''); setEditing('new') }} type="button">
          <Plus aria-hidden="true" size={16} /> Добавить баннер
        </button>
      </header>

      <section className="rounded-2xl border border-[#e5e7e9] bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-medium text-[#202223]">Все баннеры <span className="ml-1 text-[12px] font-normal text-[#777b7e]">{banners.length}</span></h2>
            <p className="mt-1 text-[11px] text-[#777b7e]">Изменения порядка и видимости сразу отражаются на сайте.</p>
          </div>
          <label className="relative min-w-[220px] flex-1 sm:max-w-[300px]">
            <Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={15} />
            <input aria-label="Найти баннер" className={`${inputClass} pl-9`} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск баннеров" value={search} />
          </label>
        </div>

        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Фильтр видимости">
          {([['all', 'Все'], ['shown', 'Показываются'], ['hidden', 'Скрыты']] as const).map(([value, label]) => (
            <button className={`h-8 rounded-lg px-3 text-[11px] font-medium transition ${visibility === value ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f2f3f4] text-[#555a5e] hover:bg-[#e8e9ea]'}`} key={value} onClick={() => setVisibility(value)} type="button">{label}</button>
          ))}
        </div>

        {message ? <p aria-live="polite" className="mb-3 rounded-lg bg-[#eef8f1] px-3 py-2 text-[12px] text-[#24713b]">{message}</p> : null}
        {error ? <p aria-live="assertive" className="mb-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}

        <div className="overflow-x-auto rounded-xl border border-[#e5e7e9]">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[#f7f7f7] text-[10px] font-medium tracking-[0.04em] text-[#6f7376] uppercase">
              <tr><th className="px-3 py-3">Баннер</th><th className="px-3 py-3">Ссылка</th><th className="px-3 py-3">Порядок</th><th className="px-3 py-3">Статус</th><th className="px-3 py-3 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-[#eceeef]">
              {visibleBanners.map((banner) => (
                <tr className="text-[12px] text-[#34383b]" key={banner.id}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-[84px] shrink-0 overflow-hidden rounded-lg bg-[#f1f2f3]">
                        {banner.img ? <Image alt="" className="object-cover" fill sizes="84px" src={`/legacy-assets/banners/${encodeURIComponent(banner.img)}`} unoptimized /> : <ImagePlus aria-hidden="true" className="absolute inset-0 m-auto text-[#989da0]" size={18} />}
                      </div>
                      <div className="min-w-0"><p className="max-w-[240px] truncate font-medium text-[#202223]">{banner.titleRu || `Баннер #${banner.id}`}</p><p className="mt-1 text-[10px] text-[#888d90]">RO: {banner.titleRo || '—'}</p></div>
                    </div>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-3 text-[#62676b]">{banner.uriRu || '—'}</td>
                  <td className="px-3 py-3"><input aria-label={`Порядок баннера ${banner.titleRu ?? banner.id}`} className="h-8 w-16 rounded-md border border-[#d9dcde] px-2 text-center text-[12px] outline-none focus:border-[#007AFF]" defaultValue={banner.sorder} min={0} onBlur={(event) => { const order = Number(event.currentTarget.value); if (Number.isInteger(order) && order !== banner.sorder) void updateBanner(banner.id, { sorder: order }) }} type="number" /></td>
                  <td className="px-3 py-3">
                    <button aria-label={`${banner.isShown === 1 ? 'Скрыть' : 'Показать'} баннер ${banner.titleRu ?? banner.id}`} aria-pressed={banner.isShown === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition ${banner.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} onClick={() => void updateBanner(banner.id, { isShown: banner.isShown === 1 ? 0 : 1 })} type="button">{banner.isShown === 1 ? <Check size={12} /> : null}{banner.isShown === 1 ? 'Показывается' : 'Скрыт'}</button>
                  </td>
                  <td className="px-3 py-3"><div className="flex justify-end gap-1">
                    {banner.uriRu.startsWith('/') ? <a aria-label="Открыть ссылку баннера" className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#f1f2f3] hover:text-[#202223]" href={banner.uriRu} rel="noreferrer" target="_blank"><ExternalLink size={14} /></a> : null}
                    <button aria-label={`Редактировать ${banner.titleRu ?? banner.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#e8f1ff] hover:text-[#005fc7]" onClick={() => { setError(''); setEditing(banner) }} type="button"><Pencil size={14} /></button>
                    <button aria-label={`Удалить ${banner.titleRu ?? banner.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#fff0f0] hover:text-[#a1262e]" onClick={() => void deleteBanner(banner)} type="button"><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
              {!visibleBanners.length ? <tr><td className="px-4 py-12 text-center text-[12px] text-[#777b7e]" colSpan={5}>Баннеры не найдены.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setEditing(null) }}>
          <section aria-labelledby="banner-dialog-title" aria-modal="true" className="max-h-[94dvh] w-full max-w-[680px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6" role="dialog">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div><h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#202223]" id="banner-dialog-title">{isEditing ? 'Редактировать баннер' : 'Новый баннер'}</h2><p className="mt-1 text-[11px] text-[#777b7e]">Укажите контент для русского и румынского языков.</p></div>
              <button aria-label="Закрыть" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#65696c] hover:bg-[#f2f3f4]" disabled={pending} onClick={() => setEditing(null)} type="button"><X size={18} /></button>
            </header>
            <form className="space-y-4" key={isEditing ? editing.id : 'new'} onSubmit={saveBanner}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>Название RU *</span><input className={inputClass} defaultValue={isEditing ? editing.titleRu ?? '' : ''} maxLength={250} name="titleRu" required /></label>
                <label><span className={labelClass}>Название RO *</span><input className={inputClass} defaultValue={isEditing ? editing.titleRo ?? '' : ''} maxLength={250} name="titleRo" required /></label>
                <label><span className={labelClass}>Ссылка RU</span><input className={inputClass} defaultValue={isEditing ? editing.uriRu : ''} maxLength={300} name="uriRu" placeholder="/ru/skidki" /></label>
                <label><span className={labelClass}>Ссылка RO</span><input className={inputClass} defaultValue={isEditing ? editing.uriRo : ''} maxLength={300} name="uriRo" placeholder="/ro/reduceri" /></label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>Изображение desktop {isEditing ? '' : '*'}</span><input accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[11px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="imgFile" required={!isEditing} type="file" /></label>
                <label><span className={labelClass}>Изображение mobile <span className="font-normal text-[#888d90]">необязательно</span></span><input accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[11px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="imgMobFile" type="file" /></label>
              </div>
              {isEditing ? <p className="-mt-2 text-[10px] text-[#777b7e]">Текущий файл: {editing.img || 'нет'} · mobile: {editing.imgMob || 'нет'}</p> : null}

              <div className="grid gap-3 sm:grid-cols-4">
                <label><span className={labelClass}>Цвет текста</span><input className={inputClass} defaultValue={isEditing ? editing.colorText : '#ffffff'} maxLength={32} name="colorText" /></label>
                <label><span className={labelClass}>Цвет кнопки</span><input className={inputClass} defaultValue={isEditing ? editing.colorButton : '#111111'} maxLength={32} name="colorButton" /></label>
                <label><span className={labelClass}>Текст кнопки</span><input className={inputClass} defaultValue={isEditing ? editing.colorButtonText : '#ffffff'} maxLength={32} name="colorButtonText" /></label>
                <label><span className={labelClass}>Порядок показа</span><input className={inputClass} defaultValue={isEditing ? editing.sorder : banners.length + 1} min={0} name="sorder" type="number" /></label>
              </div>

              <label><span className={labelClass}>Видимость</span><select className={inputClass} defaultValue={isEditing ? String(editing.isShown) : '1'} name="isShown"><option value="1">Показывать на сайте</option><option value="0">Скрыть</option></select></label>
              {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}
              <footer className="flex justify-end gap-2 border-t border-[#eceeef] pt-4">
                <button className="h-9 rounded-lg border border-[#d9dcde] px-3.5 text-[11px] font-medium text-[#45494c] hover:bg-[#f7f7f7] disabled:opacity-50" disabled={pending} onClick={() => setEditing(null)} type="button">Отмена</button>
                <button className="h-9 rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-[#007AFF] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? 'Сохраняем…' : isEditing ? 'Сохранить' : 'Добавить баннер'}</button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}
