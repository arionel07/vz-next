import { CheckoutPage } from '@/components/site/checkout-page'
import { getCheckoutCustomerPrefill, getCheckoutOptions } from '@/lib/checkout-options'

export default async function Page() {
  const [options, customer] = await Promise.all([
    getCheckoutOptions('ru'),
    getCheckoutCustomerPrefill(),
  ])

  return (
    <>
      <CheckoutPage locale="ru" {...options} customer={customer} />
    </>
  )
}
