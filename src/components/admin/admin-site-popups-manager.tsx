'use client'

import Image from 'next/image'
import { useMemo, useState, type FormEvent } from 'react'
import { Check, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react'

type SitePopup = {
  id: number
  titleRu: string
  titleRo: string
  textRu: string
  textRo: string
  image: string | null
  ctaLabelRu: string
  ctaLabelRo: string
  ctaUrl: string
  audience: 'all' | 'guest' | 'authenticated'
  startAt: string | null
  endAt: string | null
  reshowDays: number
  isShown: number
  sorder: number
}

const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[13px] text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const labelClass = 'mb-1.5 block text-[11px] font-medium text-[#555a5e]'
const audienceLabel: Record<SitePopup['audience'], string> = { all: 'Все', guest: 'Гости', authenticated: 'Зарегистрированные' }

function toDatetimeInputValue(value: string | null) {
  if (!value) return ''
  return value.replace(' ', 'T').slice(0, 16)
}

export function AdminSitePopupsManager({ initialPopups }: { initialPopups: SitePopup[] }) {
  const [popups, setPopups] = useState(initialPopups)
  const [editing, setEditing] = useState<SitePopup | null | 'new'>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const sorted = useMemo(() => [...popups].sort((a, b) => b.sorder - a.sorder || a.id - b.id), [popups])
  const isEditing = editing && editing !== 'new'

  async function toggleShown(popup: SitePopup) {
    setError('')
    const formData = new FormData()
    formData.set('id', String(popup.id))
    formData.set('titleRu', popup.titleRu)
    formData.set('titleRo', popup.titleRo)
    formData.set('textRu', popup.textRu)
    formData.set('textRo', popup.textRo)
    formData.set('ctaLabelRu', popup.ctaLabelRu)
    formData.set('ctaLabelRo', popup.ctaLabelRo)
    formData.set('ctaUrl', popup.ctaUrl)
    formData.set('audience', popup.audience)
    formData.set('startAt', toDatetimeInputValue(popup.startAt))
    formData.set('endAt', toDatetimeInputValue(popup.endAt))
    formData.set('reshowDays', String(popup.reshowDays))
    formData.set('sorder', String(popup.sorder))
    formData.set('image', popup.image ?? '')
    formData.set('isShown', String(popup.isShown === 1 ? 0 : 1))

    const response = await fetch('/api/admin/site-popups', { method: 'PATCH', body: formData })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.message ?? 'Не удалось сохранить попап.')
      return
    }
    setPopups((items) => items.map((item) => item.id === popup.id ? result.popup as SitePopup : item))
  }

  async function savePopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setMessage('')
    const formData = new FormData(event.currentTarget)
    const current = editing && editing !== 'new' ? editing : null
    const editingExisting = current !== null
    if (current) {
      formData.set('id', String(current.id))
      formData.set('image', current.image ?? '')
    }

    try {
      const response = await fetch('/api/admin/site-popups', { method: editingExisting ? 'PATCH' : 'POST', body: formData })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить попап.')
      if (editingExisting) {
        setPopups((items) => items.map((item) => item.id === current.id ? result.popup as SitePopup : item))
      } else {
        setPopups((items) => [...items, result.popup as SitePopup])
      }
      setEditing(null)
      setMessage(editingExisting ? 'Изменения сохранены.' : 'Попап добавлен.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить попап.')
    } finally {
      setPending(false)
    }
  }

  async function deletePopup(popup: SitePopup) {
    if (!window.confirm(`Удалить попап «${popup.titleRu}»?`)) return
    setError('')
    const response = await fetch(`/api/admin/site-popups?id=${popup.id}`, { method: 'DELETE' })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setError(result?.message ?? 'Не удалось удалить попап.')
      return
    }
    setPopups((items) => items.filter((item) => item.id !== popup.id))
    setMessage('Попап удалён.')
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Контент и сайт</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Попапы на сайте</h1>
          <p className="mt-2 max-w-[640px] text-[13px] leading-5 text-[#707477]">
            Акции, подарки, Black Friday и другие всплывающие предложения — без правок кода. Показывается один активный попап, подходящий по аудитории и датам (приоритет — по порядку, затем по новизне).
          </p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-[#3a3d3f]" onClick={() => { setError(''); setEditing('new') }} type="button">
          <Plus aria-hidden="true" size={16} /> Добавить попап
        </button>
      </header>

      {message ? <p aria-live="polite" className="rounded-lg bg-[#eef8f1] px-3 py-2 text-[12px] text-[#24713b]">{message}</p> : null}
      {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}

      <section className="rounded-2xl border border-[#e5e7e9] bg-white p-4 sm:p-5">
        <div className="overflow-x-auto rounded-xl border border-[#e5e7e9]">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead className="bg-[#f7f7f7] text-[10px] font-medium tracking-[0.04em] text-[#6f7376] uppercase">
              <tr><th className="px-3 py-3">Попап</th><th className="px-3 py-3">Аудитория</th><th className="px-3 py-3">Период</th><th className="px-3 py-3">Статус</th><th className="px-3 py-3 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-[#eceeef]">
              {sorted.map((popup) => (
                <tr className="text-[12px] text-[#34383b]" key={popup.id}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f1f2f3]">
                        {popup.image ? <Image alt="" className="object-cover" fill sizes="48px" src={`/legacy-assets/popups/${encodeURIComponent(popup.image)}`} unoptimized /> : <ImagePlus aria-hidden="true" className="absolute inset-0 m-auto text-[#989da0]" size={16} />}
                      </div>
                      <div className="min-w-0"><p className="max-w-[260px] truncate font-medium text-[#202223]">{popup.titleRu}</p><p className="mt-1 max-w-[260px] truncate text-[10px] text-[#888d90]">RO: {popup.titleRo}</p></div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#62676b]">{audienceLabel[popup.audience]}</td>
                  <td className="px-3 py-3 text-[#62676b]">
                    {popup.startAt || popup.endAt ? `${popup.startAt ? toDatetimeInputValue(popup.startAt).replace('T', ' ') : '—'} → ${popup.endAt ? toDatetimeInputValue(popup.endAt).replace('T', ' ') : '—'}` : 'Без ограничения'}
                  </td>
                  <td className="px-3 py-3">
                    <button aria-pressed={popup.isShown === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition ${popup.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} onClick={() => void toggleShown(popup)} type="button">{popup.isShown === 1 ? <Check size={12} /> : null}{popup.isShown === 1 ? 'Активен' : 'Выключен'}</button>
                  </td>
                  <td className="px-3 py-3"><div className="flex justify-end gap-1">
                    <button aria-label={`Редактировать ${popup.titleRu}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#e8f1ff] hover:text-[#005fc7]" onClick={() => { setError(''); setEditing(popup) }} type="button"><Pencil size={14} /></button>
                    <button aria-label={`Удалить ${popup.titleRu}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#fff0f0] hover:text-[#a1262e]" onClick={() => void deletePopup(popup)} type="button"><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
              {!sorted.length ? <tr><td className="px-4 py-12 text-center text-[12px] text-[#777b7e]" colSpan={5}>Попапов пока нет.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setEditing(null) }}>
          <section aria-labelledby="popup-dialog-title" aria-modal="true" className="max-h-[94dvh] w-full max-w-[680px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6" role="dialog">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div><h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#202223]" id="popup-dialog-title">{isEditing ? 'Редактировать попап' : 'Новый попап'}</h2><p className="mt-1 text-[11px] text-[#777b7e]">Текст и кнопка — для русского и румынского языков.</p></div>
              <button aria-label="Закрыть" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#65696c] hover:bg-[#f2f3f4]" disabled={pending} onClick={() => setEditing(null)} type="button"><X size={18} /></button>
            </header>
            <form className="space-y-4" key={isEditing ? editing.id : 'new'} onSubmit={savePopup}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>Заголовок RU *</span><input className={inputClass} defaultValue={isEditing ? editing.titleRu : ''} maxLength={255} name="titleRu" required /></label>
                <label><span className={labelClass}>Заголовок RO *</span><input className={inputClass} defaultValue={isEditing ? editing.titleRo : ''} maxLength={255} name="titleRo" required /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>Текст RU *</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isEditing ? editing.textRu : ''} maxLength={20000} name="textRu" required /></label>
                <label><span className={labelClass}>Текст RO *</span><textarea className={`${inputClass} h-20 resize-y py-2`} defaultValue={isEditing ? editing.textRo : ''} maxLength={20000} name="textRo" required /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>Текст кнопки RU</span><input className={inputClass} defaultValue={isEditing ? editing.ctaLabelRu : ''} maxLength={128} name="ctaLabelRu" placeholder="Получить скидку" /></label>
                <label><span className={labelClass}>Текст кнопки RO</span><input className={inputClass} defaultValue={isEditing ? editing.ctaLabelRo : ''} maxLength={128} name="ctaLabelRo" placeholder="Obține reducerea" /></label>
              </div>
              <label><span className={labelClass}>Ссылка кнопки <span className="font-normal text-[#888d90]">необязательно</span></span><input className={inputClass} defaultValue={isEditing ? editing.ctaUrl : ''} maxLength={255} name="ctaUrl" placeholder="/ru/katalog" /></label>

              <label><span className={labelClass}>Изображение <span className="font-normal text-[#888d90]">необязательно</span></span><input accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[11px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="imgFile" type="file" /></label>
              {isEditing ? <p className="-mt-2 text-[10px] text-[#777b7e]">Текущий файл: {editing.image || 'нет'}</p> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>Аудитория</span><select className={inputClass} defaultValue={isEditing ? editing.audience : 'all'} name="audience"><option value="all">Все посетители</option><option value="guest">Только гости (не вошли)</option><option value="authenticated">Только зарегистрированные</option></select></label>
                <label><span className={labelClass}>Повторный показ через, дней</span><input className={inputClass} defaultValue={isEditing ? editing.reshowDays : 1} min={0} name="reshowDays" type="number" /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>Показывать с <span className="font-normal text-[#888d90]">необязательно</span></span><input className={inputClass} defaultValue={isEditing ? toDatetimeInputValue(editing.startAt) : ''} name="startAt" type="datetime-local" /></label>
                <label><span className={labelClass}>Показывать до <span className="font-normal text-[#888d90]">необязательно</span></span><input className={inputClass} defaultValue={isEditing ? toDatetimeInputValue(editing.endAt) : ''} name="endAt" type="datetime-local" /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>Порядок (выше — приоритетнее)</span><input className={inputClass} defaultValue={isEditing ? editing.sorder : 0} min={0} name="sorder" type="number" /></label>
                <label><span className={labelClass}>Видимость</span><select className={inputClass} defaultValue={isEditing ? String(editing.isShown) : '1'} name="isShown"><option value="1">Активен</option><option value="0">Выключен</option></select></label>
              </div>

              {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e]" role="alert">{error}</p> : null}
              <footer className="flex justify-end gap-2 border-t border-[#eceeef] pt-4">
                <button className="h-9 rounded-lg border border-[#d9dcde] px-3.5 text-[11px] font-medium text-[#45494c] hover:bg-[#f7f7f7] disabled:opacity-50" disabled={pending} onClick={() => setEditing(null)} type="button">Отмена</button>
                <button className="h-9 rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white hover:bg-[#3a3d3f] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? 'Сохраняем…' : isEditing ? 'Сохранить' : 'Добавить попап'}</button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}
