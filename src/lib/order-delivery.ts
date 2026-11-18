import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { orders, ordersProducts, products, productsVariable, stores } from '../../drizzle/schema'

type OrderLocale = 'ru' | 'ro'

function formatMoney(value: number | string) {
  const number = Number(value)
  return `${Number.isFinite(number) ? number.toFixed(2) : '0.00'} MDL`
}

const DELIVERY_LABEL: Record<OrderLocale, Record<number, string>> = {
  ru: { 1: 'Самовывоз', 2: 'Доставка', 3: 'Срочная доставка' },
  ro: { 1: 'Ridicare personală', 2: 'Livrare', 3: 'Livrare urgentă' },
}

const PAYMENT_LABEL: Record<OrderLocale, Record<number, string>> = {
  ru: { 1: 'Наличными', 3: 'Картой', 4: 'Онлайн (Paynet)' },
  ro: { 1: 'Numerar', 3: 'Card', 4: 'Online (Paynet)' },
}

async function sendViaResend(params: { to: string; cc?: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM
  if (!apiKey || !from) return { sent: false, configured: false }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        ...(params.cc ? { cc: [params.cc] } : {}),
        subject: params.subject,
        text: params.text,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    return { sent: response.ok, configured: true }
  } catch {
    return { sent: false, configured: true }
  }
}

/**
 * Sends the order confirmation email to the buyer, CC'ing ORDER_NOTIFICATION_EMAIL
 * (if set) the way legacy's Cart::email_order() CC'd ORDER_EMAIL. Looks the order
 * back up by id rather than taking the full order payload, so it reflects exactly
 * what was persisted (and can be retried/re-triggered from just the id).
 */
export async function sendOrderConfirmationEmail(orderDbId: number, locale: OrderLocale = 'ru') {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderDbId)).limit(1)
  if (!order) return { sent: false, configured: true, reason: 'order-not-found' as const }
  if (!order.email) return { sent: false, configured: true, reason: 'no-recipient' as const }

  const lineItems = await db
    .select({
      qty: ordersProducts.qty,
      price: ordersProducts.price,
      total: ordersProducts.total,
      options: ordersProducts.options,
      titleRu: products.titleRu,
      titleRo: products.titleRo,
    })
    .from(ordersProducts)
    .leftJoin(products, eq(ordersProducts.productId, products.id))
    .where(eq(ordersProducts.orderId, orderDbId))

  const variantIds = [...new Set(lineItems.map((item) => Number(item.options)).filter((id) => Number.isInteger(id) && id > 0))]
  const variants = variantIds.length
    ? await db
        .select({ id: productsVariable.id, titleRu: productsVariable.titleRu, titleRo: productsVariable.titleRo, colorRu: productsVariable.colorRu, colorRo: productsVariable.colorRo, volumeVar: productsVariable.volumeVar })
        .from(productsVariable)
        .where(inArray(productsVariable.id, variantIds))
    : []
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]))

  let storeName = ''
  if (order.delivery === 1 && order.stores) {
    const [store] = await db.select({ titleRu: stores.titleRu, titleRo: stores.titleRo }).from(stores).where(eq(stores.id, order.stores)).limit(1)
    storeName = (locale === 'ro' ? store?.titleRo : store?.titleRu) ?? ''
  }

  const copy = locale === 'ro'
    ? {
        subject: `Comanda Vizaje-Nica #${order.orderId}`,
        greeting: `Mulțumim pentru comandă, ${order.name || ''}!`.trim(),
        orderLine: (id: number) => `Comanda #${id} a fost înregistrată.`,
        itemsHeading: 'Produse:',
        delivery: 'Livrare',
        address: 'Adresă',
        store: 'Magazin',
        payment: 'Plată',
        discount: 'Reducere',
        bonus: 'Bonusuri folosite',
        total: 'Total de plată',
        contact: 'Vă vom contacta pentru confirmare.',
      }
    : {
        subject: `Заказ Vizaje-Nica №${order.orderId}`,
        greeting: `Спасибо за заказ, ${order.name || ''}!`.trim(),
        orderLine: (id: number) => `Заказ №${id} принят в обработку.`,
        itemsHeading: 'Товары:',
        delivery: 'Доставка',
        address: 'Адрес',
        store: 'Магазин',
        payment: 'Оплата',
        discount: 'Скидка',
        bonus: 'Списано бонусов',
        total: 'Итого к оплате',
        contact: 'Мы свяжемся с вами для подтверждения заказа.',
      }

  const itemLines = lineItems.map((item) => {
    const variant = item.options && Number(item.options) > 0 ? variantsById.get(Number(item.options)) : null
    const baseTitle = (locale === 'ro' ? item.titleRo : item.titleRu) || `#${item.options ?? ''}`
    const variantLabel = variant
      ? [locale === 'ro' ? variant.titleRo : variant.titleRu, locale === 'ro' ? variant.colorRo : variant.colorRu, variant.volumeVar].filter(Boolean).join(', ')
      : ''
    const title = variantLabel ? `${baseTitle} (${variantLabel})` : baseTitle
    return `- ${title} x${item.qty} = ${formatMoney(item.total ?? 0)}`
  })

  const deliveryLabel = order.delivery ? DELIVERY_LABEL[locale][order.delivery] ?? '' : ''
  const paymentLabel = order.payment ? PAYMENT_LABEL[locale][order.payment] ?? '' : ''

  const textLines = [
    copy.greeting,
    copy.orderLine(order.orderId ?? order.id),
    '',
    copy.itemsHeading,
    ...itemLines,
    '',
  ]

  if (deliveryLabel) textLines.push(`${copy.delivery}: ${deliveryLabel}`)
  if (order.delivery === 1 && storeName) textLines.push(`${copy.store}: ${storeName}`)
  if (order.delivery !== 1 && order.address) textLines.push(`${copy.address}: ${order.address}`)
  if (paymentLabel) textLines.push(`${copy.payment}: ${paymentLabel}`)
  if (Number(order.promoDiscount) > 0) textLines.push(`${copy.discount}: ${formatMoney(order.promoDiscount)}`)
  if (Number(order.bonusMinus) > 0) textLines.push(`${copy.bonus}: ${formatMoney(order.bonusMinus)}`)
  textLines.push(`${copy.total}: ${formatMoney(order.total)}`)
  textLines.push('', copy.contact)

  const adminCc = process.env.ORDER_NOTIFICATION_EMAIL || undefined
  return sendViaResend({ to: order.email, cc: adminCc, subject: copy.subject, text: textLines.join('\n') })
}
