'use client'

import {
  BarChart3,
  FileText,
  Gift,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Package,
  PackageSearch,
  Palette,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

type NavigationGroup = {
  label: string
  items: { label: string; icon: LucideIcon; href?: string }[]
}

const navigationGroups: NavigationGroup[] = [
  {
    label: 'Магазин',
    items: [
      { label: 'Заказы', icon: ShoppingBag },
      { label: 'Товары', icon: Package, href: '/admin/products' },
      { label: 'Категории', icon: Tags, href: '/admin/categories' },
      { label: 'Бренды', icon: Store, href: '/admin/brands' },
      { label: 'Клиенты', icon: UsersRound, href: '/admin/customers' },
    ],
  },
  {
    label: 'Продажи',
    items: [
      { label: 'Акции и предложения', icon: Megaphone, href: '/admin/offers' },
      { label: 'Попапы на сайте', icon: Gift, href: '/admin/site-popups' },
      { label: 'Подарки и промокоды', icon: Gift, href: '/admin/gifts-promocodes' },
    ],
  },
  {
    label: 'Контент и сайт',
    items: [
      { label: 'Новости', icon: FileText, href: '/admin/news' },
      { label: 'Бьюти-подборки', icon: Gift, href: '/admin/beauty-selections' },
      { label: 'Баннеры', icon: Megaphone, href: '/admin/banners' },
      { label: 'Главная витрина', icon: LayoutDashboard, href: '/admin/home' },
      { label: 'Тема сайта', icon: Palette, href: '/admin/site-theme' },
      { label: 'Магазины', icon: Store, href: '/admin/stores' },
    ],
  },
  {
    label: 'Управление',
    items: [
      { label: 'Аналитика', icon: BarChart3, href: '/admin/analytics' },
      { label: 'Обратная связь', icon: MessageSquareText, href: '/admin/feedback' },
      { label: 'Поиск (Meilisearch)', icon: Search, href: '/admin/search' },
      { label: 'Импорт из 1С', icon: PackageSearch, href: '/admin/product-import' },
      { label: 'Настройки', icon: Settings, href: '/admin/settings' },
    ],
  },
]

type AdminShellProps = {
  adminLogin: string
  newOrderCount: number
  children: ReactNode
}

export function AdminShell({ adminLogin, newOrderCount: initialNewOrderCount, children }: AdminShellProps) {
  const pathname = usePathname() ?? '/admin'
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const [newOrderCount, setNewOrderCount] = useState(initialNewOrderCount)
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('ru')
  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(({ label }) => label.toLocaleLowerCase('ru').includes(normalizedSearch)),
    }))
    .filter((group) => group.items.length > 0)
  const showHome = !normalizedSearch || 'главная'.includes(normalizedSearch) || 'панель управления'.includes(normalizedSearch)
  const showStorefront = !normalizedSearch || 'витрина'.includes(normalizedSearch) || 'магазин'.includes(normalizedSearch)
  const hasSearchResults = showHome || showStorefront || filteredGroups.length > 0
  const adminInitials = adminLogin.trim().slice(0, 2).toLocaleUpperCase('ru') || 'AD'

  useEffect(() => {
    function focusAdminSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', focusAdminSearch)
    return () => window.removeEventListener('keydown', focusAdminSearch)
  }, [])

  useEffect(() => {
    setNewOrderCount(initialNewOrderCount)
  }, [initialNewOrderCount])

  useEffect(() => {
    const handleOrderCreated = () => setNewOrderCount((count) => count + 1)
    window.addEventListener('vz:admin-order-created', handleOrderCreated)
    return () => window.removeEventListener('vz:admin-order-created', handleOrderCreated)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError('')

    try {
      const result = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })

      if (!result.ok) throw new Error('logout failed')
      window.location.assign('/admin/login')
    } catch {
      setLoggingOut(false)
      setLogoutError('Не удалось выйти. Попробуйте ещё раз.')
    }
  }

  return (
    <div className="min-h-dvh bg-[#e8e8e8] text-[#202223]">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 bg-[#080909] px-3 text-white sm:px-5 lg:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <button
            aria-label={mobileNavigationOpen ? 'Закрыть меню' : 'Открыть меню'}
            className="inline-flex size-9 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#007AFF] lg:hidden"
            onClick={() => setMobileNavigationOpen((open) => !open)}
            type="button"
          >
            {mobileNavigationOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
          <Link
            aria-label="Панель управления Vizaje-Nica"
            className="inline-flex h-9 w-28 items-center justify-center focus-visible:outline-2 focus-visible:outline-[#007AFF]"
            href="/admin"
          >
            <Image
              alt=""
              className="h-6 w-28 brightness-0 invert object-contain"
              height={24}
              priority
              src="/legacy-assets/app/img/next/header/logo_v.webp"
              unoptimized
              width={112}
            />
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 px-4 md:block lg:px-10">
          <div className="relative mx-auto flex h-10 w-full max-w-[640px] items-center rounded-xl border border-white/10 bg-white/[0.09] px-3.5 transition-colors focus-within:border-white/25 focus-within:bg-white/[0.12]">
            <Search aria-hidden="true" className="mr-2.5 shrink-0 text-white/65" size={18} />
            <input
              aria-label="Поиск по разделам админки"
              className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/60"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск по разделам"
              ref={searchInputRef}
              type="search"
              value={searchQuery}
            />
            <kbd className="ml-3 hidden shrink-0 rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] text-white/60 lg:inline-flex">
              Ctrl K
            </kbd>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#007AFF] text-[12px] font-medium text-white">
              {adminInitials}
            </span>
            <span className="hidden max-w-40 truncate text-[13px] text-white/85 lg:block">{adminLogin}</span>
          </div>
          <button
            aria-label={loggingOut ? 'Выполняется выход' : 'Выйти из админки'}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-2.5 text-[12px] font-medium text-white/85 transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#007AFF] disabled:cursor-wait disabled:opacity-60 sm:px-3"
            disabled={loggingOut}
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" size={15} />
            <span className="hidden sm:inline">{loggingOut ? 'Выходим…' : 'Выйти'}</span>
          </button>
        </div>
      </header>

      {mobileNavigationOpen ? (
        <button
          aria-label="Закрыть навигацию"
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setMobileNavigationOpen(false)}
          type="button"
        />
      ) : null}

      <div className="flex min-h-[calc(100dvh-4rem)] bg-[#e8e8e8]">
        <aside
          aria-label="Основная навигация"
          className={`${mobileNavigationOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-16 bottom-0 left-0 z-30 flex w-[min(290px,calc(100vw-48px))] flex-col overflow-y-auto bg-[#e8e8e8] px-3 py-4 transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-16 lg:z-10 lg:h-[calc(100dvh-4rem)] lg:w-[256px] lg:translate-x-0 lg:px-3.5`}
        >
          <nav aria-label="Разделы админки" className="flex-1 space-y-5">
            {showHome ? (
              <div className="px-1">
                <Link
                  aria-current={pathname === '/admin' ? 'page' : undefined}
                  className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-[#007AFF] ${pathname === '/admin' ? 'bg-white text-[#202223] shadow-[0_1px_2px_rgb(0_0_0_/_5%)]' : 'text-[#45494c] transition-colors hover:bg-white/70'}`}
                  href="/admin"
                  onClick={() => setMobileNavigationOpen(false)}
                >
                  <LayoutDashboard aria-hidden="true" size={17} strokeWidth={1.9} />
                  <span>Главная</span>
                </Link>
              </div>
            ) : null}

            {filteredGroups.map((group) => (
              <section key={group.label}>
                <h2 className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">
                  {group.label}
                </h2>
                <ul className="space-y-0.5">
                  {group.items.map(({ label, icon: Icon, href }) => (
                    <li key={label}>
                      {href ? (
                        <Link
                          aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}
                          className={`flex min-h-9 items-center gap-3 rounded-xl px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-[#007AFF] ${pathname === href || pathname.startsWith(`${href}/`) ? 'bg-white text-[#202223] shadow-[0_1px_2px_rgb(0_0_0_/_5%)]' : 'text-[#45494c] transition-colors hover:bg-white/70'}`}
                          href={href}
                          onClick={() => setMobileNavigationOpen(false)}
                        >
                          <Icon aria-hidden="true" className="shrink-0" size={16} strokeWidth={1.85} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                      ) : label === 'Заказы' ? (
                        <Link
                          aria-label={newOrderCount > 0 ? `Заказы, новых: ${newOrderCount}` : 'Заказы'}
                          aria-current={pathname.startsWith('/admin/orders') ? 'page' : undefined}
                          className={`flex min-h-9 items-center gap-3 rounded-xl px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-[#007AFF] ${pathname.startsWith('/admin/orders') ? 'bg-white text-[#202223] shadow-[0_1px_2px_rgb(0_0_0_/_5%)]' : 'text-[#45494c] transition-colors hover:bg-white/70'}`}
                          href="/admin/orders"
                          onClick={() => setMobileNavigationOpen(false)}
                        >
                          <Icon aria-hidden="true" className="shrink-0" size={16} strokeWidth={1.85} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          {newOrderCount > 0 ? <span aria-hidden="true" className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#dceaff] px-1.5 text-[10px] leading-none font-semibold text-[#0759b8]">{newOrderCount > 99 ? '99+' : newOrderCount}</span> : null}
                        </Link>
                      ) : (
                        <button
                          aria-disabled="true"
                          className="flex min-h-9 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-left text-[13px] text-[#65696c]"
                          disabled
                          title="Раздел будет доступен после подключения admin API"
                          type="button"
                        >
                          <Icon aria-hidden="true" className="shrink-0" size={16} strokeWidth={1.85} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          <LockKeyhole aria-hidden="true" className="shrink-0 text-[#929598]" size={11} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {showStorefront ? (
              <section className="border-t border-black/10 pt-4">
                <h2 className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">
                  Канал продаж
                </h2>
                <Link
                  className="flex min-h-9 items-center gap-3 rounded-xl px-3 text-[13px] text-[#45494c] transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-[#007AFF]"
                  href="/ru"
                  onClick={() => setMobileNavigationOpen(false)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Store aria-hidden="true" size={16} strokeWidth={1.85} />
                  <span>Витрина</span>
                </Link>
              </section>
            ) : null}

            {normalizedSearch && !hasSearchResults ? (
              <p className="px-3 py-3 text-[12px] leading-5 text-[#777b7e]">Разделы не найдены</p>
            ) : null}
          </nav>
        </aside>

        <main className="min-h-[calc(100dvh-4rem)] min-w-0 flex-1 rounded-tl-[20px] bg-white px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-[1440px]">
            {logoutError ? (
              <p aria-live="polite" className="mb-5 rounded-lg border border-[#8e1f2d]/25 bg-white px-4 py-3 text-sm text-[#8e1f2d]" role="alert">
                {logoutError}
              </p>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
