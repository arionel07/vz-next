'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, Image as ImageIcon } from 'lucide-react'

type HomeEntry = {
  id: number
  type: 'slider' | 'category' | 'product' | 'brandSection'
  title: string
  detail: string
  image: string | null
  isShown: number
  sorder: number
  sectionKey?: string
}

type TabKey = 'slider' | 'category' | 'product' | 'brandSection'

const tabs: { key: TabKey; title: string; description: string }[] = [
  { key: 'slider', title: 'Слайды', description: 'Большие промо-блоки в верхней части главной.' },
  { key: 'category', title: 'Категории', description: 'Круглые ссылки на популярные разделы каталога.' },
  { key: 'product', title: 'Товары', description: 'Состав блоков скидок, новинок и хитов.' },
  { key: 'brandSection', title: 'Брендовые блоки', description: 'Баннеры брендов и связанные товарные подборки.' },
]

const sectionLabels: Record<string, string> = { sale: 'Скидки', new: 'Новинки', hits: 'Хиты' }

export function AdminHomeManager({ initialEntries }: { initialEntries: HomeEntry[] }) {
  const [entries, setEntries] = useState(initialEntries)
  const [activeTab, setActiveTab] = useState<TabKey>('slider')
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const activeTabInfo = tabs.find((tab) => tab.key === activeTab)!
  const tabEntries = useMemo(() => entries.filter((entry) => entry.type === activeTab), [entries, activeTab])
  const visibleCount = tabEntries.filter((entry) => entry.isShown === 1).length
  const productGroups = activeTab === 'product' ? [...new Set(tabEntries.map((entry) => entry.sectionKey ?? 'other'))] : []

  async function updateEntry(entry: HomeEntry, patch: { isShown?: number; sorder?: number }) {
    const key = `${entry.type}-${entry.id}`
    const oldEntry = entries.find((item) => item.type === entry.type && item.id === entry.id)
    if (!oldEntry) return
    setPending(key)
    setError('')
    setNotice('')
    setEntries((items) => items.map((item) => item.type === entry.type && item.id === entry.id ? { ...item, ...patch } : item))
    try {
      const response = await fetch('/api/admin/home', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: entry.type, id: entry.id, ...patch }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить изменение.')
      setNotice('Изменение сохранено и применится на витрине.')
    } catch (saveError) {
      setEntries((items) => items.map((item) => item.type === entry.type && item.id === entry.id ? oldEntry : item))
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить изменение.')
    } finally {
      setPending('')
    }
  }

  async function updateProductSection(sectionKey: string, isShown: number) {
    const affected = entries.filter((entry) => entry.type === 'product' && entry.sectionKey === sectionKey)
    if (!affected.length) return
    setPending(`section-${sectionKey}`)
    setError('')
    setNotice('')
    setEntries((items) => items.map((item) => item.type === 'product' && item.sectionKey === sectionKey ? { ...item, isShown } : item))
    try {
      const response = await fetch('/api/admin/home', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'productSection', sectionKey, isShown }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message ?? 'Не удалось сохранить видимость блока.')
      setNotice(`Блок «${sectionLabels[sectionKey] ?? sectionKey}» обновлён.`)
    } catch (saveError) {
      setEntries((items) => items.map((item) => {
        const previous = affected.find((entry) => entry.id === item.id)
        return item.type === 'product' && item.sectionKey === sectionKey && previous ? { ...item, isShown: previous.isShown } : item
      }))
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить видимость блока.')
    } finally {
      setPending('')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Контент и сайт</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">Главная витрина</h1>
          <p className="mt-2 max-w-[620px] text-[13px] leading-5 text-[#707477]">Настраивайте порядок и видимость блоков. Содержимое берётся из тех же разделов, которые использует сайт.</p>
        </div>
        <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9dcde] bg-white px-3.5 text-[11px] font-medium text-[#303438] transition hover:border-[#007AFF] hover:text-[#0062CC] focus-visible:outline-2 focus-visible:outline-[#007AFF]" href="/ru" rel="noreferrer" target="_blank">Открыть витрину <ArrowUpRight aria-hidden="true" size={15} /></Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Сводка главной страницы">
        {[
          ['Слайдов', entries.filter((entry) => entry.type === 'slider').length],
          ['Категорий', entries.filter((entry) => entry.type === 'category').length],
          ['Активных блоков', entries.filter((entry) => entry.isShown === 1).length],
        ].map(([label, count]) => <article className="rounded-2xl border border-[#e5e7e9] bg-white px-4 py-3.5" key={label}><p className="text-[10px] text-[#777b7e]">{label}</p><p className="mt-1 text-[23px] leading-7 font-medium tracking-[-0.04em] text-[#202223]">{count}</p></article>)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e5e7e9] bg-white">
        <div className="flex flex-wrap gap-1 border-b border-[#e8eaec] px-3 pt-3 sm:px-5" role="tablist" aria-label="Блоки главной">
          {tabs.map((tab) => {
            const count = entries.filter((entry) => entry.type === tab.key).length
            return <button aria-selected={activeTab === tab.key} className={`inline-flex h-9 items-center gap-2 rounded-t-lg border-b-2 px-3 text-[11px] font-medium transition ${activeTab === tab.key ? 'border-[#007AFF] text-[#005fc7]' : 'border-transparent text-[#666b6e] hover:bg-[#f6f7f8] hover:text-[#202223]'}`} key={tab.key} onClick={() => setActiveTab(tab.key)} role="tab" type="button">{tab.title}<span className="rounded-full bg-[#f0f1f2] px-1.5 py-0.5 text-[9px] text-[#666b6e]">{count}</span></button>
          })}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-4 sm:px-5">
          <div><h2 className="text-[15px] font-medium text-[#202223]">{activeTabInfo.title}</h2><p className="mt-1 text-[11px] text-[#777b7e]">{activeTabInfo.description}</p></div>
          <p className="text-[10px] text-[#777b7e]">Показываются: <span className="font-medium text-[#303438]">{visibleCount}</span> из {tabEntries.length}</p>
        </div>

        {error ? <p aria-live="assertive" className="mx-4 mb-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-[12px] text-[#a1262e] sm:mx-5" role="alert">{error}</p> : null}
        {notice ? <p aria-live="polite" className="mx-4 mb-3 rounded-lg bg-[#eef8f1] px-3 py-2 text-[12px] text-[#24713b] sm:mx-5">{notice}</p> : null}

        <div className="space-y-5 px-4 pb-5 sm:px-5">
          {activeTab === 'product' ? productGroups.map((sectionKey) => {
            const grouped = tabEntries.filter((entry) => entry.sectionKey === sectionKey).sort((a, b) => a.sorder - b.sorder || a.id - b.id)
            const sectionVisible = grouped.length > 0 && grouped.every((entry) => entry.isShown === 1)
            return <section className="overflow-hidden rounded-xl border border-[#e5e7e9]" key={sectionKey}>
              <header className="flex flex-wrap items-center justify-between gap-3 bg-[#f7f7f7] px-3 py-2.5">
                <div><h3 className="text-[12px] font-medium text-[#303438]">Блок «{sectionLabels[sectionKey] ?? sectionKey}»</h3><p className="mt-0.5 text-[10px] text-[#777b7e]">{grouped.length} товаров в подборке</p></div>
                <button aria-pressed={sectionVisible} className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-medium transition ${sectionVisible ? 'bg-[#e8f1ff] text-[#005fc7]' : 'bg-[#f0f1f2] text-[#73787b]'}`} disabled={pending === `section-${sectionKey}`} onClick={() => void updateProductSection(sectionKey, sectionVisible ? 0 : 1)} type="button">{sectionVisible ? <Check size={12} /> : null}{sectionVisible ? 'Блок включён' : 'Блок скрыт'}</button>
              </header>
              <div className="divide-y divide-[#eceeef]">{grouped.map((entry) => <EntryRow entry={entry} key={`${entry.type}-${entry.id}`} pending={pending === `${entry.type}-${entry.id}`} onShownChange={(isShown) => void updateEntry(entry, { isShown })} onOrderChange={(sorder) => void updateEntry(entry, { sorder })} />)}</div>
            </section>
          }) : tabEntries.slice().sort((a, b) => a.sorder - b.sorder || a.id - b.id).map((entry) => <EntryRow entry={entry} key={`${entry.type}-${entry.id}`} pending={pending === `${entry.type}-${entry.id}`} onShownChange={(isShown) => void updateEntry(entry, { isShown })} onOrderChange={(sorder) => void updateEntry(entry, { sorder })} />)}
          {!tabEntries.length ? <div className="rounded-xl bg-[#f7f7f7] px-4 py-12 text-center"><ImageIcon aria-hidden="true" className="mx-auto mb-2 text-[#93989b]" size={20} /><p className="text-[12px] font-medium text-[#555a5e]">Пока нет элементов этого типа.</p><p className="mt-1 text-[10px] text-[#858a8d]">Добавьте их в соответствующий модуль управления.</p></div> : null}
        </div>
      </section>
    </div>
  )
}

function EntryRow({ entry, pending, onShownChange, onOrderChange }: { entry: HomeEntry; pending: boolean; onShownChange: (value: number) => void; onOrderChange: (value: number) => void }) {
  return (
    <article className="flex min-w-0 flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap">
      <div className="relative grid h-12 w-[72px] shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f1f2f3]">
        {entry.image ? <Image alt="" className="object-cover" fill sizes="72px" src={`/legacy-assets/${entry.type === 'slider' ? 'sliders' : entry.type === 'category' ? 'home_categories' : 'home_brand_sections'}/${encodeURIComponent(entry.image)}`} unoptimized /> : <ImageIcon aria-hidden="true" className="text-[#a0a4a7]" size={17} />}
      </div>
      <div className="min-w-[150px] flex-1">
        <p className="max-w-[420px] truncate text-[12px] font-medium text-[#303438]">{entry.title || `Элемент #${entry.id}`}</p>
        <p className="mt-1 max-w-[460px] truncate text-[10px] text-[#858a8d]">{entry.detail}</p>
      </div>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <label className="flex items-center gap-1.5 text-[10px] text-[#777b7e]">Порядок <input aria-label={`Порядок: ${entry.title}`} className="h-8 w-14 rounded-md border border-[#d9dcde] bg-white px-1.5 text-center text-[11px] text-[#303438] outline-none focus:border-[#007AFF]" defaultValue={entry.sorder} disabled={pending} min={0} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isInteger(value) && value >= 0 && value !== entry.sorder) onOrderChange(value) }} type="number" /></label>
        <button aria-label={`${entry.isShown === 1 ? 'Скрыть' : 'Показать'} ${entry.title || `элемент ${entry.id}`}`} aria-pressed={entry.isShown === 1} className={`inline-flex h-8 min-w-[96px] items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-medium transition disabled:cursor-wait disabled:opacity-60 ${entry.isShown === 1 ? 'bg-[#e8f1ff] text-[#005fc7] hover:bg-[#d9e9ff]' : 'bg-[#f0f1f2] text-[#73787b] hover:bg-[#e5e6e7]'}`} disabled={pending} onClick={() => onShownChange(entry.isShown === 1 ? 0 : 1)} type="button">{entry.isShown === 1 ? <Check aria-hidden="true" size={12} /> : null}{entry.isShown === 1 ? 'Показывается' : 'Скрыт'}</button>
        <ChevronRight aria-hidden="true" className="hidden text-[#b2b5b7] sm:block" size={15} />
      </div>
    </article>
  )
}
