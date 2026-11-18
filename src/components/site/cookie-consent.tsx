'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type PanInfo, useDragControls, useReducedMotion } from 'motion/react'

import { getPathLocale, localizedPath } from '@/lib/locale-routing'

export type CookieConsentState = {
  functional: boolean
  analytics: boolean
  marketing: boolean
}

type CookieConsentProps = {
  initialConsent: CookieConsentState | null
}

const classes = {
  banner: 'fixed bottom-6 left-6 z-[9998] w-[min(390px,calc(100vw-48px))] overflow-y-auto rounded-[15px] border border-fog bg-white text-midnight-ink shadow-[0_12px_35px_rgb(0_0_0_/_14%)] transition-opacity duration-200 max-[600px]:right-3 max-[600px]:bottom-[calc(88px_+_env(safe-area-inset-bottom,0px)_+_12px)] max-[600px]:left-3 max-[600px]:w-auto max-[600px]:max-h-[calc(100dvh_-_88px_-_env(safe-area-inset-bottom,0px)_-_32px)]',
  bannerContent: 'flex flex-col items-stretch px-[17px] pt-4 pb-[13px] max-[767px]:px-[17px] max-[767px]:pt-[17px] max-[767px]:pb-[15px] max-[767px]:text-left',
  bannerText: 'flex flex-col gap-[5px] text-[10px] leading-[1.4] text-midnight-ink max-[767px]:text-[13px] max-[767px]:leading-[1.45]',
  bannerTitle: 'text-xs leading-[1.3] font-semibold max-[767px]:text-sm',
  bannerDescription: 'text-graphite',
  bannerPrivacyLink: 'text-inherit underline decoration-1 underline-offset-2',
  bannerActions: 'mt-[13px] flex w-full items-center gap-[7px] max-[767px]:mt-[14px]',
  bannerButton: 'inline-flex h-8 min-w-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-[10px] font-medium transition-[opacity,background-color] duration-200 disabled:cursor-wait disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 motion-reduce:transition-none max-[767px]:flex-[1_1_auto] max-[767px]:px-[9px] max-[767px]:text-[11px]',
  bannerSecondary: 'border border-fog bg-white text-midnight-ink hover:border-hover-cream hover:bg-button-hover',
  bannerPrimary: 'ml-auto min-w-[100px] border border-midnight-ink bg-midnight-ink text-white hover:border-hover-cream hover:bg-button-hover hover:text-midnight-ink max-[767px]:ml-0 max-[767px]:min-w-0',
  settingsButton: 'inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-fog bg-white p-0 text-midnight-ink transition-colors hover:border-hover-cream hover:bg-button-hover disabled:cursor-wait disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 max-[767px]:size-9',
  panel: 'fixed right-[14px] bottom-[14px] z-[1000001] w-[min(690px,calc(100vw-28px))] p-0 pointer-events-none max-[767px]:inset-0 max-[767px]:h-full max-[767px]:w-full',
  panelCard: 'relative max-h-[min(650px,calc(100dvh-28px))] w-full overflow-hidden rounded-dialog border border-midnight-ink/[.09] bg-white shadow-[0_18px_55px_rgb(17_17_17_/_20%)] pointer-events-auto max-[767px]:absolute max-[767px]:right-0 max-[767px]:bottom-0 max-[767px]:left-0 max-[767px]:max-h-[calc(100dvh-16px-env(safe-area-inset-bottom,0px))] max-[767px]:rounded-t-[24px] max-[767px]:rounded-b-none max-[767px]:border-x-0 max-[767px]:border-b-0 max-[767px]:shadow-[0_-16px_45px_rgb(17_17_17_/_20%)]',
  panelClose: 'absolute top-[14px] right-4 z-20 inline-flex size-8 items-center justify-center bg-transparent p-0 text-midnight-ink transition-colors hover:text-hover-cream disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-1 max-[767px]:top-2.5 max-[767px]:right-3',
  panelContent: 'max-h-[min(650px,calc(100dvh-28px))] overflow-y-auto overscroll-contain px-7 pt-[22px] max-[767px]:max-h-[calc(100dvh-16px-env(safe-area-inset-bottom,0px))] max-[767px]:px-[18px] max-[767px]:pt-5',
  panelHeader: 'flex min-h-8 items-center gap-[22px] border-b border-fog pr-10 max-[767px]:gap-[14px] max-[767px]:pr-9',
  panelTitle: 'm-0 border-b-2 border-midnight-ink pb-2.5 text-xl leading-[1.3] font-semibold tracking-[-.03em] text-midnight-ink max-[767px]:text-lg',
  panelAbout: 'pb-2.5 text-[13px] text-graphite no-underline transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 max-[767px]:text-xs',
  panelDescription: 'mt-4 max-w-[620px] text-sm leading-[1.5] text-graphite max-[767px]:mt-[14px] max-[767px]:text-[13px]',
  categories: 'mt-[18px] flex flex-col max-[767px]:mt-[14px]',
  category: 'border-b border-fog py-4 first:pt-2.5 max-[767px]:py-[15px] max-[767px]:first:pt-2',
  categoryHead: 'flex items-center justify-between gap-4',
  categoryName: 'text-sm leading-[1.3] font-medium text-midnight-ink',
  categoryDescription: 'mt-[7px] max-w-[590px] text-xs leading-[1.5] text-graphite',
  alwaysOn: 'relative block h-6 w-[42px] shrink-0 rounded-full bg-button-hover',
  toggle: 'relative block h-6 w-[42px] shrink-0 cursor-pointer',
  toggleInput: 'peer sr-only',
  toggleTrack: "absolute inset-0 rounded-full bg-silver transition-colors after:absolute after:top-[3px] after:left-[3px] after:size-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgb(0_0_0_/_25%)] after:content-[''] after:transition-transform peer-checked:bg-button-hover peer-checked:after:bg-midnight-ink peer-checked:after:translate-x-[18px] peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-hover-cream peer-focus-visible:outline-offset-2 motion-reduce:transition-none",
  panelActions: 'sticky bottom-0 mt-[18px] -mx-7 flex items-center gap-2.5 border-t border-fog bg-white/[.98] px-7 pt-4 pb-[calc(18px+env(safe-area-inset-bottom,0px))] max-[767px]:-mx-[18px] max-[767px]:px-[18px] max-[767px]:pt-[13px] max-[767px]:pb-[calc(14px+env(safe-area-inset-bottom,0px))]',
  panelButton: 'inline-flex min-h-11 w-auto min-w-[132px] items-center justify-center rounded-lg px-5 py-[11px] text-[13px] font-medium transition-[background-color,color,border-color] duration-[180ms] disabled:cursor-wait disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 motion-reduce:transition-none max-[767px]:min-w-0 max-[767px]:flex-1 max-[767px]:px-3 max-[767px]:text-xs',
  panelSecondary: 'border border-fog bg-white text-midnight-ink hover:border-hover-cream hover:bg-button-hover',
  panelPrimary: 'ml-auto border border-midnight-ink bg-midnight-ink text-white hover:border-hover-cream hover:bg-button-hover hover:text-midnight-ink max-[767px]:ml-0',
} as const

