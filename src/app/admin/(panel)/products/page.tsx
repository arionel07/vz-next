import Link from 'next/link'
import { ArrowLeft, ArrowRight, Package, Search } from 'lucide-react'

import { AdminProductTable, AdminProductsActions, AdminProductsWorkspace } from '@/components/admin/admin-products-workspace'
import { getAdminProductList, type AdminProductStatus } from '@/lib/admin-products'

const statuses: AdminProductStatus[] = ['all', 'shown', 'hidden']

function pageHref(page: number, values: { q: string; status: AdminProductStatus; categoryId?: number; brandId?: number }) {
  const search = new URLSearchParams()
  if (values.q) search.set('q', values.q)
  if (values.status !== 'all') search.set('status', values.status)
  if (values.categoryId) search.set('category', String(values.categoryId))
  if (values.brandId) search.set('brand', String(values.brandId))
  if (page > 1) search.set('page', String(page))
  return `/admin/products${search.size ? `?${search.toString()}` : ''}`
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; brand?: string; page?: string }> }) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const status = statuses.includes(params.status as AdminProductStatus) ? params.status as AdminProductStatus : 'all'
  const categoryId = Number(params.category) > 0 ? Number(params.category) : undefined
  const brandId = Number(params.brand) > 0 ? Number(params.brand) : undefined
  const page = Number(params.page) > 0 ? Number(params.page) : 1
  const data = await getAdminProductList({ query, status, categoryId, brandId, page })
  const pageValues = { q: query, status, categoryId, brandId }

  return (
    <AdminProductsWorkspace>
    <div className="space-y-6 lg:space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#f1f2f3] text-[#303438]"><Package aria-hidden="true" size={20} /></span>
          <div><p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">Магазин</p><h1 className="text-[25px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[30px]">Товары</h1></div>
        </div>
        <AdminProductsActions />
      </header>

      <section aria-label="Сводка товаров" className="grid overflow-hidden rounded-2xl border border-[#e4e6e8] bg-white sm:grid-cols-3">
        {[{ label: 'Всего товаров', value: data.stats.total }, { label: 'Показываются на сайте', value: data.stats.shown }, { label: 'Скрыты', value: data.stats.hidden }].map((metric, index) => <div className={`flex min-h-[82px] flex-col justify-center px-5 py-3 ${index > 0 ? 'border-t border-[#eceeef] sm:border-l sm:border-t-0' : ''}`} key={metric.label}><p className="text-[11px] text-[#73777a]">{metric.label}</p><p className="mt-1 text-[22px] leading-6 font-semibold tracking-[-0.03em] text-[#202223]">{metric.value.toLocaleString('ru-RU')}</p></div>)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2e4e6] bg-white">
        <form action="/admin/products" className="flex flex-wrap items-center gap-2.5 border-b border-[#e5e7e9] p-3 sm:p-4" method="get">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Поиск товара</span><Search aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-[#777b7e]" size={16} />
            <input className="h-10 w-full rounded-xl border border-[#dfe2e4] bg-white pr-3 pl-10 text-[12px] outline-none transition-colors placeholder:text-[#969a9d] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15" defaultValue={query} name="q" placeholder="Название, SKU или штрихкод" type="search" />
          </label>
          <label><span className="sr-only">Категория</span><select className="h-10 max-w-[190px] rounded-xl border border-[#dfe2e4] bg-white px-3 text-[11px] text-[#303438] outline-none focus:border-[#007AFF]" defaultValue={categoryId ?? ''} name="category"><option value="">Все категории</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.titleRu || category.titleRo || `#${category.id}`}</option>)}</select></label>
          <label><span className="sr-only">Бренд</span><select className="h-10 max-w-[190px] rounded-xl border border-[#dfe2e4] bg-white px-3 text-[11px] text-[#303438] outline-none focus:border-[#007AFF]" defaultValue={brandId ?? ''} name="brand"><option value="">Все бренды</option>{data.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.title || `#${brand.id}`}</option>)}</select></label>
          <label><span className="sr-only">Статус товара</span><select className="h-10 min-w-[130px] rounded-xl border border-[#dfe2e4] bg-white px-3 text-[11px] text-[#303438] outline-none focus:border-[#007AFF]" defaultValue={status} name="status"><option value="all">Все статусы</option><option value="shown">Опубликованы</option><option value="hidden">Скрыты</option></select></label>
          <button className="h-10 rounded-xl border border-[#d9dcde] bg-[#f7f8f8] px-4 text-[11px] font-medium text-[#303438] transition-colors hover:bg-[#eceeef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]" type="submit">Показать</button>
          {query || categoryId || brandId || status !== 'all' ? <Link className="px-1 text-[11px] text-[#0062CC] hover:underline" href="/admin/products">Сбросить</Link> : null}
        </form>

        {data.rows.length ? <AdminProductTable rows={data.rows} /> : <div className="grid min-h-[250px] place-items-center px-6 py-12 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f1f2f3] text-[#707477]"><Package aria-hidden="true" size={20} /></span><h2 className="mt-4 text-[15px] font-medium text-[#202223]">Товары не найдены</h2><p className="mt-1 text-[12px] text-[#777b7e]">Попробуйте изменить запрос или создайте новый товар.</p></div></div>}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceeef] px-4 py-3 text-[10px] text-[#777b7e]">
          <span>Показано {data.rows.length} из {data.total.toLocaleString('ru-RU')} товаров · по 40 на странице</span>
          <nav aria-label="Страницы товаров" className="flex items-center gap-1">
            <Link aria-disabled={data.page <= 1} className={`grid size-8 place-items-center rounded-lg border border-[#e1e3e5] ${data.page <= 1 ? 'pointer-events-none text-[#b8bbbd]' : 'text-[#45494c] hover:border-[#007AFF] hover:text-[#0062CC]'}`} href={pageHref(Math.max(1, data.page - 1), pageValues)}><ArrowLeft aria-hidden="true" size={14} /><span className="sr-only">Предыдущая</span></Link>
            <span className="px-2">{data.page} / {data.pageCount}</span>
            <Link aria-disabled={data.page >= data.pageCount} className={`grid size-8 place-items-center rounded-lg border border-[#e1e3e5] ${data.page >= data.pageCount ? 'pointer-events-none text-[#b8bbbd]' : 'text-[#45494c] hover:border-[#007AFF] hover:text-[#0062CC]'}`} href={pageHref(Math.min(data.pageCount, data.page + 1), pageValues)}><ArrowRight aria-hidden="true" size={14} /><span className="sr-only">Следующая</span></Link>
          </nav>
        </footer>
      </section>
    </div>
    </AdminProductsWorkspace>
  )
}
