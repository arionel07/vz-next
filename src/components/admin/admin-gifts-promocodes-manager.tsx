'use client'

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Check, Gift, Plus, Search, Tag, TicketPercent, X } from 'lucide-react'

import type {
  AdminBrandOption,
  AdminGift,
  AdminGiftProductOption,
  AdminGiftPromotion,
  AdminGiftsPromocodesData,
  AdminPromocode,
} from '@/lib/admin-gifts-promocodes'

type Tab = 'gifts' | 'rules' | 'promocodes'
type GiftForm = {
  id: number | null; titleRu: string; titleRo: string; descriptionRu: string; descriptionRo: string
  productId: string; variantId: string; product: AdminGiftProductOption | null
  isEnabled: boolean; showOnSite: boolean; sorder: string
}
type RuleForm = {
  id: number | null; titleRu: string; titleRo: string; descriptionRu: string; descriptionRo: string
  giftId: string; offerId: string; conditionQty: string; isEnabled: boolean; showOnSite: boolean
  isOnline: string; progressMode: 'time' | 'stock' | 'none'; dateFrom: string; dateTo: string
  sorder: string; brandIds: number[]
}
type PromocodeForm = {
  id: number | null; name: string; code: string; type: 'percentage' | 'fixed'; value: string
  minAmount: string; maxDiscount: string; usageLimit: string; perUserLimit: string
  allowDiscounted: boolean; startsAt: string; endsAt: string; status: 'draft' | 'active' | 'disabled'
  brandScope: 'all' | 'selected'; brandIds: number[]; excludedBrandIds: number[]
}
type Editor = { kind: 'gift'; data: GiftForm } | { kind: 'rule'; data: RuleForm } | { kind: 'promocode'; data: PromocodeForm }

const inputClass = 'h-10 w-full rounded-lg border border-[#d9dcde] bg-white px-3 text-[12px] text-[#202223] outline-none transition placeholder:text-[#9a9da0] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
const labelClass = 'mb-1.5 block text-[10px] font-medium text-[#62676b]'
const buttonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#d9dcde] bg-white px-3 text-[11px] font-medium text-[#34383b] transition hover:bg-[#f5f6f7] disabled:cursor-wait disabled:opacity-50'
const primaryClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#202223] px-4 text-[11px] font-medium text-white transition hover:bg-[#3a3d3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:cursor-wait disabled:opacity-50'

function giftForm(item?: AdminGift): GiftForm {
  return {
    id: item?.id ?? null,
    titleRu: item?.titleRu ?? '', titleRo: item?.titleRo ?? '',
    descriptionRu: item?.descriptionRu ?? '', descriptionRo: item?.descriptionRo ?? '',
    productId: item?.productId ? String(item.productId) : '', variantId: item?.variantId ? String(item.variantId) : '',
    product: item?.productId ? {
      id: item.productId, sku: item.productSku ?? '', titleRu: item.productTitle,
      titleRo: item.productTitleRo ?? item.productTitle ?? '', image: item.productImage,
    } : null,
    isEnabled: item?.isEnabled !== 0, showOnSite: item?.showOnSite !== 0, sorder: String(item?.sorder ?? 0),
  }
}

function ruleForm(item?: AdminGiftPromotion): RuleForm {
  return {
    id: item?.id ?? null,
    titleRu: item?.titleRu ?? '', titleRo: item?.titleRo ?? '',
    descriptionRu: item?.descriptionRu ?? '', descriptionRo: item?.descriptionRo ?? '',
    giftId: item ? String(item.giftId) : '', offerId: item?.offerId ? String(item.offerId) : '',
    conditionQty: String(item?.conditionQty ?? 2), isEnabled: item?.isEnabled !== 0,
    showOnSite: item?.showOnSite !== 0, isOnline: String(item?.isOnline ?? 1),
    progressMode: item?.progressMode === 'stock' || item?.progressMode === 'none' ? item.progressMode : 'time',
    dateFrom: item?.dateFrom ?? '', dateTo: item?.dateTo ?? '', sorder: String(item?.sorder ?? 0),
    brandIds: item?.brandIds ?? [],
  }
}

function localDateTime(value: string | null) {
  return value ? value.slice(0, 16).replace(' ', 'T') : ''
}

function promocodeForm(item?: AdminPromocode): PromocodeForm {
  return {
    id: item?.id ?? null, name: item?.name ?? '', code: item?.code ?? '',
    type: item?.type ?? 'percentage', value: item?.value ?? '',
    minAmount: item?.minAmount ?? '', maxDiscount: item?.maxDiscount ?? '',
    usageLimit: item?.usageLimit ? String(item.usageLimit) : '', perUserLimit: item?.perUserLimit ? String(item.perUserLimit) : '1',
    allowDiscounted: item?.allowDiscounted === 1, startsAt: localDateTime(item?.startsAt ?? null),
    endsAt: localDateTime(item?.endsAt ?? null), status: item?.status ?? 'draft',
    brandScope: item?.brandScope ?? 'all', brandIds: item?.brandIds ?? [], excludedBrandIds: item?.excludedBrandIds ?? [],
  }
}

