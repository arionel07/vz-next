'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const panelVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -28 : 28, opacity: 0 }),
}

export function DrawerViewTransition({
  viewKey,
  direction,
  children,
  className = '',
}: {
  viewKey: string
  direction: number
  children: ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" custom={direction} initial={false}>
      <motion.div
        key={viewKey}
        className={className}
        custom={direction}
        variants={panelVariants}
        initial={reduceMotion ? 'center' : 'enter'}
        animate="center"
        exit={reduceMotion ? 'center' : 'exit'}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
