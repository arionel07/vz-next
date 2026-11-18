'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Heart, Search } from 'lucide-react'

import type { BrandSummary } from '@/lib/catalog'
import type { StoreLocale } from '@/lib/locale-routing'
import { LocalizedLink as Link } from '@/components/site/localized-link'

type BrandGroup = {
  key: string
  brands: BrandSummary[]
}

const favoriteStorageKey = 'vz-brand-favorites'

export function BrandsDirectory({ groups, locale, query }: { groups: BrandGroup[]; locale: StoreLocale; query: string }) {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([])
  const isRomanian = locale === 'ro'
  const text = isRomanian
    ? {
        title: 'Branduri', search: 'Caută branduri', searchLabel: 'Caută un brand', favorites: 'Favorite',
        emptyFavorites: 'Aici nu este nimic încă. Adăugați branduri la favorite.', noResults: 'Nu am găsit branduri',
        add: 'Adaugă la favorite', remove: 'Elimină din favorite', back: 'Înapoi', alphabet: 'Navigare alfabetică',
      }
    : {
        title: 'Бренды', search: 'Найти бренды', searchLabel: 'Поиск бренда', favorites: 'Избранные',
        emptyFavorites: 'Пока здесь ничего нет. Добавляйте новые бренды в своё избранное.', noResults: 'Бренды не найдены',
        add: 'Добавить в избранное', remove: 'Убрать из избранного', back: 'Назад', alphabet: 'Навигация по алфавиту',
      }
  const allBrands = groups.flatMap((group) => group.brands)
  const favoriteBrands = allBrands.filter((brand) => favoriteIds.includes(brand.id))
  const alphabet = groups.map((group, index) => ({ ...group, index }))

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(favoriteStorageKey)
      const parsed: unknown = stored ? JSON.parse(stored) : []
      if (Array.isArray(parsed)) setFavoriteIds(parsed.filter((value): value is number => Number.isInteger(value)))
    } catch {
      setFavoriteIds([])
    }
  }, [])

  function toggleFavorite(brandId: number) {
    const nextIds = favoriteIds.includes(brandId)
      ? favoriteIds.filter((id) => id !== brandId)
      : [...favoriteIds, brandId]
    setFavoriteIds(nextIds)
    try {
      window.localStorage.setItem(favoriteStorageKey, JSON.stringify(nextIds))
    } catch {
      // Keep the in-page favorite state usable when browser storage is unavailable.
    }
  }

  return (
    <main className="site-shell bg-white text-[#111]">
      <h1 className="sr-only">{text.title}</h1>

      {alphabet.length ? (
        <nav className="mx-auto hidden min-h-10 max-w-[1040px] items-center justify-center gap-[clamp(11px,1.55vw,27px)] overflow-x-auto border-b border-[#e5e5e5] px-4 text-[11px] font-medium text-[#383838] min-[601px]:flex" aria-label={text.alphabet}>
          {alphabet.map((group) => (
            <a className="shrink-0 transition-colors hover:text-hover-cream" href={`#brands-${group.index}`} key={group.key}>{group.key}</a>
          ))}
        </nav>
      ) : null}

      <div className="mx-auto max-w-[1420px] px-[clamp(0px,2vw,30px)] pb-20 min-[601px]:px-5 min-[601px]:pt-[58px] min-[601px]:pb-28">
        <div className="mb-4 flex min-h-11 items-center min-[601px]:hidden">
          <Link className="inline-flex size-11 items-center justify-start text-[#111]" href={`/${locale}`} aria-label={text.back}>
            <ArrowLeft className="size-6" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid min-w-0 grid-cols-1 min-[900px]:grid-cols-2 min-[900px]:gap-x-[clamp(60px,10vw,190px)]">
          <div className="min-w-0 min-[900px]:col-start-2 min-[900px]:row-start-1">
            <form className="mb-8 flex h-[64px] items-center border-b border-[#e5e5e5] min-[601px]:mb-[70px] min-[601px]:h-[94px] min-[601px]:border-0" action={`/${locale}/brands`} method="get" role="search">
              <label className="sr-only" htmlFor="brand-search">{text.searchLabel}</label>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[32px] font-medium tracking-[-.045em] text-[#111] outline-none placeholder:text-[#dedede] focus:ring-0 min-[601px]:text-[clamp(38px,4vw,62px)]"
                id="brand-search"
                name="q"
                type="search"
                placeholder={text.search}
                defaultValue={query}
                autoComplete="off"
              />
              <button className="ml-3 inline-flex size-10 shrink-0 items-center justify-center text-[#d8d8d8] transition-colors hover:text-[#111] focus-visible:outline-2 focus-visible:outline-hover-cream min-[601px]:size-12" type="submit" aria-label={text.searchLabel}>
                <Search className="size-[27px] min-[601px]:size-[34px]" strokeWidth={1.5} />
              </button>
            </form>
          </div>

          <aside className="mb-8 hidden min-w-0 pt-1 text-center min-[900px]:col-start-1 min-[900px]:row-start-1 min-[900px]:mt-[134px] min-[900px]:mb-0 min-[900px]:block" aria-label={text.favorites}>
            <h2 className="m-0 text-[28px] leading-tight font-semibold tracking-[-.035em]">{text.favorites}</h2>
            {favoriteBrands.length ? (
              <ul className="mx-auto mt-4 max-w-[310px] space-y-3 text-left text-[15px]">
                {favoriteBrands.map((brand) => (
                  <li className="flex items-center justify-between gap-3" key={brand.id}>
                    <Link className="min-w-0 truncate hover:text-hover-cream" href={`/${locale}/brands/${brand.id}`}>{brand.title}</Link>
                    <button className="inline-flex size-8 shrink-0 items-center justify-center text-[#777] hover:text-[#111]" type="button" onClick={() => toggleFavorite(brand.id)} aria-label={text.remove} aria-pressed="true">
                      <Heart className="size-[18px] fill-current" strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mx-auto mt-3 max-w-[310px] text-[14px] leading-[1.45] text-[#858585]">{text.emptyFavorites}</p>
            )}
          </aside>

          <div className="min-w-0 min-[900px]:col-start-2 min-[900px]:row-start-2">
            {groups.length ? (
              <div className="space-y-8 min-[601px]:space-y-10">
                {groups.map((group, groupIndex) => (
                  <section className="scroll-mt-24" id={`brands-${groupIndex}`} key={group.key} aria-labelledby={`brands-heading-${groupIndex}`}>
                    <h2 className="mb-5 text-[29px] leading-none font-semibold tracking-[-.035em] min-[601px]:mb-7 min-[601px]:text-[30px]" id={`brands-heading-${groupIndex}`}>{group.key}</h2>
                    <ul className="grid grid-cols-1 gap-x-8 gap-y-0 min-[601px]:grid-cols-2 min-[601px]:gap-x-[clamp(32px,5vw,88px)]">
                      {group.brands.map((brand) => {
                        const isFavorite = favoriteIds.includes(brand.id)
                        return (
                          <li className="group flex min-h-[64px] min-w-0 items-center gap-3 min-[601px]:min-h-[35px] min-[601px]:gap-0" key={brand.id}>
                            <button
                              className={`inline-flex size-8 shrink-0 items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-hover-cream min-[601px]:size-7 min-[601px]:opacity-0 min-[601px]:group-hover:opacity-100 min-[601px]:group-focus-within:opacity-100 ${isFavorite ? 'text-[#111] min-[601px]:opacity-100' : 'text-[#cfcfcf] hover:text-[#111]'}`}
                              type="button"
                              onClick={() => toggleFavorite(brand.id)}
                              aria-label={isFavorite ? text.remove : text.add}
                              aria-pressed={isFavorite}
                            >
                              <Heart className={`size-[21px] min-[601px]:size-[17px] ${isFavorite ? 'fill-current' : ''}`} strokeWidth={1.4} />
                            </button>
                            <Link className="min-w-0 flex-1 truncate text-[19px] leading-[1.35] transition-colors hover:text-hover-cream min-[601px]:text-[15px]" href={`/${locale}/brands/${brand.id}`}>
                              {brand.title ?? (isRomanian ? 'Fără nume' : 'Без названия')}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p className="border-t border-[#e5e5e5] py-10 text-[16px] text-[#858585]">{text.noResults}</p>
            )}
          </div>
        </div>
      </div>

      {alphabet.length ? (
        <nav className="fixed top-1/2 right-1 z-30 flex max-h-[58vh] -translate-y-1/2 flex-col items-center overflow-y-auto rounded-full bg-white/80 px-1 py-1 text-[10px] leading-[1.45] text-[#494949] backdrop-blur-sm min-[601px]:hidden" aria-label={text.alphabet}>
          {alphabet.map((group) => (
            <a className="min-w-[18px] py-[1px] text-center transition-colors hover:text-hover-cream" href={`#brands-${group.index}`} key={group.key}>{group.key}</a>
          ))}
        </nav>
      ) : null}
    </main>
  )
}
