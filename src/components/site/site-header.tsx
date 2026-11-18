'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { localeSwitchPath, localizedPath, type StoreLocale } from '@/lib/locale-routing'
import type { CheckoutCustomerPrefill, CheckoutOptions } from '@/lib/checkout-options'
import type { StoreNavigationLink } from '@/lib/store-navigation'
import { useAccessibleDialog } from '@/lib/use-accessible-dialog'

import { CartHeaderAction, MobileCartTrigger } from './cart-header-action'
import { AuthHeaderAction, MobileAuthTrigger } from './auth-header-action'
import { SearchDrawerContent } from './search-drawer-content'

type HeaderPanel = 'menu' | 'search' | null
type DesktopDrawerMode = 'catalog' | 'search' | 'cart' | 'auth' | null
type MobileMenuItem = StoreNavigationLink & { children?: StoreNavigationLink[] }

const navigation: Record<StoreLocale, { label: string; href: string; activePaths?: string[] }[]> = {
  ru: [
    { label: 'Каталог', href: '/ru/katalog' },
    { label: 'Бренды', href: '/ru/brands' },
    { label: 'Новости', href: '/ru/novosti' },
    { label: 'Магазины', href: '/ru/magazinyi' },
    { label: 'Подарочные сертификаты', href: '/ru/podarochnaya-karta', activePaths: ['/ru/podarochnyie-sertifikatyi'] },
    { label: 'Скидки', href: '/ru/skidki' },
  ],
  ro: [
    { label: 'Catalog', href: '/ro/catalog' },
    { label: 'Branduri', href: '/ro/brands' },
    { label: 'Noutăți', href: '/ro/noutati' },
    { label: 'Magazine', href: '/ro/magazinele' },
    { label: 'Carduri cadou', href: '/ro/card-cadou' },
    { label: 'Reduceri', href: '/ro/reduceri' },
  ],
}

const headerText = {
  ru: {
    freeDelivery: 'Бесплатная доставка от 500 MDL', menu: 'Меню', search: 'Поиск',
    openSearch: 'Открыть поиск', closeMenu: 'Закрыть меню', closeSearch: 'Закрыть поиск',
    searchPlaceholder: 'Товар, бренд или артикул', find: 'Найти', delivery: 'Доставка и оплата',
    logo: 'Vizaje-Nica — главная', favorites: 'Избранное', primaryNav: 'Основная навигация',
    storeNav: 'Разделы магазина', searchInput: 'Поисковый запрос',
  },
  ro: {
    freeDelivery: 'Livrare gratuită pentru comenzile de peste 500 MDL', menu: 'Meniu', search: 'Căutare',
    openSearch: 'Deschide căutarea', closeMenu: 'Închide meniul', closeSearch: 'Închide căutarea',
    searchPlaceholder: 'Produs, brand sau cod', find: 'Caută', delivery: 'Livrare și plată',
    logo: 'Vizaje-Nica — pagina principală', favorites: 'Favorite', primaryNav: 'Navigare principală',
    storeNav: 'Secțiunile magazinului', searchInput: 'Caută un produs',
  },
} as const

const iconButton = 'inline-flex size-10 shrink-0 items-center justify-center bg-transparent text-midnight-ink transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 motion-reduce:transition-none'

function HeaderSearchIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 25 25" stroke="currentColor">
      <path d="m18 18 5 5" fill="none" strokeWidth="1.5" />
      <circle cx="11.5" cy="11.5" r="8.5" fill="none" strokeWidth="1.5" />
    </svg>
  )
}

