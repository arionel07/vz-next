'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

type Brand = {
  id: number
  title: string | null
  uri: string | null
  img: string | null
  h1Ru: string | null
  h1Ro: string | null
  breadcrumbTitleRu: string | null
  breadcrumbTitleRo: string | null
  textRu: string
  textRo: string
  seoTitleRu: string | null
  seoTitleRo: string | null
  seoDescRu: string | null
  seoDescRo: string | null
  seoTextRu: string | null
  seoTextRo: string | null
  sorder: number | null
  top: number
  isShown: number | null
  productCount: number
}

type BrandCertificate = {
  id: number
  brandId: number
  titleRu: string | null
  titleRo: string | null
  image: string
  sorder: number | null
  isShown: number
}

type BrandListData = {
  rows: Brand[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  stats: { total: number; shown: number; hidden: number }
}

type BrandStatus = 'all' | 'shown' | 'hidden'

const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[12px] text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const textareaClass = 'w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const labelClass = 'mb-1.5 block text-[10px] font-medium text-[#555a5e]'

function pageHref(page: number, query: string, status: BrandStatus) {
  const search = new URLSearchParams()
  if (query) search.set('q', query)
  if (status !== 'all') search.set('status', status)
  if (page > 1) search.set('page', String(page))
  return `/admin/brands${search.size ? `?${search.toString()}` : ''}`
}

export function AdminBrandsManager({ initialData, query, status }: { initialData: BrandListData; query: string; status: BrandStatus }) {
  const router = useRouter()
  const [brands, setBrands] = useState(initialData.rows)
  const [editing, setEditing] = useState<Brand | 'new' | null>(null)
  const [tab, setTab] = useState<'general' | 'seo' | 'certificates'>('general')
  const [pending, setPending] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [certificates, setCertificates] = useState<BrandCertificate[]>([])
  const [certificatesLoading, setCertificatesLoading] = useState(false)
  const [certificatePending, setCertificatePending] = useState<number | 'new' | null>(null)
  const [certificateMessage, setCertificateMessage] = useState('')
  const [certificateError, setCertificateError] = useState('')

  const currentBrand = editing !== null && editing !== 'new' ? editing : null
  const isEditing = currentBrand !== null

  useEffect(() => setBrands(initialData.rows), [initialData.rows])

  function openEditor(brand: Brand | 'new') {
    setError('')
    setMessage('')
    setCertificates([])
    setCertificateMessage('')
    setCertificateError('')
    setTab('general')
    setEditing(brand)
  }

  useEffect(() => {
    if (tab !== 'certificates' || !currentBrand) return
    let cancelled = false
    setCertificatesLoading(true)
    setCertificateError('')
    void fetch(`/api/admin/brands/certificates?brandId=${currentBrand.id}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.message ?? 'Не удалось загрузить сертификаты.')
        if (!cancelled) setCertificates(result.certificates ?? [])
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setCertificateError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить сертификаты.')
      })
      .finally(() => { if (!cancelled) setCertificatesLoading(false) })
    return () => { cancelled = true }
  }, [currentBrand?.id, tab])

  function fillBrandForm(formData: FormData, brand: Brand) {
    formData.set('id', String(brand.id))
    formData.set('title', brand.title ?? '')
    formData.set('uri', brand.uri ?? '')
    formData.set('h1Ru', brand.h1Ru ?? '')
    formData.set('h1Ro', brand.h1Ro ?? '')
    formData.set('breadcrumbTitleRu', brand.breadcrumbTitleRu ?? '')
    formData.set('breadcrumbTitleRo', brand.breadcrumbTitleRo ?? '')
    formData.set('textRu', brand.textRu ?? '')
    formData.set('textRo', brand.textRo ?? '')
    formData.set('seoTitleRu', brand.seoTitleRu ?? '')
    formData.set('seoTitleRo', brand.seoTitleRo ?? '')
    formData.set('seoDescRu', brand.seoDescRu ?? '')
    formData.set('seoDescRo', brand.seoDescRo ?? '')
    formData.set('seoTextRu', brand.seoTextRu ?? '')
    formData.set('seoTextRo', brand.seoTextRo ?? '')
    formData.set('sorder', String(brand.sorder ?? 0))
    formData.set('top', String(brand.top ?? 0))
    formData.set('isShown', String(brand.isShown ?? 0))
    formData.set('img', brand.img ?? '')
  }

  async function updateBrand(brand: Brand, patch: { sorder?: number; isShown?: number }) {
    setBusyId(brand.id)
    setError('')
    const formData = new FormData()
    fillBrandForm(formData, { ...brand, ...patch })
    try {
      const response = await fetch('/api/admin/brands', { method: 'PATCH', body: formData })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось обновить бренд.')
      setBrands((items) => items.map((item) => item.id === brand.id ? { ...item, ...result.brand, productCount: item.productCount } : item))
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось обновить бренд.')
    } finally {
      setBusyId(null)
    }
  }

  async function saveCertificate(event: FormEvent<HTMLFormElement>, certificate?: BrandCertificate) {
    event.preventDefault()
    if (!currentBrand) return
    setCertificatePending(certificate?.id ?? 'new')
    setCertificateError('')
    setCertificateMessage('')
    const formElement = event.currentTarget
    const formData = new FormData(formElement)
    formData.set('brandId', String(currentBrand.id))
    if (certificate) formData.set('id', String(certificate.id))
    try {
      const response = await fetch('/api/admin/brands/certificates', { method: certificate ? 'PATCH' : 'POST', body: formData })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить сертификат.')
      if (certificate) {
        setCertificates((items) => items.map((item) => item.id === certificate.id ? result.certificate : item))
        setCertificateMessage('Изменения сертификата сохранены.')
      } else {
        setCertificates((items) => [result.certificate, ...items].sort((a, b) => (a.sorder ?? 0) - (b.sorder ?? 0) || b.id - a.id))
        formElement.reset()
        setCertificateMessage('Сертификат добавлен.')
      }
    } catch (saveError) {
      setCertificateError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить сертификат.')
    } finally {
      setCertificatePending(null)
    }
  }

  async function deleteCertificate(certificate: BrandCertificate) {
    if (!currentBrand || !window.confirm(`Удалить сертификат «${certificate.titleRu || certificate.titleRo || certificate.image}»?`)) return
    setCertificatePending(certificate.id)
    setCertificateError('')
    setCertificateMessage('')
    try {
      const params = new URLSearchParams({ brandId: String(currentBrand.id), id: String(certificate.id) })
      const response = await fetch(`/api/admin/brands/certificates?${params}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось удалить сертификат.')
      setCertificates((items) => items.filter((item) => item.id !== certificate.id))
      setCertificateMessage('Сертификат удалён.')
    } catch (deleteError) {
      setCertificateError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить сертификат.')
    } finally {
      setCertificatePending(null)
    }
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setPending(true)
    setError('')
    setMessage('')
    const formData = new FormData(event.currentTarget)
    const currentBrand = editing !== 'new' ? editing : null
    const isEditing = currentBrand !== null
    if (currentBrand) {
      formData.set('id', String(currentBrand.id))
      formData.set('img', currentBrand.img ?? '')
    }
    try {
      const response = await fetch('/api/admin/brands', { method: isEditing ? 'PATCH' : 'POST', body: formData })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить бренд.')
      if (currentBrand) {
        setBrands((items) => items.map((item) => item.id === currentBrand.id ? { ...item, ...result.brand, productCount: item.productCount } : item))
      } else {
        setBrands((items) => [{ ...result.brand, productCount: 0 } as Brand, ...items].slice(0, initialData.pageSize))
      }
      setEditing(null)
      setMessage(isEditing ? 'Изменения бренда сохранены.' : 'Бренд добавлен.')
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить бренд.')
    } finally {
      setPending(false)
    }
  }

  async function deleteBrand(brand: Brand) {
    if (!window.confirm(`Удалить бренд «${brand.title || `#${brand.id}`}»?`)) return
    setBusyId(brand.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/brands?id=${brand.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось удалить бренд.')
      setBrands((items) => items.filter((item) => item.id !== brand.id))
      setMessage('Бренд удалён.')
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить бренд.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Магазин</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Бренды</h1>
          <p className="mt-2 max-w-[600px] text-[13px] leading-5 text-[#707477]">Названия, изображения и данные страниц брендов на русском и румынском языках.</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" onClick={() => openEditor('new')} type="button">
          <Plus aria-hidden="true" size={16} /> Добавить бренд
        </button>
      </header>

      <section aria-label="Сводка брендов" className="grid overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white sm:grid-cols-3">
        {[{ label: 'Всего брендов', value: initialData.stats.total }, { label: 'Показываются на сайте', value: initialData.stats.shown }, { label: 'Скрыты', value: initialData.stats.hidden }].map((metric, index) => (
          <div className={`flex min-h-[82px] flex-col justify-center px-5 py-3 ${index > 0 ? 'border-t border-[#eceeef] sm:border-l sm:border-t-0' : ''}`} key={metric.label}>
            <p className="text-[11px] text-[#73777a]">{metric.label}</p>
            <p className="mt-1 text-[22px] leading-6 font-semibold tracking-[-0.03em] text-[#202223]">{metric.value.toLocaleString('ru-RU')}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
        <form action="/admin/brands" className="flex flex-wrap items-center gap-2.5 border-b border-[#e5e7e9] p-3 sm:p-4" method="get">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Поиск брендов</span><Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={16} />
            <input className={`${inputClass} pl-10`} defaultValue={query} name="q" placeholder="Название или адрес страницы" type="search" />
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
          <p className="text-[10px] text-[#777b7e]">{initialData.total.toLocaleString('ru-RU')} брендов в выборке</p>
        </div>

        {message ? <p aria-live="polite" className="mx-4 mt-3 rounded-lg bg-[#eef8f1] px-3 py-2 text-[11px] text-[#24713b] sm:mx-5">{message}</p> : null}
        {error ? <p aria-live="assertive" className="mx-4 mt-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-[11px] text-[#a1262e] sm:mx-5" role="alert">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[#f7f7f7] text-[10px] font-medium tracking-[0.04em] text-[#6f7376] uppercase">
              <tr><th className="px-4 py-3">Бренд</th><th className="px-3 py-3">Товары</th><th className="px-3 py-3">Порядок</th><th className="px-3 py-3">Статус</th><th className="px-4 py-3 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-[#eceeef]">
              {brands.map((brand) => (
                <tr className="text-[11px] text-[#34383b]" key={brand.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#eceeef] bg-[#f6f6f6]">
                        {brand.img ? <Image alt="" className="object-contain" fill sizes="48px" src={`/legacy-assets/brands/${encodeURIComponent(brand.img)}`} unoptimized /> : <ImagePlus aria-hidden="true" className="text-[#a0a4a7]" size={17} />}
                      </div>
                      <div className="min-w-0"><p className="max-w-[310px] truncate font-medium text-[#202223]">{brand.title || `Бренд #${brand.id}`}</p><p className="mt-1 max-w-[310px] truncate text-[10px] text-[#888d90]">{brand.uri || 'Адрес не задан'} · RO: {brand.h1Ro || brand.title || '—'}</p></div>
                    </div>
                  </td>
                  <td className="px-3 py-3 tabular-nums">{brand.productCount.toLocaleString('ru-RU')}</td>
                  <td className="px-3 py-3"><input aria-label={`Порядок бренда ${brand.title ?? brand.id}`} className="h-8 w-16 rounded-md border border-[#d9dcde] px-2 text-center text-[11px] outline-none focus:border-[#007AFF]" defaultValue={brand.sorder ?? 0} disabled={busyId === brand.id} min={0} onBlur={(event) => { const order = Number(event.currentTarget.value); if (Number.isInteger(order) && order >= 0 && order !== (brand.sorder ?? 0)) void updateBrand(brand, { sorder: order }) }} type="number" /></td>
                  <td className="px-3 py-3">
                    <button aria-label={`${brand.isShown === 1 ? 'Скрыть' : 'Показать'} бренд ${brand.title ?? brand.id}`} aria-pressed={brand.isShown === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition disabled:opacity-50 ${brand.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} disabled={busyId === brand.id} onClick={() => void updateBrand(brand, { isShown: brand.isShown === 1 ? 0 : 1 })} type="button">{brand.isShown === 1 ? <Check size={12} /> : null}{brand.isShown === 1 ? 'Показывается' : 'Скрыт'}</button>
                  </td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    <button aria-label={`Редактировать ${brand.title ?? brand.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#e8f1ff] hover:text-[#005fc7]" onClick={() => openEditor(brand)} type="button"><Pencil size={14} /></button>
                    <button aria-label={`Удалить ${brand.title ?? brand.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#fff0f0] hover:text-[#a1262e] disabled:opacity-40" disabled={busyId === brand.id} onClick={() => void deleteBrand(brand)} type="button"><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
              {!brands.length ? <tr><td className="px-4 py-12 text-center text-[11px] text-[#777b7e]" colSpan={5}>Бренды не найдены.</td></tr> : null}
            </tbody>
          </table>
        </div>

        {initialData.pageCount > 1 ? (
          <nav aria-label="Страницы брендов" className="flex items-center justify-between border-t border-[#eceeef] px-4 py-3 sm:px-5">
            <span className="text-[10px] text-[#777b7e]">Страница {initialData.page} из {initialData.pageCount}</span>
            <div className="flex gap-2">
              <Link aria-disabled={initialData.page <= 1} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#dfe2e4] px-2.5 text-[10px] ${initialData.page <= 1 ? 'pointer-events-none text-[#b5b9bc]' : 'text-[#45494c] hover:bg-[#f5f6f7]'}`} href={pageHref(Math.max(1, initialData.page - 1), query, status)}><ArrowLeft size={13} /> Назад</Link>
              <Link aria-disabled={initialData.page >= initialData.pageCount} className={`inline-flex h-8 items-center gap-1 rounded-lg border border-[#dfe2e4] px-2.5 text-[10px] ${initialData.page >= initialData.pageCount ? 'pointer-events-none text-[#b5b9bc]' : 'text-[#45494c] hover:bg-[#f5f6f7]'}`} href={pageHref(Math.min(initialData.pageCount, initialData.page + 1), query, status)}>Дальше <ArrowRight size={13} /></Link>
            </div>
          </nav>
        ) : null}
      </section>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setEditing(null) }}>
          <section aria-labelledby="brand-dialog-title" aria-modal="true" className="max-h-[94dvh] w-full max-w-[780px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6" role="dialog">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div><p className="mb-1 text-[9px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Магазин</p><h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#202223]" id="brand-dialog-title">{isEditing ? 'Редактировать бренд' : 'Новый бренд'}</h2><p className="mt-1 text-[10px] text-[#777b7e]">Поля витрины для русского и румынского языков.</p></div>
              <button aria-label="Закрыть" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#65696c] hover:bg-[#f2f3f4]" disabled={pending} onClick={() => setEditing(null)} type="button"><X size={18} /></button>
            </header>

            <div className="mb-4 flex gap-1 border-b border-[#eceeef]" role="tablist" aria-label="Разделы карточки бренда">
              {([['general', 'Основное'], ['seo', 'SEO'], ...(currentBrand ? [['certificates', 'Сертификаты'] as const] : [])] as const).map(([value, label]) => <button aria-selected={tab === value} className={`relative px-3 py-2.5 text-[11px] font-medium ${tab === value ? 'text-[#202223]' : 'text-[#777b7e] hover:text-[#202223]'}`} key={value} onClick={() => setTab(value)} role="tab" type="button">{label}{tab === value ? <span className="absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-[#202223]" /> : null}</button>)}
            </div>

            <form className={`space-y-4 ${tab === 'certificates' ? 'hidden' : ''}`} key={currentBrand?.id ?? 'new'} onSubmit={saveBrand}>
              <div className={tab === 'general' ? 'space-y-4' : 'hidden'}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label><span className={labelClass}>Общее название *</span><input className={inputClass} defaultValue={currentBrand?.title ?? ''} maxLength={256} name="title" required={tab === 'general'} /></label>
                    <label><span className={labelClass}>Адрес страницы</span><input className={inputClass} defaultValue={currentBrand?.uri ?? ''} maxLength={256} name="uri" placeholder="автоматически из названия" /></label>
                    <label><span className={labelClass}>Заголовок H1 · RU</span><input className={inputClass} defaultValue={currentBrand?.h1Ru ?? ''} maxLength={255} name="h1Ru" /></label>
                    <label><span className={labelClass}>Заголовок H1 · RO</span><input className={inputClass} defaultValue={currentBrand?.h1Ro ?? ''} maxLength={255} name="h1Ro" /></label>
                    <label><span className={labelClass}>Название в крошках · RU</span><input className={inputClass} defaultValue={currentBrand?.breadcrumbTitleRu ?? ''} maxLength={255} name="breadcrumbTitleRu" /></label>
                    <label><span className={labelClass}>Название в крошках · RO</span><input className={inputClass} defaultValue={currentBrand?.breadcrumbTitleRo ?? ''} maxLength={255} name="breadcrumbTitleRo" /></label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label><span className={labelClass}>Описание страницы · RU</span><textarea className={textareaClass} defaultValue={currentBrand?.textRu ?? ''} name="textRu" rows={5} /></label>
                    <label><span className={labelClass}>Описание страницы · RO</span><textarea className={textareaClass} defaultValue={currentBrand?.textRo ?? ''} name="textRo" rows={5} /></label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
                    <label><span className={labelClass}>Логотип или изображение бренда</span><input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[10px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="imgFile" type="file" />{currentBrand ? <span className="mt-1 block truncate text-[9px] text-[#858a8d]">Текущий файл: {currentBrand.img || 'нет'}</span> : null}</label>
                    <label><span className={labelClass}>Порядок</span><input className={inputClass} defaultValue={currentBrand?.sorder ?? 0} min={0} name="sorder" type="number" /></label>
                    <label><span className={labelClass}>Видимость на сайте</span><select className={inputClass} defaultValue={String(currentBrand?.isShown ?? 1)} name="isShown"><option value="1">Показывать</option><option value="0">Скрыть</option></select></label>
                  </div>
                  <label className="block max-w-[240px]"><span className={labelClass}>Приоритет в подборках</span><select className={inputClass} defaultValue={String(currentBrand?.top ?? 0)} name="top"><option value="0">Обычный</option><option value="1">Приоритетный</option></select></label>
                </div>
              <div className={tab === 'seo' ? 'space-y-4' : 'hidden'}>
                  <p className="rounded-lg bg-[#f6f7f8] px-3 py-2.5 text-[10px] leading-4 text-[#6f7376]">Заполняйте SEO отдельно для RU и RO. Английские поля и ключевые слова в этой форме не используются.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <fieldset className="space-y-3 rounded-xl border border-[#e5e7e9] p-3"><legend className="px-1 text-[11px] font-medium text-[#34383b]">Русский</legend>
                      <label><span className={labelClass}>SEO Title</span><input className={inputClass} defaultValue={currentBrand?.seoTitleRu ?? ''} maxLength={255} name="seoTitleRu" /></label>
                      <label><span className={labelClass}>SEO Description</span><textarea className={textareaClass} defaultValue={currentBrand?.seoDescRu ?? ''} name="seoDescRu" rows={3} /></label>
                      <label><span className={labelClass}>SEO-текст внизу страницы</span><textarea className={textareaClass} defaultValue={currentBrand?.seoTextRu ?? ''} name="seoTextRu" rows={5} /></label>
                    </fieldset>
                    <fieldset className="space-y-3 rounded-xl border border-[#e5e7e9] p-3"><legend className="px-1 text-[11px] font-medium text-[#34383b]">Română</legend>
                      <label><span className={labelClass}>SEO Title</span><input className={inputClass} defaultValue={currentBrand?.seoTitleRo ?? ''} maxLength={255} name="seoTitleRo" /></label>
                      <label><span className={labelClass}>SEO Description</span><textarea className={textareaClass} defaultValue={currentBrand?.seoDescRo ?? ''} name="seoDescRo" rows={3} /></label>
                      <label><span className={labelClass}>Text SEO la finalul paginii</span><textarea className={textareaClass} defaultValue={currentBrand?.seoTextRo ?? ''} name="seoTextRo" rows={5} /></label>
                    </fieldset>
                  </div>
              </div>

              {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[11px] text-[#a1262e]" role="alert">{error}</p> : null}
              <footer className="flex justify-end gap-2 border-t border-[#eceeef] pt-4">
                <button className="h-9 rounded-lg border border-[#d9dcde] px-3.5 text-[10px] font-medium text-[#45494c] hover:bg-[#f7f7f7] disabled:opacity-50" disabled={pending} onClick={() => setEditing(null)} type="button">Отмена</button>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#202223] px-4 text-[10px] font-medium text-white hover:bg-[#3a3d3f] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? 'Сохраняем…' : <><Check size={13} />{isEditing ? 'Сохранить бренд' : 'Добавить бренд'}</>}</button>
              </footer>
            </form>

            {tab === 'certificates' && currentBrand ? (
              <div className="space-y-5">
                <div>
                  <h3 className="text-[14px] font-medium text-[#202223]">Сертификаты бренда</h3>
                  <p className="mt-1 text-[10px] leading-4 text-[#777b7e]">Документы бренда, которые могут отображаться на странице бренда.</p>
                </div>

                {certificateMessage ? <p aria-live="polite" className="rounded-lg bg-[#eef8f1] px-3 py-2 text-[11px] text-[#24713b]">{certificateMessage}</p> : null}
                {certificateError ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[11px] text-[#a1262e]" role="alert">{certificateError}</p> : null}

                <form className="space-y-3 rounded-xl border border-[#e4e6e8] bg-[#fafafa] p-4" onSubmit={(event) => void saveCertificate(event)}>
                  <h4 className="text-[11px] font-medium text-[#34383b]">Добавить сертификат</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label><span className={labelClass}>Название · RU</span><input className={inputClass} maxLength={255} name="titleRu" /></label>
                    <label><span className={labelClass}>Название · RO</span><input className={inputClass} maxLength={255} name="titleRo" /></label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_110px_150px]">
                    <label><span className={labelClass}>Изображение документа *</span><input accept="image/jpeg,image/png,image/webp" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[10px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="image" required type="file" /></label>
                    <label><span className={labelClass}>Порядок</span><input className={inputClass} min={0} name="sorder" type="number" defaultValue={0} /></label>
                    <label><span className={labelClass}>Видимость</span><select className={inputClass} defaultValue="1" name="isShown"><option value="1">Показывать</option><option value="0">Скрыть</option></select></label>
                  </div>
                  <div className="flex justify-end"><button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#202223] px-3.5 text-[10px] font-medium text-white hover:bg-[#3a3d3f] disabled:opacity-60" disabled={certificatePending === 'new'} type="submit"><Plus size={13} />{certificatePending === 'new' ? 'Загружаем…' : 'Добавить сертификат'}</button></div>
                </form>

                {certificatesLoading ? <p className="py-8 text-center text-[11px] text-[#777b7e]">Загружаем сертификаты…</p> : certificates.length ? (
                  <div className="space-y-3">
                    {certificates.map((certificate) => (
                      <form className="grid gap-3 rounded-xl border border-[#e4e6e8] p-3 sm:grid-cols-[72px_1fr]" key={certificate.id} onSubmit={(event) => void saveCertificate(event, certificate)}>
                        <a aria-label="Открыть документ" className="relative block h-[90px] w-[72px] overflow-hidden rounded-lg border border-[#e4e6e8] bg-white" href={`/legacy-assets/brand_certificates/${encodeURIComponent(certificate.image)}`} rel="noreferrer" target="_blank"><Image alt="" className="object-contain" fill sizes="72px" src={`/legacy-assets/brand_certificates/${encodeURIComponent(certificate.image)}`} unoptimized /></a>
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label><span className={labelClass}>Название · RU</span><input className={inputClass} defaultValue={certificate.titleRu ?? ''} maxLength={255} name="titleRu" /></label>
                            <label><span className={labelClass}>Название · RO</span><input className={inputClass} defaultValue={certificate.titleRo ?? ''} maxLength={255} name="titleRo" /></label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-[1fr_110px_150px]">
                            <label><span className={labelClass}>Заменить документ</span><input accept="image/jpeg,image/png,image/webp" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[10px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="image" type="file" /></label>
                            <label><span className={labelClass}>Порядок</span><input className={inputClass} defaultValue={certificate.sorder ?? 0} min={0} name="sorder" type="number" /></label>
                            <label><span className={labelClass}>Видимость</span><select className={inputClass} defaultValue={String(certificate.isShown)} name="isShown"><option value="1">Показывать</option><option value="0">Скрыть</option></select></label>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button className="h-8 rounded-lg border border-[#e3d2d2] px-3 text-[10px] font-medium text-[#9a3030] hover:bg-[#fff4f4] disabled:opacity-50" disabled={certificatePending === certificate.id} onClick={() => void deleteCertificate(certificate)} type="button">Удалить</button>
                            <button className="h-8 rounded-lg bg-[#202223] px-3 text-[10px] font-medium text-white hover:bg-[#3a3d3f] disabled:opacity-50" disabled={certificatePending === certificate.id} type="submit">{certificatePending === certificate.id ? 'Сохраняем…' : 'Сохранить'}</button>
                          </div>
                        </div>
                      </form>
                    ))}
                  </div>
                ) : <p className="rounded-xl border border-dashed border-[#dfe2e4] py-8 text-center text-[11px] text-[#777b7e]">У бренда пока нет сертификатов.</p>}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}
