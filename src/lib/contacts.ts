import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import type { StoreLocale } from '@/lib/locale-routing'
import { constants, menu, siteSupportSettings } from '../../drizzle/schema'

export type ContactPageData = {
  title: string
  addressLabel: string
  address: string
  workingLabel: string
  workingHours: string
  phoneLabel: string
  phone: string
  emailLabel: string
  email: string
  mapUrl: string
  telegramUrl: string
  telegramHandle: string
}

const fallback: Record<StoreLocale, ContactPageData> = {
  ru: {
  title: 'Контакты',
  addressLabel: 'Адрес',
  address: 'Chișinău, st. Albishoara 42/2 of 3',
  workingLabel: 'Режим работы',
  workingHours: 'Пн. - Пт. 9.00 - 18.00',
  phoneLabel: 'Контактный телефон',
  phone: '',
  emailLabel: 'Email',
  email: 'marketing@vizaje-nica.com',
  mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1359.9213135293487!2d28.834319999999998!3d47.023694000000006!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDfCsDAxJzI1LjMiTiAyOMKwNTAnMDMuNSJF!5e0!3m2!1sru!2sru!4v1440676392962',
  telegramUrl: 'https://t.me/vizaje_nica_support_bot',
  telegramHandle: '@vizaje_nica_support_bot',
  },
  ro: {
    title: 'Contacte',
    addressLabel: 'Adresă',
    address: 'Chișinău, str. Albishoara 42/2 of 3',
    workingLabel: 'Program de lucru',
    workingHours: 'Lun. - Vin. 9.00 - 18.00',
    phoneLabel: 'Telefon de contact',
    phone: '',
    emailLabel: 'Email',
    email: 'marketing@vizaje-nica.com',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1359.9213135293487!2d28.834319999999998!3d47.023694000000006!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDfCsDAxJzI1LjMiTiAyOMKwNTAnMDMuNSJF!5e0!3m2!1sro!2sro!4v1440676392962',
    telegramUrl: 'https://t.me/vizaje_nica_support_bot',
    telegramHandle: '@vizaje_nica_support_bot',
  },
}

export async function getContactPage(locale: StoreLocale = 'ru') {
  const isRomanian = locale === 'ro'
  const fallbackPage = fallback[locale]
  const [page, rows, support] = await Promise.all([
    db
      .select({ title: isRomanian ? menu.titleRo : menu.titleRu })
      .from(menu)
      .where(eq(menu.id, 11))
      .limit(1),
    db
      .select({ name: constants.name, value: isRomanian ? constants.ro : constants.ru })
      .from(constants)
      .where(inArray(constants.name, [
        'CONT_ADDRESS',
        'CONT_ADDRESS1',
        'CONT_WORKING',
        'CONT_WORKING1',
        'CONT_PHONE',
        'CONT_PHONE1',
        'CONT_EMAIL',
        'CONT_EMAIL1',
        'CONT_MAP',
      ])),
    db
      .select({ url: siteSupportSettings.telegramContact })
      .from(siteSupportSettings)
      .where(eq(siteSupportSettings.id, 1))
      .limit(1),
  ])

  const values = Object.fromEntries(rows.map((row) => [row.name ?? '', row.value ?? '']))
  const mapHtml = values.CONT_MAP ?? ''
  const mapUrl = mapHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] ?? fallbackPage.mapUrl
  const telegramUrl = support[0]?.url?.trim() || fallbackPage.telegramUrl

  return {
    title: page[0]?.title || fallbackPage.title,
    addressLabel: values.CONT_ADDRESS || fallbackPage.addressLabel,
    address: values.CONT_ADDRESS1 || fallbackPage.address,
    workingLabel: values.CONT_WORKING || fallbackPage.workingLabel,
    workingHours: values.CONT_WORKING1 || fallbackPage.workingHours,
    phoneLabel: values.CONT_PHONE || fallbackPage.phoneLabel,
    phone: values.CONT_PHONE1 || fallbackPage.phone,
    emailLabel: values.CONT_EMAIL || fallbackPage.emailLabel,
    email: values.CONT_EMAIL1 || fallbackPage.email,
    mapUrl,
    telegramUrl,
    telegramHandle: fallbackPage.telegramHandle,
  } satisfies ContactPageData
}
