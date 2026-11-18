'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Maximize2, Play, Plus, X } from 'lucide-react'

import { SliderArrowIcon } from './content-slider'
import { legacyAsset } from '@/lib/legacy-assets'
import type { StoreLocale } from '@/lib/locale-routing'
import { FavoriteToggle } from './favorite-toggle'

type ProductGalleryProps = {
  images: string[]
  title: string
  productId?: number
  videoId?: string | null
  locale?: StoreLocale
  shadePreview?: { id: number; label: string; swatch: string | null; selected: boolean }[]
  shadePreviewMore?: number
  shadePickerLabel?: string
  onOpenShades?: () => void
  toastImage?: string | null
}

type GalleryMedia = { type: 'image'; src: string } | { type: 'video'; src: string }
type PointerZone = 'previous' | 'open' | 'next'
type PointerPosition = { x: number; y: number; zone: PointerZone }

function normalizeYouTubeId(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  const match = trimmed.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i)
  return match?.[1] ?? (/^[\w-]{11}$/.test(trimmed) ? trimmed : null)
}

function YouTubeFrame({ id, title }: { id: string; title: string }) {
  return (
    <iframe
      className="size-full border-0"
      src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  )
}

export function ProductGallery({ images, title, productId, videoId, locale = 'ru', shadePreview = [], shadePreviewMore = 0, shadePickerLabel, onOpenShades, toastImage }: ProductGalleryProps) {
  const labels = locale === 'ro'
    ? { previous: 'Imaginea precedentă', next: 'Imaginea următoare', open: 'Deschide galeria', close: 'Închide galeria', thumbnails: 'Miniaturi produs', video: 'Video produs', shades: 'Deschide nuanțele' }
    : { previous: 'Предыдущее изображение', next: 'Следующее изображение', open: 'Открыть галерею', close: 'Закрыть галерею', thumbnails: 'Миниатюры товара', video: 'Видео товара', shades: 'Открыть оттенки' }

  const normalizedVideoId = normalizeYouTubeId(videoId)
  const media: GalleryMedia[] = [
    ...images.filter(Boolean).map((src) => ({ type: 'image' as const, src })),
    ...(normalizedVideoId ? [{ type: 'video' as const, src: normalizedVideoId }] : []),
  ]
  const mediaCount = media.length
  const mediaKey = media.map((item) => `${item.type}:${item.src}`).join('|')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null)
  const touchStartX = useRef<number | null>(null)
  const didSwipeRef = useRef(false)
  const thumbnailRailRef = useRef<HTMLDivElement>(null)
  const fullscreenThumbnailRailRef = useRef<HTMLDivElement>(null)
  const mobileLightboxRef = useRef<HTMLDivElement>(null)
  const selectedMedia = media[selectedIndex] ?? null
  const selectedImage = selectedMedia?.type === 'image' ? legacyAsset(selectedMedia.src) : null

  useEffect(() => {
    setSelectedIndex(0)
    setPointerPosition(null)
    didSwipeRef.current = false
  }, [mediaKey])

  const move = useCallback((direction: -1 | 1) => {
    if (!mediaCount) return
    setSelectedIndex((current) => (current + direction + mediaCount) % mediaCount)
  }, [mediaCount])

  useEffect(() => {
    if (!isLightboxOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLightboxOpen(false)
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'ArrowRight') move(1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLightboxOpen, move])

  useEffect(() => {
    if (!isLightboxOpen || !mobileLightboxRef.current) return
    const activeImage = mobileLightboxRef.current.querySelector<HTMLElement>(`[data-gallery-index="${selectedIndex}"]`)
    activeImage?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [isLightboxOpen, selectedIndex])

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const relativeX = event.clientX - rect.left
    const relativeY = event.clientY - rect.top
    const fraction = relativeX / Math.max(rect.width, 1)
    const zone: PointerZone = fraction < 0.34 ? 'previous' : fraction > 0.66 ? 'next' : 'open'
    setPointerPosition({ x: relativeX, y: relativeY, zone })
  }

  const handleMainImageClick = () => {
    if (didSwipeRef.current) {
      didSwipeRef.current = false
      return
    }
    if (pointerPosition?.zone === 'previous') move(-1)
    else if (pointerPosition?.zone === 'next') move(1)
    else setIsLightboxOpen(true)
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return
    const delta = event.changedTouches[0]?.clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta ?? 0) > 48) {
      didSwipeRef.current = true
      move(delta! < 0 ? 1 : -1)
    }
  }

  const selectMedia = (index: number) => {
    setSelectedIndex(index)
    setPointerPosition(null)
  }

  const renderThumbnail = (item: GalleryMedia, index: number, fullscreen = false) => {
    const imageUrl = item.type === 'image' ? legacyAsset(item.src) : null
    const isSelected = index === selectedIndex
    return (
      <button
        key={`${item.type}-${item.src}-${index}`}
        type="button"
        onClick={() => selectMedia(index)}
        aria-label={item.type === 'video' ? labels.video : `${title}, ${index + 1}`}
        aria-current={isSelected ? 'true' : undefined}
        className={`relative aspect-square w-full shrink-0 overflow-hidden border bg-[#f2f2f2] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cdbbb0] ${isSelected ? 'border-[#cdbbb0]' : 'border-transparent hover:border-black/25'} ${fullscreen ? 'max-w-[72px]' : 'max-w-[84px] max-[1100px]:max-w-[70px]'}`}
      >
        {imageUrl ? <img className="size-full object-contain mix-blend-multiply" src={imageUrl} alt="" loading="lazy" /> : <span className="flex size-full items-center justify-center bg-midnight-ink text-white"><Play className="size-5" fill="currentColor" /></span>}
      </button>
    )
  }

  const renderMedia = (item: GalleryMedia | null, className: string) => {
    if (!item) return <div className={`${className} flex items-center justify-center text-sm text-graphite`}>{locale === 'ro' ? 'Imagine indisponibilă' : 'Изображение недоступно'}</div>
    if (item.type === 'video') return <div className={className}><YouTubeFrame id={item.src} title={title} /></div>
    const imageUrl = legacyAsset(item.src)
    return imageUrl
      ? <img className={`${className} mix-blend-multiply`} src={imageUrl} alt={title} draggable={false} fetchPriority="high" />
      : <div className={`${className} flex items-center justify-center text-sm text-graphite`}>{locale === 'ro' ? 'Imagine indisponibilă' : 'Изображение недоступно'}</div>
  }

  return (
    <div className="min-w-0 max-[600px]:-mx-5">
      <div className="relative min-w-0">
        <div className="hidden min-w-0 min-[901px]:block">
          <div className="grid min-w-0 grid-cols-2 gap-2">
            {media.map((item, index) => (
              <div
                className="group relative aspect-[4/5] min-w-0 overflow-hidden bg-[#f2f2f2]"
                key={`${item.type}-${item.src}-${index}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  selectMedia(index)
                  setIsLightboxOpen(true)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    selectMedia(index)
                    setIsLightboxOpen(true)
                  }
                }}
                aria-label={`${title}, ${index + 1}`}
              >
                {renderMedia(item, 'pointer-events-none size-full object-contain mix-blend-multiply')}
                {index === 0 && productId ? <FavoriteToggle productId={productId} locale={locale} toastProduct={{ title, image: toastImage }} className="absolute top-4 right-4 z-10 inline-flex size-[42px] items-center justify-center rounded-full border border-black/10 bg-white text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-[#cdbbb0]" /> : null}
                {index === 0 && shadePreview.length && onOpenShades && item.type !== 'video' ? (
                  <button
                    className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col items-center rounded-full bg-white/95 p-1 shadow-[0_5px_18px_rgba(17,17,17,0.14)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-[#cdbbb0]"
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onOpenShades() }}
                    aria-label={shadePickerLabel ?? labels.shades}
                    title={shadePickerLabel ?? labels.shades}
                  >
                    {shadePreview.map((shade) => (
                      <span className={`grid size-[25px] place-items-center rounded-full border border-white p-[2px] ${shade.selected ? 'ring-1 ring-midnight-ink ring-offset-1' : ''}`} key={shade.id}>
                        <span className="size-full rounded-full border border-black/10" style={shade.swatch ? { background: shade.swatch } : undefined} aria-hidden="true" />
                      </span>
                    ))}
                    {shadePreviewMore > 0 ? <span className="flex h-[40px] w-[40px] items-center justify-center bg-white text-[10px] leading-3 font-normal text-midnight-ink">+{shadePreviewMore}</span> : null}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {mediaCount > 1 ? (
            <div className="flex items-center gap-7 pt-4 text-sm text-midnight-ink" aria-label={locale === 'ro' ? 'Galerie de imagini' : 'Галерея изображений'}>
              <button type="button" onClick={() => move(-1)} aria-label={labels.previous} className="transition-opacity hover:opacity-55">←</button>
              <button type="button" onClick={() => move(1)} aria-label={labels.next} className="transition-opacity hover:opacity-55">→</button>
              <span>{selectedIndex + 1} / {mediaCount}</span>
            </div>
          ) : null}
        </div>

        <div className="grid min-w-0 grid-cols-1 min-[901px]:hidden min-[901px]:grid-cols-[84px_minmax(0,1fr)] min-[901px]:gap-3">
          {mediaCount > 1 ? (
            <aside className="hidden min-[901px]:flex min-[901px]:h-[clamp(560px,67vh,720px)] min-[901px]:flex-col min-[901px]:items-center min-[901px]:gap-2" aria-label={labels.thumbnails}>
              <button className="inline-flex size-7 shrink-0 items-center justify-center text-graphite transition-colors hover:text-midnight-ink" type="button" aria-label={locale === 'ro' ? 'Derulează miniaturile în sus' : 'Прокрутить миниатюры вверх'} onClick={() => thumbnailRailRef.current?.scrollBy({ top: -260, behavior: 'smooth' })}><ChevronUp className="size-4" /></button>
              <div ref={thumbnailRailRef} className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {media.map((item, index) => renderThumbnail(item, index))}
              </div>
              <button className="inline-flex size-7 shrink-0 items-center justify-center text-graphite transition-colors hover:text-midnight-ink" type="button" aria-label={locale === 'ro' ? 'Derulează miniaturile în jos' : 'Прокрутить миниатюры вниз'} onClick={() => thumbnailRailRef.current?.scrollBy({ top: 260, behavior: 'smooth' })}><ChevronDown className="size-4" /></button>
            </aside>
          ) : null}

          <div
            className={`group/product-gallery relative min-w-0 overflow-hidden bg-[#f2f2f2] max-[600px]:aspect-[1/1.02] min-[601px]:max-[900px]:aspect-square min-[901px]:h-[clamp(560px,67vh,720px)] min-[901px]:aspect-auto min-[901px]:rounded-none ${selectedMedia?.type === 'video' ? 'bg-black' : ''}`}
            onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; didSwipeRef.current = false }}
            onTouchEnd={handleTouchEnd}
          >
            {selectedMedia?.type === 'video' ? (
              <div className="absolute inset-0 z-0"><YouTubeFrame id={selectedMedia.src} title={title} /></div>
            ) : (
              <button
                type="button"
                onClick={handleMainImageClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setPointerPosition(null)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
                  if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
                }}
                aria-label={`${title}. ${labels.previous} — левый край, ${labels.next} — правый край, ${labels.open} — центр.`}
                className="absolute inset-0 flex size-full cursor-zoom-in items-center justify-center border-0 bg-transparent p-0 text-inherit focus-visible:outline-2 focus-visible:outline-[#cdbbb0] min-[901px]:cursor-none"
              >
                {renderMedia(selectedMedia, 'pointer-events-none size-full object-contain mix-blend-multiply')}
                {pointerPosition ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute z-[1] hidden size-12 items-center justify-center rounded-full bg-white/95 text-midnight-ink shadow-sm min-[901px]:flex"
                    style={{ left: pointerPosition.x, top: pointerPosition.y, transform: 'translate(-50%, -50%)' }}
                  >
                    {pointerPosition.zone === 'previous' ? <SliderArrowIcon direction="left" className="h-5 w-[30px]" /> : pointerPosition.zone === 'next' ? <SliderArrowIcon direction="right" className="h-5 w-[30px]" /> : <Plus className="size-5" strokeWidth={1.5} />}
                  </span>
                ) : null}
              </button>
            )}

            {productId ? <FavoriteToggle productId={productId} locale={locale} toastProduct={{ title, image: toastImage }} className="absolute top-4 right-4 z-10 inline-flex size-[42px] items-center justify-center rounded-full border border-black/10 bg-white text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-[#cdbbb0] max-[600px]:hidden" /> : null}

            {shadePreview.length && onOpenShades && selectedMedia?.type !== 'video' ? (
              <button
                className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col items-center rounded-full bg-white/95 p-1 shadow-[0_5px_18px_rgba(17,17,17,0.14)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-[#cdbbb0] max-[600px]:right-2"
                type="button"
                onClick={onOpenShades}
                aria-label={shadePickerLabel ?? labels.shades}
                title={shadePickerLabel ?? labels.shades}
              >
                {shadePreview.map((shade) => (
                  <span className={`grid size-[25px] place-items-center rounded-full border border-white p-[2px] ${shade.selected ? 'ring-1 ring-midnight-ink ring-offset-1' : ''}`} key={shade.id}>
                    <span className="size-full rounded-full border border-black/10" style={shade.swatch ? { background: shade.swatch } : undefined} aria-hidden="true" />
                  </span>
                ))}
                {shadePreviewMore > 0 ? <span className="flex h-[40px] w-[40px] items-center justify-center bg-white text-[10px] leading-3 font-normal text-midnight-ink">+{shadePreviewMore}</span> : null}
              </button>
            ) : null}

            {mediaCount > 1 ? (
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 min-[901px]:hidden" aria-label={locale === 'ro' ? 'Galerie de imagini' : 'Галерея изображений'}>
                {media.map((item, index) => (
                  <button key={`${item.type}-${item.src}-${index}`} className={`size-2 rounded-full transition-colors ${index === selectedIndex ? 'bg-midnight-ink' : 'bg-midnight-ink/25'}`} type="button" onClick={() => selectMedia(index)} aria-label={`${index + 1} / ${mediaCount}`} aria-current={index === selectedIndex ? 'true' : undefined} />
                ))}
              </div>
            ) : null}

            {selectedImage ? <span className="pointer-events-none absolute right-4 bottom-4 z-10 hidden rounded-full bg-white/90 p-2 text-midnight-ink opacity-0 transition-opacity group-hover/product-gallery:opacity-100 min-[901px]:block"><Maximize2 className="size-4" /></span> : null}
          </div>
        </div>
      </div>

      {isLightboxOpen && mediaCount > 0 ? (
        <div className="fixed inset-0 z-[90] bg-white" role="dialog" aria-modal="true" aria-label={locale === 'ro' ? `Galerie: ${title}` : `Галерея: ${title}`}>
          <div ref={mobileLightboxRef} className="absolute inset-0 flex flex-col overflow-y-auto bg-white min-[601px]:hidden">
            {media.map((item, index) => (
              <div className="flex min-h-[75vh] w-full shrink-0 items-center justify-center bg-[#f2f2f2]" data-gallery-index={index} key={`${item.type}-${item.src}-${index}`}>
                {item.type === 'video' ? <div className="aspect-video w-full"><YouTubeFrame id={item.src} title={title} /></div> : renderMedia(item, 'size-full object-contain mix-blend-multiply')}
              </div>
            ))}
          </div>

          <div className="absolute inset-0 hidden bg-white min-[601px]:block">
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className={`relative flex h-[min(88vh,900px)] w-[min(60vw,1000px)] items-center justify-center overflow-hidden ${selectedMedia?.type === 'video' ? 'bg-black' : 'bg-[#f2f2f2]'}`}>
                {selectedMedia?.type === 'video' ? <div className="aspect-video w-full"><YouTubeFrame id={selectedMedia.src} title={title} /></div> : renderMedia(selectedMedia, 'size-full object-contain')}
                {mediaCount > 1 ? (
                  <>
                    <button className="absolute top-1/2 left-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-midnight-ink transition-colors hover:bg-white" type="button" onClick={() => move(-1)} aria-label={labels.previous}><SliderArrowIcon direction="left" className="h-5 w-[30px]" /></button>
                    <button className="absolute top-1/2 right-3 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-midnight-ink transition-colors hover:bg-white" type="button" onClick={() => move(1)} aria-label={labels.next}><SliderArrowIcon direction="right" className="h-5 w-[30px]" /></button>
                    <span className="absolute right-4 bottom-4 rounded-full bg-white/90 px-3 py-1 text-xs text-midnight-ink">{selectedIndex + 1} / {mediaCount}</span>
                  </>
                ) : null}
              </div>
            </div>

            {mediaCount > 1 ? (
              <aside className="absolute top-1/2 left-8 z-10 flex h-[min(84vh,760px)] w-[72px] -translate-y-1/2 flex-col items-center gap-2" aria-label={labels.thumbnails}>
                <button className="inline-flex size-7 shrink-0 items-center justify-center text-graphite hover:text-midnight-ink" type="button" aria-label={locale === 'ro' ? 'Derulează miniaturile în sus' : 'Прокрутить миниатюры вверх'} onClick={() => fullscreenThumbnailRailRef.current?.scrollBy({ top: -260, behavior: 'smooth' })}><ChevronUp className="size-4" /></button>
                <div ref={fullscreenThumbnailRailRef} className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {media.map((item, index) => renderThumbnail(item, index, true))}
                </div>
                <button className="inline-flex size-7 shrink-0 items-center justify-center text-graphite hover:text-midnight-ink" type="button" aria-label={locale === 'ro' ? 'Derulează miniaturile în jos' : 'Прокрутить миниатюры вниз'} onClick={() => fullscreenThumbnailRailRef.current?.scrollBy({ top: 260, behavior: 'smooth' })}><ChevronDown className="size-4" /></button>
              </aside>
            ) : null}
          </div>

          <button className="absolute top-4 right-4 z-20 inline-flex size-11 items-center justify-center bg-white text-midnight-ink transition-colors hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-[#cdbbb0]" type="button" onClick={() => setIsLightboxOpen(false)} aria-label={labels.close}><X className="size-6" strokeWidth={1.4} /></button>
        </div>
      ) : null}
    </div>
  )
}
