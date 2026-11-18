import { connection } from 'next/server'
import { BarChart3, Box, ShoppingBag, UsersRound } from 'lucide-react'
import Link from 'next/link'

import { getAdminAnalytics, type AnalyticsRange } from '@/lib/admin-analytics'

const ranges: { value: AnalyticsRange; label: string }[] = [
  { value: 7, label: '7 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
]

const statusLabels: Record<string, string> = {
  new: 'Новые',
  progress: 'В обработке',
  finished: 'Завершённые',
  canceled: 'Отменённые',
}

const statusStyles: Record<string, { bar: string; dot: string }> = {
  new: { bar: 'bg-[#007AFF]', dot: 'bg-[#007AFF]' },
  progress: { bar: 'bg-[#e0a800]', dot: 'bg-[#e0a800]' },
  finished: { bar: 'bg-[#2e8b57]', dot: 'bg-[#2e8b57]' },
  canceled: { bar: 'bg-[#9b9b9b]', dot: 'bg-[#9b9b9b]' },
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)
}

function formatMoney(value: number) {
  return `${formatNumber(value)} MDL`
}

function salesLinePath(values: number[]) {
  const width = 1000
  const height = 180
  const inset = 8
  const max = Math.max(...values, 1)
  return values.map((value, index) => {
    const x = inset + (values.length > 1 ? (index / (values.length - 1)) * (width - inset * 2) : (width - inset * 2) / 2)
    const y = height - inset - (value / max) * (height - inset * 2)
    return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

function formatPeriod(start: string, end: string) {
  const format = (value: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
  return `${format(start)} — ${format(end)}`
}

function sourceLabel(source: string) {
  if (source === 'web') return 'Сайт'
  if (source === 'app') return 'Приложение'
  if (source === 'admin') return 'Админка'
  return source === 'unknown' ? 'Не указан' : source.toUpperCase()
}

function paymentLabel(payment: number | null) {
  if (payment === 1) return 'Наличными'
  if (payment === 2) return 'Онлайн'
  if (payment === 3) return 'Картой курьеру'
  if (payment === 0) return 'Оплата позднее'
  return 'Не указан'
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await connection()
  const params = await searchParams
  const range = ranges.some(({ value }) => String(value) === params.range)
    ? Number(params.range) as AnalyticsRange
    : 30
  const data = await getAdminAnalytics(range)
  const maxStatusCount = Math.max(...data.statuses.map(({ count }) => count), 1)
  const maxProductSales = Math.max(...data.products.map(({ sales }) => sales), 1)
  const salesChange = data.previousSales > 0 ? ((data.sales - data.previousSales) / data.previousSales) * 100 : null
  const fulfilledCount = data.statuses.find(({ status }) => status === 'finished')?.count ?? 0

  const metrics = [
    {
      label: 'Сумма заказов',
      value: formatMoney(data.sales),
      detail: salesChange === null
        ? (data.sales > 0 ? 'Нет данных для сравнения' : 'За выбранный период')
        : `${salesChange >= 0 ? '+' : ''}${salesChange.toFixed(1).replace('.', ',')}% к прошлому периоду`,
      icon: BarChart3,
      positive: salesChange === null || salesChange >= 0,
    },
    { label: 'Повторные клиенты', value: `${data.returningCustomerRate.toFixed(1).replace('.', ',')}%`, detail: `Среди ${formatNumber(data.customerCount)} зарегистрированных покупателей`, icon: UsersRound },
    { label: 'Завершённые заказы', value: formatNumber(fulfilledCount), detail: 'Статус «Завершён»', icon: Box },
    { label: 'Заказов', value: formatNumber(data.orderCount), detail: `${formatNumber(data.canceledCount)} отменено`, icon: ShoppingBag },
  ]

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#e8f1ff] text-[#0062CC]"><BarChart3 aria-hidden="true" size={20} /></span>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5"><h1 className="text-[25px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[30px]">Аналитика</h1><span className="text-[10px] text-[#777b7e]">Обновлено при открытии</span></div>
            <p className="text-[10px] text-[#777b7e]">Показатели магазина по данным заказов</p>
          </div>
        </div>
        <div aria-label="Период аналитики" className="inline-flex rounded-xl border border-[#e1e3e5] bg-[#f7f7f7] p-1" role="group">
          {ranges.map(({ value, label }) => (
            <Link
              aria-current={range === value ? 'page' : undefined}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#007AFF] ${range === value ? 'bg-white text-[#202223] shadow-sm' : 'text-[#686d70] hover:text-[#202223]'}`}
              href={`/admin/analytics?range=${value}`}
              key={value}
            >
              {label}
            </Link>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#777b7e]">
        <p>{formatPeriod(data.startDate, data.endDate)} · сравнение с предыдущими {range} днями</p>
        <span className="rounded-lg border border-[#dedfe1] bg-white px-3 py-1.5 font-medium text-[#4f5559]">MDL</span>
      </div>

      <section aria-label="Ключевые показатели" className="grid overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, positive }, index) => (
          <article className={`min-h-[118px] px-5 py-4 ${index ? 'border-t border-[#eceeef] sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'xl:border-l' : ''}`} key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-[#73777a]">{label}</p>
              <Icon aria-hidden="true" className="text-[#92979a]" size={16} strokeWidth={1.8} />
            </div>
            <p className="mt-2 text-[24px] leading-7 font-semibold tracking-[-0.035em] text-[#202223]">{value}</p>
            <p className={`mt-1 text-[10px] ${positive === undefined ? 'text-[#858a8d]' : positive ? 'text-[#287847]' : 'text-[#b42332]'}`}>{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
        <article className="min-w-0 rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-[#202223]">Продажи по дням</h2>
              <p className="mt-1 text-[10px] text-[#858a8d]">Сумма заказов без отмен · {formatPeriod(data.startDate, data.endDate)}</p>
            </div>
            <span className="rounded-full bg-[#f3f4f5] px-2.5 py-1 text-[10px] text-[#666b6e]">MDL</span>
          </div>
          {data.sales > 0 ? (
            <>
              <svg aria-label={`Продажи по дням за ${range} дней`} className="h-[190px] w-full overflow-visible" preserveAspectRatio="none" role="img" viewBox="0 0 1000 190">
                <title>Продажи без отмен по дням</title>
                {[20, 50, 80, 180].map((y) => <line key={y} stroke="#eceeef" strokeWidth="1" x1="0" x2="1000" y1={y} y2={y} />)}
                <path d={salesLinePath(data.chart.map((day) => day.sales))} fill="none" stroke="#27aee4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="mt-2 flex justify-between text-[9px] text-[#858a8d]"><span>{data.chart[0]?.label}</span><span>{data.chart[Math.floor(data.chart.length / 2)]?.label}</span><span>{data.chart.at(-1)?.label}</span></div>
              <div className="mt-4 flex items-center justify-between border-t border-[#eceeef] pt-3">
                <span className="text-[10px] text-[#777b7e]">Всего за период</span>
                <span className="text-[14px] font-semibold text-[#202223]">{formatMoney(data.sales)}</span>
              </div>
            </>
          ) : (
            <div className="grid h-[190px] place-items-center border-b border-[#e9ebed] text-center">
              <div><p className="text-[12px] font-medium text-[#555a5d]">Пока нет заказов за этот период</p><p className="mt-1 text-[10px] text-[#858a8d]">Выберите более длинный период или вернитесь позже.</p></div>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[#e4e6e8] bg-white p-4 sm:p-5">
          <div className="mb-5 flex items-start justify-between gap-2">
            <div><h2 className="text-[14px] font-semibold text-[#202223]">Статусы заказов</h2><p className="mt-1 text-[10px] text-[#858a8d]">За выбранный период</p></div>
            <span className="text-[19px] leading-6 font-semibold text-[#202223]">{formatNumber(data.orderCount)}</span>
          </div>
          {data.statuses.length ? (
            <div className="space-y-4">
              {data.statuses.map(({ status, count }) => {
                const style = statusStyles[status] ?? statusStyles.new
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
                      <span className="flex items-center gap-2 text-[#4e5356]"><span className={`size-2 rounded-full ${style.dot}`} />{statusLabels[status] ?? status}</span>
                      <span className="font-medium text-[#202223]">{formatNumber(count)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#f0f1f2]"><div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.max((count / maxStatusCount) * 100, count ? 2 : 0)}%` }} /></div>
                  </div>
                )
              })}
            </div>
          ) : <p className="py-10 text-center text-[11px] text-[#858a8d]">Нет заказов за выбранный период.</p>}
          <Link className="mt-5 inline-flex text-[11px] font-medium text-[#0062CC] hover:underline" href="/admin/orders">Перейти к заказам <span aria-hidden="true" className="ml-1">→</span></Link>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#eceeef] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[#f1f2f3] text-[#4e5356]"><Box aria-hidden="true" size={16} /></span><div><h2 className="text-[13px] font-semibold text-[#202223]">Популярные товары</h2><p className="mt-0.5 text-[10px] text-[#858a8d]">По сумме продаж без отмен</p></div></div>
            <Link className="text-[10px] font-medium text-[#0062CC] hover:underline" href="/admin/products">Каталог</Link>
          </div>
          {data.products.length ? (
            <ol className="divide-y divide-[#f0f1f2]">
              {data.products.map((product, index) => (
                <li className="flex items-center gap-3 px-4 py-3 sm:px-5" key={product.id}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#f6f7f8] text-[10px] font-semibold text-[#74797c]">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-[#303438]">{product.title}</p><div className="mt-1 h-1 overflow-hidden rounded-full bg-[#f0f1f2]"><div className="h-full rounded-full bg-[#007AFF]" style={{ width: `${Math.max((product.sales / maxProductSales) * 100, 2)}%` }} /></div></div>
                  <div className="shrink-0 text-right"><p className="text-[11px] font-semibold text-[#202223]">{formatMoney(product.sales)}</p><p className="mt-0.5 text-[9px] text-[#858a8d]">{formatNumber(product.quantity)} шт.</p></div>
                </li>
              ))}
            </ol>
          ) : <div className="px-5 py-12 text-center text-[11px] text-[#858a8d]">В заказах за период пока нет товаров.</div>}
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white">
          <div className="border-b border-[#eceeef] px-4 py-4 sm:px-5"><h2 className="text-[13px] font-semibold text-[#202223]">Продажи по каналам и оплате</h2><p className="mt-0.5 text-[10px] text-[#858a8d]">По данным оформленных заказов</p></div>
          <div className="grid sm:grid-cols-3">
            <div className="p-4 sm:border-r sm:border-[#eceeef] sm:px-5"><h3 className="mb-3 text-[10px] font-semibold tracking-[0.06em] text-[#858a8d] uppercase">Канал заказа</h3>{data.sources.length ? <ul className="space-y-3">{data.sources.map((row) => <li className="flex items-center justify-between gap-3 text-[11px]" key={row.source}><span className="truncate text-[#4e5356]">{sourceLabel(row.source)}</span><span className="shrink-0 font-medium text-[#202223]">{formatNumber(row.count)}</span></li>)}</ul> : <p className="text-[10px] text-[#858a8d]">Нет данных.</p>}</div>
            <div className="border-t border-[#eceeef] p-4 sm:border-t-0 sm:border-r sm:border-[#eceeef] sm:px-5"><h3 className="mb-3 text-[10px] font-semibold tracking-[0.06em] text-[#858a8d] uppercase">Способ оплаты</h3>{data.payments.length ? <ul className="space-y-3">{data.payments.map((row) => <li className="flex items-center justify-between gap-3 text-[11px]" key={row.payment ?? 'none'}><span className="truncate text-[#4e5356]">{paymentLabel(row.payment)}</span><span className="shrink-0 font-medium text-[#202223]">{formatNumber(row.count)}</span></li>)}</ul> : <p className="text-[10px] text-[#858a8d]">Нет данных.</p>}</div>
            <div className="border-t border-[#eceeef] p-4 sm:border-t-0 sm:px-5"><h3 className="mb-2 text-[10px] font-semibold tracking-[0.06em] text-[#858a8d] uppercase">Средний чек</h3><p className="text-[22px] leading-7 font-semibold tracking-[-0.03em] text-[#202223]">{formatMoney(data.averageOrder)}</p><p className="mt-1 text-[10px] text-[#858a8d]">По заказам без отмен</p><div aria-label={`Средний чек по дням за ${range} дней`} className="mt-4 flex h-10 items-end gap-1" role="img">{data.chart.map((day) => <span className="min-w-0 flex-1 rounded-t-[2px] bg-[#9bd7ef]" key={day.date} style={{ height: `${day.averageBarHeight}%` }} title={`${day.label}: ${formatMoney(day.averageOrder)}`} />)}</div></div>
          </div>
        </article>
      </section>

      <aside className="flex items-start gap-3 rounded-2xl border border-[#e5e7e9] bg-[#f8f9fa] px-4 py-4 sm:px-5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#697176]"><UsersRound aria-hidden="true" size={16} /></span>
        <div><h2 className="text-[11px] font-semibold text-[#303438]">Метрики посещений пока не подключены</h2><p className="mt-1 max-w-[900px] text-[10px] leading-5 text-[#73777a]">Shopify также показывает сессии, конверсию, источники трафика и активность в реальном времени. В Next сбор событий пока не включён, поэтому здесь показаны только проверяемые данные по заказам и товарам.</p></div>
      </aside>
    </div>
  )
}
