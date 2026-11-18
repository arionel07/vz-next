import { desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { orders } from '../../../../../../drizzle/schema'

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ message: 'Требуется вход в админку.' }, { status: 401 })

  try {
    const rows = await db.select().from(orders).orderBy(desc(orders.added), desc(orders.id))
    const headers = ['ID', 'Номер заказа', 'Дата', 'Статус', 'Источник', 'Имя', 'Фамилия', 'Email', 'Телефон', 'Сумма MDL', 'Доставка', 'Цена доставки MDL', 'Оплата', 'Оплата подтверждена', 'Адрес', 'Комментарий']
    const body = rows.map((order) => [
      order.id,
      order.orderId,
      order.added,
      order.status,
      order.orderSource,
      order.name,
      order.surname,
      order.email,
      order.phone,
      order.total,
      order.delivery,
      order.deliveryPrice,
      order.payment,
      order.paySuccess,
      order.address,
      order.message,
    ].map(csvCell).join(','))
    const csv = `\uFEFF${headers.map(csvCell).join(',')}\r\n${body.join('\r\n')}`
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="vizaje-nica-orders.csv"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Failed to export admin orders', error)
    return NextResponse.json({ message: 'Не удалось экспортировать заказы.' }, { status: 500 })
  }
}
