import { StorefrontLayout } from '@/components/site/storefront-layout'

export default function RussianStorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StorefrontLayout locale="ru">{children}</StorefrontLayout>
}
