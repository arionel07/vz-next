'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { SiteHeader } from '@/components/site/site-header'
import { getPathLocale, localizedPath } from '@/lib/locale-routing'

export default function NotFound() {
  const locale = getPathLocale(usePathname())
  const text = locale === 'ro'
    ? {
        title: 'Ups... pagina nu a fost găsită',
        beforeHome: 'Poți merge la ',
        home: 'pagina principală',
        middle: ' sau poți vedea selecția de ',
        popular: 'produse populare',
        after: '.',
      }
    : {
        title: 'УПС... страница не найдена',
        beforeHome: 'Можете перейти на ',
        home: 'главную',
        middle: ' или посмотреть подборку ',
        popular: 'популярных товаров',
        after: '.',
      }

  return (
    <>
      <SiteHeader />
      <main className="min-h-[calc(100svh-136px)] bg-white text-[#111]">
        <section
          className="mx-auto grid min-h-[calc(100svh-136px)] max-w-[1320px] grid-cols-1 px-6 pt-10 sm:grid-cols-[48.5%_51.5%] sm:px-8 sm:pt-11"
          aria-labelledby="not-found-title"
        >
          <div className="hidden sm:block" aria-hidden="true" />
          <div className="max-w-[440px]">
            <h1
              id="not-found-title"
              className="m-0 text-[42px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[48px]"
            >
              {text.title}
            </h1>
            <p className="mt-6 max-w-[430px] text-[14px] leading-[1.7]">
              {text.beforeHome}
              <Link className="text-[#ab8a73] transition-colors hover:text-[#111]" href={localizedPath('/ru', locale)}>
                {text.home}
              </Link>
              {text.middle}
              <Link className="text-[#ab8a73] transition-colors hover:text-[#111]" href={localizedPath('/ru/top-prodaz', locale)}>
                {text.popular}
              </Link>
              {text.after}
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
