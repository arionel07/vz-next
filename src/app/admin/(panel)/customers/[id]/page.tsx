import { ArrowLeft, BadgeCheck, CalendarClock, Gift, MapPin, ShoppingBag, UserRound } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminCustomerEditor } from '@/components/admin/admin-customer-editor'
import { getAdminCustomerDetail } from '@/lib/admin-customers'

function amount(value: number | string | null | undefined) {
  const numeric = Number(String(value ?? 0).replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.'))
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number.isFinite(numeric) ? numeric : 0)} MDL`
}

function date(value: string | null | undefined) {
  if (!value) return '—'
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

const orderStatus: Record<string, string> = { new: 'Новый', progress: 'В обработке', finished: 'Завершён', canceled: 'Отменён' }
const eventType: Record<string, string> = { applied: 'Применён', rejected: 'Отклонён', removed: 'Удалён', used: 'Использован' }

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id < 1) notFound()

  const data = await getAdminCustomerDetail(id)
  if (!data) notFound()

  const { customer, summary } = data
  const name = [customer.name, customer.surname].filter((part) => part && part !== '0').join(' ') || 'Без имени'
  const accountStatus = customer.code === 1 ? (customer.active === 1 ? 'Активен' : 'Неактивен') : 'Не подтверждён'

  return (
    <div className="mx-auto max-w-[1280px] space-y-5 lg:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link aria-label="Вернуться к клиентам" className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#e2e4e6] text-[#555a5d] transition-colors hover:bg-[#f6f7f7] hover:text-[#202223] focus-visible:outline-2 focus-visible:outline-[#007AFF]" href="/admin/customers"><ArrowLeft aria-hidden="true" size={16} /></Link>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f2f3] text-[#303438]"><UserRound aria-hidden="true" size={20} /></span>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">Профиль клиента · ID {customer.id}</p>
            <h1 className="truncate text-[22px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[28px]">{name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-[52px] sm:pl-0">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${customer.code === 1 ? 'bg-[#e7f4ea] text-[#28623a]' : 'bg-[#fff1c2] text-[#755400]'}`}>{accountStatus}</span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${customer.isb2B ? 'bg-[#e6f0ff] text-[#2458a6]' : 'bg-[#f1f2f3] text-[#555a5d]'}`}>{customer.isb2B ? 'B2B' : 'B2C'}</span>
          {customer.isCreator ? <span className="rounded-full bg-[#f3e8ff] px-2.5 py-1 text-[10px] font-medium text-[#6b2fa6]">Криэйтор</span> : null}
        </div>
      </header>

      <section aria-label="Сводка клиента" className="grid overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Всего заказов', value: summary.ordersCount.toLocaleString('ru-RU'), icon: ShoppingBag },
          { label: 'Завершённые заказы', value: amount(summary.completedTotal), icon: BadgeCheck },
          { label: 'Бонусный баланс', value: customer.bonus || '0', icon: Gift },
          { label: 'Персональная скидка', value: customer.discount || '0', icon: UserRound },
        ].map(({ label, value, icon: Icon }, index) => (
          <div className={`flex min-h-[88px] items-center gap-3 px-4 py-3.5 ${index > 0 ? 'border-t border-[#eceeef] sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'xl:border-l' : ''}`} key={label}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f7f8f8] text-[#62666a]"><Icon aria-hidden="true" size={16} /></span>
            <div className="min-w-0"><p className="text-[10px] text-[#73777a]">{label}</p><p className="mt-0.5 truncate text-[16px] leading-5 font-semibold tracking-[-0.02em] text-[#202223]">{value}</p></div>
          </div>
        ))}
      </section>

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <AdminCustomerEditor customer={{
          id: customer.id,
          name: customer.name === '0' ? '' : customer.name,
          surname: customer.surname ?? '',
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          address: customer.address ?? '',
          city: customer.city ?? '',
          house: customer.house ?? '',
          apartament: customer.apartament ?? '',
          porch: customer.porch ?? '',
          active: customer.active,
          isb2B: customer.isb2B,
          isCreator: customer.isCreator,
        }} />

        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
            <div className="flex items-center justify-between border-b border-[#eceeef] px-4 py-3.5 sm:px-5">
              <div><h2 className="text-[13px] font-semibold text-[#202223]">Последние заказы</h2><p className="mt-0.5 text-[10px] text-[#777b7e]">Последние 20 заказов клиента</p></div>
              <ShoppingBag aria-hidden="true" className="text-[#858a8d]" size={17} />
            </div>
            {data.orders.length ? (
              <div className="divide-y divide-[#eceeef]">
                {data.orders.map((order) => (
                  <Link className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[#fafafa] sm:px-5" href={`/admin/orders/${order.id}`} key={order.id}>
                    <span className="min-w-0"><span className="block text-[11px] font-medium text-[#202223]">Заказ #{order.orderId ?? order.id}</span><span className="mt-0.5 block text-[10px] text-[#858a8d]">{date(order.added)} · {order.itemCount} поз.</span></span>
                    <span className="shrink-0 text-right"><span className="block text-[11px] font-medium text-[#303438]">{amount(order.total)}</span><span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] ${order.status === 'finished' ? 'bg-[#e7f4ea] text-[#28623a]' : order.status === 'canceled' ? 'bg-[#f1f2f3] text-[#666b6e]' : 'bg-[#fff1c2] text-[#755400]'}`}>{orderStatus[order.status] ?? order.status}</span></span>
                  </Link>
                ))}
              </div>
            ) : <p className="px-5 py-8 text-center text-[11px] text-[#777b7e]">У клиента пока нет заказов.</p>}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
            <div className="flex items-center justify-between border-b border-[#eceeef] px-4 py-3.5 sm:px-5">
              <div><h2 className="text-[13px] font-semibold text-[#202223]">История промокодов</h2><p className="mt-0.5 text-[10px] text-[#777b7e]">События применения и проверки</p></div>
              <CalendarClock aria-hidden="true" className="text-[#858a8d]" size={17} />
            </div>
            {data.promoEvents.length ? (
              <div className="divide-y divide-[#eceeef]">
                {data.promoEvents.map((event) => (
                  <article className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5" key={event.id}>
                    <div className="min-w-0"><p className="truncate text-[11px] font-medium text-[#202223]">{event.code}</p><p className="mt-0.5 text-[10px] text-[#858a8d]">{eventType[event.eventType] ?? event.eventType}{event.reason ? ` · ${event.reason}` : ''}</p><p className="mt-0.5 text-[9px] text-[#9a9ea1]">{date(event.createdAt)}</p></div>
                    <div className="shrink-0 text-right"><p className="text-[10px] text-[#555a5d]">−{amount(Number(event.discountAmount))}</p><p className="mt-0.5 text-[9px] text-[#858a8d]">Итого {amount(Number(event.finalTotal))}</p></div>
                  </article>
                ))}
              </div>
            ) : <p className="px-5 py-8 text-center text-[11px] text-[#777b7e]">Событий применения промокодов пока нет.</p>}
          </section>

          <section className="rounded-2xl border border-[#e2e4e6] bg-white p-4 sm:p-5">
            <h2 className="text-[13px] font-semibold text-[#202223]">Данные профиля</h2>
            <dl className="mt-3 divide-y divide-[#eceeef] text-[10px]">
              <div className="flex items-center justify-between gap-3 py-2"><dt className="text-[#858a8d]">Телефон подтверждён</dt><dd className="text-right text-[#303438]">{customer.code === 1 ? 'Да' : 'Нет'}</dd></div>
              <div className="flex items-center justify-between gap-3 py-2"><dt className="text-[#858a8d]">SMS-подписка</dt><dd className="text-right text-[#303438]">{customer.smsSubscribe ? 'Включена' : 'Выключена'}</dd></div>
              <div className="flex items-center justify-between gap-3 py-2"><dt className="text-[#858a8d]">Email-подписка</dt><dd className="text-right text-[#303438]">{customer.mailSubscribe ? 'Включена' : 'Выключена'}</dd></div>
              <div className="flex items-center justify-between gap-3 py-2"><dt className="flex items-center gap-1.5 text-[#858a8d]"><MapPin aria-hidden="true" size={12} />Город</dt><dd className="text-right text-[#303438]">{customer.city || 'Не указан'}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
