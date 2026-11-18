import 'server-only'

import { asc, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { banners, homeBrandSections, homeCategories, homeProductItems, products, sliders } from '../../drizzle/schema'

export async function getAdminBanners() {
  return db.select({
    id: banners.id,
    titleRu: banners.titleRu,
    titleRo: banners.titleRo,
    uriRu: banners.uriRu,
    uriRo: banners.uriRo,
    img: banners.img,
    imgMob: banners.imgMob,
    isShown: banners.isShown,
    sorder: banners.sorder,
    colorText: banners.colorText,
    colorButton: banners.colorButton,
    colorButtonText: banners.colorButtonText,
  }).from(banners).orderBy(asc(banners.sorder), desc(banners.id))
}

export async function getAdminHomeContent() {
  const [slides, categories, productItems, brandSections] = await Promise.all([
    db.select({ id: sliders.id, title: sliders.titleRu, image: sliders.img, mobileImage: sliders.imgMob, uri: sliders.uriRu, isShown: sliders.isShown, sorder: sliders.sorder })
      .from(sliders).orderBy(asc(sliders.sorder), desc(sliders.id)),
    db.select({ id: homeCategories.id, title: homeCategories.titleRu, image: homeCategories.img, url: homeCategories.urlRu, isShown: homeCategories.isShown, sorder: homeCategories.sorder })
      .from(homeCategories).orderBy(asc(homeCategories.sorder), asc(homeCategories.id)),
    db.select({ id: homeProductItems.id, sectionKey: homeProductItems.sectionKey, productId: homeProductItems.productId, title: products.titleRu, sorder: homeProductItems.sorder, isShown: homeProductItems.isShown })
      .from(homeProductItems).leftJoin(products, eq(homeProductItems.productId, products.id))
      .orderBy(asc(homeProductItems.sectionKey), asc(homeProductItems.sorder), asc(homeProductItems.id)),
    db.select({ id: homeBrandSections.id, title: homeBrandSections.titleRu, placement: homeBrandSections.placement, image: homeBrandSections.img, mobileImage: homeBrandSections.imgMob, url: homeBrandSections.urlRu, isShown: homeBrandSections.isShown, sorder: homeBrandSections.sorder })
      .from(homeBrandSections).orderBy(asc(homeBrandSections.placement), asc(homeBrandSections.sorder), asc(homeBrandSections.id)),
  ])

  return { slides, categories, productItems, brandSections }
}
