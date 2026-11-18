import { StorefrontLayout } from '@/components/site/storefront-layout'

export default function RomanianStorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StorefrontLayout locale="ro">{children}</StorefrontLayout>
}
