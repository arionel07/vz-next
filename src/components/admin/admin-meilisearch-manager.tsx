'use client'

import { Loader2, PlayCircle, RefreshCcw, Save, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type AdminMeilisearchManagerProps = {
  index: string
  configured: boolean
  initialSynonymGroupsText: string
  synonymStorageReady: boolean
}

type HealthState = 'checking' | 'ok' | 'down' | 'unconfigured'

const PHASES: { key: 'bestsellers' | 'remaining'; label: string }[] = [
  { key: 'bestsellers', label: 'Бестселлеры' },
  { key: 'remaining', label: 'Остальные товары' },
]

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.ok === false) throw new Error(result?.message || `HTTP ${response.status}`)
  return result
}

export function AdminMeilisearchManager({ index, configured, initialSynonymGroupsText, synonymStorageReady }: AdminMeilisearchManagerProps) {
  const [health, setHealth] = useState<HealthState>(configured ? 'checking' : 'unconfigured')
  const [documentCount, setDocumentCount] = useState<number | null>(null)
  const [log, setLog] = useState<string[]>(['Готово к запуску.'])
  const [isReindexing, setIsReindexing] = useState(false)
  const [isApplyingSettings, setIsApplyingSettings] = useState(false)
  const [synonymsText, setSynonymsText] = useState(initialSynonymGroupsText)
  const [isSavingSynonyms, setIsSavingSynonyms] = useState(false)
  const logRef = useRef<HTMLPreElement>(null)

  function report(message: string) {
    setLog((previous) => [...previous, message])
  }

  async function refreshStats() {
    try {
      const response = await fetch('/api/admin/meilisearch/stats', { credentials: 'same-origin' })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message)
      setDocumentCount(Number(result.number_of_documents) || 0)
    } catch {
      setDocumentCount(null)
    }
  }

  async function refreshHealth() {
    if (!configured) {
      setHealth('unconfigured')
      return
    }
    try {
      const response = await fetch('/api/admin/meilisearch/health', { credentials: 'same-origin' })
      const result = await response.json()
      setHealth(response.ok && result.ok ? 'ok' : 'down')
    } catch {
      setHealth('down')
    }
  }

  useEffect(() => {
    refreshHealth()
    refreshStats()
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  async function waitForTask(taskUid: number | string | null | undefined, label: string) {
    if (taskUid === null || taskUid === undefined) return
    const deadline = Date.now() + 300_000
    while (Date.now() < deadline) {
      const result = await postJson('/api/admin/meilisearch/task-status', { taskUid })
      if (result.status === 'succeeded') {
        report(`${label}: задача ${taskUid} завершена.`)
        return
      }
      if (result.status === 'failed' || result.status === 'canceled') {
        throw new Error(`${label}: ${result.error || `задача ${result.status}`}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    throw new Error(`${label}: Meilisearch не завершил задачу за 5 минут. Проверь статус позже.`)
  }

  async function runReindex() {
    setIsReindexing(true)
    setLog(['Сначала индексируются бестселлеры…'])
    let total = 0
    let lastTaskUid: number | string | null = null
    try {
      for (const phase of PHASES) {
        let afterId = 0
        let phaseTotal = 0
        for (;;) {
          const result = await postJson('/api/admin/meilisearch/reindex', { after_id: afterId, limit: 500, phase: phase.key })
          total += result.indexed
          phaseTotal += result.indexed
          report(`${phase.label}: отправлено ${phaseTotal}; всего ${total}; последний ID: ${result.next_after_id}`)
          const taskUid = result.task?.taskUid ?? result.task?.uid
          if (taskUid !== undefined) lastTaskUid = taskUid
          const settingsTaskUid = result.settings_task?.taskUid ?? result.settings_task?.uid
          if (settingsTaskUid !== undefined) lastTaskUid = settingsTaskUid
          afterId = result.next_after_id
          if (!result.has_more) {
            report(`${phase.label}: пакеты отправлены.`)
            break
          }
        }
      }
      report('Все пакеты отправлены. Проверяю завершение очереди Meilisearch…')
      await waitForTask(lastTaskUid, 'Индексация')
      report(`Готово. Индексация завершена; отправлено товаров: ${total}`)
      await refreshStats()
    } catch (error) {
      report(`Ошибка: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsReindexing(false)
    }
  }

  async function applySettings() {
    setIsApplyingSettings(true)
    setLog(['Применяем настройки поиска…'])
    try {
      const result = await postJson('/api/admin/meilisearch/settings', {})
      if (result.task_uid !== null && result.task_uid !== undefined) {
        report('Настройки приняты. Ожидаю применение…')
        await waitForTask(result.task_uid, 'Настройки поиска')
      } else {
        report('Настройки отправлены в Meilisearch.')
      }
    } catch (error) {
      report(`Ошибка: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsApplyingSettings(false)
    }
  }

  async function saveSynonyms() {
    setIsSavingSynonyms(true)
    try {
      const result = await postJson('/api/admin/meilisearch/synonyms', { groups: synonymsText })
      report(`Сохранено групп: ${result.groups_count}. Теперь нажми «Применить настройки поиска».`)
    } catch (error) {
      report(`Ошибка: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsSavingSynonyms(false)
    }
  }

  const healthBadge = {
    checking: { label: 'Проверка…', className: 'bg-[#f0f0f0] text-[#666]' },
    ok: { label: 'Доступен', className: 'bg-[#e7f7ec] text-[#1a7f3c]' },
    down: { label: 'Недоступен', className: 'bg-[#fdeaea] text-[#b3261e]' },
    unconfigured: { label: 'Не настроен', className: 'bg-[#f0f0f0] text-[#666]' },
  }[health]

  return (
    <div className="max-w-3xl space-y-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[#111]">Meilisearch</h1>
          <p className="mt-1 text-[13px] text-[#777]">
            Индекс: <span className="font-medium text-[#111]">{index}</span>
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium ${healthBadge.className}`}>
          {healthBadge.label}
        </span>
      </header>

      {!configured ? (
        <p className="rounded-lg border border-[#f0d9a6] bg-[#fff8ea] p-4 text-[13px] text-[#8a6416]">
          MEILISEARCH_URL не задан. Поиск на сайте работает через MySQL fallback; индексация здесь недоступна, пока не настроен сервис.
        </p>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-[#e4e6e8] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-medium text-[#202223]">Индексация каталога</h2>
            <p className="mt-1 text-[12px] text-[#777b7e]">
              Сначала индексируются отмеченные бестселлеры, затем остальные видимые товары пакетами по 500. Повторная индексация обновляет документы и не очищает индекс.
            </p>
          </div>
          <p className="text-[12px] text-[#777b7e]">
            Документов в индексе: <span className="font-medium text-[#111]">{documentCount === null ? '—' : documentCount.toLocaleString('ru-RU')}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runReindex}
            disabled={!configured || isReindexing || isApplyingSettings}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#007AFF] px-4 text-[13px] font-medium text-white transition hover:bg-[#0062cc] disabled:cursor-wait disabled:opacity-60"
          >
            {isReindexing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <PlayCircle className="size-4" aria-hidden="true" />}
            Запустить индексацию
          </button>
          <button
            type="button"
            onClick={applySettings}
            disabled={!configured || isReindexing || isApplyingSettings}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9dcde] bg-white px-4 text-[13px] font-medium text-[#45494c] transition hover:border-[#007AFF] hover:text-[#0062cc] disabled:cursor-wait disabled:opacity-60"
          >
            {isApplyingSettings ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <SlidersHorizontal className="size-4" aria-hidden="true" />}
            Применить настройки поиска
          </button>
          <button
            type="button"
            onClick={refreshStats}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9dcde] bg-white px-3 text-[13px] font-medium text-[#45494c] transition hover:border-[#007AFF] hover:text-[#0062cc]"
          >
            <RefreshCcw className="size-4" aria-hidden="true" />
          </button>
        </div>

        <pre ref={logRef} className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#f4f6f8] p-4 text-[12px] leading-5 text-[#333]">
          {log.join('\n')}
        </pre>
      </section>

      <section className="space-y-3 rounded-2xl border border-[#e4e6e8] bg-white p-5">
        <div>
          <h2 className="text-[15px] font-medium text-[#202223]">Синонимы поиска</h2>
          <p className="mt-1 text-[12px] text-[#777b7e]">
            Одна группа на строку. Разделяй варианты символом <code>|</code>: запрос любого варианта будет искать остальные. Например: <code>помада | lipstick | ruj</code>.
          </p>
          {!synonymStorageReady ? (
            <p className="mt-1 text-[12px] text-[#b3261e]">
              Чтобы сохранять изменения из админки, сначала выполни миграцию <code>drizzle/0006_search_synonym_settings.sql</code>.
            </p>
          ) : null}
        </div>
        <textarea
          value={synonymsText}
          onChange={(event) => setSynonymsText(event.target.value)}
          spellCheck={false}
          rows={10}
          className="w-full rounded-lg border border-[#d9dcde] p-3 font-mono text-[13px] leading-5 text-[#111] outline-none focus:border-[#007AFF]"
        />
        <button
          type="button"
          onClick={saveSynonyms}
          disabled={!synonymStorageReady || isSavingSynonyms}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d9dcde] bg-white px-4 text-[13px] font-medium text-[#45494c] transition hover:border-[#007AFF] hover:text-[#0062cc] disabled:cursor-wait disabled:opacity-60"
        >
          {isSavingSynonyms ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          Сохранить группы синонимов
        </button>
      </section>
    </div>
  )
}
