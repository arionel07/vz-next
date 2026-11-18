'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Gift, RotateCw, X } from 'lucide-react'

import { localizedPath, type StoreLocale } from '@/lib/locale-routing'
import { useAccessibleDialog } from '@/lib/use-accessible-dialog'
import { useCartStore } from '@/store/cart-store'

type RoulettePrize = {
  id: number
  code: string
  type: string
  title: string
  value: number
  probability: number
  expiresAt?: string
}

type RouletteState = {
  visible: boolean
  canSpin: boolean
  reason: string | null
  serverTime: string
  settings: { title: string; description: string; rules: string }
  prizes: RoulettePrize[]
  activePrize: RoulettePrize | null
}

const messages = {
  ru: {
    open: 'Рулетка удачи', title: 'Рулетка удачи', description: 'Приз определяется сервером и сохраняется в вашем аккаунте.',
    spin: 'Крутить колесо', spinning: 'Колесо крутится…', loading: 'Загружаем рулетку…', result: 'Ваш приз',
    activeDescription: 'Приз зафиксирован за вашим аккаунтом. Используйте его в течение 24 часов.',
    apply: 'Применить приз', applied: 'Применяем приз…', shop: 'Перейти к покупкам', rules: 'Правила',
    close: 'Закрыть рулетку', empty: 'Призы пока не настроены.',
    reasons: {
      completed_order_required: 'Для участия нужен завершённый заказ.',
      active_prize: 'У вас уже есть активный приз.', payment_pending: 'Предыдущий заказ ожидает подтверждения оплаты.',
      weekly_window_not_started: 'Рулетка откроется в понедельник в 00:00.', weekly_spin_used: 'Вы уже использовали вращение этой недели. Следующее будет доступно с понедельника.',
      roulette_hidden: 'Рулетка временно недоступна.', roulette_disabled: 'Рулетка временно отключена.',
      prizes_not_configured: 'Призы временно недоступны.', spin_unavailable: 'Сейчас вращение недоступно.',
    } as Record<string, string>,
    loadError: 'Не удалось загрузить рулетку. Обновите страницу.', spinError: 'Вращение не удалось. Попробуйте ещё раз.',
    applyError: 'Не удалось применить приз. Попробуйте ещё раз.', until: 'Действует до',
  },
  ro: {
    open: 'Roata norocului', title: 'Roata norocului', description: 'Premiul este ales de server și salvat în contul tău.',
    spin: 'Învârte roata', spinning: 'Roata se învârte…', loading: 'Se încarcă roata…', result: 'Premiul tău',
    activeDescription: 'Premiul a fost salvat în contul tău. Folosește-l în următoarele 24 de ore.',
    apply: 'Aplică premiul', applied: 'Se aplică…', shop: 'Mergi la cumpărături', rules: 'Regulament',
    close: 'Închide roata', empty: 'Premiile nu sunt configurate încă.',
    reasons: {
      completed_order_required: 'Este necesară o comandă finalizată pentru participare.',
      active_prize: 'Ai deja un premiu activ.', payment_pending: 'Comanda anterioară așteaptă confirmarea plății.',
      weekly_window_not_started: 'Roata se deschide luni la ora 00:00.', weekly_spin_used: 'Ai folosit deja rotirea din această săptămână. Următoarea este disponibilă luni.',
      roulette_hidden: 'Roata este temporar indisponibilă.', roulette_disabled: 'Roata este temporar dezactivată.',
      prizes_not_configured: 'Premiile sunt temporar indisponibile.', spin_unavailable: 'Rotirea nu este disponibilă acum.',
    } as Record<string, string>,
    loadError: 'Nu am putut încărca roata. Reîncarcă pagina.', spinError: 'Rotirea nu a reușit. Încearcă din nou.',
    applyError: 'Premiul nu a putut fi aplicat. Încearcă din nou.', until: 'Valabil până la',
  },
} as const

function getPendingRequestId() {
  try {
    const current = window.sessionStorage.getItem('vz-roulette-pending-request')
    if (current) return current
    const created = window.crypto.randomUUID()
    window.sessionStorage.setItem('vz-roulette-pending-request', created)
    return created
  } catch {
    return window.crypto.randomUUID()
  }
}

