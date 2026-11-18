import type { Metadata } from 'next'

import { B2BPage } from '@/components/site/b2b-page'

export const metadata: Metadata = {
  title: 'B2B сотрудничество — Vizaje-Nica',
  description: 'Vizaje-Nica — beauty retail and distribution partner in Moldova.',
}

export default function Page() {
  return <B2BPage />
}
