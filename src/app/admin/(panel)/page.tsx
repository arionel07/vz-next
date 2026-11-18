import {
  BarChart3,
  FileText,
  Gift,
  LayoutDashboard,
  Megaphone,
  Package,
  ShoppingBag,
  Store,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { connection } from 'next/server'
import Link from 'next/link'

import { getAdminAnalyticsSummary } from '@/lib/admin-analytics'

const areas: { title: string; description: string; icon: LucideIcon; href?: string }[] = [
  { title: 'Каталог', description: 'Товары, варианты, изображения, категории и бренды.', icon: Package },
  { title: 'Заказы', description: 'Заказы, доставка, оплата и статусы покупателей.', icon: ShoppingBag },
  { title: 'Клиенты', description: 'Профили, избранное, бонусы и история заказов.', icon: UsersRound },
  { title: 'Акции и подарки', description: 'Предложения, подарки, промокоды и бонусные правила.', icon: Gift },
  { title: 'Баннеры', description: 'Изображения, ссылки, языковые версии и порядок показа.', icon: Megaphone, href: '/admin/banners' },
  { title: 'Главная витрина', description: 'Слайды, категории, товарные и брендовые блоки.', icon: LayoutDashboard, href: '/admin/home' },
  { title: 'Новости', description: 'Публикации, даты выхода, изображения и SEO.', icon: FileText, href: '/admin/news' },
  { title: 'Бьюти-подборки', description: 'Материалы и связанные товары для витрины.', icon: Gift, href: '/admin/beauty-selections' },
  { title: 'Аналитика', description: 'Продажи, заказы, средний чек и популярные товары.', icon: BarChart3, href: '/admin/analytics' },
]

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)
}

function formatCompactMoney(value: number) {
  return `${formatCompactNumber(value)} MDL`
}

export default async function AdminOverviewPage() {
  await connection()
  const summary = await getAdminAnalyticsSummary(7)
  const snapshot = [
    { label: 'Продажи за 7 дней', value: formatCompactMoney(summary.sales) },
    { label: 'Заказов', value: formatCompactNumber(summary.orderCount) },
    { label: 'Средний чек', value: formatCompactMoney(summary.averageOrder) },
    { label: 'Новые и в обработке', value: formatCompactNumber(summary.openOrderCount) },
  ]

  return (
    <div className="space-y-8 lg:space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#777b7e] uppercase">Рабочее пространство</p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em] text-[#202223] sm:text-[32px]">
            Главная
          </h1>
        </div>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d9dcde] bg-white px-3.5 text-[12px] font-medium text-[#303438] transition-colors hover:border-[#007AFF] hover:text-[#0062CC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]"
          href="/ru"
          rel="noreferrer"
          target="_blank"
        >
          Открыть витрину
          <Store aria-hidden="true" size={15} />
        </Link>
      </header>

      <section aria-label="Краткая аналитика за последние 7 дней" className="overflow-hidden rounded-2xl border border-[#e1e3e5] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eceeef] px-4 py-2.5 sm:px-5">
          <p className="text-[10px] font-medium text-[#777b7e]">Обзор · последние 7 дней</p>
          <Link className="text-[10px] font-medium text-[#0062CC] hover:underline" href="/admin/analytics">Открыть аналитику <span aria-hidden="true">→</span></Link>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.map(({ label, value }, index) => (
            <Link className={`flex min-h-[72px] flex-col justify-center gap-1.5 px-4 py-3 transition-colors hover:bg-[#f8f9fa] sm:px-5 ${index ? 'border-t border-[#eceeef] sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'xl:border-l' : ''}`} href="/admin/analytics" key={label}>
              <span className="text-[10px] text-[#73777a]">{label}</span>
              <span className="text-[18px] leading-5 font-semibold tracking-[-0.025em] text-[#202223]">{value}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-welcome-title" className="flex min-h-[clamp(220px,32vh,320px)] items-center justify-center rounded-[24px] border border-[#eceeef] bg-[#fafafa] px-6 py-10 sm:px-12">
        <div className="max-w-[680px] text-center">
          <p className="mb-1 text-[20px] leading-7 font-medium text-[#6f7376] sm:text-[23px]">Добро пожаловать!</p>
          <h2 className="text-[25px] leading-tight font-medium tracking-[-0.03em] text-[#202223] sm:text-[34px]">
            Продолжим развивать магазин.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[13px] leading-6 text-[#707477] sm:text-[14px]">
            Сводка заказов за неделю — сверху. Откройте аналитику, чтобы посмотреть продажи, статусы и товары за выбранный период.
          </p>
        </div>
      </section>

      <section aria-labelledby="admin-areas-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[17px] leading-6 font-medium tracking-[-0.015em] text-[#202223]" id="admin-areas-title">
              Разделы магазина
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-[#777b7e]">Рабочие разделы можно открыть прямо отсюда.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map(({ title, description, icon: Icon, href }) => (
            <article className={`min-h-[154px] rounded-2xl border border-[#e5e7e9] bg-white p-4 transition-colors sm:p-5 ${href ? 'hover:border-[#007AFF]' : ''}`} key={title}>
              <div className="mb-5 flex items-start justify-between gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#f1f2f3] text-[#34383b]">
                  <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                </span>
                {href ? <span className="rounded-full bg-[#e8f1ff] px-2.5 py-1 text-[10px] font-medium text-[#005fc7]">Готово</span> : <span className="rounded-full bg-[#f0f1f2] px-2.5 py-1 text-[10px] font-medium text-[#6c7174]">В подготовке</span>}
              </div>
              <h3 className="text-[13px] font-medium text-[#202223]">{href ? <Link className="focus-visible:outline-2 focus-visible:outline-[#007AFF]" href={href}>{title}</Link> : title}</h3>
              <p className="mt-1.5 text-[11px] leading-[1.55] text-[#777b7e]">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
