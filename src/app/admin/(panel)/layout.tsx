import type { Metadata } from 'next'
import { Suspense, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import { AdminShell } from '@/components/admin/admin-shell'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getAdminNewOrderCount } from '@/lib/admin-orders'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminSessionFallback />}>
      <AuthenticatedAdminPanel>{children}</AuthenticatedAdminPanel>
    </Suspense>
  )
}

async function AuthenticatedAdminPanel({ children }: { children: ReactNode }) {
  await connection()
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')
  const newOrderCount = await getAdminNewOrderCount()

  return <AdminShell adminLogin={admin.login} newOrderCount={newOrderCount}>{children}</AdminShell>
}

function AdminSessionFallback() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f6f7] px-4 text-sm text-[#6d7175]">
      Проверяем доступ…
    </main>
  )
}
