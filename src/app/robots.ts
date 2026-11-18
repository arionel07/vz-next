import type { MetadataRoute } from 'next'

import { getSiteOrigin } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/ru/account',
        '/ru/zakazyi',
        '/ru/korzina',
        '/ru/checkout',
        '/ru/search',
        '/ru/wishlist',
        '/ru/password-reset',
        '/ru/order-success',
        '/ru/success',
        '/ru/error',
        '/ro/contul-meu',
        '/ro/comenzile-mele',
        '/ro/cos',
        '/ro/checkout',
        '/ro/cautare',
        '/ro/favorite',
        '/ro/resetati-parola',
        '/ro/order-success',
        '/ro/success',
        '/ro/eroare',
      ],
    },
    sitemap: `${getSiteOrigin()}/sitemap.xml`,
  }
}
