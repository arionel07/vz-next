import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'

import { OrderDetailPage } from '@/components/site/order-detail-page'
import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { getAccountOrder } from '@/lib/account'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  await connection()
  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  if (!user) redirect('/ru')

  const { id } = await params
  const orderNumber = Number(id)
  if (!Number.isInteger(orderNumber) || orderNumber < 1) notFound()

  const order = await getAccountOrder(user.id, orderNumber)
  if (!order) notFound()

  return (
    <>
      <OrderDetailPage order={order} />
    </>
  )
}