function numberOrNull(value: string) {
  return value.trim() === '' ? null : Number(value)
}

function tabName(tab: Tab) {
  if (tab === 'gifts') return 'Каталог подарков'
  if (tab === 'rules') return 'Подарки за покупку'
  return 'Акционные промокоды'
}

function statusLabel(enabled: boolean, publicOnSite: boolean) {
  if (!enabled) return 'Отключено'
  return publicOnSite ? 'Опубликовано' : 'Черновик'
}

export function AdminGiftsPromocodesManager({ initialData }: { initialData: AdminGiftsPromocodesData }) {
  const [data, setData] = useState(initialData)
  const [tab, setTab] = useState<Tab>('gifts')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Editor | null>(null)
  const [pending, setPending] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const filteredGifts = useMemo(() => data.gifts.filter((item) => !normalizedQuery || [item.titleRu, item.titleRo, item.productTitle, item.productTitleRo, item.productSku].some((value) => value?.toLocaleLowerCase('ru').includes(normalizedQuery))), [data.gifts, normalizedQuery])
  const filteredRules = useMemo(() => data.giftPromotions.filter((item) => !normalizedQuery || [item.titleRu, item.titleRo, item.giftTitle, item.offerTitle, ...item.brandTitles].some((value) => value?.toLocaleLowerCase('ru').includes(normalizedQuery))), [data.giftPromotions, normalizedQuery])
  const filteredPromocodes = useMemo(() => data.promocodes.filter((item) => !normalizedQuery || [item.name, item.code].some((value) => value.toLocaleLowerCase('ru').includes(normalizedQuery))), [data.promocodes, normalizedQuery])

  function openGift(item?: AdminGift) { setError(''); setEditing({ kind: 'gift', data: giftForm(item) }) }
  function openRule(item?: AdminGiftPromotion) { setError(''); setEditing({ kind: 'rule', data: ruleForm(item) }) }
  function openPromocode(item?: AdminPromocode) { setError(''); setEditing({ kind: 'promocode', data: promocodeForm(item) }) }

  function updateGift(patch: Partial<GiftForm>) {
    setEditing((current) => current?.kind === 'gift' ? { ...current, data: { ...current.data, ...patch } } : current)
  }
  function updateRule(patch: Partial<RuleForm>) {
    setEditing((current) => current?.kind === 'rule' ? { ...current, data: { ...current.data, ...patch } } : current)
  }
  function updatePromocode(patch: Partial<PromocodeForm>) {
    setEditing((current) => current?.kind === 'promocode' ? { ...current, data: { ...current.data, ...patch } } : current)
  }

  async function refreshData() {
    const response = await fetch('/api/admin/gifts-promocodes', { cache: 'no-store' })
    const result = await response.json().catch(() => null)
    if (!response.ok || !result?.gifts) throw new Error(result?.message ?? 'Не удалось обновить список.')
    setData(result as AdminGiftsPromocodesData)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setPending(true); setError(''); setMessage('')
    const current = editing
    let payload: Record<string, unknown>
    if (current.kind === 'gift') {
      payload = {
        titleRu: current.data.titleRu, titleRo: current.data.titleRo,
        descriptionRu: current.data.descriptionRu, descriptionRo: current.data.descriptionRo,
        productId: current.data.productId ? Number(current.data.productId) : null,
        variantId: current.data.variantId ? Number(current.data.variantId) : null,
        isEnabled: current.data.isEnabled ? 1 : 0, showOnSite: current.data.showOnSite ? 1 : 0,
        sorder: Number(current.data.sorder) || 0,
      }
    } else if (current.kind === 'rule') {
      payload = {
        titleRu: current.data.titleRu, titleRo: current.data.titleRo,
        descriptionRu: current.data.descriptionRu, descriptionRo: current.data.descriptionRo,
        giftId: Number(current.data.giftId), offerId: current.data.offerId ? Number(current.data.offerId) : null,
        conditionQty: Number(current.data.conditionQty), isEnabled: current.data.isEnabled ? 1 : 0,
        showOnSite: current.data.showOnSite ? 1 : 0, isOnline: Number(current.data.isOnline),
        progressMode: current.data.progressMode, dateFrom: current.data.dateFrom, dateTo: current.data.dateTo,
        sorder: Number(current.data.sorder) || 0, brandIds: current.data.brandIds,
      }
    } else {
      payload = {
        name: current.data.name, code: current.data.code.toUpperCase(), type: current.data.type,
        value: Number(current.data.value), minAmount: numberOrNull(current.data.minAmount),
        maxDiscount: numberOrNull(current.data.maxDiscount), usageLimit: numberOrNull(current.data.usageLimit),
        perUserLimit: numberOrNull(current.data.perUserLimit), allowDiscounted: current.data.allowDiscounted ? 1 : 0,
        startsAt: current.data.startsAt, endsAt: current.data.endsAt, status: current.data.status,
        brandScope: current.data.brandScope, brandIds: current.data.brandIds, excludedBrandIds: current.data.excludedBrandIds,
      }
    }
    try {
      const kind = current.kind === 'rule' ? 'giftPromotion' : current.kind
      const response = await fetch('/api/admin/gifts-promocodes', {
        method: current.data.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id: current.data.id ?? undefined, data: payload }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить запись.')
      await refreshData()
      setEditing(null)
      setMessage(current.data.id ? 'Изменения сохранены.' : 'Запись добавлена.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить запись.')
    } finally { setPending(false) }
  }

  async function disable(kind: 'gift' | 'giftPromotion' | 'promocode', id: number, title: string) {
    if (!window.confirm(`Отключить «${title}»? Запись и связанные данные сохранятся.`)) return
    setPendingId(id); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/admin/gifts-promocodes?kind=${kind}&id=${id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось отключить запись.')
      await refreshData()
      setMessage('Запись отключена. Данные и история сохранены.')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Не удалось отключить запись.')
    } finally { setPendingId(null) }
  }

  useEffect(() => {
    if (!editing) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) setEditing(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editing, pending])

  const tabCounts: Record<Tab, number> = { gifts: data.gifts.length, rules: data.giftPromotions.length, promocodes: data.promocodes.length }
  const currentCount = tab === 'gifts' ? filteredGifts.length : tab === 'rules' ? filteredRules.length : filteredPromocodes.length

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Продажи</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Подарки и промокоды</h1>
          <p className="mt-2 max-w-[700px] text-[12px] leading-5 text-[#707477]">Каталог подарочных товаров, правила «подарок за покупку» и промокоды для акционных скидок.</p>
        </div>
        <button className={primaryClass} onClick={() => tab === 'gifts' ? openGift() : tab === 'rules' ? openRule() : openPromocode()} type="button"><Plus size={15} />{tab === 'gifts' ? 'Добавить подарок' : tab === 'rules' ? 'Добавить правило' : 'Добавить акционный промокод'}</button>
      </header>

      {(error || message) ? <div aria-live="polite" className={error ? 'rounded-xl border border-[#f2d3d5] bg-[#fff6f6] px-4 py-3 text-[12px] text-[#a1262e]' : 'rounded-xl border border-[#d8e9ff] bg-[#f4f9ff] px-4 py-3 text-[12px] text-[#245a96]'} role={error ? 'alert' : 'status'}>{error || message}</div> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={<Gift size={16} />} title="Подарки" value={data.gifts.length} detail={`${data.gifts.filter((item) => item.isEnabled === 1).length} включено`} />
        <SummaryCard icon={<Tag size={16} />} title="Правила" value={data.giftPromotions.length} detail={`${data.giftPromotions.filter((item) => item.isEnabled === 1).length} включено`} />
        <SummaryCard icon={<TicketPercent size={16} />} title="Акционные промокоды" value={data.promocodes.length} detail={`${data.promocodes.filter((item) => item.status === 'active').length} активно`} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e5e7e9] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceeef] px-4 pt-3 sm:px-5">
          <div aria-label="Разделы подарков и промокодов" className="flex gap-5 overflow-x-auto" role="tablist">
            {(['gifts', 'rules', 'promocodes'] as const).map((item) => <button aria-selected={tab === item} className={`relative flex h-11 shrink-0 items-center gap-2 text-[11px] font-medium transition ${tab === item ? 'text-[#202223]' : 'text-[#74797d] hover:text-[#202223]'}`} key={item} onClick={() => { setTab(item); setQuery('') }} role="tab" type="button">{tabName(item)}<span className="rounded-full bg-[#f1f2f3] px-1.5 py-0.5 text-[9px] text-[#6f7478]">{tabCounts[item]}</span>{tab === item ? <span className="absolute right-0 bottom-[-1px] left-0 h-0.5 rounded-full bg-[#202223]" /> : null}</button>)}
          </div>
          <label className="relative mb-2 block w-full sm:w-[260px]"><Search className="absolute top-1/2 left-3 -translate-y-1/2 text-[#8a8f93]" size={15} /><input aria-label={`Поиск: ${tabName(tab)}`} className={`${inputClass} h-9 pl-9`} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по списку" value={query} /></label>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-[10px] text-[#777b7e] sm:px-5"><span>{tabName(tab)}</span><span>{currentCount} записей</span></div>
        {tab === 'gifts' ? <div className="divide-y divide-[#eef0f1]">{filteredGifts.map((item) => <GiftRow item={item} key={item.id} onDisable={() => void disable('gift', item.id, item.titleRu)} onEdit={() => openGift(item)} pending={pendingId === item.id} />)}{filteredGifts.length === 0 ? <EmptyState title="Подарки не найдены" detail="Добавьте подарочный товар или измените запрос." /> : null}</div> : null}
        {tab === 'rules' ? <div className="divide-y divide-[#eef0f1]">{filteredRules.map((item) => <RuleRow item={item} key={item.id} onDisable={() => void disable('giftPromotion', item.id, item.titleRu)} onEdit={() => openRule(item)} pending={pendingId === item.id} />)}{filteredRules.length === 0 ? <EmptyState title="Правила не найдены" detail="Создайте правило, чтобы связать подарок с покупкой." /> : null}</div> : null}
        {tab === 'promocodes' ? <div className="divide-y divide-[#eef0f1]">{filteredPromocodes.map((item) => <PromocodeRow item={item} key={item.id} onDisable={() => void disable('promocode', item.id, item.code)} onEdit={() => openPromocode(item)} pending={pendingId === item.id} />)}{filteredPromocodes.length === 0 ? <EmptyState title="Акционные промокоды не найдены" detail="Добавьте код скидки и задайте условия его применения." /> : null}</div> : null}
      </section>

      {editing ? <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setEditing(null) }}>
        <section aria-labelledby="gifts-promo-editor-title" aria-modal="true" className="flex max-h-[94dvh] w-full max-w-[780px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl" role="dialog">
          <header className="flex items-center justify-between border-b border-[#eceeef] px-5 py-4 sm:px-6">
            <div><p className="text-[9px] font-semibold tracking-[0.12em] text-[#82878b] uppercase">{editing.kind === 'gift' ? 'Каталог подарков' : editing.kind === 'rule' ? 'Подарки за покупку' : 'Акционные промокоды'}</p><h2 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#202223]" id="gifts-promo-editor-title">{editing.data.id ? 'Редактировать запись' : 'Новая запись'}</h2></div>
            <button aria-label="Закрыть" className="grid size-9 place-items-center rounded-full text-[#62676b] transition hover:bg-[#f1f2f3]" disabled={pending} onClick={() => setEditing(null)} type="button"><X size={18} /></button>
          </header>
          <form className="min-h-0 flex-1 overflow-y-auto" onSubmit={(event) => void save(event)}>
            <div className="space-y-5 px-5 py-5 sm:px-6">
              {editing.kind === 'gift' ? <GiftEditor data={editing.data} onChange={updateGift} /> : null}
              {editing.kind === 'rule' ? <RuleEditor data={editing.data} gifts={data.gifts} brands={data.brands} offers={data.offers} onChange={updateRule} /> : null}
              {editing.kind === 'promocode' ? <PromocodeEditor data={editing.data} brands={data.brands} onChange={updatePromocode} /> : null}
              {error ? <p aria-live="assertive" className="rounded-lg bg-[#fff0f0] px-3 py-2 text-[11px] text-[#a1262e]" role="alert">{error}</p> : null}
            </div>
            <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-[#eceeef] bg-white px-5 py-3 sm:px-6"><button className={buttonClass} disabled={pending} onClick={() => setEditing(null)} type="button">Отмена</button><button className={primaryClass} disabled={pending} type="submit">{pending ? 'Сохраняем…' : editing.data.id ? 'Сохранить' : 'Добавить'}</button></footer>
          </form>
        </section>
      </div> : null}
    </div>
  )
}

