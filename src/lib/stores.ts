import { asc, eq } from 'drizzle-orm'

import { db } from '@/db'
import type { StoreLocale } from '@/lib/locale-routing'
import { stores } from '../../drizzle/schema'

export type Store = {
  id: number
  title: string
  address: string
  schedule: string
  phone: string
  lat: number
  lng: number
}

const DEFAULT_COORDS = { lat: 47.0183674, lng: 28.8516902 }
const STORE_BRANCHES = [
  ['port mall', 'port'],
  ['shopping malldova', 'malldova', 'mall'],
  ['gemini'],
  ['unic'],
  ['sun city', 'suncity'],
] as const

function parseCoords(value: string | null) {
  const [latValue, lngValue] = (value ?? '').split(',').map((part) => Number(part.trim()))
  return {
    lat: Number.isFinite(latValue) ? latValue : DEFAULT_COORDS.lat,
    lng: Number.isFinite(lngValue) ? lngValue : DEFAULT_COORDS.lng,
  }
}

export async function getStoresPage(locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const rows = await db
    .select({
      id: stores.id,
      title: isRomanian ? stores.titleRo : stores.titleRu,
      address: isRomanian ? stores.textRo : stores.textRu,
      schedule: isRomanian ? stores.descRo : stores.descRu,
      phone: stores.phone,
      coords: stores.coords,
    })
    .from(stores)
    .where(eq(stores.isShown, 1))
    .orderBy(asc(stores.sorder), asc(stores.id))

  const availableStores = rows.map((row) => ({
    id: row.id,
    title: row.title ?? 'Магазин Vizaje-Nica',
    address: row.address ?? '',
    schedule: row.schedule ?? '',
    phone: row.phone ?? '',
    ...parseCoords(row.coords),
  })) satisfies Store[]

  const unusedIds = new Set(availableStores.map((store) => store.id))
  const orderedStores: Store[] = []

  for (const aliases of STORE_BRANCHES) {
    const match = availableStores.find((store) => {
      if (!unusedIds.has(store.id)) return false
      const searchText = `${store.title} ${store.address}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      return aliases.some((alias) => searchText.includes(alias))
    })
    if (!match) continue
    orderedStores.push(match)
    unusedIds.delete(match.id)
  }

  for (const store of availableStores) {
    if (unusedIds.has(store.id)) orderedStores.push(store)
  }

  return orderedStores
}
