'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

export function SmoothScroll() {
  useEffect(() => {
    const scrollTopAfterProductBack = () => {
      if (window.sessionStorage.getItem('vz:scroll-top-after-product-back') !== '1') return
      window.sessionStorage.removeItem('vz:scroll-top-after-product-back')
      const reset = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        lenis.scrollTo(0, { immediate: true })
      }
      window.requestAnimationFrame(() => window.requestAnimationFrame(reset))
    }

    const lenis = new Lenis({
      duration: 0.7,
      easing: (time) => 1 - Math.pow(1 - time, 4),
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      stopInertiaOnNavigate: true,
      autoRaf: false,
      prevent: (node) => Boolean(node.closest('[role="dialog"], [data-lenis-prevent]')),
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = window.requestAnimationFrame(raf)
    }

    frame = window.requestAnimationFrame(raf)
    window.addEventListener('popstate', scrollTopAfterProductBack)
    scrollTopAfterProductBack()
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('popstate', scrollTopAfterProductBack)
      lenis.destroy()
    }
  }, [])

  return null
}
