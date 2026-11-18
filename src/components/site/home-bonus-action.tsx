'use client'

import type { StoreLocale } from '@/lib/locale-routing'

export function HomeBonusAction({ locale = 'ru', label }: { locale?: StoreLocale; label?: string }) {
  return (
    <button
      className="flex min-h-[50px] w-full items-center justify-center rounded-lg border border-[#111111] bg-[#111111] px-5 text-[11px] font-semibold tracking-[.08em] text-white uppercase transition-colors hover:border-hover-cream hover:bg-button-hover hover:text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-4 motion-reduce:transition-none"
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('vz:open-auth', { detail: { mode: 'register' } }))}
    >
      {label ?? (locale === 'ro' ? 'Vreau să mă alătur' : 'Хочу в клуб')}
    </button>
  )
}
