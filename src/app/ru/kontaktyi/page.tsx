import { connection } from 'next/server'
import { Suspense } from 'react'

import { ContactsPage } from '@/components/site/contacts-page'
import { getContactPage } from '@/lib/contacts'

async function ContactRoute() {
  await connection()
  return <ContactsPage data={await getContactPage()} />
}

export default function Page() {
  return <Suspense fallback={<main className="site-shell" aria-busy="true" />}><ContactRoute /></Suspense>
}
