'use client'

import { useEffect, useState } from 'react'

import type { CatalogProduct } from './catalog'

export function useCartRecommendations({ productIds, locale, enabled = true }: {
  productIds: number[]
  locale: 'ru' | 'ro'
  enabled?: boolean
}) {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const signature = [...new Set(productIds)].sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (!enabled || !signature) {
      setProducts([])
      return
    }

    const controller = new AbortController()
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(`/api/cart/recommendations?ids=${signature}&locale=${locale}`, { signal: controller.signal })
        if (!response.ok) return
        const result = await response.json() as { products: CatalogProduct[] }
        if (!cancelled) setProducts(result.products)
      } catch {
        // Recommendations are a nice-to-have; a failed fetch just leaves the rail empty.
      }
    }

    void load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [signature, locale, enabled])

  return products
}
