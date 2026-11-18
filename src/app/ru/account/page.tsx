import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'

import { AccountPage } from '@/components/site/account-page'
import { AUTH_SESSION_COOKIE, getUserBySessionToken } from '@/lib/auth'
import { getAccountData } from '@/lib/account'

type PageProps = {
  searchParams: Promise<{ section?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  return (
    <>
      <Suspense fallback={<main className="site-shell" aria-busy="true" />}>
        <AccountContent searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function AccountContent({ searchParams }: PageProps) {
  await connection()
  const cookieStore = await cookies()
  const user = await getUserBySessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value)
  if (!user) redirect('/ru')

  const account = await getAccountData(user.id, 'ru')
  if (!account) redirect('/ru')

  const params = await searchParams
  return (
    <AccountPage initialData={account} initialSection={params.section} locale="ru" />
  )
}
