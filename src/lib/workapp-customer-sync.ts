import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { getBonusAccum, getCustomerByPhone, isWorkAppEnabled, postCustomerInfoByPhone } from '@/lib/workapp-client'
import { clients } from '../../drizzle/schema'

type SyncClient = {
  id: number
  phone: string | null
  name: string | null
  surname: string | null
  birthday?: string | null
}

function birthDateForWorkApp(value: string | null | undefined) {
  const text = (value ?? '').trim()
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`
  const dotted = text.match(/^(\d{2})[./](\d{2})[./](\d{4})$/)
  if (dotted) return `${dotted[3]}${dotted[2]}${dotted[1]}`
  return /^\d{8}$/.test(text) ? text : undefined
}

/**
 * Pulls Discount and Bonus from WorkApp into `clients`, like legacy's
 * Account::workappGet(). Unlike legacy, a failed bonus request leaves the
 * local bonus untouched, and the WorkApp name only fills an empty local name.
 */
export async function pullCustomerFromWorkApp(client: SyncClient) {
  if (!isWorkAppEnabled() || !client.phone) return { synced: false as const }

  const customer = await getCustomerByPhone(client.phone)
  if (!customer.ok || !customer.data.Discount || !customer.data.Code) return { synced: false as const }

  const update: Partial<typeof clients.$inferInsert> = { discount: String(customer.data.Discount).slice(0, 16) }

  const bonus = await getBonusAccum(String(customer.data.Code))
  if (bonus.ok && bonus.data.Bonus !== undefined && bonus.data.Bonus !== null) {
    update.bonus = String(bonus.data.Bonus).slice(0, 16)
  }

  const localName = (client.name ?? '').trim()
  if ((!localName || localName === '0') && customer.data.Name) {
    const [name, surname] = String(customer.data.Name).trim().split(/\s+/)
    if (name) {
      update.name = name.slice(0, 255)
      if (surname && !client.surname) update.surname = surname.slice(0, 256)
    }
  }

  await db.update(clients).set(update).where(eq(clients.id, client.id))
  return { synced: true as const }
}

/** Sends the client's contact data to WorkApp, like legacy's Account::workappPost(). */
export async function pushCustomerToWorkApp(client: SyncClient) {
  if (!isWorkAppEnabled() || !client.phone) return { sent: false as const }

  const result = await postCustomerInfoByPhone({
    phone: client.phone,
    name: client.name && client.name !== '0' ? client.name : undefined,
    surname: client.surname ?? undefined,
    birthDate: birthDateForWorkApp(client.birthday),
  })
  return { sent: result.ok }
}
