import { LocalizedLink as Link } from '@/components/site/localized-link'

import { formatPrice } from '@/lib/format'
import { legacyAsset } from '@/lib/legacy-assets'
import type { AccountOrder } from '@/lib/account'
import type { StoreLocale } from '@/lib/locale-routing'

import styles from './order-detail-page.module.css'

function orderStatus(status: string, locale: StoreLocale) {
  if (locale === 'ro') return ({ new: 'Nouă', progress: 'În procesare', finished: 'Finalizată', canceled: 'Anulată' }[status] ?? status)
  return {
    new: 'Новый',
    progress: 'В обработке',
    finished: 'Завершён',
    canceled: 'Отменён',
  }[status] ?? status
}

function orderDelivery(value: number | null, locale: StoreLocale) {
  if (locale === 'ro') {
    if (value === 1) return 'Ridicare'
    if (value === 3) return 'Livrare · în aceeași zi'
    return 'Livrare'
  }
  if (value === 1) return 'Самовывоз'
  if (value === 3) return 'Доставка · в день заказа'
  return 'Доставка'
}

function formatDate(value: string | null, locale: StoreLocale) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale === 'ro' ? 'ro-MD' : 'ru-MD', { dateStyle: 'long' }).format(new Date(value))
}

function productPrice(product: AccountOrder['products'][number]) {
  return product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price
}

export function OrderDetailPage({ order, locale = 'ru' }: { order: AccountOrder; locale?: StoreLocale }) {
  const text = locale === 'ro'
    ? { profile: 'Contul meu · Comenzile mele', order: 'Comanda nr.', all: '← Toate comenzile', content: 'Produsele comenzii', items: 'Produse', noItems: 'Comanda nu conține produse.', article: 'Cod produs:', volume: 'Volum:', pieces: 'buc.', total: 'Rezumat comandă', delivery: 'Livrare', free: 'Gratuit', bonusPlus: 'Bonusuri acordate', bonusMinus: 'Bonusuri utilizate', pay: 'De plată' }
    : { profile: 'Мой профиль · Мои заказы', order: 'Заказ №', all: '← Все заказы', content: 'Состав заказа', items: 'Товары', noItems: 'В заказе нет товаров.', article: 'Артикул:', volume: 'Объём:', pieces: 'шт.', total: 'Итог заказа', delivery: 'Доставка', free: 'Бесплатно', bonusPlus: 'Начислено бонусов', bonusMinus: 'Списано бонусов', pay: 'К оплате' }
  const orderNumber = order.orderId ?? order.id
  const productsTotal = order.products.reduce((sum, product) => sum + product.lineTotal, 0)
  const finalTotal = order.total + order.deliveryPrice - order.bonusMinus

  return (
    <main className={`site-shell account-page ${styles.page}`} aria-labelledby="order-title">
      <section className={styles.heading}>
        <div>
          <p className="eyebrow">{text.profile}</p>
          <h1 id="order-title">{text.order}{orderNumber}</h1>
          <div className={styles.meta}>
            <span>{orderStatus(order.status, locale)}</span>
            <span>{formatDate(order.added, locale)}</span>
            <span>{orderDelivery(order.delivery, locale)}</span>
          </div>
        </div>
        <Link className={styles.back} href="/ru/zakazyi">{text.all}</Link>
      </section>

      <section className={styles.content} aria-label={`${text.content} ${orderNumber}`}>
        <div className={styles.products}>
          <div className={styles.sectionLabel}>{text.items}</div>
          {order.products.length ? order.products.map((product) => (
            <article className={styles.product} key={product.id}>
              <Link className={styles.productImage} href={`/ru/katalog/product/${product.id}`}>
                {product.image ? <img src={legacyAsset(product.image) ?? undefined} alt="" /> : null}
              </Link>
              <div className={styles.productInfo}>
                <p className={styles.brand}>{product.brand}</p>
                <Link className={styles.productTitle} href={`/ru/katalog/product/${product.id}`}>{product.title}</Link>
                <div className={styles.productDetails}>
                  {product.sku ? <span>{text.article} {product.sku}</span> : null}
                  {product.volume ? <span>{text.volume} {product.volume}</span> : null}
                  <span>{product.quantity} {text.pieces} × {formatPrice(productPrice(product))}</span>
                </div>
              </div>
              <strong className={styles.lineTotal}>{formatPrice(product.lineTotal)}</strong>
            </article>
          )) : <p className={styles.empty}>{text.noItems}</p>}
        </div>

        <aside className={styles.summary} aria-label={text.total}>
          <div className={styles.sectionLabel}>{text.total}</div>
          <div className={styles.summaryRow}><span>{text.items}</span><strong>{formatPrice(order.total || productsTotal)}</strong></div>
          <div className={styles.summaryRow}><span>{text.delivery}</span><strong>{order.deliveryPrice ? formatPrice(order.deliveryPrice) : text.free}</strong></div>
          {order.bonusPlus ? <div className={styles.summaryRow}><span>{text.bonusPlus}</span><strong>+{formatPrice(order.bonusPlus)}</strong></div> : null}
          {order.bonusMinus ? <div className={styles.summaryRow}><span>{text.bonusMinus}</span><strong>−{formatPrice(order.bonusMinus)}</strong></div> : null}
          <div className={styles.total}><span>{text.pay}</span><strong>{formatPrice(finalTotal)}</strong></div>
        </aside>
      </section>
    </main>
  )
}
