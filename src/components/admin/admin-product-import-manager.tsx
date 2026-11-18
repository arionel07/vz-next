'use client'

import { AlertTriangle, Loader2, PlayCircle, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import type { ImportSample, ImportStats, ProductImportFeedSelection, ProductImportResult } from '@/lib/product-import'

const FEED_LABELS: { key: keyof ProductImportFeedSelection; label: string; hint: string }[] = [
  { key: 'products', label: 'Товары и варианты', hint: 'products.json — основной импорт + варианты' },
  { key: 'prices', label: 'Цены', hint: 'pricevn.json' },
  { key: 'seo', label: 'SEO', hint: 'JobVN.json' },
]

const STAT_LABELS: { key: keyof ImportStats; label: string; tone?: 'warn' }[] = [
  { key: 'productsAdded', label: 'Новые товары' },
  { key: 'productsUpdated', label: 'Обновлённые товары' },
  { key: 'productsUnchanged', label: 'Без изменений' },
  { key: 'productsSkippedEmpty', label: 'Пропущено (нет описания)' },
  { key: 'brandsCreated', label: 'Новые бренды' },
  { key: 'categoryMismatches', label: 'Категории без совпадения', tone: 'warn' },
  { key: 'variantsAdded', label: 'Новые варианты' },
  { key: 'variantsUpdated', label: 'Обновлённые варианты' },
  { key: 'variantsOrphanSkipped', label: 'Варианты без родителя (пропущены)', tone: 'warn' },
  { key: 'variantsOrphanKeptExistingParent', label: 'Варианты: родитель не найден, оставлен как был', tone: 'warn' },
  { key: 'pricesUpdatedOnProducts', label: 'Цены обновлены (товары)' },
  { key: 'pricesUpdatedOnVariants', label: 'Цены обновлены (варианты)' },
  { key: 'pricesNotMatched', label: 'Цены без совпадения', tone: 'warn' },
  { key: 'seoUpdated', label: 'SEO обновлено' },
  { key: 'seoSkippedNoProduct', label: 'SEO: товар не найден', tone: 'warn' },
]

async function postImport(mode: 'preview' | 'apply', feeds: ProductImportFeedSelection) {
  const response = await fetch('/api/admin/product-import', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, feeds }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result?.message || `HTTP ${response.status}`)
  return result as ProductImportResult
}

