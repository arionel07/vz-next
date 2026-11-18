'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

type CategoryBanner = {
  id: number
  categoryId: number
  titleRu: string | null
  titleRo: string | null
  uriRu: string | null
  uriRo: string | null
  descRu: string | null
  descRo: string | null
  img: string | null
  sorder: number | null
  isShown: number | null
}

type Category = {
  id: number
  parentId: number
  featureType: number
  step: number
  titleRu: string | null
  titleRo: string | null
  h1Ru: string | null
  h1Ro: string | null
  breadcrumbTitleRu: string | null
  breadcrumbTitleRo: string | null
  uriRu: string | null
  uriRo: string | null
  img: string | null
  descRu: string | null
  descRo: string | null
  seoTitleRu: string | null
  seoTitleRo: string | null
  seoDescRu: string | null
  seoDescRo: string | null
  seoTextRu: string | null
  seoTextRo: string | null
  searchTeg: string | null
  calculator: number
  imgNav: string
  imgNavHover: string
  topMenu: number
  footerMenu: number
  wallpaper: number
  isCustomMobile: number
  sorder: number | null
  isShown: number | null
  parentTitleRu: string | null
  parentTitleRo: string | null
  productCount: number
  banners: CategoryBanner[]
}

type CategoryParent = { id: number; parentId: number; step: number; titleRu: string | null; titleRo: string | null }
type FeatureType = { id: number; name: string }
type CategoryListData = {
  rows: Category[]
  parents: CategoryParent[]
  featureTypes: FeatureType[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  stats: { total: number; shown: number; hidden: number }
}

export type CategoryStatus = 'all' | 'shown' | 'hidden'
type CategoryEditor = Category | 'new'
type EditorTab = 'general' | 'seo' | 'banners'

const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[12px] text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const textareaClass = 'w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2.5 text-[12px] leading-5 text-[#202223] outline-none transition focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const labelClass = 'mb-1.5 block text-[10px] font-medium text-[#555a5e]'

function pageHref(page: number, query: string, status: CategoryStatus) {
  const search = new URLSearchParams()
  if (query) search.set('q', query)
  if (status !== 'all') search.set('status', status)
  if (page > 1) search.set('page', String(page))
  return `/admin/categories${search.size ? `?${search.toString()}` : ''}`
}

function getBanner(category: Category | null, slot: 1 | 2) {
  if (!category) return null
  return category.banners.find((banner) => banner.sorder === slot) ?? category.banners[slot - 1] ?? null
}

function categoryImage(image: string) {
  return `/legacy-assets/categories/${encodeURIComponent(image)}`
}

type VisibleCategoryRow = { row: Category; depth: number; hasChildren: boolean; collapsed: boolean }

function buildVisibleCategoryTree(rows: Category[], parents: CategoryParent[], collapsedIds: ReadonlySet<number>): VisibleCategoryRow[] {
  const parentById = new Map<number, CategoryParent>()
  for (const row of parents) parentById.set(row.id, row)
  const allIds = new Set(parentById.keys())
  const loadedIds = new Set(rows.map((row) => row.id))
  const childrenByParent = new Map<number, CategoryParent[]>()
  const loadedChildrenByParent = new Map<number, Category[]>()

  for (const row of parents) {
    if (row.parentId > 0 && allIds.has(row.parentId)) {
      const siblings = childrenByParent.get(row.parentId) ?? []
      siblings.push(row)
      childrenByParent.set(row.parentId, siblings)
    }
  }
  for (const row of rows) {
    if (row.parentId > 0 && loadedIds.has(row.parentId)) {
      const siblings = loadedChildrenByParent.get(row.parentId) ?? []
      siblings.push(row)
      loadedChildrenByParent.set(row.parentId, siblings)
    }
  }

  const depthOf = (row: Category) => {
    let depth = 0
    let parentId = row.parentId
    const seen = new Set([row.id])
    while (parentId > 0 && allIds.has(parentId) && !seen.has(parentId)) {
      seen.add(parentId)
      depth += 1
      parentId = parentById.get(parentId)?.parentId ?? 0
    }
    return depth
  }

  const hiddenByCollapsedAncestor = (row: Category) => {
    let parentId = row.parentId
    const seen = new Set([row.id])
    while (parentId > 0 && allIds.has(parentId) && !seen.has(parentId)) {
      if (collapsedIds.has(parentId)) return true
      seen.add(parentId)
      parentId = parentById.get(parentId)?.parentId ?? 0
    }
    return false
  }

  const roots = rows.filter((row) => !loadedIds.has(row.parentId))
  const visible: VisibleCategoryRow[] = []
  const visited = new Set<number>()
  const append = (row: Category, depth: number) => {
    if (visited.has(row.id)) return
    visited.add(row.id)
    const children = childrenByParent.get(row.id) ?? []
    const collapsed = collapsedIds.has(row.id)
    visible.push({ row, depth, hasChildren: children.length > 0, collapsed })
    if (!collapsed) for (const child of loadedChildrenByParent.get(row.id) ?? []) append(child, depth + 1)
  }

  for (const root of roots) {
    if (!hiddenByCollapsedAncestor(root)) append(root, depthOf(root))
  }
  for (const row of rows) {
    if (!visited.has(row.id) && !hiddenByCollapsedAncestor(row)) append(row, depthOf(row))
  }
  return visible
}

export function AdminCategoriesManager({ initialData, query, status }: { initialData: CategoryListData; query: string; status: CategoryStatus }) {
  const router = useRouter()
  const [rows, setRows] = useState(initialData.rows)
  const [editing, setEditing] = useState<CategoryEditor | null>(null)
  const [tab, setTab] = useState<EditorTab>('general')
  const [pending, setPending] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<number>>(() => new Set())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const category = editing && editing !== 'new' ? editing : null

  useEffect(() => setRows(initialData.rows), [initialData.rows])

  function openEditor(value: CategoryEditor) {
    setError('')
    setMessage('')
    setTab('general')
    setEditing(value)
  }

  function toggleCategory(categoryId: number) {
    setCollapsedCategoryIds((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  async function updateCategory(row: Category, patch: Partial<Pick<Category, 'sorder' | 'isShown' | 'topMenu' | 'isCustomMobile'>>) {
    setBusyId(row.id)
    setError('')
    const form = new FormData()
    form.set('id', String(row.id))
    form.set('action', 'quick')
    for (const [key, value] of Object.entries(patch)) form.set(key, String(value ?? 0))
    try {
      const response = await fetch('/api/admin/categories', { method: 'PATCH', body: form })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось обновить категорию.')
      setRows((items) => items.map((item) => item.id === row.id ? { ...item, ...result.patch } : item))
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось обновить категорию.')
    } finally {
      setBusyId(null)
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    if (!String(form.get('titleRu') ?? '').trim() || !String(form.get('titleRo') ?? '').trim()) {
      setTab('general')
      setError('Заполните обязательные названия на русском и румынском языках.')
      return
    }
    setPending(true)
    setError('')
    setMessage('')
    if (category) {
      form.set('id', String(category.id))
      form.set('img', category.img ?? '')
    }
    for (const slot of [1, 2] as const) {
      const banner = getBanner(category, slot)
      form.set(`banner${slot}Id`, String(banner?.id ?? ''))
      form.set(`banner${slot}Img`, banner?.img ?? '')
    }
    try {
      const response = await fetch('/api/admin/categories', { method: category ? 'PATCH' : 'POST', body: form })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить категорию.')
      setEditing(null)
      setMessage(category ? 'Изменения категории сохранены.' : 'Категория добавлена.')
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить категорию.')
    } finally {
      setPending(false)
    }
  }

  async function deleteCategory(row: Category) {
    if (!window.confirm(`Удалить категорию «${row.titleRu || `#${row.id}`}»? Это действие нельзя отменить.`)) return
    setBusyId(row.id)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/admin/categories?id=${row.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось удалить категорию.')
      setRows((items) => items.filter((item) => item.id !== row.id))
      setEditing(null)
      setMessage('Категория удалена.')
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить категорию.')
    } finally {
      setBusyId(null)
    }
  }

  const isEditing = category !== null
  const categoryBanner1 = getBanner(category, 1)
  const categoryBanner2 = getBanner(category, 2)
  const visibleRows = buildVisibleCategoryTree(rows, initialData.parents, collapsedCategoryIds)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Магазин</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Категории</h1>
          <p className="mt-2 max-w-[620px] text-[13px] leading-5 text-[#707477]">Дерево каталога, локализованные названия, изображения, баннеры и SEO-данные.</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#202223] px-4 text-[12px] font-medium text-white transition hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" onClick={() => openEditor('new')} type="button">
          <Plus aria-hidden="true" size={16} /> Добавить категорию
        </button>
      </header>

      <section aria-label="Сводка категорий" className="grid overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white sm:grid-cols-3">
        {[{ label: 'Всего категорий', value: initialData.stats.total }, { label: 'Показываются на сайте', value: initialData.stats.shown }, { label: 'Скрыты', value: initialData.stats.hidden }].map((metric, index) => (
          <div className={`flex min-h-[82px] flex-col justify-center px-5 py-3 ${index > 0 ? 'border-t border-[#eceeef] sm:border-l sm:border-t-0' : ''}`} key={metric.label}>
            <p className="text-[11px] text-[#73777a]">{metric.label}</p>
            <p className="mt-1 text-[22px] leading-6 font-semibold tracking-[-0.03em] text-[#202223]">{metric.value.toLocaleString('ru-RU')}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
        <form action="/admin/categories" className="flex flex-wrap items-center gap-2.5 border-b border-[#e5e7e9] p-3 sm:p-4" method="get">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Поиск категорий</span><Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={16} />
            <input className={`${inputClass} pl-10`} defaultValue={query} name="q" placeholder="Название, H1 или адрес страницы" type="search" />
          </label>
          {status !== 'all' ? <input name="status" type="hidden" value={status} /> : null}
          <button className="h-10 rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white hover:bg-[#3a3d3f]" type="submit">Найти</button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceeef] px-4 py-3 sm:px-5">
          <div aria-label="Фильтр видимости" className="flex flex-wrap gap-2" role="group">
            {([['all', 'Все'], ['shown', 'Показываются'], ['hidden', 'Скрыты']] as const).map(([value, label]) => (
              <Link aria-current={status === value ? 'page' : undefined} className={`inline-flex h-8 items-center rounded-lg px-3 text-[10px] font-medium transition ${status === value ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f2f3f4] text-[#555a5e] hover:bg-[#e8e9ea]'}`} href={pageHref(1, query, value)} key={value}>{label}</Link>
            ))}
          </div>
          <p className="text-[10px] text-[#777b7e]">{initialData.total.toLocaleString('ru-RU')} категорий в выборке · по 50 на странице</p>
        </div>

        {message ? <p aria-live="polite" className="mx-4 mt-3 rounded-lg bg-[#eef8f1] px-3 py-2 text-[11px] text-[#24713b] sm:mx-5">{message}</p> : null}
        {error ? <p aria-live="assertive" className="mx-4 mt-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-[11px] text-[#a1262e] sm:mx-5" role="alert">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-[#f7f7f7] text-[10px] font-medium tracking-[0.04em] text-[#6f7376] uppercase">
              <tr><th className="px-4 py-3">Категория</th><th className="px-3 py-3">Товары</th><th className="px-3 py-3">В меню</th><th className="px-3 py-3">Мобильное меню</th><th className="px-3 py-3">Порядок</th><th className="px-3 py-3">Статус</th><th className="px-4 py-3 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-[#eceeef]">
              {visibleRows.map(({ row, depth, hasChildren, collapsed }) => {
                const missing: string[] = []
                if (!row.img) missing.push('изображение')
                if (!row.titleRu || !row.titleRo) missing.push('название RU/RO')
                if (!row.uriRu || !row.uriRo) missing.push('адрес страницы')
                return (
                  <tr className="text-[11px] text-[#34383b]" key={row.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5" style={{ paddingInlineStart: `${Math.max(0, Math.min(depth, 8)) * 16}px` }}>
                        {hasChildren ? (
                          <button aria-expanded={!collapsed} aria-label={`${collapsed ? 'Раскрыть' : 'Свернуть'} вложенные категории: ${row.titleRu ?? row.id}`} className="grid size-7 shrink-0 place-items-center rounded-md text-[#707477] transition hover:bg-[#f0f1f2] hover:text-[#202223] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007AFF]" onClick={() => toggleCategory(row.id)} type="button">
                            {collapsed ? <ChevronRight aria-hidden="true" size={15} /> : <ChevronDown aria-hidden="true" size={15} />}
                          </button>
                        ) : <span aria-hidden="true" className="size-7 shrink-0" />}
                        <div className={`relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border ${row.img ? 'border-[#eceeef] bg-[#f6f6f6]' : 'border-[#f0d566] bg-[#fff8d7]'}`}>
                          {row.img ? <Image alt="" className="object-contain" fill sizes="48px" src={categoryImage(row.img)} unoptimized /> : <ImagePlus aria-hidden="true" className="text-[#a0a4a7]" size={17} />}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[360px] truncate font-medium text-[#202223]">{row.titleRu || `Категория #${row.id}`}</p>
                          <p className="mt-1 max-w-[360px] truncate text-[10px] text-[#888d90]">{row.parentTitleRu ? `${row.parentTitleRu} · ` : 'Корневой раздел · '}{row.uriRu || 'Адрес не задан'} · RO: {row.titleRo || '—'}</p>
                          {missing.length ? <p className="mt-1 text-[9px] font-medium text-[#9a7410]">Не заполнено: {missing.join(', ')}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{row.productCount.toLocaleString('ru-RU')}</td>
                    <td className="px-3 py-3">
                      <button aria-label={`${row.topMenu === 1 ? 'Убрать из' : 'Добавить в'} верхнее меню: ${row.titleRu ?? row.id}`} aria-pressed={row.topMenu === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition disabled:opacity-50 ${row.topMenu === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} disabled={busyId === row.id} onClick={() => void updateCategory(row, { topMenu: row.topMenu === 1 ? 0 : 1 })} type="button">{row.topMenu === 1 ? <Check size={12} /> : null}{row.topMenu === 1 ? 'Да' : 'Нет'}</button>
                    </td>
                    <td className="px-3 py-3">
                      <button aria-label={`${row.isCustomMobile === 1 ? 'Отключить' : 'Включить'} мобильную категорию: ${row.titleRu ?? row.id}`} aria-pressed={row.isCustomMobile === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition disabled:opacity-50 ${row.isCustomMobile === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} disabled={busyId === row.id} onClick={() => void updateCategory(row, { isCustomMobile: row.isCustomMobile === 1 ? 0 : 1 })} type="button">{row.isCustomMobile === 1 ? <Check size={12} /> : null}{row.isCustomMobile === 1 ? 'Да' : 'Нет'}</button>
                    </td>
                    <td className="px-3 py-3"><input aria-label={`Порядок категории ${row.titleRu ?? row.id}`} className="h-8 w-16 rounded-md border border-[#d9dcde] px-2 text-center text-[11px] outline-none focus:border-[#007AFF]" defaultValue={row.sorder ?? 0} disabled={busyId === row.id} min={0} onBlur={(event) => { const order = Number(event.currentTarget.value); if (Number.isInteger(order) && order >= 0 && order !== (row.sorder ?? 0)) void updateCategory(row, { sorder: order }) }} type="number" /></td>
                    <td className="px-3 py-3">
                      <button aria-label={`${row.isShown === 1 ? 'Скрыть' : 'Показать'} категорию ${row.titleRu ?? row.id}`} aria-pressed={row.isShown === 1} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition disabled:opacity-50 ${row.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} disabled={busyId === row.id} onClick={() => void updateCategory(row, { isShown: row.isShown === 1 ? 0 : 1 })} type="button">{row.isShown === 1 ? <Check size={12} /> : null}{row.isShown === 1 ? 'Показывается' : 'Скрыта'}</button>
                    </td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1">
                      <button aria-label={`Редактировать ${row.titleRu ?? row.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#e8f1ff] hover:text-[#005fc7]" onClick={() => openEditor(row)} type="button"><Pencil size={14} /></button>
                      <button aria-label={`Удалить ${row.titleRu ?? row.id}`} className="grid size-8 place-items-center rounded-lg text-[#686d70] hover:bg-[#fff0f0] hover:text-[#a1262e] disabled:opacity-40" disabled={busyId === row.id} onClick={() => void deleteCategory(row)} type="button"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                )
              })}
              {!rows.length ? <tr><td className="px-4 py-12 text-center text-[11px] text-[#777b7e]" colSpan={7}>Категории не найдены.</td></tr> : null}
            </tbody>
          </table>
        </div>

        {initialData.pageCount > 1 ? (
          <nav aria-label="Страницы категорий" className="flex items-center justify-between border-t border-[#eceeef] px-4 py-3 sm:px-5">
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
          <section aria-labelledby="category-dialog-title" aria-modal="true" className="max-h-[96dvh] w-full max-w-[960px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6" role="dialog">
            <header className="mb-5 flex items-start justify-between gap-4">
              <div><p className="mb-1 text-[9px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Каталог</p><h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#202223]" id="category-dialog-title">{isEditing ? 'Редактировать категорию' : 'Новая категория'}</h2><p className="mt-1 text-[10px] text-[#777b7e]">Название и содержимое страницы задаются отдельно для RU и RO.</p></div>
              <button aria-label="Закрыть" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#65696c] hover:bg-[#f2f3f4]" disabled={pending} onClick={() => setEditing(null)} type="button"><X size={18} /></button>
            </header>

            <div aria-label="Разделы категории" className="mb-4 flex gap-1 border-b border-[#eceeef]" role="tablist">
              {([['general', 'Основное'], ['seo', 'SEO'], ['banners', 'Баннеры']] as const).map(([value, label]) => <button aria-selected={tab === value} className={`relative px-3 py-2.5 text-[11px] font-medium ${tab === value ? 'text-[#202223]' : 'text-[#777b7e] hover:text-[#202223]'}`} key={value} onClick={() => setTab(value)} role="tab" type="button">{label}{tab === value ? <span className="absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-[#202223]" /> : null}</button>)}
            </div>

            <form className="space-y-4" key={category?.id ?? 'new'} noValidate onSubmit={(event) => void saveCategory(event)}>
              <div className={tab === 'general' ? 'space-y-4' : 'hidden'}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="lg:col-span-2"><span className={labelClass}>Название категории · RU *</span><input className={inputClass} defaultValue={category?.titleRu ?? ''} maxLength={256} name="titleRu" /></label>
                  <label className="lg:col-span-2"><span className={labelClass}>Denumirea categoriei · RO *</span><input className={inputClass} defaultValue={category?.titleRo ?? ''} maxLength={256} name="titleRo" /></label>
                  <label className="lg:col-span-2"><span className={labelClass}>Родительская категория</span><select className={inputClass} defaultValue={String(category?.parentId ?? 0)} name="parentId"><option value="0">Корневой раздел</option>{initialData.parents.filter((parent) => parent.id !== category?.id).map((parent) => <option key={parent.id} value={parent.id}>{'— '.repeat(Math.max(0, parent.step - 1))}{parent.titleRu || `Категория #${parent.id}`}</option>)}</select></label>
                  <label className="lg:col-span-2"><span className={labelClass}>Тип характеристик</span><select className={inputClass} defaultValue={String(category?.featureType ?? 0)} name="featureType"><option value="0">Без типа</option>{initialData.featureTypes.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}</select></label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label><span className={labelClass}>Заголовок H1 · RU</span><input className={inputClass} defaultValue={category?.h1Ru ?? ''} maxLength={255} name="h1Ru" /></label>
                  <label><span className={labelClass}>Titlu H1 · RO</span><input className={inputClass} defaultValue={category?.h1Ro ?? ''} maxLength={255} name="h1Ro" /></label>
                  <label><span className={labelClass}>Название в хлебных крошках · RU</span><input className={inputClass} defaultValue={category?.breadcrumbTitleRu ?? ''} maxLength={255} name="breadcrumbTitleRu" /></label>
                  <label><span className={labelClass}>Denumire breadcrumb · RO</span><input className={inputClass} defaultValue={category?.breadcrumbTitleRo ?? ''} maxLength={255} name="breadcrumbTitleRo" /></label>
                  <label><span className={labelClass}>Адрес страницы · RU</span><input className={inputClass} defaultValue={category?.uriRu ?? ''} maxLength={256} name="uriRu" placeholder="создать из названия" /></label>
                  <label><span className={labelClass}>Adresa paginii · RO</span><input className={inputClass} defaultValue={category?.uriRo ?? ''} maxLength={256} name="uriRo" placeholder="generată din denumire" /></label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label><span className={labelClass}>Описание страницы · RU</span><textarea className={textareaClass} defaultValue={category?.descRu ?? ''} name="descRu" rows={4} /></label>
                  <label><span className={labelClass}>Descrierea paginii · RO</span><textarea className={textareaClass} defaultValue={category?.descRo ?? ''} name="descRo" rows={4} /></label>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_160px_160px]">
                  <div>
                    <label><span className={labelClass}>Изображение категории</span><input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[10px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="imgFile" type="file" /></label>
                    {category?.img ? <div className="mt-2 flex items-center gap-2"><span className="relative size-10 overflow-hidden rounded-md border border-[#e5e7e9] bg-[#f7f7f7]"><Image alt="" className="object-contain" fill sizes="40px" src={categoryImage(category.img)} unoptimized /></span><span className="min-w-0 flex-1 truncate text-[9px] text-[#777b7e]">{category.img}</span><label className="flex items-center gap-1.5 text-[9px] text-[#777b7e]"><input name="removeImg" type="checkbox" value="1" />Удалить</label></div> : null}
                  </div>
                  <label><span className={labelClass}>Порядок</span><input className={inputClass} defaultValue={category?.sorder ?? 0} max={99999} min={0} name="sorder" type="number" /></label>
                  <label><span className={labelClass}>Показывать на сайте</span><select className={inputClass} defaultValue={String(category?.isShown ?? 1)} name="isShown"><option value="1">Да</option><option value="0">Нет</option></select></label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label><span className={labelClass}><span className="inline-flex items-center gap-1.5"><ImagePlus aria-hidden="true" size={12} />Изображение категории в меню</span></span><input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[10px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="imgNavFile" type="file" /></label>
                    {category?.imgNav ? <div className="mt-2 flex items-center gap-2"><span className="relative size-10 overflow-hidden rounded-md border border-[#e5e7e9] bg-[#f7f7f7]"><Image alt="" className="object-contain" fill sizes="40px" src={categoryImage(category.imgNav)} unoptimized /></span><span className="min-w-0 flex-1 truncate text-[9px] text-[#777b7e]">{category.imgNav}</span><label className="flex items-center gap-1.5 text-[9px] text-[#777b7e]"><input name="removeImgNav" type="checkbox" value="1" />Удалить</label></div> : null}
                  </div>
                  <div>
                    <label><span className={labelClass}><span className="inline-flex items-center gap-1.5"><ImagePlus aria-hidden="true" size={12} />Изображение категории при наведении</span></span><input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[10px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name="imgNavHoverFile" type="file" /></label>
                    {category?.imgNavHover ? <div className="mt-2 flex items-center gap-2"><span className="relative size-10 overflow-hidden rounded-md border border-[#e5e7e9] bg-[#f7f7f7]"><Image alt="" className="object-contain" fill sizes="40px" src={categoryImage(category.imgNavHover)} unoptimized /></span><span className="min-w-0 flex-1 truncate text-[9px] text-[#777b7e]">{category.imgNavHover}</span><label className="flex items-center gap-1.5 text-[9px] text-[#777b7e]"><input name="removeImgNavHover" type="checkbox" value="1" />Удалить</label></div> : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label><span className={labelClass}>Верхнее меню</span><select className={inputClass} defaultValue={String(category?.topMenu ?? 0)} name="topMenu"><option value="0">Нет</option><option value="1">Да</option></select></label>
                  <label><span className={labelClass}>Меню внизу сайта</span><select className={inputClass} defaultValue={String(category?.footerMenu ?? 0)} name="footerMenu"><option value="0">Нет</option><option value="1">Да</option></select></label>
                  <label><span className={labelClass}>Мобильное меню</span><select className={inputClass} defaultValue={String(category?.isCustomMobile ?? 0)} name="isCustomMobile"><option value="0">Обычное</option><option value="1">Особое</option></select></label>
                  <label><span className={labelClass}>Тип страницы</span><select className={inputClass} defaultValue={String(category?.wallpaper ?? 0)} name="wallpaper"><option value="0">Обычная категория</option><option value="1">Страница-обои</option></select></label>
                  <label><span className={labelClass}>Калькулятор</span><select className={inputClass} defaultValue={String(category?.calculator ?? 0)} name="calculator"><option value="0">Выключен</option><option value="1">Включён</option></select></label>
                </div>
                <label className="block max-w-[360px]"><span className={labelClass}>Дополнительные поисковые фразы</span><input className={inputClass} defaultValue={category?.searchTeg ?? ''} maxLength={255} name="searchTeg" /></label>
                <p className="rounded-lg bg-[#f6f7f8] px-3 py-2 text-[10px] leading-4 text-[#73777a]">Английские поля и SEO-ключевые слова здесь не редактируются; сохранённые legacy-значения остаются в базе.</p>
              </div>

              <div className={tab === 'seo' ? 'space-y-4' : 'hidden'}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <fieldset className="space-y-3 rounded-xl border border-[#e5e7e9] p-3"><legend className="px-1 text-[11px] font-medium text-[#34383b]">Русский</legend>
                    <label><span className={labelClass}>SEO Title</span><input className={inputClass} defaultValue={category?.seoTitleRu ?? ''} maxLength={255} name="seoTitleRu" /></label>
                    <label><span className={labelClass}>SEO Description</span><textarea className={textareaClass} defaultValue={category?.seoDescRu ?? ''} name="seoDescRu" rows={3} /></label>
                    <label><span className={labelClass}>SEO-текст внизу страницы</span><textarea className={textareaClass} defaultValue={category?.seoTextRu ?? ''} name="seoTextRu" rows={5} /></label>
                  </fieldset>
                  <fieldset className="space-y-3 rounded-xl border border-[#e5e7e9] p-3"><legend className="px-1 text-[11px] font-medium text-[#34383b]">Română</legend>
                    <label><span className={labelClass}>SEO Title</span><input className={inputClass} defaultValue={category?.seoTitleRo ?? ''} maxLength={255} name="seoTitleRo" /></label>
                    <label><span className={labelClass}>SEO Description</span><textarea className={textareaClass} defaultValue={category?.seoDescRo ?? ''} name="seoDescRo" rows={3} /></label>
                    <label><span className={labelClass}>Text SEO la finalul paginii</span><textarea className={textareaClass} defaultValue={category?.seoTextRo ?? ''} name="seoTextRo" rows={5} /></label>
                  </fieldset>
                </div>
              </div>

              <div className={tab === 'banners' ? 'space-y-4' : 'hidden'}>
                <p className="rounded-lg bg-[#f6f7f8] px-3 py-2.5 text-[10px] leading-4 text-[#6f7376]">Два баннера, как в форме legacy. Для каждого можно задать текст на RU/RO и изображение.</p>
                {([1, 2] as const).map((slot) => {
                  const banner = slot === 1 ? categoryBanner1 : categoryBanner2
                  return (
                    <fieldset className="space-y-3 rounded-xl border border-[#e5e7e9] p-3" key={slot}>
                      <legend className="px-1 text-[11px] font-medium text-[#34383b]">Баннер {slot}</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label><span className={labelClass}>Заголовок · RU</span><input className={inputClass} defaultValue={banner?.titleRu ?? ''} maxLength={256} name={`banner${slot}TitleRu`} /></label>
                        <label><span className={labelClass}>Titlu · RO</span><input className={inputClass} defaultValue={banner?.titleRo ?? ''} maxLength={256} name={`banner${slot}TitleRo`} /></label>
                        <label><span className={labelClass}>Адрес · RU</span><input className={inputClass} defaultValue={banner?.uriRu ?? ''} maxLength={256} name={`banner${slot}UriRu`} /></label>
                        <label><span className={labelClass}>Adresa · RO</span><input className={inputClass} defaultValue={banner?.uriRo ?? ''} maxLength={256} name={`banner${slot}UriRo`} /></label>
                        <label><span className={labelClass}>Краткое описание · RU</span><input className={inputClass} defaultValue={banner?.descRu ?? ''} maxLength={256} name={`banner${slot}DescRu`} /></label>
                        <label><span className={labelClass}>Descriere scurtă · RO</span><input className={inputClass} defaultValue={banner?.descRo ?? ''} maxLength={256} name={`banner${slot}DescRo`} /></label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                        <label><span className={labelClass}>Изображение баннера</span><input accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full rounded-lg border border-[#d9dcde] bg-white px-3 py-2 text-[10px] text-[#555a5e] file:mr-3 file:rounded-md file:border-0 file:bg-[#f0f1f2] file:px-2.5 file:py-1.5 file:text-[10px]" name={`banner${slot}ImgFile`} type="file" />{banner?.img ? <span className="mt-1 flex items-center gap-2"><span className="relative size-9 shrink-0 overflow-hidden rounded-md border border-[#e5e7e9] bg-[#f7f7f7]"><Image alt="" className="object-cover" fill sizes="36px" src={categoryImage(banner.img)} unoptimized /></span><span className="min-w-0 truncate text-[9px] text-[#858a8d]">{banner.img}</span></span> : null}</label>
                        <label><span className={labelClass}>Видимость</span><select className={inputClass} defaultValue={String(banner?.isShown ?? 1)} name={`banner${slot}IsShown`}><option value="1">Показывать</option><option value="0">Скрыть</option></select></label>
                      </div>
                      {banner?.img ? <label className="flex w-fit items-center gap-2 text-[10px] text-[#6f7376]"><input name={`banner${slot}Remove`} type="checkbox" value="1" />Удалить баннер</label> : null}
                    </fieldset>
                  )
                })}
              </div>

              {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[11px] text-[#a1262e]" role="alert">{error}</p> : null}
              <footer className="flex justify-end gap-2 border-t border-[#eceeef] pt-4">
                {isEditing ? <button className="mr-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[10px] font-medium text-[#9a3030] hover:bg-[#fff4f4] disabled:opacity-50" disabled={pending} onClick={() => category && void deleteCategory(category)} type="button"><Trash2 size={13} />Удалить</button> : null}
                <button className="h-9 rounded-lg border border-[#d9dcde] px-3.5 text-[10px] font-medium text-[#45494c] hover:bg-[#f7f7f7] disabled:opacity-50" disabled={pending} onClick={() => setEditing(null)} type="button">Отмена</button>
                <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#202223] px-4 text-[10px] font-medium text-white hover:bg-[#3a3d3f] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? 'Сохраняем…' : <><Check size={13} />{isEditing ? 'Сохранить категорию' : 'Добавить категорию'}</>}</button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}
