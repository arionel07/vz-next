import { and, asc, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'

import { db } from '@/db'
import { AUTH_SESSION_COOKIE, findClientById, getUserBySessionToken } from '@/lib/auth'
import { EXPRESS_DELIVERY_PRICE } from '@/lib/delivery-constants'
import type { StoreLocale } from '@/lib/locale-routing'
import { menu, stores } from '../../drizzle/schema'

export type PickupStore = {
  id: number
  title: string
  address: string
  schedule: string
}

export type CheckoutOptions = {
  pickupStores: PickupStore[]
  expressDeliveryEnabled: boolean
  expressDeliveryPrice: number
}

export async function getCheckoutOptions(locale: StoreLocale): Promise<CheckoutOptions> {
  const isRomanian = locale === 'ro'
  const [storeRows, expressRows] = await Promise.all([
    db
      .select({
        id: stores.id,
        title: isRomanian ? stores.titleRo : stores.titleRu,
        address: isRomanian ? stores.textRo : stores.textRu,
        schedule: isRomanian ? stores.descRo : stores.descRu,
      })
      .from(stores)
      .where(and(eq(stores.delivery, 1), eq(stores.isShown, 1)))
      .orderBy(asc(stores.sorder), asc(stores.id)),
    db
      .select({ id: menu.id })
      .from(menu)
      .where(and(eq(menu.id, 39), eq(menu.isShown, 1)))
      .limit(1),
  ])

  const pickupStores: PickupStore[] = storeRows.map((store) => ({
    id: store.id,
    title: store.title ?? (isRomanian ? 'Magazin Vizaje-Nica' : 'Магазин Vizaje-Nica'),
    address: store.address ?? '',
    schedule: store.schedule ?? '',
  }))

  return {
    pickupStores,
    expressDeliveryEnabled: expressRows.length > 0,
    expressDeliveryPrice: EXPRESS_DELIVERY_PRICE,
  }
}

export type CheckoutCustomerPrefill = {
  name: string
  surname: string
  phone: string
  email: string
}

/**
 * Prefill for a logged-in client's contact fields. Legacy's checkout.php
 * uses `$client_info` for this; the Next checkout previously left every
 * field blank even for a logged-in customer, who had to retype their own
 * name/phone/email on every order.
 *
 * Delivery-address fields (clients.address/city/house/apartament/porch)
 * are deliberately NOT prefilled from here: nothing in vz-next currently
 * writes to them (confirmed — only the admin customer view reads them),
 * so for most accounts they'd just be stale or empty legacy data.
 */
export async function getCheckoutCustomerPrefill(): Promise<CheckoutCustomerPrefill | null> {
  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  if (!user) return null

  const client = await findClientById(user.id)
  if (!client) return null

  return {
    name: client.name && client.name !== '0' ? client.name : '',
    surname: client.surname ?? '',
    phone: client.phone ?? '',
    email: client.email ?? '',
  }
}