function SummaryCard({ icon, title, value, detail }: { icon: ReactNode; title: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-[#e5e7e9] bg-white p-4"><div className="flex items-center justify-between text-[#707579]"><span className="text-[11px]">{title}</span><span className="text-[#007AFF]">{icon}</span></div><div className="mt-3 flex items-end justify-between"><span className="text-[24px] leading-none font-medium tracking-[-0.04em] text-[#202223]">{value}</span><span className="text-[10px] text-[#777b7e]">{detail}</span></div></div>
}

function RowActions({ onEdit, onDisable, pending, disabled }: { onEdit: () => void; onDisable: () => void; pending: boolean; disabled: boolean }) {
  return <div className="flex shrink-0 items-center gap-1.5"><button className={buttonClass} onClick={onEdit} type="button">Изменить</button>{!disabled ? <button className="inline-flex h-9 items-center justify-center rounded-lg border border-[#f0d7d8] px-3 text-[10px] font-medium text-[#a1262e] transition hover:bg-[#fff6f6] disabled:opacity-50" disabled={pending} onClick={onDisable} type="button">{pending ? '…' : 'Отключить'}</button> : null}</div>
}

function GiftRow({ item, onEdit, onDisable, pending }: { item: AdminGift; onEdit: () => void; onDisable: () => void; pending: boolean }) {
  return <article className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-[12px] font-medium text-[#202223]">{item.titleRu}</h3><StatusPill label={statusLabel(item.isEnabled === 1, item.showOnSite === 1)} active={item.isEnabled === 1} /></div><p className="mt-1 truncate text-[10px] text-[#777b7e]">{item.productTitle || 'Товар не выбран'}{item.variantLabel ? ` · ${item.variantLabel}` : ''}{item.productSku ? ` · SKU ${item.productSku}` : ''}</p><p className="mt-1 text-[9px] text-[#969a9d]">RU: {item.titleRu} · RO: {item.titleRo}</p></div><RowActions disabled={item.isEnabled === 0} onDisable={onDisable} onEdit={onEdit} pending={pending} /></article>
}

function RuleRow({ item, onEdit, onDisable, pending }: { item: AdminGiftPromotion; onEdit: () => void; onDisable: () => void; pending: boolean }) {
  return <article className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-[12px] font-medium text-[#202223]">{item.titleRu}</h3><StatusPill label={statusLabel(item.isEnabled === 1, item.showOnSite === 1)} active={item.isEnabled === 1} /></div><p className="mt-1 text-[10px] text-[#777b7e]">Подарок: {item.giftTitle || `#${item.giftId}`} · от {item.conditionQty} шт. · {item.brandTitles.join(', ') || 'бренды не указаны'}</p><p className="mt-1 text-[9px] text-[#969a9d]">{item.offerTitle ? `Акция: ${item.offerTitle} · ` : ''}{item.dateFrom || 'без даты начала'} — {item.dateTo || 'без даты окончания'} · {item.progressMode === 'none' ? 'без срока/остатка' : item.progressMode === 'stock' ? 'по остатку' : 'по сроку'}</p></div><RowActions disabled={item.isEnabled === 0} onDisable={onDisable} onEdit={onEdit} pending={pending} /></article>
}

function PromocodeRow({ item, onEdit, onDisable, pending }: { item: AdminPromocode; onEdit: () => void; onDisable: () => void; pending: boolean }) {
  const discount = item.type === 'percentage' ? `${Number(item.value)}%` : `${item.value} MDL`
  return <article className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#f1f2f3] px-2 py-1 font-mono text-[11px] font-semibold tracking-[0.04em] text-[#202223]">{item.code}</span><StatusPill label={item.status === 'active' ? 'Активен' : item.status === 'draft' ? 'Черновик' : 'Отключён'} active={item.status === 'active'} /><span className="text-[10px] font-medium text-[#202223]">−{discount}</span></div><p className="mt-1 truncate text-[11px] text-[#555a5e]">{item.name}</p><p className="mt-1 text-[9px] text-[#969a9d]">Использовано {item.usages}{item.usageLimit ? ` из ${item.usageLimit}` : ''} · {item.brandScope === 'selected' ? `${item.brandIds.length} брендов` : item.excludedBrandIds.length ? `все бренды, кроме ${item.excludedBrandIds.length}` : 'все бренды'}</p></div><RowActions disabled={item.status === 'disabled'} onDisable={onDisable} onEdit={onEdit} pending={pending} /></article>
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return <span className={`rounded-full px-2 py-1 text-[9px] font-medium ${active ? 'bg-[#eaf4ff] text-[#1766b1]' : 'bg-[#f1f2f3] text-[#777b7e]'}`}>{label}</span>
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="grid min-h-[180px] place-items-center px-4 py-8 text-center"><div><p className="text-[13px] font-medium text-[#34383b]">{title}</p><p className="mt-1 text-[11px] text-[#777b7e]">{detail}</p></div></div>
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={wide ? 'block sm:col-span-2' : 'block'}><span className={labelClass}>{label}</span>{children}</label>
}

function CheckField({ label, checked, onChange, detail }: { label: string; checked: boolean; onChange: (value: boolean) => void; detail?: string }) {
  return <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-[#e7e9eb] px-3 py-3"><span><span className="block text-[11px] font-medium text-[#34383b]">{label}</span>{detail ? <span className="mt-1 block text-[9px] leading-4 text-[#777b7e]">{detail}</span> : null}</span><input checked={checked} className="mt-0.5 size-4 shrink-0 accent-[#007AFF]" onChange={(event) => onChange(event.target.checked)} type="checkbox" /></label>
}

function GiftEditor({ data, onChange }: { data: GiftForm; onChange: (patch: Partial<GiftForm>) => void }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Название RU *"><input className={inputClass} maxLength={255} onChange={(event) => onChange({ titleRu: event.target.value })} required value={data.titleRu} /></Field><Field label="Название RO *"><input className={inputClass} maxLength={255} onChange={(event) => onChange({ titleRo: event.target.value })} required value={data.titleRo} /></Field><Field label="Описание RU"><textarea className={`${inputClass} h-24 resize-y py-2`} maxLength={20000} onChange={(event) => onChange({ descriptionRu: event.target.value })} value={data.descriptionRu} /></Field><Field label="Описание RO"><textarea className={`${inputClass} h-24 resize-y py-2`} maxLength={20000} onChange={(event) => onChange({ descriptionRo: event.target.value })} value={data.descriptionRo} /></Field></div>
    <ProductPicker value={data.product} onSelect={(product) => onChange({ product, productId: product ? String(product.id) : '', variantId: '' })} />
    {data.productId ? <GiftVariantField productId={Number(data.productId)} value={data.variantId} onChange={(variantId) => onChange({ variantId })} /> : null}
    <div className="grid gap-3 sm:grid-cols-3"><Field label="Порядок"><input className={inputClass} min={0} onChange={(event) => onChange({ sorder: event.target.value })} type="number" value={data.sorder} /></Field><CheckField checked={data.isEnabled} detail="Используется в правилах подарков и корзине." label="Подарок включён" onChange={(isEnabled) => onChange({ isEnabled })} /><CheckField checked={data.showOnSite} detail="Разрешает отображение на витрине." label="Показывать на сайте" onChange={(showOnSite) => onChange({ showOnSite })} /></div>
  </>
}

function ProductPicker({ value, onSelect }: { value: AdminGiftProductOption | null; onSelect: (product: AdminGiftProductOption | null) => void }) {
  const [query, setQuery] = useState(value ? `${value.titleRu || value.titleRo} · SKU ${value.sku}` : '')
  const [results, setResults] = useState<AdminGiftProductOption[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const selectedLabel = value ? `${value.titleRu || value.titleRo} · SKU ${value.sku}` : ''
  useEffect(() => { if (selectedLabel) setQuery(selectedLabel) }, [selectedLabel])
  useEffect(() => {
    const term = query.trim()
    if (term.length < 2 || term === selectedLabel) { setResults([]); setLoading(false); return }
    let current = true
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/gifts-promocodes?products=1&q=${encodeURIComponent(term)}`, { cache: 'no-store' })
        const result = await response.json().catch(() => null)
        if (current) setResults(Array.isArray(result?.products) ? result.products as AdminGiftProductOption[] : [])
      } catch { if (current) setResults([]) } finally { if (current) setLoading(false) }
    }, 250)
    return () => { current = false; window.clearTimeout(timer) }
  }, [query, selectedLabel])
  return <div className="relative"><Field label="Подарочный товар"><div className="relative"><Search className="absolute top-1/2 left-3 -translate-y-1/2 text-[#888d90]" size={14} /><input autoComplete="off" className={`${inputClass} pl-9`} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setOpen(true); if (value) onSelect(null) }} onFocus={() => setOpen(true)} placeholder="Найдите товар по названию или SKU" value={query} /></div></Field>
    {open && (results.length > 0 || loading || query.trim().length >= 2) ? <div className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[#e0e3e5] bg-white p-1 shadow-xl">{loading ? <p className="px-3 py-3 text-[10px] text-[#777b7e]">Ищем товары…</p> : results.length ? results.map((product) => <button className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#f4f8fc]" key={product.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(product); setQuery(`${product.titleRu || product.titleRo} · SKU ${product.sku}`); setResults([]); setOpen(false) }} type="button"><span className="min-w-0"><span className="block truncate text-[11px] font-medium text-[#34383b]">{product.titleRu || product.titleRo}</span><span className="mt-0.5 block text-[9px] text-[#777b7e]">SKU {product.sku} · #{product.id}</span></span>{product.image ? <Check className="shrink-0 text-[#007AFF]" size={15} /> : null}</button>) : <p className="px-3 py-3 text-[10px] text-[#777b7e]">Совпадений нет. Подарком можно назначить опубликованный товар или товар с отметкой «Подарок для акции».</p>}</div> : null}
    <p className="mt-1.5 text-[9px] text-[#858a8e]">Можно выбрать опубликованный товар или товар, отмеченный в карточке товара как подарок.</p></div>
}

function GiftVariantField({ productId, value, onChange }: { productId: number; value: string; onChange: (value: string) => void }) {
  const [variants, setVariants] = useState<Array<{ id: number; titleRu: string | null; titleRo: string; volume: string; colorRu: string; colorRo: string; sku: string | null }>>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let current = true
    setLoading(true)
    void fetch(`/api/admin/gifts-promocodes?variants=1&productId=${productId}`, { cache: 'no-store' }).then((response) => response.json()).then((result) => {
      if (current) setVariants(Array.isArray(result?.variants) ? result.variants : [])
    }).catch(() => { if (current) setVariants([]) }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [productId])
  return <Field label="Вариант подарка (необязательно)"><select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}><option value="">Любой доступный вариант</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{[variant.titleRu || variant.titleRo, variant.volume, variant.colorRu || variant.colorRo, variant.sku].filter(Boolean).join(' · ')}</option>)}</select><span className="mt-1 block text-[9px] text-[#858a8e]">{loading ? 'Загружаем варианты…' : variants.length ? `${variants.length} вариантов` : 'У товара нет вариантов'}</span></Field>
}

function RuleEditor({ data, gifts, brands, offers, onChange }: { data: RuleForm; gifts: AdminGift[]; brands: AdminBrandOption[]; offers: AdminGiftsPromocodesData['offers']; onChange: (patch: Partial<RuleForm>) => void }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Название RU *"><input className={inputClass} maxLength={255} onChange={(event) => onChange({ titleRu: event.target.value })} required value={data.titleRu} /></Field><Field label="Название RO *"><input className={inputClass} maxLength={255} onChange={(event) => onChange({ titleRo: event.target.value })} required value={data.titleRo} /></Field><Field label="Описание RU"><textarea className={`${inputClass} h-20 resize-y py-2`} maxLength={20000} onChange={(event) => onChange({ descriptionRu: event.target.value })} value={data.descriptionRu} /></Field><Field label="Описание RO"><textarea className={`${inputClass} h-20 resize-y py-2`} maxLength={20000} onChange={(event) => onChange({ descriptionRo: event.target.value })} value={data.descriptionRo} /></Field></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Подарок *"><select className={inputClass} onChange={(event) => onChange({ giftId: event.target.value })} required value={data.giftId}><option value="">Выберите подарок</option>{gifts.filter((item) => item.isEnabled === 1).map((item) => <option key={item.id} value={item.id}>{item.titleRu} · #{item.id}</option>)}</select></Field><Field label="Связать с акцией"><select className={inputClass} onChange={(event) => onChange({ offerId: event.target.value })} value={data.offerId}><option value="">Не привязывать</option>{offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.titleRu || `Акция #${offer.id}`}</option>)}</select></Field><Field label="Условие: купить товаров *"><input className={inputClass} min={1} onChange={(event) => onChange({ conditionQty: event.target.value })} required type="number" value={data.conditionQty} /></Field><Field label="Канал"><select className={inputClass} onChange={(event) => onChange({ isOnline: event.target.value })} value={data.isOnline}><option value="1">Онлайн</option><option value="0">Офлайн</option><option value="2">Онлайн и офлайн</option></select></Field><Field label="Тип окончания"><select className={inputClass} onChange={(event) => onChange({ progressMode: event.target.value as RuleForm['progressMode'] })} value={data.progressMode}><option value="time">По сроку</option><option value="stock">По остатку подарков</option><option value="none">Без ограничения срока/остатка</option></select></Field><Field label="Порядок"><input className={inputClass} min={0} onChange={(event) => onChange({ sorder: event.target.value })} type="number" value={data.sorder} /></Field><Field label="Дата начала"><input className={inputClass} onChange={(event) => onChange({ dateFrom: event.target.value })} type="date" value={data.dateFrom} /></Field><Field label="Дата окончания"><input className={inputClass} onChange={(event) => onChange({ dateTo: event.target.value })} type="date" value={data.dateTo} /></Field></div>
    <BrandChecklist brands={brands} label="Применяется к брендам *" selected={data.brandIds} onChange={(brandIds) => onChange({ brandIds })} />
    <div className="grid gap-3 sm:grid-cols-2"><CheckField checked={data.isEnabled} detail="Система сможет применить правило в корзине." label="Правило включено" onChange={(isEnabled) => onChange({ isEnabled })} /><CheckField checked={data.showOnSite} detail="Отображать предложение в публичных блоках сайта." label="Показывать на сайте" onChange={(showOnSite) => onChange({ showOnSite })} /></div>
  </>
}

function PromocodeEditor({ data, brands, onChange }: { data: PromocodeForm; brands: AdminBrandOption[]; onChange: (patch: Partial<PromocodeForm>) => void }) {
  return <>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Внутреннее название *"><input className={inputClass} maxLength={255} onChange={(event) => onChange({ name: event.target.value })} required value={data.name} /></Field><Field label="Код для покупателя *"><input autoCapitalize="characters" className={`${inputClass} font-mono uppercase`} maxLength={64} onChange={(event) => onChange({ code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} pattern="[A-Z0-9_-]+" required value={data.code} /></Field><Field label="Тип скидки"><select className={inputClass} onChange={(event) => onChange({ type: event.target.value as PromocodeForm['type'] })} value={data.type}><option value="percentage">Процент</option><option value="fixed">Фиксированная сумма</option></select></Field><Field label={data.type === 'percentage' ? 'Скидка, % *' : 'Скидка, MDL *'}><input className={inputClass} max={data.type === 'percentage' ? 100 : undefined} min="0.01" onChange={(event) => onChange({ value: event.target.value })} required step="0.01" type="number" value={data.value} /></Field><Field label="Минимальная сумма заказа"><input className={inputClass} min="0" onChange={(event) => onChange({ minAmount: event.target.value })} placeholder="Без минимума" step="0.01" type="number" value={data.minAmount} /></Field><Field label="Максимальный размер скидки"><input className={inputClass} min="0" onChange={(event) => onChange({ maxDiscount: event.target.value })} placeholder="Без лимита" step="0.01" type="number" value={data.maxDiscount} /></Field><Field label="Общий лимит использований"><input className={inputClass} min={1} onChange={(event) => onChange({ usageLimit: event.target.value })} placeholder="Без лимита" type="number" value={data.usageLimit} /></Field><Field label="Лимит на клиента"><input className={inputClass} min={1} onChange={(event) => onChange({ perUserLimit: event.target.value })} placeholder="1" type="number" value={data.perUserLimit} /></Field><Field label="Начало действия"><input className={inputClass} onChange={(event) => onChange({ startsAt: event.target.value })} type="datetime-local" value={data.startsAt} /></Field><Field label="Окончание действия"><input className={inputClass} onChange={(event) => onChange({ endsAt: event.target.value })} type="datetime-local" value={data.endsAt} /></Field><Field label="Статус"><select className={inputClass} onChange={(event) => onChange({ status: event.target.value as PromocodeForm['status'] })} value={data.status}><option value="draft">Черновик</option><option value="active">Активен</option><option value="disabled">Отключён</option></select></Field><Field label="Область действия"><select className={inputClass} onChange={(event) => onChange({ brandScope: event.target.value as PromocodeForm['brandScope'] })} value={data.brandScope}><option value="all">Все бренды</option><option value="selected">Только выбранные бренды</option></select></Field></div>
    <CheckField checked={data.allowDiscounted} detail="Разрешить применять этот код к товарам со скидкой." label="Можно сочетать с акционными товарами" onChange={(allowDiscounted) => onChange({ allowDiscounted })} />
    {data.brandScope === 'selected' ? <BrandChecklist brands={brands} label="Разрешённые бренды *" selected={data.brandIds} onChange={(brandIds) => onChange({ brandIds })} /> : <BrandChecklist brands={brands} label="Исключить бренды (необязательно)" selected={data.excludedBrandIds} onChange={(excludedBrandIds) => onChange({ excludedBrandIds })} />}
  </>
}

function BrandChecklist({ brands, label, selected, onChange }: { brands: AdminBrandOption[]; label: string; selected: number[]; onChange: (value: number[]) => void }) {
  const [query, setQuery] = useState('')
  const filtered = brands.filter((brand) => (brand.title ?? '').toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')))
  function toggle(id: number) { onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]) }
  return <section className="rounded-xl border border-[#e5e7e9] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-[10px] font-medium text-[#34383b]">{label}</h3><p className="mt-0.5 text-[9px] text-[#858a8e]">Выбрано: {selected.length}</p></div><label className="relative block w-full sm:w-[210px]"><Search className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[#909599]" size={13} /><input className={`${inputClass} h-8 pl-8 text-[10px]`} onChange={(event) => setQuery(event.target.value)} placeholder="Найти бренд" value={query} /></label></div><div className="mt-3 grid max-h-36 gap-1 overflow-y-auto sm:grid-cols-2">{filtered.map((brand) => <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[10px] text-[#555a5e] hover:bg-[#f5f6f7]" key={brand.id}><input checked={selected.includes(brand.id)} className="size-3.5 accent-[#007AFF]" onChange={() => toggle(brand.id)} type="checkbox" /><span className="truncate">{brand.title || `Бренд #${brand.id}`}</span></label>)}{filtered.length === 0 ? <p className="px-2 py-2 text-[10px] text-[#858a8e]">Нет совпадений.</p> : null}</div></section>
}
