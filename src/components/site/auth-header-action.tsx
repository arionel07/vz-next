'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { localizedPath, type StoreLocale } from '@/lib/locale-routing'

import type { AuthUser } from '@/lib/auth-types'
import { AuthDrawer } from './auth-drawer'

function HeaderProfileIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 25 25">
      <path
        clipRule="evenodd"
        d="M13 23.5c2.672 0 5.11-.998 6.963-2.641A8.096 8.096 0 0 0 13 16.9a8.096 8.096 0 0 0-6.963 3.96A10.46 10.46 0 0 0 13 23.5Zm0-8.1a9.591 9.591 0 0 1 8.04 4.353A10.457 10.457 0 0 0 23.5 13c0-5.799-4.701-10.5-10.5-10.5S2.5 7.201 2.5 13c0 2.572.925 4.928 2.46 6.753A9.592 9.592 0 0 1 13 15.4ZM25 13c0 3.15-1.214 6.017-3.2 8.158A11.968 11.968 0 0 1 13 25a11.963 11.963 0 0 1-5.968-1.587A11.995 11.995 0 0 1 1 13C1 6.373 6.373 1 13 1s12 5.373 12 12Zm-9.75-2.878a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm1.5 0a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        fillRule="evenodd"
        stroke="none"
      />
    </svg>
  )
}

export function AuthHeaderAction({ locale = 'ru', drawerTargetId }: { locale?: StoreLocale; drawerTargetId?: string }) {
  const router = useRouter()
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 601px)').matches)
  const [initialMode, setInitialMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionResolved, setSessionResolved] = useState(false)
  const authInteractionRef = useRef(false)
  const accountHref = localizedPath('/ru/account', locale)
  const profileLabel = user
    ? `${locale === 'ro' ? 'Contul meu' : 'Личный кабинет'}: ${user.name || user.email || (locale === 'ro' ? 'Cont' : 'Аккаунт')}`
    : locale === 'ro' ? 'Autentificare' : 'Войти в личный кабинет'
  const profileTitle = user
    ? user.name || (locale === 'ro' ? 'Cont' : 'Аккаунт')
    : locale === 'ro' ? 'Autentificare' : 'Войти'
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    window.dispatchEvent(new CustomEvent('vz:auth-drawer-state', { detail: { open: false } }))
  }, [])
  const handleAuthenticated = useCallback((nextUser: AuthUser) => {
    authInteractionRef.current = true
    setUser(nextUser)
    setSessionResolved(true)
    window.dispatchEvent(new CustomEvent('vz:auth-changed', { detail: { user: nextUser } }))
  }, [])
  const handleLoggedOut = useCallback(() => {
    authInteractionRef.current = true
    setUser(null)
    setSessionResolved(true)
    window.dispatchEvent(new CustomEvent('vz:auth-changed', { detail: { user: null } }))
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 601px)')
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const openAuth = (event: Event) => {
      const requestedMode = (event as CustomEvent<{ mode?: 'login' | 'register' | 'forgot' }>).detail?.mode
      setInitialMode(requestedMode ?? 'login')
      setDrawerOpen(true)
      window.dispatchEvent(new CustomEvent('vz:auth-drawer-state', { detail: { open: true } }))
    }
    const refreshProfile = () => {
      fetch('/api/auth?action=session', { cache: 'no-store' })
        .then((response) => response.json())
        .then((data: { user?: AuthUser | null }) => {
          setUser(data.user ?? null)
          setSessionResolved(true)
        })
        .catch(() => setSessionResolved(true))
    }
    window.addEventListener('vz:open-auth', openAuth)
    const closeAuth = () => setDrawerOpen(false)
    window.addEventListener('vz:close-auth', closeAuth)
    window.addEventListener('vz:auth-profile-updated', refreshProfile)
    fetch('/api/auth?action=session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { user?: AuthUser | null }) => {
        if (!authInteractionRef.current) setUser(data.user ?? null)
        setSessionResolved(true)
      })
      .catch(() => {
        if (!authInteractionRef.current) setUser(null)
        setSessionResolved(true)
      })
    return () => {
      window.removeEventListener('vz:open-auth', openAuth)
      window.removeEventListener('vz:close-auth', closeAuth)
      window.removeEventListener('vz:auth-profile-updated', refreshProfile)
    }
  }, [])

  const buttonClassName = 'inline-flex size-10 shrink-0 items-center justify-center bg-transparent text-midnight-ink transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 motion-reduce:transition-none'
  const openLoginDrawer = () => {
    setInitialMode('login')
    setDrawerOpen(true)
    window.dispatchEvent(new CustomEvent('vz:auth-drawer-state', { detail: { open: true } }))
  }
  const handleGuestClick = async () => {
    if (!sessionResolved) {
      try {
        const response = await fetch('/api/auth?action=session', { cache: 'no-store' })
        const data = await response.json() as { user?: AuthUser | null }
        const currentUser = data.user ?? null
        setUser(currentUser)
        setSessionResolved(true)
        if (currentUser) {
          router.push(accountHref)
          return
        }
      } catch {
        setSessionResolved(true)
      }
    }
    openLoginDrawer()
  }

  return (
    <>
      {user ? (
        <Link className={buttonClassName} href={accountHref} aria-label={profileLabel} title={profileTitle}>
          <HeaderProfileIcon className="size-[20px]" />
        </Link>
      ) : (
        <button
          className={buttonClassName}
          type="button"
          onClick={handleGuestClick}
          aria-label={profileLabel}
          aria-haspopup="dialog"
          aria-expanded={isDrawerOpen}
          aria-controls="auth-drawer"
          title={profileTitle}
        >
          <HeaderProfileIcon className="size-[20px]" />
        </button>
      )}
      <AuthDrawer
        open={isDrawerOpen}
        drawerTargetId={isDesktop ? drawerTargetId : undefined}
        locale={locale}
        initialMode={initialMode}
        user={user}
        onClose={closeDrawer}
        onAuthenticated={handleAuthenticated}
        onLoggedOut={handleLoggedOut}
      />
    </>
  )
}