function SampleList({ samples, category, title }: { samples: ImportSample[]; category: ImportSample['category']; title: string }) {
  const filtered = samples.filter((sample) => sample.category === category)
  if (!filtered.length) return null
  return (
    <div className="space-y-1">
      <p className="text-[12px] font-medium text-[#45494c]">{title}</p>
      <ul className="max-h-40 overflow-y-auto rounded-lg bg-[#f4f6f8] p-3 text-[12px] leading-5 text-[#555]">
        {filtered.map((sample, index) => (
          <li key={index}>
            {sample.guid ? `GUID ${sample.guid} ` : ''}
            {sample.sku ? `SKU ${sample.sku} ` : ''}
            {sample.title ? `— ${sample.title} ` : ''}
            {sample.detail ? `(${sample.detail})` : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminProductImportManager() {
  const [feeds, setFeeds] = useState<ProductImportFeedSelection>({ products: true, prices: true, seo: true })
  const [isRunning, setIsRunning] = useState(false)
  const [preview, setPreview] = useState<ProductImportResult | null>(null)
  const [applyResult, setApplyResult] = useState<ProductImportResult | null>(null)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  function toggleFeed(key: keyof ProductImportFeedSelection) {
    setFeeds((current) => ({ ...current, [key]: !current[key] }))
    setPreview(null)
    setApplyResult(null)
  }

  async function runPreview() {
    setIsRunning(true)
    setError('')
    setApplyResult(null)
    try {
      const result = await postImport('preview', feeds)
      setPreview(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить предпросмотр.')
    } finally {
      setIsRunning(false)
    }
  }

  async function runApply() {
    setConfirmOpen(false)
    setIsRunning(true)
    setError('')
    try {
      const result = await postImport('apply', feeds)
      setApplyResult(result)
      setPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Импорт не удался.')
    } finally {
      setIsRunning(false)
    }
  }

  const displayed = applyResult ?? preview
  const anyFeedSelected = feeds.products || feeds.prices || feeds.seo

  return (
    <div className="max-w-4xl space-y-8 p-6">
      <header>
        <h1 className="text-[20px] font-semibold text-[#111]">Импорт товаров из 1С</h1>
        <p className="mt-1 text-[13px] text-[#777]">
          Читает те же файлы, что и Legacy (<code>public/import/products.json</code>, <code>pricevn.json</code>, <code>JobVN.json</code>) из общего каталога. Сначала сделайте предпросмотр, затем примените.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-5">
        <h2 className="text-[15px] font-medium text-[#202223]">Какие фиды обработать</h2>
        <div className="flex flex-wrap gap-3">
          {FEED_LABELS.map((feed) => (
            <label key={feed.key} className="flex items-center gap-2 rounded-lg border border-[#d9dcde] px-3 py-2 text-[13px]">
              <input type="checkbox" checked={feeds[feed.key]} onChange={() => toggleFeed(feed.key)} />
              <span>
                <strong>{feed.label}</strong>
                <br />
                <span className="text-[11px] text-[#999]">{feed.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runPreview}
            disabled={isRunning || !anyFeedSelected}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9dcde] bg-white px-4 text-[13px] font-medium text-[#45494c] transition hover:border-[#007AFF] hover:text-[#0062cc] disabled:cursor-wait disabled:opacity-60"
          >
            {isRunning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
            Предпросмотр (без изменений в БД)
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isRunning || !preview || preview.errors.length > 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#007AFF] px-4 text-[13px] font-medium text-white transition hover:bg-[#0062cc] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlayCircle className="size-4" aria-hidden="true" />
            Применить к базе данных
          </button>
        </div>
        {!preview && !applyResult ? (
          <p className="text-[12px] text-[#999]">Кнопка «Применить» становится доступна после предпросмотра.</p>
        ) : null}
      </section>

      {error ? (
        <section className="rounded-lg border border-[#f2c6c6] bg-[#fdeaea] p-4 text-[13px] text-[#b3261e]">{error}</section>
      ) : null}

      {displayed ? (
        <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-[#202223]">
              {displayed.dryRun ? 'Результат предпросмотра' : 'Импорт применён'}
            </h2>
            {displayed.dryRun ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8ea] px-3 py-1 text-[12px] font-medium text-[#8a6416]">
                <AlertTriangle className="size-3.5" aria-hidden="true" /> ничего не записано
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7ec] px-3 py-1 text-[12px] font-medium text-[#1a7f3c]">
                применено
              </span>
            )}
          </div>

          {displayed.errors.length > 0 ? (
            <div className="rounded-lg border border-[#f2c6c6] bg-[#fdeaea] p-3 text-[13px] text-[#b3261e]">
              {displayed.errors.map((message, index) => <p key={index}>{message}</p>)}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STAT_LABELS.map(({ key, label, tone }) => {
              const value = displayed.stats[key]
              if (!value) return null
              return (
                <div key={key} className={`rounded-lg border p-3 ${tone === 'warn' ? 'border-[#f0d9a6] bg-[#fff8ea]' : 'border-[#e4e6e8] bg-[#f9fafb]'}`}>
                  <p className="text-[18px] font-semibold text-[#111]">{value}</p>
                  <p className="text-[11px] text-[#777]">{label}</p>
                </div>
              )
            })}
          </div>

          <div className="space-y-3">
            <SampleList samples={displayed.samples} category="product-added" title="Новые товары (примеры)" />
            <SampleList samples={displayed.samples} category="product-updated" title="Обновлённые товары (примеры)" />
            <SampleList samples={displayed.samples} category="brand-created" title="Новые бренды" />
            <SampleList samples={displayed.samples} category="category-mismatch" title="Категории без совпадения" />
            <SampleList samples={displayed.samples} category="variant-added" title="Новые варианты (примеры)" />
            <SampleList samples={displayed.samples} category="variant-updated" title="Обновлённые варианты (примеры)" />
            <SampleList samples={displayed.samples} category="variant-orphan" title="Варианты без родителя" />
            <SampleList samples={displayed.samples} category="price-updated" title="Обновления цен (примеры)" />
            <SampleList samples={displayed.samples} category="seo-updated" title="Обновления SEO (примеры)" />
          </div>
        </section>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmOpen(false) }}>
          <section className="w-full max-w-md rounded-2xl bg-white p-6" role="dialog" aria-modal="true">
            <h2 className="text-[16px] font-semibold text-[#111]">Применить импорт к базе данных?</h2>
            <p className="mt-2 text-[13px] text-[#555]">
              Будет записано: {preview?.stats.productsAdded ?? 0} новых товаров, {preview?.stats.productsUpdated ?? 0} обновлённых,
              {' '}{preview?.stats.variantsAdded ?? 0} новых вариантов, {preview?.stats.variantsUpdated ?? 0} обновлённых вариантов.
              Действие нельзя отменить одной кнопкой — только резервной копией БД.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="h-10 rounded-lg border border-[#d9dcde] px-4 text-[13px] font-medium text-[#45494c]">Отмена</button>
              <button type="button" onClick={runApply} className="h-10 rounded-lg bg-[#007AFF] px-4 text-[13px] font-medium text-white">Да, применить</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
