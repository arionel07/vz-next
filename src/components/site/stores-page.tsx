import { LocalizedLink as Link } from '@/components/site/localized-link'
import { connection } from 'next/server'

import { getStoresPage } from '@/lib/stores'
import type { StoreLocale } from '@/lib/locale-routing'

import { StoresExplorer } from './stores-explorer'

export async function StoresPage({ locale = 'ru' }: { locale?: StoreLocale }) {
  await connection()
  const stores = await getStoresPage(locale)
  const isRomanian = locale === 'ro'

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <div className="mx-auto max-w-[1600px] px-5 pb-16 pt-6 sm:px-8 md:px-12 md:pt-8">
        <nav aria-label={isRomanian ? 'Fir de navigare' : 'Навигация'} className="flex items-center gap-2 text-xs text-[#777]">
          <Link className="transition-colors hover:text-[#ab8a73]" href={`/${locale}`}>
            {isRomanian ? 'Acasă' : 'Главная'}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#111]">{isRomanian ? 'Magazine' : 'Магазины'}</span>
        </nav>

        <header className="pb-8 pt-10 text-center md:pb-11 md:pt-12">
          <h1 className="m-0 text-[42px] font-medium leading-[1.05] tracking-[-0.055em] sm:text-5xl md:text-[64px]">
            {isRomanian ? 'Magazine' : 'Магазины'}
          </h1>
          <p className="mb-0 mt-3 text-sm text-[#777]">
            {stores.length} {isRomanian ? 'locații Vizaje-Nica' : 'магазинов Vizaje-Nica'}
          </p>
        </header>
      </div>

      <StoresExplorer stores={stores} locale={locale} />
    </main>
  )
}
