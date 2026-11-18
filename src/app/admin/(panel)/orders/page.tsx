import { ArrowDownToLine, ArrowUpRight, Plus, Search, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

import { formatOrderAmount, getAdminOrders, getOrderDeliveryLabel, getOrderPaymentLabel, getOrderPaymentStyle, getOrderSourceLabel, getOrderStatusLabel, type AdminOrderStatus } from '@/lib/admin-orders'

const statuses: AdminOrderStatus[] = ['new', 'progress', 'finished', 'canceled']

function statusStyle(status: AdminOrderStatus) {
  if (status === 'new') return 'bg-[#007aff]/10 text-[#005bc4]'
  if (status === 'progress') return 'bg-[#fff1c2] text-[#755400]'
  if (status === 'finished') return 'bg-[#e7f4ea] text-[#28623a]'
  return 'bg-[#f1f1f1] text-[#666]'
}

function formatDate(value: string | Date | null) {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const status = statuses.includes(params.status as AdminOrderStatus) ? params.status as AdminOrderStatus : undefined
  const data = await getAdminOrders({ query, status })

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#f1f2f3] text-[#303438]"><ShoppingBag aria-hidden="true" size={20} /></span>
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">Магазин</p>
            <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[30px]">Заказы</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d9dcde] bg-white px-3.5 text-[12px] font-medium text-[#303438] transition-colors hover:border-[#007AFF] hover:text-[#0062CC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" href="/api/admin/orders/export">
            <ArrowDownToLine aria-hidden="true" size={15} /> Экспорт
          </a>
          <Link className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#202223] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" href="/admin/orders/new">
            <Plus aria-hidden="true" size={16} /> Создать заказ
          </Link>
        </div>
      </header>

      <section aria-label="Сводка заказов" className="grid overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Заказов сегодня', value: data.stats.today },
          { label: 'Новые', value: data.stats.new },
          { label: 'В обработке', value: data.stats.progress },
          { label: 'Завершены', value: data.stats.finished },
        ].map((metric, index) => (
          <div className={`flex min-h-[94px] flex-col justify-center px-5 py-4 ${index > 0 ? 'border-t border-[#eceeef] sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'xl:border-l' : ''}`} key={metric.label}>
            <p className="text-[11px] text-[#73777a]">{metric.label}</p>
            <p className="mt-1 text-[24px] leading-7 font-semibold tracking-[-0.03em] text-[#202223]">{metric.value.toLocaleString('ru-RU')}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
        <form action="/admin/orders" className="flex flex-wrap items-center gap-3 border-b border-[#e5e7e9] p-3 sm:p-4" method="get">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Поиск по заказам</span>
            <Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={17} />
            <input className="h-10 w-full rounded-xl border border-[#dfe2e4] bg-white pr-3 pl-10 text-[12px] outline-none transition-colors placeholder:text-[#969a9d] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15" defaultValue={query} name="q" placeholder="Номер, имя, телефон или email" type="search" />
          </label>
          <label>
            <span className="sr-only">Статус заказа</span>
            <select className="h-10 min-w-[160px] rounded-xl border border-[#dfe2e4] bg-white px-3 text-[12px] text-[#303438] outline-none focus:border-[#007AFF]" defaultValue={status ?? ''} name="status">
              <option value="">Все статусы</option>
              {statuses.map((value) => <option key={value} value={value}>{getOrderStatusLabel(value)}</option>)}
            </select>
          </label>
          <button className="h-10 rounded-xl border border-[#d9dcde] bg-[#f7f8f8] px-4 text-[12px] font-medium text-[#303438] transition-colors hover:bg-[#eceeef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" type="submit">Показать</button>
          {query || status ? <Link className="px-1 text-[12px] text-[#0062CC] hover:underline" href="/admin/orders">Сбросить</Link> : null}
        </form>

        {data.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-[12px]">
              <thead className="bg-[#f7f7f7] text-[#62666a]">
                <tr>
                  <th className="px-4 py-3 font-medium">Заказ</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Покупатель</th>
                  <th className="px-4 py-3 font-medium">Канал</th>
                  <th className="px-4 py-3 text-right font-medium">Сумма</th>
                  <th className="px-4 py-3 font-medium">Оплата</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Товары</th>
                  <th className="px-4 py-3 font-medium">Доставка</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eceeef]">
                {data.rows.map((order) => (
                  <tr className="group transition-colors hover:bg-[#fafafa]" key={order.id}>
                    <td className="px-4 py-3.5 font-semibold text-[#202223]">
                      <Link className="rounded-sm hover:text-[#0062CC] focus-visible:outline-2 focus-visible:outline-[#007AFF]" href={`/admin/orders/${order.id}`}>#{order.orderId ?? order.id}</Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#666b6e]">{formatDate(order.added)}</td>
                    <td className="max-w-[200px] px-4 py-3.5">
                      <p className="truncate font-medium text-[#303438]">{[order.name, order.surname].filter(Boolean).join(' ') || 'Гость'}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[#858a8d]">{order.phone || order.email || 'Контакты не указаны'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-[#555a5d]">{getOrderSourceLabel(order.orderSource)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-[#303438]">{formatOrderAmount(order.total)}</td>
                    <td className="px-4 py-3.5"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium ${getOrderPaymentStyle(order.payment, order.paySuccess)}`}>{getOrderPaymentLabel(order.payment, order.paySuccess)}</span></td>
                    <td className="px-4 py-3.5"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium ${statusStyle(order.status)}`}>{getOrderStatusLabel(order.status)}</span></td>
                    <td className="px-4 py-3.5 text-[#555a5d]">{order.itemCount} шт.</td>
                    <td className="px-4 py-3.5 text-[#555a5d]">{getOrderDeliveryLabel(order.delivery)}</td>
                    <td className="px-3 py-3.5 text-[#8a8e91]"><Link aria-label={`Открыть заказ ${order.orderId ?? order.id}`} className="inline-flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-[#eef5ff] hover:text-[#0062CC] focus-visible:outline-2 focus-visible:outline-[#007AFF]" href={`/admin/orders/${order.id}`}><ArrowUpRight aria-hidden="true" size={15} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-[250px] place-items-center px-6 py-12 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f1f2f3] text-[#707477]"><ShoppingBag aria-hidden="true" size={20} /></span>
              <h2 className="mt-4 text-[15px] font-medium text-[#202223]">Заказы не найдены</h2>
              <p className="mt-1 text-[12px] text-[#777b7e]">Попробуйте изменить запрос или сбросить фильтры.</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eceeef] px-4 py-3 text-[10px] text-[#777b7e]">
          <span>Показано {data.rows.length} заказов · максимум 100</span>
          <span>Данные из заказов магазина</span>
        </div>
      </section>
    </div>
  )
}
