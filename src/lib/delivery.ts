import { asc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { delivery, menu } from '../../drizzle/schema'

export type DeliverySection = {
  title: string
  left: string
  right: string
}

export type DeliveryPageData = {
  title: string
  intro: string
  note: string
  sections: DeliverySection[]
}

const fallback: Record<'ru' | 'ro', DeliveryPageData> = {
ru: {
  title: 'Доставка',
  intro: 'Выберите удобный способ получения заказа — доставку курьером или самовывоз из магазина.',
  note: 'Условия и стоимость доставки рассчитываются при оформлении заказа.',
  sections: [
    {
      title: 'Доставка по Кишинёву',
      left: 'Курьер привезёт заказ по указанному адресу после подтверждения менеджером.',
      right: 'Точную стоимость и удобное время доставки мы согласуем с вами по телефону.',
    },
    {
      title: 'Самовывоз',
      left: 'Заказ можно забрать из магазина Shopping Malldova.',
      right: 'Мы сообщим, когда заказ будет собран и готов к получению.',
    },
    {
      title: 'Сроки получения',
      left: 'Срок зависит от выбранного способа получения и наличия товара.',
      right: 'Если товар нужно дополнительно переместить, менеджер заранее предупредит вас.',
    },
    {
      title: 'Важная информация',
      left: 'Пожалуйста, проверяйте заказ при получении.',
      right: 'Если у вас появились вопросы, обратитесь в службу поддержки или свяжитесь с нами.',
    },
  ],
},
ro: {
  title: 'Livrare',
  intro: 'Alegeți o metodă comodă de ridicare a comenzii: livrare prin curier sau ridicare din magazin.',
  note: 'Condițiile și costul livrării se calculează la plasarea comenzii.',
  sections: [
    { title: 'Livrare în Chișinău', left: 'Curierul va livra comanda la adresa indicată după confirmarea managerului.', right: 'Vom confirma telefonic costul exact și intervalul de livrare convenabil.' },
    { title: 'Ridicare din magazin', left: 'Comanda poate fi ridicată din magazinul Shopping MallDova.', right: 'Vă vom anunța când comanda este pregătită pentru ridicare.' },
    { title: 'Termene de livrare', left: 'Termenul depinde de metoda de livrare aleasă și de disponibilitatea produsului.', right: 'Dacă produsul trebuie transferat, managerul vă va informa din timp.' },
    { title: 'Informații importante', left: 'Vă rugăm să verificați comanda la primire.', right: 'Dacă aveți întrebări, contactați serviciul de asistență.' },
  ],
},
}

export async function getDeliveryPage(language: 'ru' | 'ro' = 'ru'): Promise<DeliveryPageData> {
  try {
    const isRomanian = language === 'ro'
    const [row] = await db
      .select()
      .from(delivery)
      .where(eq(delivery.isShown, 1))
      .orderBy(asc(delivery.sorder), asc(delivery.id))
      .limit(1)

    const [page] = await db
      .select({ title: isRomanian ? menu.titleRo : menu.titleRu })
      .from(menu)
      .where(eq(isRomanian ? menu.uriRo : menu.uriRu, isRomanian ? 'livrare' : 'dostavka'))
      .limit(1)

    const fallbackPage = fallback[language]
    if (!row) return { ...fallbackPage, title: page?.title || fallbackPage.title }

    const suffix = isRomanian ? 'Ro' : 'Ru'
    const value = (field: string) => String((row as Record<string, unknown>)[`${field}${suffix}`] ?? '').trim()
    const sections = [1, 2, 3, 4].map((index) => ({
      title: value(`title${index}`),
      left: value(`descL${index}`),
      right: value(`descR${index}`),
    })).filter((section) => section.title || section.left || section.right)

    return {
      title: page?.title || fallbackPage.title,
      intro: value('text1') || fallbackPage.intro,
      note: value('note1') || fallbackPage.note,
      sections: sections.length ? sections : fallbackPage.sections,
    }
  } catch {
    return fallback[language]
  }
}
