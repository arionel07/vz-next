'use client'

import Image from 'next/image'
import Link from 'next/link'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { ImageOff, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { legacyAsset } from '@/lib/legacy-assets'

export type AdminProductListRow = {
  id: number
  sku: string
  titleRu: string | null
  titleRo: string | null
  price: number | string | null
  discountPrice: number | string | null
  isShown: number | null
  isNew: number | null
  bestSelling: number | null
  isGift: number | null
  categoryTitle: string | null
  brandTitle: string | null
  image: string | null
  missingCategory: boolean
  missingBrand: boolean
  variantCount: number
  variantMinimumPrice: number | null
}

type ProductWorkspaceState = {
  selectionMode: boolean
  selectedIds: number[]
  pending: boolean
  error: string
  toggleMode: () => void
  toggleProduct: (id: number) => void
  requestDelete: () => void
  cancelDelete: () => void
  confirmDelete: () => Promise<void>
}

const ProductWorkspaceContext = createContext<ProductWorkspaceState | null>(null)

function useProductWorkspace() {
  const value = useContext(ProductWorkspaceContext)
  if (!value) throw new Error('AdminProductsWorkspace is missing.')
  return value
}

export function AdminProductsWorkspace({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  function toggleMode() {
    setSelectionMode((current) => !current)
    setSelectedIds([])
    setError('')
  }

  function toggleProduct(id: number) {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id])
  }

  function requestDelete() {
    if (!selectedIds.length) return
    setError('')
    setConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!selectedIds.length) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      const result = await response.json().catch(() => null) as { deleted?: number; message?: string } | null
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось удалить выбранные товары.')
      setConfirmOpen(false)
      setSelectionMode(false)
      setSelectedIds([])
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить выбранные товары.')
    } finally {
      setPending(false)
    }
  }

  const value: ProductWorkspaceState = {
    selectionMode,
    selectedIds,
    pending,
    error,
    toggleMode,
    toggleProduct,
    requestDelete,
    cancelDelete: () => { if (!pending) setConfirmOpen(false) },
    confirmDelete,
  }

  return <ProductWorkspaceContext.Provider value={value}>
    {children}
    {confirmOpen ? <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setConfirmOpen(false) }}>
      <section aria-labelledby="bulk-delete-title" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[#e2e4e6] bg-white p-5 shadow-2xl" role="alertdialog">
        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fff5c2] text-[#765b13]"><TriangleAlert aria-hidden="true" size={17} /></span><div><h2 className="text-[15px] font-semibold text-[#202223]" id="bulk-delete-title">Точно удалить выбранные товары?</h2><p className="mt-1 text-[11px] leading-5 text-[#62676b]">Будет удалено товаров: {selectedIds.length}. Товары, которые уже входят в заказ или используются в настройках подарков, будут защищены от удаления.</p></div></div>
        {error ? <p aria-live="assertive" className="mt-4 rounded-lg bg-[#fff0f0] px-3 py-2.5 text-[11px] text-[#a1262e]" role="alert">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2"><button className="h-9 rounded-lg border border-[#d9dcde] px-3 text-[11px] font-medium text-[#45494c] hover:bg-[#f7f8f9] disabled:opacity-50" disabled={pending} onClick={() => setConfirmOpen(false)} type="button">Отмена</button><button className="h-9 rounded-lg bg-[#a1262e] px-4 text-[11px] font-medium text-white hover:bg-[#891f26] disabled:cursor-wait disabled:opacity-60" disabled={pending} onClick={() => void confirmDelete()} type="button">{pending ? 'Удаляем…' : `Удалить (${selectedIds.length})`}</button></div>
      </section>
    </div> : null}
  </ProductWorkspaceContext.Provider>
}

export function AdminProductsActions() {
  const { selectionMode, selectedIds, toggleMode, requestDelete, pending } = useProductWorkspace()
  return <div className="flex flex-wrap items-center gap-2">
    <Link className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#202223] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" href="/admin/products/new"><Plus aria-hidden="true" size={16} /> Добавить товар</Link>
    {selectionMode ? <>
      <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d9dcde] bg-white px-3 text-[11px] font-medium text-[#45494c] hover:bg-[#f7f8f9]" onClick={toggleMode} type="button">Отмена</button>
      <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ead7a0] bg-[#fff8db] px-3 text-[11px] font-medium text-[#765b13] hover:bg-[#fff1b8] disabled:cursor-not-allowed disabled:opacity-50" disabled={!selectedIds.length || pending} onClick={requestDelete} type="button"><Trash2 aria-hidden="true" size={14} /> Удалить выбранные ({selectedIds.length})</button>
    </> : <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d9dcde] bg-white px-3 text-[11px] font-medium text-[#45494c] transition hover:border-[#b8bdc1] hover:bg-[#f7f8f9]" onClick={toggleMode} type="button"><Trash2 aria-hidden="true" size={14} /> Удалить</button>}
  </div>
}

function formatPrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0) return 'Цена не задана'
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(value))} MDL`
}

export function AdminProductTable({ rows }: { rows: AdminProductListRow[] }) {
  const { selectionMode, selectedIds, toggleProduct } = useProductWorkspace()
  const pageIds = rows.map((row) => row.id)
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
  const togglePage = () => {
    if (allSelected) pageIds.forEach((id) => { if (selectedIds.includes(id)) toggleProduct(id) })
    else pageIds.forEach((id) => { if (!selectedIds.includes(id)) toggleProduct(id) })
  }

  return <div className="overflow-x-auto">
    {selectionMode ? <p className="border-b border-[#eceeef] bg-[#fffbea] px-4 py-2 text-[10px] text-[#725913]">Отметьте товары, затем нажмите «Удалить выбранные» и подтвердите действие.</p> : null}
    <table className="w-full min-w-[920px] border-collapse text-left text-[11px]">
      <thead className="bg-[#f7f7f7] text-[#62666a]"><tr>
        {selectionMode ? <th className="w-10 px-3 py-3"><input aria-label="Выбрать все товары на странице" checked={allSelected} className="size-3.5 accent-[#007AFF]" onChange={togglePage} type="checkbox" /></th> : null}
        <th className="px-4 py-3 font-medium">Товар</th><th className="px-3 py-3 font-medium">Категория</th><th className="px-3 py-3 font-medium">Бренд</th><th className="px-3 py-3 font-medium">Цена</th><th className="px-3 py-3 font-medium">Варианты</th><th className="px-3 py-3 font-medium">Состояние</th><th className="px-3 py-3 text-right font-medium">Действия</th>
      </tr></thead>
      <tbody className="divide-y divide-[#eceeef]">
        {rows.map((product) => {
          const price = product.discountPrice && Number(product.discountPrice) > 0 ? Number(product.discountPrice) : product.price
          const hasPrice = Boolean(price && Number(price) > 0) || product.variantMinimumPrice !== null
          const missing = [product.missingCategory ? 'категория' : '', product.missingBrand ? 'бренд' : ''].filter(Boolean)
          return <tr className={`text-[#34383b] ${!product.image ? 'bg-[#fffdf2]' : ''}`} key={product.id}>
            {selectionMode ? <td className="px-3 py-3"><input aria-label={`Выбрать товар ${product.titleRu || product.titleRo || product.id}`} checked={selectedIds.includes(product.id)} className="size-3.5 accent-[#007AFF]" onChange={() => toggleProduct(product.id)} type="checkbox" /></td> : null}
            <td className="px-4 py-3"><div className="flex items-center gap-3">
              <div className={`relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg ${product.image ? 'bg-[#f2f2f2]' : 'bg-[#fff1bf]'}`}>{product.image ? <Image alt="" className="object-contain mix-blend-multiply" fill sizes="56px" src={legacyAsset(product.image, 'products')!} unoptimized /> : <ImageOff aria-hidden="true" className="text-[#94721b]" size={17} />}</div>
              <div className="min-w-0"><p className="max-w-[320px] truncate font-medium text-[#202223]">{product.titleRu || product.titleRo || `Товар #${product.id}`}</p><p className="mt-1 text-[10px] text-[#777b7e]">SKU {product.sku} · ID {product.id}</p><div className="mt-1 flex flex-wrap gap-1">{product.isNew === 1 ? <span className="rounded-full bg-[#f0f1f2] px-1.5 py-0.5 text-[9px] text-[#555a5e]">Новинка</span> : null}{product.bestSelling === 1 ? <span className="rounded-full bg-[#f0f1f2] px-1.5 py-0.5 text-[9px] text-[#555a5e]">Хит</span> : null}{product.isGift === 1 ? <span className="rounded-full bg-[#f0f1f2] px-1.5 py-0.5 text-[9px] text-[#555a5e]">Подарок</span> : null}</div></div>
            </div></td>
            <td className="max-w-[160px] truncate px-3 py-3 text-[#62676b]">{product.categoryTitle || '—'}</td>
            <td className="max-w-[160px] truncate px-3 py-3 text-[#62676b]">{product.brandTitle || '—'}</td>
            <td className="whitespace-nowrap px-3 py-3"><span className={hasPrice ? 'font-medium text-[#202223]' : 'text-[#aa5d2e]'}>{formatPrice(price ?? product.variantMinimumPrice)}</span>{product.discountPrice && Number(product.discountPrice) > 0 && product.price ? <span className="mt-1 block text-[9px] text-[#898e91] line-through">{formatPrice(product.price)}</span> : null}</td>
            <td className="px-3 py-3 text-[#62676b]">{product.variantCount || '—'}</td>
            <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-medium ${product.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`}>{product.isShown === 1 ? 'Опубликован' : 'Скрыт'}</span>
              {!product.image ? <span className="mt-1 block text-[9px] font-medium text-[#765b13]">Нет фото</span> : null}
              {!hasPrice ? <span className="mt-1 block text-[9px] text-[#aa5d2e]">Нет цены</span> : null}
              {missing.length ? <span className="mt-1 inline-flex rounded-md bg-[#fff1bf] px-1.5 py-1 text-[9px] font-medium text-[#765b13]">Не хватает: {missing.join(', ')}</span> : null}
            </td>
            <td className="px-3 py-3 text-right"><Link className="inline-flex h-8 items-center rounded-lg border border-[#d9dcde] px-2.5 text-[10px] font-medium text-[#45494c] hover:border-[#007AFF] hover:text-[#0062CC]" href={`/admin/products/${product.id}`}>Редактировать</Link></td>
          </tr>
        })}
      </tbody>
    </table>
  </div>
}