export function MobileAuthTrigger({ locale = 'ru', active = false }: { locale?: StoreLocale; active?: boolean }) {
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const handleDrawerState = (event: Event) => {
      setDrawerOpen(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open))
    }
    const handleAuthChanged = (event: Event) => {
      setUser((event as CustomEvent<{ user?: AuthUser | null }>).detail?.user ?? null)
    }
    const refreshSession = () => {
      fetch('/api/auth?action=session', { cache: 'no-store' })
        .then((response) => response.json())
        .then((data: { user?: AuthUser | null }) => setUser(data.user ?? null))
        .catch(() => setUser(null))
    }
    window.addEventListener('vz:auth-drawer-state', handleDrawerState)
    window.addEventListener('vz:auth-changed', handleAuthChanged)
    window.addEventListener('vz:auth-profile-updated', refreshSession)
    refreshSession()
    return () => {
      window.removeEventListener('vz:auth-drawer-state', handleDrawerState)
      window.removeEventListener('vz:auth-changed', handleAuthChanged)
      window.removeEventListener('vz:auth-profile-updated', refreshSession)
    }
  }, [])

  const className = `relative inline-flex min-h-[50px] min-w-0 w-full shrink-0 flex-col items-center justify-center gap-[2px] px-1 py-[3px] text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[-2px] ${active ? 'text-hover-cream' : ''}`
  const content = (
    <>
      <span aria-hidden="true" className="block size-[29px] shrink-0 bg-current [mask-image:url('/legacy-assets/app/img/icons/mobile-tabbar-profile.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />
      <span className="text-[9px] leading-[1.1] font-medium whitespace-nowrap">{locale === 'ro' ? 'Profil' : 'Профиль'}</span>
    </>
  )

  if (user) return <Link className={className} href={localizedPath('/ru/account', locale)} aria-label={locale === 'ro' ? 'Contul meu' : 'Личный кабинет'} aria-current={active ? 'page' : undefined} title={user.name || (locale === 'ro' ? 'Contul meu' : 'Личный кабинет')}>{content}</Link>

  return (
    <button
      className={className}
      type="button"
      onClick={(event) => window.dispatchEvent(new CustomEvent('vz:open-auth', { detail: { trigger: event.currentTarget } }))}
      aria-label={locale === 'ro' ? 'Autentificare' : 'Войти в личный кабинет'}
      aria-haspopup="dialog"
      aria-expanded={isDrawerOpen}
      aria-controls="auth-drawer"
      title={locale === 'ro' ? 'Contul meu' : 'Личный кабинет'}
    >{content}</button>
  )
}
