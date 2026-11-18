'use client'

import { Children, type ReactNode, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

export function SliderArrowIcon({ direction, className }: { direction: 'left' | 'right'; className?: string }) {
  return (
    <svg aria-hidden="true" className={`${direction === 'right' ? 'rotate-180' : ''} ${className ?? ''}`} fill="none" viewBox="0 0 30 20" stroke="currentColor">
      <g stroke="currentColor" strokeWidth="1.5">
        <path d="M10 1 1 9.978 10 19" />
        <path d="M1 10h29" />
      </g>
    </svg>
  )
}

type ContentSliderProps = {
  label: string
  heading?: ReactNode
  action?: ReactNode
  beforeTrack?: ReactNode
  children: ReactNode
  slideClassName: string
  trackClassName?: string
  variant?: 'default' | 'home'
  containerClassName?: string
  headerClassName?: string
  slideSnapClassName?: string
  scrollStep?: 'viewport' | 'slide' | 'page'
  pageSize?: number
  pageClassName?: string
  middleSlideClassName?: string
  controlsPlacement?: 'header' | 'sides'
  controlsClassName?: string
  arrowClassName?: string
}

export function ContentSlider({
  label,
  heading,
  action,
  beforeTrack,
  children,
  slideClassName,
  trackClassName = '',
  variant = 'default',
  containerClassName = '',
  headerClassName = '',
  slideSnapClassName = 'snap-start',
  scrollStep = 'viewport',
  pageSize = 4,
  pageClassName = 'relative flex min-w-full items-stretch',
  middleSlideClassName = '',
  controlsPlacement = 'header',
  controlsClassName = 'gap-1',
  arrowClassName = 'h-5 w-[30px]',
}: ContentSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollBack, setCanScrollBack] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageDirection, setPageDirection] = useState<-1 | 1>(1)
  const [isAnimating, setIsAnimating] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const childItems = Children.toArray(children)
  const slideCount = childItems.length
  const isPaged = scrollStep === 'page'
  const pageGroups = isPaged
    ? Array.from({ length: Math.ceil(childItems.length / pageSize) }, (_, index) => childItems.slice(index * pageSize, (index + 1) * pageSize))
    : []

  useEffect(() => {
    setPageIndex((current) => Math.min(current, Math.max(0, pageGroups.length - 1)))
  }, [pageGroups.length])

  useEffect(() => {
    if (isPaged) return
    const track = trackRef.current
    if (!track) return

    const updateControls = () => {
      setCanScrollBack(track.scrollLeft > 2)
      setCanScrollForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 2)
    }

    updateControls()
    track.addEventListener('scroll', updateControls, { passive: true })
    const observer = new ResizeObserver(updateControls)
    observer.observe(track)
    Array.from(track.children).forEach((slide) => observer.observe(slide))
    return () => {
      track.removeEventListener('scroll', updateControls)
      observer.disconnect()
    }
  }, [isPaged, slideCount])

  function move(direction: -1 | 1) {
    if (isPaged) {
      if (isAnimating) return
      const nextIndex = Math.min(pageGroups.length - 1, Math.max(0, pageIndex + direction))
      if (nextIndex === pageIndex) return
      setPageDirection(direction)
      setIsAnimating(true)
      setPageIndex(nextIndex)
      return
    }

    const track = trackRef.current
    if (!track) return
    const firstSlide = track.firstElementChild as HTMLElement | null
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0
    const slideDistance = firstSlide ? firstSlide.getBoundingClientRect().width + gap : 0
    const distance = scrollStep === 'slide' && slideDistance ? slideDistance : Math.max(track.clientWidth, 240)
    track.scrollBy({ left: direction * distance, behavior: 'smooth' })
  }

  const canGoBack = isPaged ? pageIndex > 0 : canScrollBack
  const canGoForward = isPaged ? pageIndex < pageGroups.length - 1 : canScrollForward
  const hasControls = canGoBack || canGoForward

  const cardClassName = (index: number) => `min-w-0 shrink-0 ${slideSnapClassName} ${slideClassName} ${index === 1 || index === 2 ? middleSlideClassName : ''}`
  const renderCard = (child: ReactNode, index: number, key: string | number) => (
    <div className={cardClassName(index)} key={key}>
      {child}
    </div>
  )

  return (
    <div className={`min-w-0 ${containerClassName}`}>
      {heading || action || hasControls ? (
        <div className={`${variant === 'home' ? 'mb-7 flex items-center justify-between gap-6 max-[767px]:mb-5' : 'mb-6 flex items-end justify-between gap-4 border-b border-fog pb-[14px] max-[640px]:mb-[18px]'} ${headerClassName}`}>
          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-5">
            {heading ? <div className="min-w-0">{heading}</div> : null}
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          {hasControls && controlsPlacement === 'header' ? (
            <div className={`hidden shrink-0 items-center min-[641px]:flex ${controlsClassName}`}>
              <button className={`${variant === 'home' ? 'inline-flex size-9 items-center justify-center text-midnight-ink transition-colors hover:text-hover-cream disabled:text-ash' : 'inline-flex size-10 items-center justify-center rounded-full text-midnight-ink transition-colors hover:bg-button-hover/25 hover:text-hover-cream disabled:text-ash disabled:hover:bg-transparent disabled:hover:text-ash'} focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 disabled:cursor-default`} type="button" onClick={() => move(-1)} disabled={isAnimating || !canGoBack} aria-label={`Предыдущие элементы: ${label}`}>
                <SliderArrowIcon direction="left" className={arrowClassName} />
              </button>
              <button className={`${variant === 'home' ? 'inline-flex size-9 items-center justify-center text-midnight-ink transition-colors hover:text-hover-cream disabled:text-ash' : 'inline-flex size-10 items-center justify-center rounded-full text-midnight-ink transition-colors hover:bg-button-hover/25 hover:text-hover-cream disabled:text-ash disabled:hover:bg-transparent disabled:hover:text-ash'} focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 disabled:cursor-default`} type="button" onClick={() => move(1)} disabled={isAnimating || !canGoForward} aria-label={`Следующие элементы: ${label}`}>
                <SliderArrowIcon direction="right" className={arrowClassName} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {beforeTrack}

      <div className="relative">
        {hasControls && controlsPlacement === 'sides' ? (
          <div className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-between min-[641px]:flex">
            <button className="pointer-events-auto inline-flex size-10 items-center justify-center text-midnight-ink transition-colors hover:text-hover-cream disabled:text-ash focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 disabled:cursor-default" type="button" onClick={() => move(-1)} disabled={isAnimating || !canGoBack} aria-label={`Предыдущие элементы: ${label}`}>
              <SliderArrowIcon direction="left" className="h-5 w-[30px]" />
            </button>
            <button className="pointer-events-auto inline-flex size-10 items-center justify-center text-midnight-ink transition-colors hover:text-hover-cream disabled:text-ash focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-2 disabled:cursor-default" type="button" onClick={() => move(1)} disabled={isAnimating || !canGoForward} aria-label={`Следующие элементы: ${label}`}>
              <SliderArrowIcon direction="right" className="h-5 w-[30px]" />
            </button>
          </div>
        ) : null}

        {isPaged ? (
          <>
            <div className={`relative hidden min-w-0 overflow-hidden min-[768px]:block ${trackClassName}`} role="region" aria-label={label}>
              <AnimatePresence initial={false} mode="sync" onExitComplete={() => setIsAnimating(false)}>
                {pageGroups[pageIndex] ? (
                  <motion.div
                    key={pageIndex}
                    className={pageClassName}
                    custom={pageDirection}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={{
                      enter: { position: 'relative', zIndex: 2 },
                      center: { position: 'relative', zIndex: 2 },
                      exit: (direction: -1 | 1) => ({ position: 'absolute', inset: 0, zIndex: 1, x: -22 * direction, opacity: 0 }),
                    }}
                  >
                    {pageGroups[pageIndex].map((child, index) => (
                      <motion.div
                        key={index}
                        className={cardClassName(index)}
                        initial={prefersReducedMotion ? { opacity: 0 } : { clipPath: pageDirection > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)', x: 32 * pageDirection, opacity: 1 }}
                        animate={{ clipPath: 'inset(0 0% 0 0%)', x: 0, opacity: 1 }}
                        transition={prefersReducedMotion ? { duration: 0.14 } : { clipPath: { duration: 0.58, delay: 0.08 + index * 0.055, ease: 'easeInOut' }, x: { duration: 0.62, delay: 0.08 + index * 0.055, ease: 'easeOut' }, opacity: { duration: 0.3, delay: index * 0.035, ease: 'easeIn' } }}
                      >
                        {child}
                      </motion.div>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <div className="min-[768px]:hidden">
              <div ref={trackRef} className={`flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${trackClassName}`} role="region" aria-label={label} tabIndex={0}>
                {childItems.map((child, index) => renderCard(child, index, index))}
              </div>
            </div>
          </>
        ) : (
          <div ref={trackRef} className={`flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-[18px] ${trackClassName}`} role="region" aria-label={label} tabIndex={0}>
            {childItems.map((child, index) => renderCard(child, index, index))}
          </div>
        )}
      </div>
    </div>
  )
}
