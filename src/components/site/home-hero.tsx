'use client'

import { LocalizedLink as Link } from '@/components/site/localized-link'
import { useEffect, useState } from 'react'

import type { HomeSlide } from '@/lib/home'
import type { StoreLocale } from '@/lib/locale-routing'
import { legacyAsset } from '@/lib/legacy-assets'

export function HomeHero({ slides, locale = 'ru' }: { slides: HomeSlide[]; locale?: StoreLocale }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 7000)
    return () => window.clearInterval(timer)
  }, [slides.length])

  if (!slides.length) return null

  return (
    <section id="home-hero" className="relative mx-0 aspect-[1900/720] max-h-[720px] overflow-hidden bg-mist max-[767px]:aspect-[4/5]" role="region" aria-label={locale === 'ro' ? 'Campanii și oferte Vizaje-Nica' : 'Кампании и предложения Vizaje-Nica'} aria-roledescription={locale === 'ro' ? 'carusel' : 'карусель'}>
      {slides.map((item, slideIndex) => {
        const isActive = slideIndex === index
        const slideContent = (
          <picture className="absolute inset-0 block overflow-hidden">
            {item.mobileImage ? <source media="(max-width: 767px)" srcSet={legacyAsset(item.mobileImage, 'sliders') ?? undefined} /> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={`size-full object-cover transition-transform duration-[900ms] motion-reduce:transition-none ${isActive ? 'scale-100' : 'scale-[1.015]'}`} src={legacyAsset(item.image, 'sliders') ?? ''} alt={item.title} fetchPriority={slideIndex === 0 ? 'high' : undefined} loading={slideIndex === 0 ? 'eager' : 'lazy'} />
          </picture>
        )

        return (
          <article key={item.id} className={`absolute inset-0 transition-[opacity,visibility] duration-[760ms] ${isActive ? 'z-10 visible opacity-100' : 'pointer-events-none invisible opacity-0'}`} aria-hidden={!isActive}>
            {item.uri && item.uri !== '#' ? (
              <Link className="absolute inset-0 block focus-visible:outline-2 focus-visible:outline-midnight-ink" href={item.uri} aria-label={item.title} tabIndex={isActive ? 0 : -1}>{slideContent}</Link>
            ) : <div className="absolute inset-0">{slideContent}</div>}
          </article>
        )
      })}

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-4 z-30 flex items-center justify-center gap-2" aria-label={locale === 'ro' ? 'Navigare între slide-uri' : 'Навигация по слайдам'}>
          {slides.map((item, slideIndex) => (
            <button
              className="grid size-5 place-items-center focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-1"
              type="button"
              key={item.id}
              onClick={() => setIndex(slideIndex)}
              aria-label={locale === 'ro' ? `Slide ${slideIndex + 1}` : `Слайд ${slideIndex + 1}`}
              aria-current={slideIndex === index ? 'true' : undefined}
            >
              <span className={`size-[6px] rounded-full ${slideIndex === index ? 'bg-white' : 'bg-white/50'}`} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
