import { LocalizedLink as Link } from '@/components/site/localized-link'

import type { DeliveryPageData } from '@/lib/delivery'
import type { StoreLocale } from '@/lib/locale-routing'

import styles from './delivery-page.module.css'

export function DeliveryPage({ data, locale = 'ru' }: { data: DeliveryPageData; locale?: StoreLocale }) {
  return (
    <main className={`site-shell ${styles.page}`}>

      <nav className={styles.breadcrumbs} aria-label={locale === 'ro' ? 'Fir de navigare' : 'Хлебные крошки'}>
        <Link href={`/${locale}`}>{locale === 'ro' ? 'Acasă' : 'Главная'}</Link>
        <span aria-hidden="true">/</span>
        <span>{data.title}</span>
      </nav>

      <header className={styles.hero}>
        <p className="eyebrow">VIZAJE-NICA</p>
        <h1>{data.title}</h1>
        <p className={styles.intro}>{data.intro}</p>
        {data.note ? <p className={styles.note}>{data.note}</p> : null}
      </header>

      <section className={styles.sections} aria-label={locale === 'ro' ? 'Condiții de livrare' : 'Условия доставки'}>
        {data.sections.map((section, index) => (
          <article className={styles.section} key={`${section.title}-${index}`}>
            <h2>{section.title || (locale === 'ro' ? `Condiții ${index + 1}` : `Условия ${index + 1}`)}</h2>
            <div className={styles.copy}>
              <article dangerouslySetInnerHTML={{ __html: section.left }} />
              <article dangerouslySetInnerHTML={{ __html: section.right }} />
            </div>
          </article>
        ))}
      </section>

    </main>
  )
}