function isActivePath(pathname: string, href: string, extraPaths: string[] = []) {
  return [href, ...extraPaths].some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

type SiteHeaderProps = {
  navigationItems?: StoreNavigationLink[]
  mobileNavigationItems?: StoreNavigationLink[]
  checkoutOptions?: CheckoutOptions
  checkoutCustomer?: CheckoutCustomerPrefill | null
}

export function SiteHeader({ navigationItems, mobileNavigationItems, checkoutOptions, checkoutCustomer }: SiteHeaderProps = {}) {
  const pathname = usePathname() ?? '/ru'
  const locale: StoreLocale = pathname.startsWith('/ro') ? 'ro' : 'ru'
  const isHomeRoute = pathname === `/${locale}` || pathname === `/${locale}/`
  const isProductDetail = /\/(?:katalog|catalog)\/product(?:\/|$)/.test(pathname)
  const showMobileSearch = !isProductDetail
  const text = headerText[locale]
  const reduceMotion = useReducedMotion()
  const [desktopDrawerMode, setDesktopDrawerMode] = useState<DesktopDrawerMode>(null)
  const [desktopDrawerRenderedMode, setDesktopDrawerRenderedMode] = useState<Exclude<DesktopDrawerMode, null> | null>(null)
  const [desktopDrawerVisible, setDesktopDrawerVisible] = useState(false)
  const desktopDrawerCloseTimer = useRef<number | null>(null)
  const links = navigationItems?.length ? navigationItems : navigation[locale]
  const mobileLinks = mobileNavigationItems?.length ? mobileNavigationItems : links
  const hasLocalizedNavigation = Boolean(navigationItems?.length)
  const catalogHref = localizedPath('/ru/katalog', locale)
  const localizedMobileLinks = mobileLinks
    .map((item) => ({ ...item, href: hasLocalizedNavigation ? item.href : localizedPath(item.href, locale) }))
    .filter((item) => item.href !== catalogHref)
  const catalogChildren = localizedMobileLinks.filter((item) => item.href.startsWith(`${catalogHref}/`))
  const directMobileLinks = localizedMobileLinks.filter((item) => !item.href.startsWith(`${catalogHref}/`))
  const getMenuRole = (item: StoreNavigationLink) => {
    const value = `${item.label} ${item.href}`
    if (/бренд|brand/i.test(value)) return 'brand'
    if (/скид|reduc|sale/i.test(value)) return 'discount'
    if (/promo|акци/i.test(value)) return 'promotion'
    if (/подар|gift|card|сертифик|certificat/i.test(value)) return 'gift'
    return 'other'
  }
  const byRole = (role: string) => directMobileLinks.find((item) => getMenuRole(item) === role)
  const prioritizedMobileLinks = [byRole('brand'), byRole('discount'), byRole('gift')].filter(
    (item): item is StoreNavigationLink => Boolean(item),
  )
  const prioritizedHrefs = new Set(prioritizedMobileLinks.map((item) => item.href))
  const mobileMenuLinks: MobileMenuItem[] = [
    { label: locale === 'ro' ? 'Catalog' : 'Каталог', href: catalogHref, activePaths: [], children: catalogChildren },
    ...prioritizedMobileLinks,
    ...directMobileLinks.filter((item) => !prioritizedHrefs.has(item.href)),
  ]
  const defaultCatalogChildLinks: StoreNavigationLink[] = locale === 'ro'
    ? [
        { label: 'Machiaj', href: '/ro/catalog/machiaj' },
        { label: 'Parfumerie', href: '/ro/catalog/parfumerie' },
        { label: 'Îngrijirea pielii', href: '/ro/catalog/uhod' },
        { label: 'Păr', href: '/ro/catalog/volosyi' },
        { label: 'Bărbați', href: '/ro/catalog/mujchinyi' },
      ]
    : [
        { label: 'Макияж', href: '/ru/katalog/makiyaj' },
        { label: 'Парфюмерия', href: '/ru/katalog/parfyumeriya' },
        { label: 'Уход за кожей', href: '/ru/katalog/uhod' },
        { label: 'Волосы', href: '/ru/katalog/volosyi' },
        { label: 'Мужчины', href: '/ru/katalog/mujchinyi' },
      ]
  const catalogChildLinks = [...links
    .filter((item) => item.href.startsWith(`${catalogHref}/`))
    .filter((item) => !/новост|nout[aă]ți|news/i.test(`${item.label} ${item.href}`)), ...defaultCatalogChildLinks]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index)
  const desktopLinks = [
    { label: locale === 'ro' ? 'Catalog' : 'Каталог', href: catalogHref, activePaths: [] },
    ...links
      .filter((item) => item.href !== catalogHref && !item.href.startsWith(`${catalogHref}/`))
      .filter((item) => !/подар|gift|card|сертифик|certificat/i.test(`${item.label} ${item.href}`))
      .filter((item) => !/новост|nout[aă]ți|news/i.test(`${item.label} ${item.href}`)),
    { label: locale === 'ro' ? 'Carduri cadou' : 'Сертификаты', href: locale === 'ro' ? '/ro/catalog/sertifikatyi' : '/ru/katalog/sertifikatyi' },
  ]
    .map((item) => /подар|gift|card|сертифик|certificat/i.test(`${item.label} ${item.href}`)
      ? { ...item, label: locale === 'ro' ? 'Carduri cadou' : 'Сертификаты' }
      : item)
    .sort((left, right) => {
      const order = (item: StoreNavigationLink) => {
        const value = `${item.label} ${item.href}`
        if (/скид|reduc|sale/i.test(value)) return 1
        if (/подар|gift|card|сертифик|certificat/i.test(value)) return 2
        if (/магаз|magazin|store/i.test(value)) return 3
        if (/бренд|brand/i.test(value)) return 4
        if (/каталог|catalog/i.test(value)) return 5
        return 10
      }
      return order(left) - order(right)
    })
  const [panel, setPanel] = useState<HeaderPanel>(null)
  const [expandedMenuItem, setExpandedMenuItem] = useState<string | null>(null)
  const [isCondensed, setIsCondensed] = useState(false)
  const [heroUnderSearch, setHeroUnderSearch] = useState(isHomeRoute)
  const dialogRef = useRef<HTMLElement | null>(null)
  const initialFocusRef = useRef<HTMLElement | null>(null)
  const openDesktopDrawer = useCallback((mode: Exclude<DesktopDrawerMode, null>) => {
    if (desktopDrawerCloseTimer.current !== null) window.clearTimeout(desktopDrawerCloseTimer.current)
    setDesktopDrawerMode(mode)
    setDesktopDrawerRenderedMode(mode)
    setDesktopDrawerVisible(true)
  }, [])
  const closeDesktopDrawer = useCallback((notify = true) => {
    if (notify) {
      window.dispatchEvent(new CustomEvent('vz:close-cart'))
      window.dispatchEvent(new CustomEvent('vz:close-auth'))
    }
    setDesktopDrawerMode(null)
    setDesktopDrawerVisible(false)
    if (desktopDrawerCloseTimer.current !== null) window.clearTimeout(desktopDrawerCloseTimer.current)
    desktopDrawerCloseTimer.current = window.setTimeout(() => setDesktopDrawerRenderedMode(null), 480)
  }, [])
  useEffect(() => {
    const isDesktopViewport = () => window.matchMedia('(min-width: 601px)').matches
    const onOpenCart = () => { if (isDesktopViewport()) openDesktopDrawer('cart') }
    const onOpenAuth = () => { if (isDesktopViewport()) openDesktopDrawer('auth') }
    const onCartState = (event: Event) => {
      if (!isDesktopViewport()) return
      const isOpen = Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open)
      if (isOpen) openDesktopDrawer('cart')
      else if (desktopDrawerMode === 'cart') closeDesktopDrawer(true)
    }
    const onAuthState = (event: Event) => {
      if (!isDesktopViewport()) return
      const isOpen = Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open)
      if (isOpen) openDesktopDrawer('auth')
      else if (desktopDrawerMode === 'auth') closeDesktopDrawer(true)
    }
    window.addEventListener('vz:open-cart', onOpenCart)
    window.addEventListener('vz:open-auth', onOpenAuth)
    window.addEventListener('vz:cart-drawer-state', onCartState)
    window.addEventListener('vz:auth-drawer-state', onAuthState)
    return () => {
      window.removeEventListener('vz:open-cart', onOpenCart)
      window.removeEventListener('vz:open-auth', onOpenAuth)
      window.removeEventListener('vz:cart-drawer-state', onCartState)
      window.removeEventListener('vz:auth-drawer-state', onAuthState)
      if (desktopDrawerCloseTimer.current !== null) window.clearTimeout(desktopDrawerCloseTimer.current)
    }
  }, [closeDesktopDrawer, desktopDrawerMode, openDesktopDrawer])
  const closePanel = useCallback(() => {
    setPanel(null)
    setExpandedMenuItem(null)
  }, [])

  useEffect(() => {
    setPanel(null)
    setExpandedMenuItem(null)
  }, [pathname])

  useAccessibleDialog({
    open: panel !== null,
    rootRef: dialogRef,
    initialFocusRef,
    onClose: closePanel,
  })

  useEffect(() => {
    let previousY = window.scrollY

    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY <= 0) {
        setIsCondensed(false)
        previousY = currentY
        return
      }

      if (window.innerWidth <= 600) return
      const delta = currentY - previousY
      if (Math.abs(delta) > 4) {
        setIsCondensed(delta > 0)
        previousY = currentY
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isHomeRoute) {
      setHeroUnderSearch(false)
      return
    }

    const hero = document.getElementById('home-hero')
    if (!hero) {
      setHeroUnderSearch(false)
      return
    }

    const updateHeroVisibility = () => {
      const bounds = hero.getBoundingClientRect()
      setHeroUnderSearch(bounds.top <= 0 && bounds.bottom >= 58)
    }

    updateHeroVisibility()
    window.addEventListener('scroll', updateHeroVisibility, { passive: true })
    window.addEventListener('resize', updateHeroVisibility)
    return () => {
      window.removeEventListener('scroll', updateHeroVisibility)
      window.removeEventListener('resize', updateHeroVisibility)
    }
  }, [isHomeRoute, pathname])

  return (
    <header className={`site-header z-[1000] w-full bg-white ${isHomeRoute && heroUnderSearch ? 'max-[600px]:bg-transparent' : ''} min-[601px]:sticky min-[601px]:top-0 ${isCondensed ? 'is-condensed' : ''}`}>
      <div className="fixed right-0 bottom-0 left-0 z-[91] hidden h-[30px] items-center justify-center bg-[#17C1F3] px-5 text-center text-[15px] leading-none font-medium text-white min-[601px]:flex">
        <Link className="rounded-sm focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2" href={localizedPath('/ru/dostavka', locale)}>
          {text.freeDelivery} <span aria-hidden="true" className="ml-1">→</span>
        </Link>
      </div>

      <div className="relative z-[1001] mx-auto grid h-[82px] w-full max-w-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[clamp(20px,2.5vw,48px)] px-5 max-[600px]:hidden min-[1024px]:px-[max(2rem,3.33vw)]">
        <Link className="relative inline-flex h-[35px] w-[174px] items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2" href={`/${locale}`} aria-label={text.logo}>
          <Image
            src="/legacy-assets/app/img/next/header/logo_v.webp"
            alt="Vizaje-Nica"
            width={250}
            height={42}
            priority
            unoptimized
            className="h-full w-full object-contain"
          />
        </Link>

        <nav className="mr-[clamp(25px,2vw,30px)] flex min-w-0 items-center justify-end gap-[clamp(16px,1.65vw,32px)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={text.primaryNav}>
          {desktopLinks.map((item) => {
            const href = hasLocalizedNavigation ? item.href : localizedPath(item.href, locale)
            const activePaths = hasLocalizedNavigation
              ? item.activePaths
              : item.activePaths?.map((path) => localizedPath(path, locale))
            const active = isActivePath(pathname, href, activePaths)
            const value = `${item.label} ${item.href}`
            const isCatalog = /каталог|catalog/i.test(value)
            const isDiscount = /скид|reduc|sale/i.test(value)
            const link = (
              <Link
                className={`relative shrink-0 whitespace-nowrap text-[17px] leading-5 font-medium transition-colors after:absolute after:right-0 after:bottom-[-10px] after:left-0 after:h-px after:origin-right after:scale-x-0 after:content-[''] after:transition-transform after:duration-200 hover:after:origin-left hover:after:scale-x-100 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-4 ${isCatalog ? 'text-[#5B5FEF] after:bg-[#5B5FEF] hover:text-[#4b4fcf]' : isDiscount ? 'text-[#D21F3C] after:bg-[#D21F3C] hover:text-[#b91932]' : 'text-[#000000] after:bg-[#000000] hover:text-[#555555]'} ${active ? 'after:origin-left after:scale-x-100' : ''}`}
                href={href}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
            if (!isCatalog) return <span key={href}>{link}</span>
            return (
              <div className="group relative shrink-0" key={href} onMouseEnter={() => openDesktopDrawer('catalog')} onMouseLeave={() => {
                if (desktopDrawerMode !== 'catalog') return
                if (desktopDrawerCloseTimer.current !== null) window.clearTimeout(desktopDrawerCloseTimer.current)
                desktopDrawerCloseTimer.current = window.setTimeout(() => closeDesktopDrawer(false), 180)
              }}>
                {link}
              </div>
            )
          })}
        </nav>

        <div className="flex items-center justify-self-end gap-[17px]">
          {!isProductDetail ? (
            <button className={iconButton} type="button" onClick={() => openDesktopDrawer('search')} aria-label={text.openSearch} aria-haspopup="dialog" aria-expanded={desktopDrawerMode === 'search'} aria-controls="site-search-panel" title={text.search}>
              <HeaderSearchIcon className="size-[20px]" />
            </button>
          ) : null}
          <AuthHeaderAction locale={locale} drawerTargetId="site-desktop-auth-drawer" />
          <CartHeaderAction locale={locale} drawerTargetId="site-desktop-cart-drawer" checkoutOptions={checkoutOptions} checkoutCustomer={checkoutCustomer} />
          <div className="inline-flex h-10 items-center gap-1 rounded-full bg-[#F4F5F6] px-3 text-[13px] font-medium">
            <Globe className="text-[#5B5FEF]" size={17} strokeWidth={1.5} aria-hidden="true" />
            <Link className={locale === 'ru' ? 'text-[#5B5FEF]' : 'text-black/40'} href={localeSwitchPath(pathname, 'ru')} aria-current={locale === 'ru' ? 'page' : undefined}>RU</Link>
            <span className="text-black/25" aria-hidden="true">/</span>
            <Link className={locale === 'ro' ? 'text-[#5B5FEF]' : 'text-black/40'} href={localeSwitchPath(pathname, 'ro')} aria-current={locale === 'ro' ? 'page' : undefined}>RO</Link>
          </div>
        </div>
      </div>

      <nav className="hidden" aria-hidden="true" />

      {desktopDrawerRenderedMode ? (
        <div className={`fixed inset-0 z-[120] hidden min-[601px]:block ${desktopDrawerVisible ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!desktopDrawerVisible}>
          <button className={`absolute inset-0 bg-[rgba(17,17,17,0.38)] transition-opacity duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${desktopDrawerVisible ? 'opacity-100' : 'opacity-0'}`} type="button" onClick={() => closeDesktopDrawer()} aria-label={text.closeSearch} tabIndex={desktopDrawerVisible ? 0 : -1} />
          <aside className={`absolute top-0 right-0 h-full w-[48vw] max-w-none bg-white shadow-[-20px_0_60px_rgba(17,17,17,0.1)] transition-transform duration-[480ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${desktopDrawerVisible ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true" aria-label={text.primaryNav} onMouseLeave={() => { if (desktopDrawerMode === 'catalog') closeDesktopDrawer(false) }}>
            <div className="relative h-full overflow-hidden">
              <div className={`absolute inset-0 overflow-y-auto transition-[opacity,transform] duration-300 ease-out ${desktopDrawerRenderedMode === 'catalog' && desktopDrawerMode === 'catalog' ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-5 opacity-0'}`} onMouseEnter={() => openDesktopDrawer('catalog')}>
                <div className="flex min-h-full flex-col px-[clamp(32px,3.5vw,68px)] pt-[clamp(140px,15vh,180px)] pb-12">
                  <div className="flex flex-col items-start gap-1">
                    <Link className="text-[clamp(30px,2.3vw,42px)] leading-[1.1] font-medium text-black transition-colors hover:text-[#5B5FEF]" href={catalogHref}>{locale === 'ro' ? 'Vezi tot' : 'Смотреть всё'}</Link>
                    {catalogChildLinks.map((child) => {
                      const childHref = hasLocalizedNavigation ? child.href : localizedPath(child.href, locale)
                      return <Link className="text-[clamp(30px,2.3vw,42px)] leading-[1.1] font-medium text-black transition-colors hover:text-[#5B5FEF]" href={childHref} key={childHref}>{child.label}</Link>
                    })}
                  </div>
                  <div className="mt-auto flex flex-col items-start gap-2 pt-20 text-[17px] text-black">
                    <Link href={localizedPath('/ru/orders', locale)}>{locale === 'ro' ? 'Starea comenzii' : 'Статус заказа'}</Link>
                    <Link href={localizedPath('/ru/magazinyi', locale)}>{locale === 'ro' ? 'Găsește un magazin' : 'Магазины'}</Link>
                    <Link href={localizedPath('/ru/dostavka', locale)}>{locale === 'ro' ? 'Ajutor și suport' : 'Помощь и поддержка'}</Link>
                  </div>
                </div>
              </div>

              <div className={`absolute inset-0 overflow-y-auto bg-white transition-[opacity,transform] duration-300 ease-out ${desktopDrawerRenderedMode === 'search' && desktopDrawerMode === 'search' ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-5 opacity-0'}`}>
                <div className="flex min-h-full flex-col px-10 pt-6 pb-8">
                  <div className="mb-8 flex items-center justify-end border-b border-midnight-ink/10 pb-4">
                    <button className={iconButton} type="button" onClick={() => { closePanel(); closeDesktopDrawer() }} aria-label={text.closeSearch}><X size={21} /></button>
                  </div>
                  <SearchDrawerContent locale={locale} inputRef={(element) => { initialFocusRef.current = element }} onSubmit={() => { closePanel(); closeDesktopDrawer() }} />
                </div>
              </div>

              <div className={`absolute inset-0 transition-[opacity,transform] duration-300 ease-out ${desktopDrawerRenderedMode === 'cart' && desktopDrawerMode === 'cart' ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-5 opacity-0'}`} id="site-desktop-cart-drawer" />
              <div className={`absolute inset-0 transition-[opacity,transform] duration-300 ease-out ${desktopDrawerRenderedMode === 'auth' && desktopDrawerMode === 'auth' ? 'pointer-events-auto translate-x-0 opacity-100' : 'pointer-events-none translate-x-5 opacity-0'}`} id="site-desktop-auth-drawer" />
            </div>
          </aside>
        </div>
      ) : null}

      {showMobileSearch ? (
        <>
          {!isHomeRoute ? <div className="h-[58px] min-[601px]:hidden" aria-hidden="true" /> : null}
          <div className={`fixed inset-x-0 top-0 z-[95] flex h-[58px] items-center px-[28px] transition-colors min-[601px]:hidden ${isHomeRoute && heroUnderSearch ? 'border-b border-white/70 bg-transparent' : 'border-b border-[#c3c3c3] bg-white'}`}>
            <button
              className={`flex h-full w-full items-center justify-start text-left focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[-3px] ${isHomeRoute && heroUnderSearch ? 'text-white opacity-70 mix-blend-difference' : 'text-midnight-ink'}`}
              type="button"
              onClick={() => setPanel('search')}
              aria-label={text.openSearch}
              aria-haspopup="dialog"
              aria-expanded={panel === 'search'}
              aria-controls="site-search-panel"
            >
              <span className="inline-flex items-center gap-[10px]">
                <Search className={`size-[25px] shrink-0 ${isHomeRoute && heroUnderSearch ? '' : 'text-[#c3c3c3]'}`} strokeWidth={1.7} aria-hidden="true" />
                <span className={`text-[20px] leading-none font-semibold tracking-[.04em] uppercase ${isHomeRoute && heroUnderSearch ? '' : 'text-[#c3c3c3]'}`}>{locale === 'ro' ? 'Căutare' : 'Поиск'}</span>
              </span>
            </button>
          </div>
        </>
      ) : null}

      <div className={`${panel === 'menu' ? 'hidden' : 'flex'} fixed right-0 bottom-[calc(72px_+_env(safe-area-inset-bottom))] left-0 z-[9] h-[30px] items-center justify-center bg-[#17C1F3] px-3 text-center text-[10px] leading-none text-white min-[601px]:hidden`}>
        <Link href={localizedPath('/ru/dostavka', locale)}>{text.freeDelivery} <span aria-hidden="true">→</span></Link>
      </div>

      <nav className="fixed right-0 bottom-0 left-0 z-[10] grid min-h-[calc(72px_+_env(safe-area-inset-bottom))] grid-cols-5 items-center border-t border-[#f2f2f2] bg-white px-3 pt-2 pb-[calc(8px_+_env(safe-area-inset-bottom))] text-midnight-ink min-[601px]:hidden" aria-label={text.primaryNav}>
        <button
          className={`inline-flex min-h-[50px] min-w-0 flex-col items-center justify-center gap-[2px] px-1 py-[3px] text-center transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[-2px] ${isActivePath(pathname, localizedPath('/ru/katalog', locale)) ? 'text-hover-cream' : ''}`}
          type="button"
          onClick={() => setPanel((current) => current === 'menu' ? null : 'menu')}
          aria-label={locale === 'ro' ? 'Catalog' : 'Каталог'}
          aria-haspopup="dialog"
          aria-expanded={panel === 'menu'}
          aria-controls="site-mobile-menu"
        >
          <span aria-hidden="true" className="block size-[29px] shrink-0 bg-current [mask-image:url('/legacy-assets/app/img/icons/mobile-tabbar-search.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />
          <span className="text-[9px] leading-[1.1] font-medium whitespace-nowrap">{locale === 'ro' ? 'Catalog' : 'Каталог'}</span>
        </button>
        <Link
          className={`inline-flex min-h-[50px] min-w-0 flex-col items-center justify-center gap-[2px] px-1 py-[3px] text-center transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[-2px] ${isActivePath(pathname, localizedPath('/ru/izbrannyie', locale), [localizedPath('/ru/wishlist', locale)]) ? 'text-hover-cream' : ''}`}
          href={localizedPath('/ru/izbrannyie', locale)}
          aria-label={text.favorites}
          aria-current={isActivePath(pathname, localizedPath('/ru/izbrannyie', locale), [localizedPath('/ru/wishlist', locale)]) ? 'page' : undefined}
        >
          <span aria-hidden="true" className="block size-[29px] shrink-0 bg-current [mask-image:url('/legacy-assets/app/img/icons/mobile-tabbar-wishlist.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />
          <span className="text-[9px] leading-[1.1] font-medium whitespace-nowrap">{locale === 'ro' ? 'Favorite' : 'Избранное'}</span>
        </Link>
        <Link className={`inline-flex min-h-[50px] items-center justify-center rounded-sm text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[-2px] ${pathname === `/${locale}` ? 'text-hover-cream' : ''}`} href={`/${locale}`} aria-label={text.logo} aria-current={pathname === `/${locale}` ? 'page' : undefined}>
          <span aria-hidden="true" className="block size-[33px] shrink-0 bg-current [mask-image:url('/legacy-assets/app/img/mini-logo.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />
        </Link>
        <MobileAuthTrigger locale={locale} active={isActivePath(pathname, localizedPath('/ru/account', locale))} />
        <MobileCartTrigger locale={locale} active={isActivePath(pathname, localizedPath('/ru/cart', locale), [localizedPath('/ru/cos', locale)])} />
      </nav>

      <AnimatePresence initial={false} mode="wait">
      {panel === 'menu' ? (
        <motion.div
          key="menu"
          className="fixed inset-x-0 top-0 bottom-[calc(72px_+_env(safe-area-inset-bottom))] z-[120] bg-black/30 min-[601px]:hidden"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className="absolute inset-0 size-full cursor-default" type="button" onClick={closePanel} aria-label={text.closeMenu} aria-hidden="true" tabIndex={-1} />
          <motion.aside
            ref={dialogRef}
            className="relative flex h-full w-full flex-col overflow-y-auto bg-white px-6 pt-4 pb-8"
            id="site-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={text.storeNav}
            tabIndex={-1}
            initial={reduceMotion ? { x: 0 } : { x: '-100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { x: 0 } : { x: '-100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="border-b border-midnight-ink/10 pb-4">
              <button
                className="flex h-[58px] w-full items-center justify-start text-left text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[-3px]"
                type="button"
                onClick={() => setPanel('search')}
                aria-label={text.openSearch}
                aria-haspopup="dialog"
                aria-expanded={false}
                aria-controls="site-search-panel"
              >
                <span className="inline-flex items-center gap-[10px]">
                  <Search className="size-[25px] shrink-0 text-[#c3c3c3]" strokeWidth={1.7} aria-hidden="true" />
                  <span className="text-[20px] leading-none font-semibold tracking-[.04em] text-[#c3c3c3] uppercase">{locale === 'ro' ? 'Căutare' : 'Поиск'}</span>
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 border-b border-midnight-ink/10 py-4 text-sm">
              <Globe size={17} aria-hidden="true" />
              <Link className={locale === 'ru' ? 'font-medium' : 'text-graphite'} href={localeSwitchPath(pathname, 'ru')} aria-current={locale === 'ru' ? 'page' : undefined} onClick={closePanel}>RU</Link>
              <span aria-hidden="true" className="text-midnight-ink/30">/</span>
              <Link className={locale === 'ro' ? 'font-medium' : 'text-graphite'} href={localeSwitchPath(pathname, 'ro')} aria-current={locale === 'ro' ? 'page' : undefined} onClick={closePanel}>RO</Link>
            </div>
            <nav className="flex flex-col" aria-label={text.storeNav}>
              {mobileMenuLinks.map((item) => {
                const active = isActivePath(pathname, item.href, item.activePaths)
                const hasChildren = Boolean(item.children?.length)
                const isExpanded = expandedMenuItem === item.href
                const isLargeItem = item.href === catalogHref || ['brand', 'discount', 'promotion'].includes(getMenuRole(item))
                const rowClass = `flex min-h-[58px] w-full items-center justify-between gap-4 border-b border-midnight-ink/10 py-4 text-left font-medium transition-colors hover:text-[#ab8a73] ${isLargeItem ? 'text-[26px]' : 'text-[22px]'} ${active ? 'text-[#872b3a]' : ''}`
                return (
                  <div key={`${item.href}-${item.label}`}>
                    {hasChildren ? (
                      <button
                        className={rowClass}
                        type="button"
                        onClick={() => setExpandedMenuItem(isExpanded ? null : item.href)}
                        aria-expanded={isExpanded}
                      >
                        <span>{item.label}</span>
                        <span aria-hidden="true" className={`text-[24px] leading-none transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                      </button>
                    ) : (
                      <Link className={rowClass} href={item.href} aria-current={active ? 'page' : undefined} onClick={closePanel}>
                        <span className={getMenuRole(item) === 'discount' ? 'text-[#d11f35]' : ''}>{item.label}</span>
                      </Link>
                    )}
                    <AnimatePresence initial={false}>
                      {isExpanded ? (
                        <motion.div
                          className="overflow-hidden border-b border-midnight-ink/10 pl-4"
                          initial={reduceMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={reduceMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.36, ease: [0.16, 1, 0.3, 1] }}
                        >
                          {item.children?.map((child) => {
                            const childActive = isActivePath(pathname, child.href, child.activePaths)
                            return <Link className={`flex min-h-[50px] items-center border-b border-midnight-ink/10 py-3 text-[22px] font-medium last:border-b-0 ${childActive ? 'text-[#872b3a]' : ''}`} href={child.href} key={`${child.href}-${child.label}`} aria-current={childActive ? 'page' : undefined} onClick={closePanel}>{child.label}</Link>
                          })}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                )
              })}
            </nav>
            <div className="mt-2 flex flex-col">
              {[
                { label: locale === 'ro' ? 'Contacte' : 'Контакты', href: localizedPath('/ru/kontaktyi', locale) },
              ].map((item) => <Link className="border-b border-midnight-ink/10 py-4 text-[22px] font-medium" href={item.href} key={item.href} onClick={closePanel}>{item.label}</Link>)}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}

      {panel === 'search' ? (
        <motion.div
          key="search"
          className="fixed inset-0 z-[120] hidden justify-end bg-[rgba(17,17,17,0.38)] max-[600px]:flex"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className="absolute inset-0 size-full cursor-default" type="button" onClick={closePanel} aria-label={text.closeSearch} aria-hidden="true" tabIndex={-1} />
          <motion.aside
            ref={dialogRef}
            className="relative flex h-full w-full flex-col bg-white px-6 pt-6 pb-8 shadow-xl min-[992px]:w-[48vw] min-[992px]:max-w-none min-[992px]:px-10 max-[767px]:px-5 max-[767px]:pt-4"
            id="site-search-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-panel-title"
            tabIndex={-1}
            initial={reduceMotion ? { x: 0 } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduceMotion ? { x: 0 } : { x: '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-8 flex items-center justify-between border-b border-midnight-ink/10 pb-4 max-[767px]:mb-4 max-[767px]:border-0 max-[767px]:pb-0">
              <h2 className="m-0 text-lg font-medium max-[767px]:sr-only" id="search-panel-title">{text.search}</h2>
              <button className={`${iconButton} max-[767px]:fixed max-[767px]:right-4 max-[767px]:bottom-[calc(16px_+_env(safe-area-inset-bottom))] max-[767px]:z-10 max-[767px]:size-12 max-[767px]:rounded-full max-[767px]:bg-[#111] max-[767px]:text-white max-[767px]:shadow-lg`} type="button" onClick={closePanel} aria-label={text.closeSearch}><X size={21} /></button>
            </div>
            <SearchDrawerContent locale={locale} inputRef={(element) => { initialFocusRef.current = element }} onSubmit={closePanel} />
          </motion.aside>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </header>
  )
}
