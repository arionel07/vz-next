import { ArrowLeft, ArrowRight, ArrowUpRight, Building2, Search, UserRound, UsersRound } from 'lucide-react'
import Link from 'next/link'

import { getAdminCustomerList, type AdminCustomerListStatus } from '@/lib/admin-customers'

const statuses: AdminCustomerListStatus[] = ['registered', 'pending', 'all']
const statusLabels: Record<AdminCustomerListStatus, string> = {
  registered: 'Подтверждённые',
  pending: 'Ожидают подтверждения',
  all: 'Все клиенты',
}

function amount(value: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)} MDL`
}

function pageHref(page: number, query: string, status: AdminCustomerListStatus) {
  const search = new URLSearchParams()
  if (query) search.set('q', query)
  if (status !== 'registered') search.set('status', status)
  if (page > 1) search.set('page', String(page))
  return `/admin/customers${search.size ? `?${search.toString()}` : ''}`
}

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const status = statuses.includes(params.status as AdminCustomerListStatus) ? params.status as AdminCustomerListStatus : 'registered'
  const requestedPage = Number(params.page) > 0 ? Math.floor(Number(params.page)) : 1
  const firstResult = await getAdminCustomerList({ query, status, page: requestedPage })
  const page = Math.min(requestedPage, firstResult.pageCount)
  const data = page === requestedPage ? firstResult : await getAdminCustomerList({ query, status, page })
  const firstItem = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1
  const lastItem = Math.min(data.page * data.pageSize, data.total)

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#f1f2f3] text-[#303438]"><UsersRound aria-hidden="true" size={20} /></span>
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">Магазин</p>
            <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[30px]">Клиенты</h1>
          </div>
        </div>
      </header>

      <section aria-label="Сводка клиентов" className="grid overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Всего профилей', value: data.stats.total, icon: UsersRound },
          { label: 'Подтверждённые', value: data.stats.registered, icon: UserRound },
          { label: 'Активные', value: data.stats.active, icon: UserRound },
          { label: 'B2B-клиенты', value: data.stats.business, icon: Building2 },
        ].map(({ label, value, icon: Icon }, index) => (
          <div className={`flex min-h-[94px] items-center gap-3 px-5 py-4 ${index > 0 ? 'border-t border-[#eceeef] sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'xl:border-l' : ''}`} key={label}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f7f8f8] text-[#62666a]"><Icon aria-hidden="true" size={17} /></span>
            <div>
              <p className="text-[11px] text-[#73777a]">{label}</p>
              <p className="mt-0.5 text-[22px] leading-7 font-semibold tracking-[-0.03em] text-[#202223]">{value.toLocaleString('ru-RU')}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7e9] px-4 pt-3 sm:px-5">
          <nav aria-label="Фильтр клиентов" className="flex min-w-0 gap-1 overflow-x-auto">
            {statuses.map((value) => (
              <Link
                aria-current={status === value ? 'page' : undefined}
                className={`inline-flex min-h-10 shrink-0 items-center border-b-2 px-3 text-[11px] font-medium transition-colors ${status === value ? 'border-[#202223] text-[#202223]' : 'border-transparent text-[#73777a] hover:text-[#202223]'}`}
                href={pageHref(1, query, value)}
                key={value}
              >
                {statusLabels[value]}
              </Link>
            ))}
          </nav>
          <form action="/admin/customers" className="flex w-full gap-2 pb-3 sm:w-auto" method="get">
            {status !== 'registered' ? <input name="status" type="hidden" value={status} /> : null}
            <label className="relative min-w-0 flex-1 sm:w-[300px] sm:flex-none">
              <span className="sr-only">Поиск клиентов</span>
              <Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={16} />
              <input className="h-9 w-full rounded-xl border border-[#dfe2e4] bg-white pr-3 pl-9 text-[11px] outline-none transition-colors placeholder:text-[#969a9d] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15" defaultValue={query} name="q" placeholder="Имя, email, телефон или ID" type="search" />
            </label>
            <button className="h-9 shrink-0 rounded-xl bg-[#202223] px-3.5 text-[11px] font-medium text-white transition-colors hover:bg-[#383b3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" type="submit">Найти</button>
          </form>
        </div>

        {data.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left text-[12px]">
              <thead className="bg-[#f7f7f7] text-[#62666a]">
                <tr>
                  <th className="px-4 py-3 font-medium">Клиент</th>
                  <th className="px-4 py-3 font-medium">Контакты</th>
                  <th className="px-4 py-3 text-right font-medium">Заказы</th>
                  <th className="px-4 py-3 text-right font-medium">Завершено на</th>
                  <th className="px-4 py-3 font-medium">Бонусы</th>
                  <th className="px-4 py-3 font-medium">Тип / статус</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eceeef]">
                {data.rows.map((customer) => {
                  const name = [customer.name, customer.surname].filter((part) => part && part !== '0').join(' ') || 'Без имени'
                  return (
                    <tr className="group transition-colors hover:bg-[#fafafa]" key={customer.id}>
                      <td className="px-4 py-3.5">
                        <Link className="font-medium text-[#202223] hover:text-[#0062CC] focus-visible:outline-2 focus-visible:outline-[#007AFF]" href={`/admin/customers/${customer.id}`}>{name}</Link>
                        <p className="mt-0.5 text-[10px] text-[#858a8d]">ID клиента · {customer.id}</p>
                      </td>
                      <td className="max-w-[240px] px-4 py-3.5">
                        <p className="truncate text-[#303438]">{customer.email || 'Email не указан'}</p>
                        <p className="mt-0.5 truncate text-[10px] text-[#858a8d]">{customer.phone || 'Телефон не указан'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-[#303438]">{customer.ordersCount}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-[#303438]">{amount(customer.completedTotal)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[#555a5d]">{customer.bonus || '0'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${customer.isb2B ? 'bg-[#e6f0ff] text-[#2458a6]' : 'bg-[#f1f2f3] text-[#555a5d]'}`}>{customer.isb2B ? 'B2B' : 'B2C'}</span>
                          {customer.isCreator ? <span className="inline-flex rounded-full bg-[#f3e8ff] px-2 py-1 text-[10px] font-medium text-[#6b2fa6]">Криэйтор</span> : null}
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${customer.code === 1 ? 'bg-[#e7f4ea] text-[#28623a]' : 'bg-[#fff1c2] text-[#755400]'}`}>{customer.code === 1 ? (customer.active === 1 ? 'Активен' : 'Неактивен') : 'Не подтверждён'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-[#8a8e91]"><Link aria-label={`Открыть профиль клиента ${name}`} className="inline-flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-[#eef5ff] hover:text-[#0062CC] focus-visible:outline-2 focus-visible:outline-[#007AFF]" href={`/admin/customers/${customer.id}`}><ArrowUpRight aria-hidden="true" size={15} /></Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-[250px] place-items-center px-6 py-12 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f1f2f3] text-[#707477]"><UsersRound aria-hidden="true" size={20} /></span>
              <h2 className="mt-4 text-[15px] font-medium text-[#202223]">Клиенты не найдены</h2>
              <p className="mt-1 text-[12px] text-[#777b7e]">Измените поиск или выберите другой список.</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceeef] px-4 py-3 text-[10px] text-[#777b7e] sm:px-5">
          <span>Показано {firstItem}–{lastItem} из {data.total} · по 40 на странице</span>
          {data.pageCount > 1 ? (
            <nav aria-label="Страницы клиентов" className="flex items-center gap-1">
              <Link aria-disabled={data.page <= 1} className={`inline-flex size-8 items-center justify-center rounded-lg border border-[#e2e4e6] ${data.page <= 1 ? 'pointer-events-none text-[#b9bdc0]' : 'text-[#303438] hover:bg-[#f7f8f8]'}`} href={pageHref(Math.max(1, data.page - 1), query, status)}><ArrowLeft aria-hidden="true" size={14} /><span className="sr-only">Предыдущая</span></Link>
              <span className="min-w-14 text-center">{data.page} / {data.pageCount}</span>
              <Link aria-disabled={data.page >= data.pageCount} className={`inline-flex size-8 items-center justify-center rounded-lg border border-[#e2e4e6] ${data.page >= data.pageCount ? 'pointer-events-none text-[#b9bdc0]' : 'text-[#303438] hover:bg-[#f7f8f8]'}`} href={pageHref(Math.min(data.pageCount, data.page + 1), query, status)}><ArrowRight aria-hidden="true" size={14} /><span className="sr-only">Следующая</span></Link>
            </nav>
          ) : null}
        </div>
      </section>
    </div>
  )
}