function wheelGradient(prizes: RoulettePrize[]) {
  if (!prizes.length) return 'conic-gradient(#ece8e4 0deg 360deg)'
  let cursor = 0
  const stops = prizes.map((prize, index) => {
    const start = cursor
    cursor += prize.probability
    return `${index % 2 === 0 ? '#111111' : '#cdbbb0'} ${start}% ${cursor}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

function prizeRotation(prizes: RoulettePrize[], prize: RoulettePrize, current: number) {
  let before = 0
  for (const candidate of prizes) {
    if (candidate.code === prize.code) break
    before += candidate.probability
  }
  const center = (before + prize.probability / 2) * 3.6
  const target = (360 - center + 360) % 360
  const currentModulo = ((current % 360) + 360) % 360
  const delta = (target - currentModulo + 360) % 360
  return current + 6 * 360 + delta
}

export function RouletteExperience({ locale }: { locale: StoreLocale }) {
  const text = messages[locale]
  const pathname = usePathname() ?? '/ru/account'
  const router = useRouter()
  const setDiscountChoice = useCartStore((store) => store.setDiscountChoice)
  const [apiState, setApiState] = useState<RouletteState | null>(null)
  const [csrfToken, setCsrfToken] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rotation, setRotation] = useState(0)
  const [countdown, setCountdown] = useState('')
  const [serverOffset, setServerOffset] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const initialFocusRef = useRef<HTMLButtonElement | null>(null)
  const requestLocale: StoreLocale = pathname.startsWith('/ro') ? 'ro' : locale
  const wheelBackground = useMemo(() => wheelGradient(apiState?.prizes ?? []), [apiState?.prizes])
  const close = useCallback(() => setOpen(false), [])

  useAccessibleDialog({ open, rootRef, initialFocusRef, onClose: close })

  const refreshState = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/roulette/state?locale=${requestLocale}`, { cache: 'no-store', signal })
    const result = await response.json() as { data?: RouletteState; csrfToken?: string; error?: string }
    if (!response.ok || !result.data || !result.csrfToken) throw new Error(result.error ?? 'state_unavailable')
    setApiState(result.data)
    setCsrfToken(result.csrfToken)
    const serverTime = Date.parse(result.data.serverTime)
    if (Number.isFinite(serverTime)) setServerOffset(serverTime - Date.now())
    return result.data
  }, [requestLocale])

  useEffect(() => {
    const controller = new AbortController()
    void refreshState(controller.signal).catch((cause: unknown) => {
      if (!(cause instanceof Error) || cause.name !== 'AbortError') setApiState(null)
    })
    return () => controller.abort()
  }, [refreshState])

  useEffect(() => {
    if (!apiState?.activePrize?.expiresAt) {
      setCountdown('')
      return
    }
    const update = () => {
      const remaining = Date.parse(apiState.activePrize?.expiresAt ?? '') - (Date.now() + serverOffset)
      if (!Number.isFinite(remaining) || remaining <= 0) {
        setCountdown('')
        void refreshState().catch(() => undefined)
        return
      }
      const total = Math.floor(remaining / 1000)
      const pad = (value: number) => String(value).padStart(2, '0')
      setCountdown(`${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`)
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [apiState?.activePrize?.expiresAt, refreshState, serverOffset])

  async function spin() {
    if (!apiState?.canSpin || busy || !csrfToken) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/roulette/spin', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ requestId: getPendingRequestId(), csrfToken, locale: requestLocale }),
      })
      const result = await response.json() as { prize?: RoulettePrize; error?: string }
      if (!response.ok || !result.prize) {
        if (response.status === 409) {
          const nextState = await refreshState()
          setError(nextState.activePrize ? text.reasons.active_prize : text.reasons[result.error ?? 'spin_unavailable'] ?? text.spinError)
          return
        }
        if (result.error === 'invalid_csrf_token') {
          await refreshState()
        }
        throw new Error(result.error ?? 'spin_failed')
      }
      const finalRotation = prizeRotation(apiState.prizes, result.prize, rotation)
      setRotation(finalRotation)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : 5200))
      const selectedPrize = result.prize
      setApiState((current) => current ? { ...current, canSpin: false, activePrize: selectedPrize } : current)
      try { window.sessionStorage.removeItem('vz-roulette-pending-request') } catch { /* storage can be unavailable */ }
    } catch {
      setError(text.spinError)
    } finally {
      setBusy(false)
    }
  }

  function applyPrize() {
    setDiscountChoice('roulette')
    setOpen(false)
    router.push(localizedPath('/ru/korzina', requestLocale))
  }

  if (!apiState?.visible) return null

  const activePrize = apiState.activePrize
  const reasonMessage = apiState.reason ? text.reasons[apiState.reason] ?? text.reasons.spin_unavailable : ''

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 border border-[#d9d2cd] bg-white px-4 py-2 text-sm font-medium text-[#111] transition-colors hover:border-[#ab8a73] hover:text-[#ab8a73] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ab8a73]"
        onClick={() => { setError(''); setOpen(true) }}
        type="button"
      >
        <RotateCw aria-hidden="true" size={16} /> {text.open}
        {activePrize ? <span aria-label={text.result} className="size-2 rounded-full bg-[#8e1f2d]" /> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4" ref={rootRef}>
          <button aria-label={text.close} className="absolute inset-0 size-full cursor-default" onClick={close} type="button" />
          <section aria-describedby="roulette-description" aria-labelledby="roulette-title" aria-modal="true" className="relative z-[1] grid max-h-[min(760px,94dvh)] w-full max-w-[900px] grid-cols-2 overflow-y-auto bg-white shadow-2xl max-[720px]:max-w-[480px] max-[720px]:grid-cols-1" role="dialog" tabIndex={-1}>
            <div className="flex flex-col p-8 max-[720px]:p-5">
              <div className="mb-7 flex items-start justify-between gap-5">
                <div>
                  <p className="mb-2 text-[11px] font-medium tracking-[0.12em] text-[#8a817b] uppercase">VIZAJE-NICA</p>
                  <h2 className="m-0 text-2xl font-medium" id="roulette-title">{apiState.settings.title || text.title}</h2>
                </div>
                <button aria-label={text.close} className="inline-flex size-9 shrink-0 items-center justify-center text-[#111] transition-colors hover:text-[#ab8a73] focus-visible:outline-2 focus-visible:outline-[#ab8a73]" onClick={close} ref={initialFocusRef} type="button"><X size={21} /></button>
              </div>
              <p className="mb-6 text-sm leading-6 text-[#666]" id="roulette-description">{apiState.settings.description || text.description}</p>

              {activePrize ? (
                <div aria-live="polite" className="border border-[#e8e1dc] bg-[#faf8f6] p-5">
                  <p className="mb-2 text-xs tracking-[0.08em] text-[#88786e] uppercase">{text.result}</p>
                  <h3 className="mb-2 text-xl font-medium">{activePrize.title}</h3>
                  <p className="mb-4 text-sm leading-6 text-[#666]">{text.activeDescription}</p>
                  {countdown ? <p className="mb-4 text-sm tabular-nums">{text.until} {new Date(activePrize.expiresAt ?? '').toLocaleString(locale === 'ro' ? 'ro-MD' : 'ru-MD')} · {countdown}</p> : null}
                  <button className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#111] px-5 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-60" disabled={busy} onClick={applyPrize} type="button">{busy ? text.applied : text.apply} <ArrowRight size={16} /></button>
                </div>
              ) : (
                <div className="mt-auto">
                  {apiState.settings.rules ? <details className="mb-5 text-sm leading-6 text-[#666]"><summary className="cursor-pointer font-medium text-[#111]">{text.rules}</summary><p className="mb-0 whitespace-pre-line pt-3">{apiState.settings.rules}</p></details> : null}
                  {error ? <p className="mb-3 text-sm text-[#8e1f2d]" role="alert">{error}</p> : null}
                  {!apiState.canSpin && reasonMessage ? <p className="mb-3 text-sm text-[#777]" role="status">{reasonMessage}</p> : null}
                  <button className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#111] px-5 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:bg-[#d6d3d1]" disabled={!apiState.canSpin || busy} onClick={() => void spin()} type="button">
                    <RotateCw className={busy ? 'animate-spin' : ''} size={17} /> {busy ? text.spinning : text.spin}
                  </button>
                </div>
              )}
            </div>

            <div className="flex min-h-[380px] flex-col items-center justify-center gap-6 bg-[#f7f5f3] p-8 max-[720px]:min-h-[300px] max-[720px]:p-5">
              {apiState.prizes.length ? (
                <div className="relative flex size-[min(62vw,300px)] max-[720px]:size-[min(74vw,260px)] items-center justify-center">
                  <span aria-hidden="true" className="absolute -top-2 left-1/2 z-[2] -translate-x-1/2 border-x-[13px] border-t-[24px] border-x-transparent border-t-[#8e1f2d]" />
                  <div aria-label={apiState.prizes.map((prize) => prize.title).join(', ')} className="relative size-full rounded-full border-[8px] border-white shadow-[0_8px_28px_rgba(0,0,0,0.15)] transition-transform duration-[5200ms] [transition-timing-function:cubic-bezier(0.12,0.75,0.15,1)] motion-reduce:transition-none" role="img" style={{ background: wheelBackground, transform: `rotate(${rotation}deg)` }}>
                    {apiState.prizes.map((prize, index) => {
                      const priorProbability = apiState.prizes.slice(0, index).reduce((sum, item) => sum + item.probability, 0)
                      const angle = (priorProbability + prize.probability / 2) * 3.6
                      return <span aria-hidden="true" className="absolute top-1/2 left-1/2 max-w-[84px] -translate-x-1/2 -translate-y-1/2 text-center text-[10px] leading-tight font-medium" key={prize.code} style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-100px) rotate(${-angle}deg)`, color: index % 2 === 0 ? 'white' : '#111' }}>{prize.title}</span>
                    })}
                    <span className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#cdbbb0] text-[#111]"><Gift size={20} /></span>
                  </div>
                </div>
              ) : <p className="text-sm text-[#777]">{text.empty}</p>}
              <p className="max-w-[320px] text-center text-xs leading-5 text-[#777]">{apiState.settings.rules || text.description}</p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
