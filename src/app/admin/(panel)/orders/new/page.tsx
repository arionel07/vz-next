import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'

import { AdminOrderCreateForm } from '@/components/admin/admin-order-create-form'
import { db } from '@/db'
import { getCheckoutOptions } from '@/lib/checkout-options'
import { constants } from '../../../../../../drizzle/schema'

function settingAmount(value: string | null | undefined) {
  const amount = Number.parseFloat(String(value ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

export default async function AdminNewOrderPage() {
  const [checkoutOptions, shippingSettings] = await Promise.all([
    getCheckoutOptions('ru'),
    db.select({ name: constants.name, value: constants.ru }).from(constants),
  ])
  const setting = (name: string) => shippingSettings.find((item) => item.name === name)?.value

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="flex flex-wrap items-center gap-3">
        <Link aria-label="Назад к заказам" className="grid size-9 place-items-center rounded-xl border border-[#dfe2e4] bg-white text-[#45494c] transition-colors hover:bg-[#f7f8f8] focus-visible:outline-2 focus-visible:outline-[#007aff]" href="/admin/orders"><ArrowLeft aria-hidden="true" size={17} /></Link>
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-[#777b7e] uppercase">Заказы</p>
          <h1 className="flex items-center gap-2 text-[25px] leading-tight font-semibold tracking-[-0.03em] text-[#202223] sm:text-[30px]"><Plus aria-hidden="true" size={21} /> Создать заказ</h1>
        </div>
      </header>

      <AdminOrderCreateForm
        stores={checkoutOptions.pickupStores}
        freeShippingThreshold={settingAmount(setting('FREE_SHIPPING_VALUE'))}
        shippingPrice={Math.round(settingAmount(setting('SHIPPING_PRICE')))}
      />
    </div>
  )
}
