'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from 'motion/react'

export type CustomSelectOption = {
  value: string
  label: string
}

type Props = {
  value: string
  label: string
  title?: string
  options: CustomSelectOption[]
  closeLabel: string
  triggerClassName?: string
  onChange: (value: string) => void
}

const DISMISS_OFFSET = 120
const DISMISS_VELOCITY = 600

export function CustomSelect({ value, label, title = label, options, closeLabel, triggerClassName = '', onChange }: Props) {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const touchStartY = useRef<number | null>(null)
  const selected = options.find((option) => option.value === value)?.label ?? label

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(nextValue: string) {
    setOpen(false)
    onChange(nextValue)
  }

  function handleMobileDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) setOpen(false)
  }

  const mobileSheet = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence initial={false}>
      {open ? (
        <>
          <motion.button
            key="sort-sheet-backdrop"
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[1990] bg-black/35 min-[601px]:hidden"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            key="sort-sheet"
            className="fixed inset-x-0 bottom-0 z-[2000] touch-none rounded-t-[28px] bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.16)] min-[601px]:hidden"
            onTouchStart={(event) => { touchStartY.current = event.touches[0]?.clientY ?? null }}
            onTouchEnd={() => { touchStartY.current = null }}
            role="listbox"
            aria-label={title}
            initial={reduceMotion ? { y: 0 } : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduceMotion ? { y: 0 } : { y: '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleMobileDragEnd}
          >
            <span aria-hidden="true" className="mx-auto mb-5 block h-1 w-10 rounded-full bg-[#e6e6e6]" />
            <p className="m-0 px-1 pb-4 text-center text-[20px] font-normal tracking-[-0.03em] text-[#141414]">{title}</p>
            <div className="space-y-1">
              {options.map((option) => (
                <button
                  key={option.value || 'default'}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => choose(option.value)}
                  className={`flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl px-3 text-left text-[14px] transition-colors hover:bg-[#f6f4f2] ${option.value === value ? 'font-medium text-[#141414]' : 'text-[#555]'}`}
                >
                  <span>{option.label}</span>
                  {option.value === value ? <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.7} /> : null}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  ) : null

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex max-w-[175px] items-center gap-1 bg-transparent py-2 pr-5 text-left text-[13px] font-medium outline-none transition-colors hover:text-[#777] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#cdbbb0] max-[560px]:max-w-[145px] ${triggerClassName}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected}</span>
        <ChevronDown aria-hidden="true" className={`pointer-events-none absolute right-0 size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
      {open ? (
          <motion.div
            key="desktop-select"
            className="absolute top-[calc(100%+8px)] left-0 z-[1200] min-w-[240px] rounded-2xl border border-[#e8e8e8] bg-white p-2 shadow-[0_16px_44px_rgba(0,0,0,0.14)] max-[600px]:hidden"
            role="listbox"
            aria-label={title}
            initial={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -4, scale: 0.985 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="m-0 px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#777]">{title}</p>
            <div className="space-y-1">
              {options.map((option) => (
                <button
                  key={option.value || 'default'}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => choose(option.value)}
                  className={`flex min-h-11 w-full items-center justify-between gap-4 rounded-xl px-3 text-left text-[14px] transition-colors hover:bg-[#f6f4f2] max-[600px]:min-h-12 max-[600px]:rounded-2xl ${option.value === value ? 'font-medium text-[#141414]' : 'text-[#555]'}`}
                >
                  <span>{option.label}</span>
                  {option.value === value ? <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.7} /> : null}
                </button>
              ))}
            </div>
          </motion.div>
      ) : null}
      </AnimatePresence>
      {mobileSheet}
    </div>
  )
}