async function saveConsent(value: CookieConsentState) {
  const response = await fetch('/api/cookie-consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      functional: value.functional ? '1' : '0',
      analytics: value.analytics ? '1' : '0',
      marketing: value.marketing ? '1' : '0',
    }),
  })

  if (!response.ok) throw new Error('Не удалось сохранить настройки cookie')
}

export function CookieConsent({ initialConsent }: CookieConsentProps) {
  const pathname = usePathname()
  const router = useRouter()
  const locale = getPathLocale(pathname)
  const privacyHref = localizedPath('/ru/politika-konfidentsialnosti-i-cookies', locale)
  const text = locale === 'ro'
    ? {
        bannerTitle: 'Respectăm confidențialitatea ta',
        bannerDescription: 'Folosim cookie-uri pentru personalizarea conținutului și a reclamelor, pentru funcțiile rețelelor sociale și pentru analiza traficului nostru.',
        privacy: 'Politica de confidențialitate și cookie-uri', decline: 'Respinge toate', settings: 'Setări', accept: 'Acceptă toate',
        close: 'Închide setările cookie', title: 'Setări cookie', about: 'Despre cookie-uri',
        choose: 'Alege ce cookie-uri permiți. Cookie-urile strict necesare nu pot fi dezactivate, deoarece sunt esențiale pentru funcțiile de bază ale site-ului.',
        essential: 'Strict necesare', essentialDescription: 'Necesare pentru funcționarea site-ului, inclusiv sesiunea și coșul. Sunt mereu active.',
        functional: 'Funcționale', functionalDescription: 'Oferă funcții suplimentare și ne ajută să reținem preferințele tale.',
        analytics: 'Analitice', analyticsDescription: 'Google Analytics și Microsoft Clarity ne ajută să înțelegem cum este folosit site-ul și cum îl putem îmbunătăți.',
        marketing: 'Marketing', marketingDescription: 'Măsoară eficiența campaniilor și ajută la afișarea reclamelor relevante când tehnologiile de marketing sunt activate.',
        save: 'Salvează selecția', alwaysOn: 'Mereu activ',
      }
    : {
        bannerTitle: 'Мы ценим вашу конфиденциальность',
        bannerDescription: 'Мы используем файлы cookie для персонализации контента и рекламы, предоставления функций социальных сетей и анализа нашего трафика.',
        privacy: 'Политика конфиденциальности и cookies', decline: 'Отклонить всё', settings: 'Настроить', accept: 'Принять всё',
        close: 'Закрыть настройки cookie', title: 'Настройки cookie', about: 'О cookies',
        choose: 'Выберите, какие cookie разрешить. Строго необходимые cookie нельзя отключить, так как они нужны для основных функций сайта.',
        essential: 'Строго необходимые', essentialDescription: 'Нужны для основной работы сайта, включая сессию и корзину. Всегда активны.',
        functional: 'Функциональные', functionalDescription: 'Обеспечивают дополнительные функции сайта и помогают запоминать ваши предпочтения.',
        analytics: 'Аналитика', analyticsDescription: 'Google Analytics и Microsoft Clarity помогают понять, как посетители используют сайт, и улучшать его работу.',
        marketing: 'Маркетинг', marketingDescription: 'Помогают измерять эффективность рекламных кампаний и показывать более релевантную рекламу при включённых маркетинговых технологиях.',
        save: 'Сохранить выбор', alwaysOn: 'Всегда активно',
      }
  const [panelOpen, setPanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null)
  const panelCloseButtonRef = useRef<HTMLButtonElement | null>(null)
  const panelOpenerRef = useRef<HTMLElement | null>(null)
  const wasPanelOpenRef = useRef(false)
  const dragControls = useDragControls()
  const reduceMotion = useReducedMotion()
  const [value, setValue] = useState<CookieConsentState>(
    initialConsent ?? { functional: false, analytics: false, marketing: false },
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const updateViewport = () => setIsMobileViewport(media.matches)
    updateViewport()
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    const openSettings = (event: MouseEvent) => {
      const trigger = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-cookie-action="settings"]')
        : null
      if (!trigger) return
      panelOpenerRef.current = trigger
      trigger.setAttribute('aria-expanded', 'true')
      setPanelOpen(true)
    }

    document.addEventListener('click', openSettings)
    return () => document.removeEventListener('click', openSettings)
  }, [])

  useEffect(() => {
    if (panelOpen) {
      wasPanelOpenRef.current = true
      const focusFrame = window.requestAnimationFrame(() => panelCloseButtonRef.current?.focus())
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        setPanelOpen(false)
      }
      document.addEventListener('keydown', closeOnEscape)
      return () => {
        window.cancelAnimationFrame(focusFrame)
        document.removeEventListener('keydown', closeOnEscape)
      }
    }

    if (!wasPanelOpenRef.current) return
    wasPanelOpenRef.current = false

    const frame = window.requestAnimationFrame(() => {
      const opener = panelOpenerRef.current
      const target = opener?.isConnected && opener.getClientRects().length
        ? opener
        : settingsButtonRef.current
      opener?.setAttribute('aria-expanded', 'false')
      target?.focus()
      panelOpenerRef.current = null
    })
    return () => window.cancelAnimationFrame(frame)
  }, [panelOpen])

  const openSettings = (trigger: HTMLElement) => {
    panelOpenerRef.current = trigger
    trigger.setAttribute('aria-expanded', 'true')
    setPanelOpen(true)
  }

  const submit = async (nextValue: CookieConsentState) => {
    if (saving) return
    setSaving(true)
    try {
      await saveConsent(nextValue)
      router.refresh()
    } catch {
      setSaving(false)
    }
  }

  const updateToggle = (key: keyof CookieConsentState, checked: boolean) => {
    setValue((current) => ({ ...current, [key]: checked }))
  }

  const handlePanelDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) setPanelOpen(false)
  }

  const showBanner = initialConsent === null

  if (pathname?.endsWith('/b2b') || pathname === '/get-app') return null

  return (
    <>
      {showBanner ? (
        <div className={`${classes.banner} ${panelOpen ? 'pointer-events-none opacity-0' : 'opacity-100'}`} data-cookie-banner aria-hidden={panelOpen} inert={panelOpen}>
          <div className={classes.bannerContent}>
            <div className={classes.bannerText}>
              <strong className={classes.bannerTitle}>{text.bannerTitle}</strong>
              <span className="text-graphite">
                {text.bannerDescription}{' '}
                <a className={classes.bannerPrivacyLink} href={privacyHref}>{text.privacy}</a>
              </span>
            </div>
            <div className={classes.bannerActions}>
              <button
                type="button"
                className={`${classes.bannerButton} ${classes.bannerSecondary}`}
                disabled={saving}
                onClick={() => submit({ functional: false, analytics: false, marketing: false })}
              >
                {text.decline}
              </button>
              <button
                type="button"
                className={classes.settingsButton}
                ref={settingsButtonRef}
                aria-label={text.settings}
                aria-expanded={panelOpen}
                aria-controls="cookie-settings-panel"
                title={text.settings}
                disabled={saving}
                onClick={(event) => openSettings(event.currentTarget)}
              >
                <SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.7} />
              </button>
              <button
                type="button"
                className={`${classes.bannerButton} ${classes.bannerPrimary}`}
                disabled={saving}
                onClick={() => submit({ functional: true, analytics: true, marketing: true })}
              >
                {text.accept}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {panelOpen ? (
          <motion.div
            className={classes.panel}
            id="cookie-settings-panel"
            data-cookie-panel
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1, y: 0 } : isMobileViewport ? { opacity: 0, y: '100%' } : { opacity: 0, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              aria-label={text.close}
              className="pointer-events-auto absolute inset-0 hidden bg-black/30 transition-opacity min-[768px]:hidden max-[767px]:block"
              onClick={() => setPanelOpen(false)}
            />
            <motion.div
              className={classes.panelCard}
              role="region"
              aria-labelledby="cookiePanelTitle"
              initial={reduceMotion ? { y: 0 } : isMobileViewport ? { y: '100%' } : { y: 14 }}
              animate={{ y: 0 }}
              exit={reduceMotion ? { y: 0 } : isMobileViewport ? { y: '100%' } : { y: 14 }}
              transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
              drag={isMobileViewport ? 'y' : false}
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={isMobileViewport ? handlePanelDragEnd : undefined}
            >
          <div className="hidden touch-none justify-center pt-3 max-[767px]:flex" onPointerDown={(event) => dragControls.start(event)}>
            <span className="h-1 w-10 rounded-full bg-black/20" />
          </div>
          <button
            type="button"
            className={classes.panelClose}
            ref={panelCloseButtonRef}
            aria-label={text.close}
            disabled={saving}
            onClick={() => setPanelOpen(false)}
          >
            <X aria-hidden="true" size={20} strokeWidth={1.5} />
          </button>

          <div className={classes.panelContent}>
            <div className={classes.panelHeader}>
              <h2 className={classes.panelTitle} id="cookiePanelTitle">{text.title}</h2>
              <a className={classes.panelAbout} href={privacyHref}>{text.about}</a>
            </div>
            <p className={classes.panelDescription}>
              {text.choose}
            </p>

            <div className={classes.categories}>
              <CookieCategory
                name={text.essential}
                description={text.essentialDescription}
                alwaysOn
                alwaysOnLabel={text.alwaysOn}
              />
              <CookieCategory
                name={text.functional}
                description={text.functionalDescription}
                checked={value.functional}
                disabled={saving}
                onChange={(checked) => updateToggle('functional', checked)}
              />
              <CookieCategory
                name={text.analytics}
                description={text.analyticsDescription}
                checked={value.analytics}
                disabled={saving}
                onChange={(checked) => updateToggle('analytics', checked)}
              />
              <CookieCategory
                name={text.marketing}
                description={text.marketingDescription}
                checked={value.marketing}
                disabled={saving}
                onChange={(checked) => updateToggle('marketing', checked)}
              />
            </div>

            <div className={classes.panelActions}>
              <button
                type="button"
                className={`${classes.panelButton} ${classes.panelSecondary}`}
                disabled={saving}
                onClick={() => submit({ functional: false, analytics: false, marketing: false })}
              >
                {text.decline}
              </button>
              <button
                type="button"
                className={`${classes.panelButton} ${classes.panelPrimary}`}
                disabled={saving}
                onClick={() => submit(value)}
              >
                {text.save}
              </button>
            </div>
          </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

function CookieCategory({
  name,
  description,
  alwaysOn = false,
  alwaysOnLabel = 'Always on',
  checked = false,
  disabled = false,
  onChange,
}: {
  name: string
  description: string
  alwaysOn?: boolean
  alwaysOnLabel?: string
  checked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <div className={classes.category}>
      <div className={classes.categoryHead}>
        <span className={classes.categoryName}>{name}</span>
        {alwaysOn ? (
          <span className={classes.alwaysOn} aria-label={alwaysOnLabel}>
            <span className="absolute top-[3px] right-[3px] size-[18px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0_/_25%)]" />
          </span>
        ) : (
          <label className={classes.toggle}>
            <input
              className={classes.toggleInput}
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(event) => onChange?.(event.target.checked)}
            />
            <span className={classes.toggleTrack} />
          </label>
        )}
      </div>
      <p className={classes.categoryDescription}>{description}</p>
    </div>
  )
}
