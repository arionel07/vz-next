import { ArrowLeft, MapPin, PackageCheck, Phone, UserRound } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { formatOrderAmount, getAdminOrderDetail, getOrderDeliveryLabel, getOrderPaymentLabel, getOrderPaymentStyle, getOrderSourceLabel, getOrderStatusLabel, parseOrderAmount, type AdminOrderStatus } from '@/lib/admin-orders'
import { legacyAsset } from '@/lib/legacy-assets'

function statusStyle(status: AdminOrderStatus) {
  if (status === 'new') return 'bg-[#007aff]/10 text-[#005bc4]'
  if (status === 'progress') return 'bg-[#fff1c2] text-[#755400]'
  if (status === 'finished') return 'bg-[#e7f4ea] text-[#28623a]'
  return 'bg-[#f1f1f1] text-[#666]'
}

function formatDate(value: string | Date | null) {
  return value ? String(value).replace('T', ' ').slice(0, 16) : '—'
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id <= 0) notFound()
  const data = await getAdminOrderDetail(id)
  if (!data) notFound()

  const { order, items } = data
  const status = order.status as AdminOrderStatus
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const paymentLabel = getOrderPaymentLabel(order.payment, order.paySuccess)
  const paymentStatus = order.payment === 2
    ? order.paySuccess ? 'Платёж подтверждён' : 'Оплата не подтверждена'
    : order.payment === 1 || order.payment === 3 ? 'Оплата при получении'
      : 'Оплата позднее'

  return (
    <div className="space-y-5 lg:space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link aria-label="Назад к заказам" className="grid size-9 place-items-center rounded-xl border border-[#dfe2e4] bg-white text-[#45494c] transition-colors hover:bg-[#f7f8f8] focus-visible:outline-2 focus-visible:outline-[#007AFF]" href="/admin/orders"><ArrowLeft aria-hidden="true" size={17} /></Link>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[30px]">Заказ #{order.orderId ?? order.id}</h1>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${statusStyle(status)}`}>{getOrderStatusLabel(status)}</span>
            </div>
            <p className="text-[11px] text-[#777b7e]">Создан {formatDate(order.added)} · {getOrderSourceLabel(order.orderSource)}</p>
          </div>
        </div>
      </header>

      <div className="sticky top-16 z-30 flex items-center justify-between gap-3 rounded-xl border border-[#dfe2e4] bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-[10px] text-[#777b7e]">Итого · {quantity} шт.</p>
          <strong className="block text-[17px] leading-6 font-semibold text-[#202223]">{formatOrderAmount(order.total)}</strong>
        </div>
        <span className={`max-w-[58%] truncate rounded-full px-2.5 py-1.5 text-[10px] font-medium ${getOrderPaymentStyle(order.payment, order.paySuccess)}`}>{paymentLabel}</span>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white" aria-labelledby="order-info-title">
            <div className="flex items-center justify-between gap-3 border-b border-[#eceeef] px-5 py-4">
              <h2 className="text-[14px] font-semibold text-[#202223]" id="order-info-title">Информация о заказе</h2>
              <span className="text-[10px] text-[#777b7e]">{quantity} шт.</span>
            </div>
            <dl className="space-y-3 px-5 py-4 text-[11px]">
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3"><dt className="text-[#777b7e]">Способ доставки</dt><dd className="font-medium text-[#303438]">{getOrderDeliveryLabel(order.delivery)}</dd></div>
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] items-center gap-3"><dt className="text-[#777b7e]">Способ оплаты</dt><dd><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${getOrderPaymentStyle(order.payment, order.paySuccess)}`}>{paymentLabel}</span><p className="mt-1 text-[9px] text-[#858a8d]">{paymentStatus}</p></dd></div>
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3"><dt className="text-[#777b7e]">Дата заказа</dt><dd className="font-medium text-[#303438]">{formatDate(order.added)}</dd></div>
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3"><dt className="text-[#777b7e]">Стоимость доставки</dt><dd className="font-medium text-[#303438]">{formatOrderAmount(order.deliveryPrice)}</dd></div>
              {order.promoCode || parseOrderAmount(order.promoDiscount) > 0 ? <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3"><dt className="text-[#777b7e]">Промокод{order.promoCode ? ` · ${order.promoCode}` : ''}</dt><dd className="font-medium text-[#8e1f2d]">−{formatOrderAmount(order.promoDiscount)}</dd></div> : null}
              {order.voucher && order.voucher !== '0' ? <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3"><dt className="text-[#777b7e]">Сертификат / ваучер</dt><dd className="font-medium text-[#303438]">Применён</dd></div> : null}
              {parseOrderAmount(order.bonusMinus) > 0 ? <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3"><dt className="text-[#777b7e]">Списано бонусов</dt><dd className="font-medium text-[#303438]">−{formatOrderAmount(order.bonusMinus)}</dd></div> : null}
              {parseOrderAmount(order.bonusPlus) > 0 ? <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3"><dt className="text-[#777b7e]">Начислено бонусов</dt><dd className="font-medium text-[#303438]">+{formatOrderAmount(order.bonusPlus)}</dd></div> : null}
              <div className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3 border-t border-[#eceeef] pt-3"><dt className="font-semibold text-[#202223]">Сумма заказа</dt><dd className="text-[15px] font-semibold text-[#202223]">{formatOrderAmount(order.total)}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-[#e2e4e6] bg-white p-5" aria-labelledby="order-notes-title">
            <h2 className="text-[14px] font-semibold text-[#202223]" id="order-notes-title">Комментарий к заказу</h2>
            <p className="mt-3 whitespace-pre-wrap text-[12px] leading-5 text-[#555a5d]">{order.message?.trim() || order.notes?.trim() || 'Комментарий не добавлен.'}</p>
          </section>
        </div>

        <section className="rounded-2xl border border-[#e2e4e6] bg-white p-5" aria-labelledby="order-customer-title">
          <div className="mb-4 flex items-center gap-2.5"><UserRound aria-hidden="true" className="text-[#555a5d]" size={17} /><h2 className="text-[14px] font-semibold text-[#202223]" id="order-customer-title">Информация о клиенте</h2></div>
          <dl className="space-y-4 text-[11px]">
            <div><dt className="text-[10px] text-[#858a8d]">Имя</dt><dd className="mt-1 text-[12px] font-medium text-[#303438]">{[order.name, order.surname].filter(Boolean).join(' ') || 'Гость'}</dd></div>
            {order.email ? <div><dt className="text-[10px] text-[#858a8d]">Email</dt><dd className="mt-1"><a className="break-all text-[#0062CC] hover:underline" href={`mailto:${order.email}`}>{order.email}</a></dd></div> : null}
            <div><dt className="text-[10px] text-[#858a8d]">Телефон</dt><dd className="mt-1">{order.phone ? <a className="inline-flex items-center gap-1.5 text-[#303438] hover:text-[#0062CC]" href={`tel:${order.phone}`}><Phone aria-hidden="true" size={13} />{order.phone}</a> : '—'}</dd></div>
            <div><dt className="text-[10px] text-[#858a8d]">Адрес</dt><dd className="mt-1 flex items-start gap-1.5 whitespace-pre-line leading-5 text-[#555a5d]"><MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={13} />{[order.address, order.street, order.locality, order.town, order.city].filter((value, index, values) => value?.trim() && values.indexOf(value) === index).join(', ') || (order.delivery === 1 ? 'Самовывоз' : 'Адрес не указан')}</dd></div>
            {order.stores ? <div><dt className="text-[10px] text-[#858a8d]">Магазин самовывоза</dt><dd className="mt-1 text-[#555a5d]">#{order.stores}</dd></div> : null}
          </dl>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white" aria-labelledby="order-items-title">
        <div className="border-b border-[#eceeef] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5"><PackageCheck aria-hidden="true" className="text-[#555a5d]" size={18} /><h2 className="text-[14px] font-semibold text-[#202223]" id="order-items-title">Товары · {quantity} шт.</h2></div>
            <span className="text-[11px] text-[#707477]">Канал: {getOrderSourceLabel(order.orderSource)}</span>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[#777b7e]">SKU, штрихкод и название склада берутся из карточки товара/варианта, заполненной данными 1С. Исторический снимок этих полей в заказе пока не хранится.</p>
        </div>
        <div className="divide-y divide-[#eceeef]">
          {items.length ? items.map((item) => {
            const image = legacyAsset(item.image)
            return (
              <article className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-5" key={item.id}>
                <div className="mt-0.5 grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f2f2f2]">
                  {image ? <img alt="" className="size-full object-contain mix-blend-multiply" src={image} /> : <span className="text-[10px] text-[#8b8f92]">#{item.productId ?? '—'}</span>}
                </div>
                <div className="min-w-[150px] flex-1">
                  {item.brand ? <p className="text-[9px] font-medium tracking-[0.08em] text-[#777b7e] uppercase">{item.brand}</p> : null}
                  <h3 className="mt-0.5 text-[12px] leading-5 font-medium text-[#202223]">{item.title}</h3>
                  {item.variant ? <p className="mt-0.5 text-[10px] text-[#777b7e]">Вариант: {item.variant}</p> : null}
                  <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[10px] leading-4 sm:grid-cols-2 2xl:grid-cols-3">
                    <div className="flex min-w-0 gap-1"><dt className="shrink-0 text-[#858a8d]">Код / SKU:</dt><dd className="min-w-0 break-all text-[#45494c]">{item.sku || '—'}</dd></div>
                    <div className="flex min-w-0 gap-1"><dt className="shrink-0 text-[#858a8d]">Штрихкод:</dt><dd className="min-w-0 break-all text-[#45494c]">{item.barcode || '—'}</dd></div>
                    <div className="flex min-w-0 gap-1 sm:col-span-2 2xl:col-span-1"><dt className="shrink-0 text-[#858a8d]">Склад 1С:</dt><dd className="min-w-0 break-words text-[#45494c]">{item.warehouseName || '—'}</dd></div>
                  </dl>
                  {item.isGift ? <span className="mt-2 inline-flex rounded-full bg-[#fff2cc] px-2 py-1 text-[9px] font-medium text-[#785700]">Подарок</span> : null}
                </div>
                <div className="ml-auto flex w-full items-end justify-between gap-4 border-t border-[#f0f1f2] pt-2 text-[11px] text-[#555a5d] sm:ml-0 sm:w-auto sm:min-w-[150px] sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p>{item.quantity} шт. × {formatOrderAmount(item.price)}</p>
                    {item.promoDiscount > 0 ? <p className="mt-1 text-[10px] text-[#8e1f2d]">Промокод: −{formatOrderAmount(item.promoDiscount)}</p> : null}
                  </div>
                  <strong className="min-w-[86px] text-right text-[12px] font-semibold text-[#202223]">{formatOrderAmount(item.total)}</strong>
                </div>
              </article>
            )
          }) : <p className="px-5 py-8 text-[12px] text-[#777b7e]">В заказе нет позиций.</p>}
        </div>
      </section>
    </div>
  )
}
