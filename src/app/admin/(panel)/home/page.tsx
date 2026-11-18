import { AdminHomeManager } from '@/components/admin/admin-home-manager'
import { getAdminHomeContent } from '@/lib/admin-content'

export default async function AdminHomePage() {
  const content = await getAdminHomeContent()
  const entries = [
    ...content.slides.map((item) => ({
      id: item.id,
      type: 'slider' as const,
      title: item.title || `Слайд #${item.id}`,
      detail: [item.uri || 'Без ссылки', item.image ? 'desktop изображение' : 'нет desktop изображения', item.mobileImage ? 'есть mobile изображение' : null].filter(Boolean).join(' · '),
      image: item.image,
      isShown: item.isShown,
      sorder: item.sorder,
    })),
    ...content.categories.map((item) => ({
      id: item.id,
      type: 'category' as const,
      title: item.title,
      detail: item.url || 'Без ссылки',
      image: item.image,
      isShown: item.isShown,
      sorder: item.sorder,
    })),
    ...content.productItems.map((item) => ({
      id: item.id,
      type: 'product' as const,
      title: item.title || `Товар #${item.productId}`,
      detail: `Товар #${item.productId} · блок «${item.sectionKey}»`,
      image: null,
      isShown: item.isShown,
      sorder: item.sorder,
      sectionKey: item.sectionKey,
    })),
    ...content.brandSections.map((item) => ({
      id: item.id,
      type: 'brandSection' as const,
      title: item.title,
      detail: `${item.placement === 'after_sale' ? 'После скидок' : 'После новинок'} · ${item.url || 'без ссылки'}${item.mobileImage ? ' · mobile изображение' : ''}`,
      image: item.image,
      isShown: item.isShown,
      sorder: item.sorder,
    })),
  ]

  return <AdminHomeManager initialEntries={entries} />
}
