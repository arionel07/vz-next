import { LocalizedLink as Link } from '@/components/site/localized-link'
import { and, eq, inArray } from 'drizzle-orm'
import { connection } from 'next/server'

import { db } from '@/db'
import { constants, menu, siteSupportSettings } from '../../../drizzle/schema'
import { legacyAsset } from '@/lib/legacy-assets'
import { localizedPath } from '@/lib/locale-routing'

type FooterLocale = 'ru' | 'ro'
type FooterLink = { label: string; href: string }

const footerClasses = {
  footer: 'bg-white text-midnight-ink [content-visibility:auto] [contain-intrinsic-size:680px]',
  main: 'border-t border-midnight-ink/10 bg-white pt-16 pb-[52px] max-[767px]:py-[42px]',
  container: 'mx-auto w-full max-w-[1670px] px-5',
  content: 'grid grid-cols-[minmax(210px,1.1fr)_repeat(3,minmax(160px,1fr))] items-start gap-x-[72px] gap-y-[42px] max-[1100px]:grid-cols-[minmax(190px,1.05fr)_repeat(2,minmax(160px,1fr))] max-[1100px]:gap-10 max-[767px]:grid-cols-2 max-[767px]:gap-x-7 max-[767px]:gap-y-[38px] max-[520px]:grid-cols-1 max-[520px]:gap-y-8',
  column: 'min-w-0',
  brandColumn: 'max-w-[240px] max-[1100px]:row-span-2 max-[767px]:col-span-full max-[767px]:row-span-1 max-[767px]:max-w-full',
  appCard: 'flex flex-col items-center gap-3 rounded-card border border-midnight-ink/15 bg-white p-[14px] text-center text-midnight-ink/70 transition-colors hover:border-hover-cream hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[3px] motion-reduce:transition-none max-[767px]:flex-row max-[767px]:justify-center max-[767px]:px-[18px] max-[767px]:py-3',
  appCardImage: 'block size-[150px] object-contain max-[767px]:size-24',
  appCardCaption: 'max-w-[180px] text-xs leading-[1.35] max-[767px]:text-left',
  hotline: 'mt-5 flex flex-col items-center gap-1 text-center',
  hotlineLabel: 'text-[11px] leading-[1.3] text-midnight-ink/60',
  hotlinePhone: 'text-lg leading-[1.2] font-semibold text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[3px]',
  telegram: 'group mt-[18px] flex items-center gap-2.5 text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[3px]',
  telegramIcon: 'inline-flex size-5 shrink-0',
  telegramBody: 'flex min-w-0 flex-col gap-0.5 group-hover:underline group-hover:underline-offset-[3px]',
  telegramLabel: 'text-[11px] leading-[1.25] text-midnight-ink/60',
  telegramHandle: 'text-[13px] leading-[1.3]',
  telegramArrow: 'ml-auto text-[15px]',
  columnHeading: 'mt-1 text-base leading-[1.3] font-medium text-midnight-ink',
  linkList: 'mt-[18px] flex list-none flex-col gap-3 p-0 max-[520px]:mt-3.5 max-[520px]:gap-2.5',
  link: "relative inline-flex text-sm leading-[1.42] font-normal text-midnight-ink transition-colors after:absolute after:right-0 after:bottom-[-3px] after:left-0 after:h-px after:origin-right after:scale-x-0 after:bg-button-hover after:content-[''] after:transition-transform after:duration-200 hover:text-hover-cream hover:after:origin-left hover:after:scale-x-100 focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[3px] motion-reduce:transition-none max-[520px]:text-[13px]",
  cookieLink: 'inline-flex border-0 bg-transparent p-0 text-left text-sm leading-[1.42] text-midnight-ink underline decoration-1 underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[3px] max-[520px]:text-[13px]',
  bottom: 'border-t border-midnight-ink/10 bg-white py-[18px] pb-[14px]',
  bottomGrid: 'grid grid-cols-[minmax(120px,1fr)_auto_minmax(180px,1fr)] items-center gap-7 max-[767px]:grid-cols-1 max-[767px]:gap-[18px]',
  socials: 'flex flex-wrap items-center gap-4 max-[767px]:justify-center',
  socialLink: 'flex size-6 items-center justify-center text-midnight-ink transition-[color,transform] hover:-translate-y-px hover:text-hover-cream focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[3px] motion-reduce:transition-none',
  socialImage: 'block size-[21px] object-contain',
  appStores: 'flex flex-wrap items-center justify-center gap-2.5',
  storeButton: 'inline-flex h-[47px] w-[158px] items-center gap-2 rounded-lg border border-midnight-ink/20 bg-white px-[13px] py-[5px] leading-none text-midnight-ink transition-[background-color,color,border-color,transform] hover:-translate-y-px hover:border-hover-cream hover:bg-button-hover hover:text-midnight-ink focus-visible:outline-2 focus-visible:outline-hover-cream focus-visible:outline-offset-[3px] motion-reduce:transition-none max-[520px]:h-11 max-[520px]:w-[148px] max-[520px]:px-2.5',
  storeImage: 'block size-6 shrink-0 object-contain',
  storeText: 'flex min-w-0 flex-col leading-[1.05]',
  storeLabel: 'text-[7px] font-medium uppercase tracking-[.02em]',
  storeName: 'mt-0.5 whitespace-nowrap text-base font-medium max-[520px]:text-sm',
  payments: 'flex flex-wrap items-center justify-end gap-2.5 max-[767px]:justify-center max-[520px]:gap-2',
  payment: 'inline-flex shrink-0 items-center justify-center',
  paymentVisa: 'h-5 w-14',
  paymentMastercard: 'size-8',
  paymentGooglePay: 'h-10 w-11',
  paymentApplePay: 'h-[38px] w-11',
  paymentImage: 'block size-full object-contain',
  legal: 'mt-4 flex items-center justify-between gap-x-7 gap-y-3 border-t border-midnight-ink/10 pt-3.5 max-[767px]:flex-wrap max-[767px]:justify-center max-[767px]:text-center',
  copyright: 'm-0 text-[11px] leading-[1.4] text-midnight-ink/60',
} as const

const footerMenuIds = [4, 7, 31, 32, 29, 9, 30, 11, 10, 22, 23]
const footerColumns = [
  { headingKey: 'FOOTER_MENU1', itemIds: [4, 7, 31, 32] },
  { headingKey: 'FOOTER_MENU2', itemIds: [29, 9, 30] },
  { headingKey: 'FOOTER_MENU3', itemIds: [11, 10, 22, 23] },
] as const

const fallbackColumns: Record<FooterLocale, { heading: string; links: FooterLink[] }[]> = {
  ru: [
    {
      heading: 'Покупателям',
      links: [
        { label: 'Доставка', href: '/ru/dostavka' },
        { label: 'Магазины', href: '/ru/magazinyi' },
        { label: 'Подарочные сертификаты', href: '/ru/podarochnaya-karta' },
      ],
    },
    {
      heading: 'О компании',
      links: [
        { label: 'Контакты', href: '/ru/kontaktyi' },
        { label: 'Акции', href: '/ru/aktsii' },
        { label: 'Бьюти-подборки', href: '/ru/beauty-selections' },
        { label: 'Новости', href: '/ru/novosti' },
        { label: 'Блог', href: '/ru/blog' },
      ],
    },
    {
      heading: 'Информация',
      links: [
        { label: 'Политика конфиденциальности и cookies', href: '/ru/politika-konfidentsialnosti-i-cookies' },
        { label: 'Условия и положения', href: '/ru/usloviya-i-polojeniya' },
        { label: 'Информация для потребителей', href: '/ru/informatsiya-dlya-potrebiteley' },
      ],
    },
  ],
  ro: [
    {
      heading: 'Pentru clienți',
      links: [
        { label: 'Livrare', href: '/ro/livrare' },
        { label: 'Magazine', href: '/ro/magazinele' },
        { label: 'Carduri cadou', href: '/ro/card-cadou' },
      ],
    },
    {
      heading: 'Despre companie',
      links: [
        { label: 'Contacte', href: '/ro/contacte' },
        { label: 'Promoții', href: '/ro/promotii' },
        { label: 'Selecții de frumusețe', href: '/ro/beauty-selections' },
        { label: 'Noutăți', href: '/ro/noutati' },
        { label: 'Blog', href: '/ro/blog' },
      ],
    },
    {
      heading: 'Informații',
      links: [
        { label: 'Politica de confidențialitate și cookies', href: '/ro/politica-de-confidentialitate-si-cookies' },
        { label: 'Termeni și condiții', href: '/ro/termeni-si-conditii' },
        { label: 'Informații pentru consumatori', href: '/ro/informatii-pentru-consumatori' },
      ],
    },
  ],
}

const appStoreUrl = 'https://apps.apple.com/ua/app/vizaje-nica/id1606198313'
const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.nicavizaje.project&hl=ru'
const telegramFallback = 'https://t.me/vizaje_nica_support_bot'

function localeText(locale: FooterLocale) {
  if (locale === 'ro') {
    return {
      qrAlt: 'Cod QR pentru aplicația Vizaje-Nica',
      qrCaption: 'Scanează codul QR și descarcă aplicația',
      hotline: 'Linie fierbinte',
      telegram: 'Suport pe Telegram',
      social: 'Rețele sociale',
      apps: 'Aplicația mobilă',
      payments: 'Metode de plată',
      storeLabel: 'Descarcă de pe',
      reserved: 'Toate drepturile rezervate.',
      authenticity: 'Certificate de autenticitate',
      feedback: 'Aveți o idee sau ați găsit o eroare?',
      cookieSettings: 'Setări cookie',
    }
  }

  return {
    qrAlt: 'QR-код приложения Vizaje-Nica',
    qrCaption: 'Наведите камеру и скачайте наше приложение',
    hotline: 'Горячая линия',
    telegram: 'Поддержка в Telegram',
    social: 'Социальные сети',
    apps: 'Мобильное приложение',
    payments: 'Способы оплаты',
    storeLabel: 'Скачайте в',
    reserved: 'Все права защищены.',
    authenticity: 'Сертификаты подлинности',
    feedback: 'Есть идея или нашли ошибку?',
    cookieSettings: 'Настройки cookies',
  }
}

function makeMenuHref(locale: FooterLocale, uri: string) {
  if (/^https?:\/\//i.test(uri)) return uri
  const normalizedUri = uri.replace(/^\/(ru|ro)\//, '').replace(/^\/+/, '')
  return localizedPath(`/${locale}/${normalizedUri}`, locale)
}

async function loadFooterData(locale: FooterLocale) {
  const text = localeText(locale)
  const fallbacks = fallbackColumns[locale]

  try {
    const [menuRows, constantRows, supportRows] = await Promise.all([
      db
        .select({ id: menu.id, uriRu: menu.uriRu, uriRo: menu.uriRo, titleRu: menu.titleRu, titleRo: menu.titleRo })
        .from(menu)
        .where(and(inArray(menu.id, footerMenuIds), eq(menu.isShown, 1), eq(menu.onBottom, 1))),
      db
        .select({ name: constants.name, ru: constants.ru, ro: constants.ro })
        .from(constants)
        .where(inArray(constants.name, ['FOOTER_MENU1', 'FOOTER_MENU2', 'FOOTER_MENU3', 'CONT_PHONE1', 'ALL_RESERVED', 'COOKIE_SETTINGS_LINK'])),
      db
        .select({ isEnabled: siteSupportSettings.isEnabled, telegramContact: siteSupportSettings.telegramContact, supportPhone: siteSupportSettings.supportPhone })
        .from(siteSupportSettings)
        .where(eq(siteSupportSettings.id, 1))
        .limit(1),
    ])

    const values = new Map(constantRows.map((row) => [row.name ?? '', locale === 'ro' ? row.ro : row.ru]))
    const itemsById = new Map(menuRows.map((row) => [row.id, row]))
    const columns = footerColumns.map((column, index) => {
      const links: FooterLink[] = []
      for (const id of column.itemIds) {
        const row = itemsById.get(id)
        const label = locale === 'ro' ? row?.titleRo : row?.titleRu
        const uri = locale === 'ro' ? row?.uriRo : row?.uriRu
        if (label && uri) links.push({ label, href: makeMenuHref(locale, uri) })

        if (index === 1 && id === 9) {
          links.push(
            { label: locale === 'ro' ? 'Selecții de frumusețe' : 'Бьюти-подборки', href: `/${locale}/beauty-selections` },
            { label: locale === 'ro' ? 'Noutăți' : 'Новости', href: locale === 'ro' ? '/ro/noutati' : '/ru/novosti' },
          )
        }
      }

      return {
        heading: values.get(column.headingKey) || fallbacks[index].heading,
        links: links.length ? links : fallbacks[index].links,
      }
    })

    const support = supportRows[0]
    const phone = values.get('CONT_PHONE1')?.trim() || support?.supportPhone?.trim() || ''

    return {
      columns,
      phone,
      telegramEnabled: support?.isEnabled !== 0,
      telegramUrl: support?.telegramContact?.trim() || telegramFallback,
      authenticityUrl: locale === 'ro' ? '/ro/certificate-de-autenticitate' : '/ru/sertifikaty-podlinnosti',
      authenticityLabel: text.authenticity,
      feedbackUrl: locale === 'ro' ? '/ro/contacte#feedback' : '/ru/kontaktyi#feedback',
      feedbackLabel: text.feedback,
      cookieSettingsLabel: values.get('COOKIE_SETTINGS_LINK') || text.cookieSettings,
      copyright: values.get('ALL_RESERVED') || text.reserved,
      text,
    }
  } catch {
    return {
      columns: fallbacks,
      phone: '',
      telegramEnabled: true,
      telegramUrl: telegramFallback,
      authenticityUrl: locale === 'ro' ? '/ro/certificate-de-autenticitate' : '/ru/sertifikaty-podlinnosti',
      authenticityLabel: text.authenticity,
      feedbackUrl: locale === 'ro' ? '/ro/contacte#feedback' : '/ru/kontaktyi#feedback',
      feedbackLabel: text.feedback,
      cookieSettingsLabel: text.cookieSettings,
      copyright: text.reserved,
      text,
    }
  }
}

export async function StorefrontFooter({ locale = 'ru' }: { locale?: FooterLocale }) {
  await connection()
  const data = await loadFooterData(locale)
  const phoneHref = data.phone.replace(/[^\d+]/g, '')
  const socials = [
    { label: 'Facebook', href: 'https://www.facebook.com/VizajeNicaMD', image: 'fb.svg' },
    { label: 'Instagram', href: 'https://www.instagram.com/vizaje_nica/', image: 'inst.svg' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@vizajenica', image: 'tiktok.svg' },
  ]
  const payments = [
    { label: 'Visa', image: 'visa.svg', className: footerClasses.paymentVisa },
    { label: 'Mastercard', image: 'mastercard.svg', className: footerClasses.paymentMastercard },
    { label: 'Google Pay', image: 'google-pay.svg', className: footerClasses.paymentGooglePay },
    { label: 'Apple Pay', image: 'apple-pay.svg', className: footerClasses.paymentApplePay },
  ]

  return (
    <footer className={footerClasses.footer}>
      <div className={footerClasses.main}>
        <div className={footerClasses.container}>
          <div className={footerClasses.content}>
            <div className={`${footerClasses.column} ${footerClasses.brandColumn}`}>
              <Link href="/get-app" className={footerClasses.appCard}>
                <img
                  className={footerClasses.appCardImage}
                  src={legacyAsset('img/next/footer/app/vizaje-nica-app.png', 'app') ?? ''}
                  alt={data.text.qrAlt}
                  width="150"
                  height="150"
                  loading="lazy"
                  decoding="async"
                />
                <span className={footerClasses.appCardCaption}>{data.text.qrCaption}</span>
              </Link>

              {data.phone ? (
                <div className={footerClasses.hotline}>
                  <span className={footerClasses.hotlineLabel}>{data.text.hotline}</span>
                  <a className={footerClasses.hotlinePhone} href={`tel:${phoneHref}`}>{data.phone}</a>
                </div>
              ) : null}

              {data.telegramEnabled ? (
                <a className={footerClasses.telegram} href={data.telegramUrl} target="_blank" rel="noopener noreferrer">
                  <span className={footerClasses.telegramIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21.6 3.4 18.3 20c-.25 1.17-.9 1.46-1.83.91l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.15 9.38-8.48c.41-.36-.09-.56-.64-.2L5.46 13.6.49 12.04c-1.08-.34-1.1-1.08.23-1.57L20.15 3.1c.9-.34 1.69.2 1.45.3Z" fill="currentColor" />
                    </svg>
                  </span>
                  <span className={footerClasses.telegramBody}>
                    <span className={footerClasses.telegramLabel}>{data.text.telegram}</span>
                    <span className={footerClasses.telegramHandle}>@vizaje_nica_support_bot</span>
                  </span>
                  <span className={footerClasses.telegramArrow} aria-hidden="true">↗</span>
                </a>
              ) : null}
            </div>

            {data.columns.map((column, index) => (
              <div className={footerClasses.column} key={`${column.heading}-${index}`}>
                <p className={footerClasses.columnHeading}>{column.heading}</p>
                <ul className={footerClasses.linkList}>
                  {column.links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      <Link className={footerClasses.link} href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                  {index === 0 ? (
                    <>
                      <li><Link className={footerClasses.link} href={data.authenticityUrl}>{data.authenticityLabel}</Link></li>
                      <li><Link className={footerClasses.link} href={data.feedbackUrl}>{data.feedbackLabel}</Link></li>
                    </>
                  ) : null}
                  {index === 2 ? (
                    <li>
                      <button className={footerClasses.cookieLink} type="button" data-cookie-action="settings" aria-expanded="false" aria-controls="cookie-settings-panel">
                        {data.cookieSettingsLabel}
                      </button>
                    </li>
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={footerClasses.bottom}>
        <div className={`${footerClasses.container} ${footerClasses.bottomGrid}`}>
          <nav className={footerClasses.socials} aria-label={data.text.social}>
            {socials.map((social) => (
              <a className={footerClasses.socialLink} href={social.href} key={social.label} aria-label={social.label} target="_blank" rel="noopener noreferrer">
                <img className={footerClasses.socialImage} src={legacyAsset(`img/next/footer/social/${social.image}`, 'app') ?? ''} alt="" width="21" height="21" loading="lazy" decoding="async" />
              </a>
            ))}
          </nav>

          <div className={footerClasses.appStores} aria-label={data.text.apps}>
            <a className={footerClasses.storeButton} href={appStoreUrl} target="_blank" rel="noopener noreferrer">
              <img className={footerClasses.storeImage} src={legacyAsset('img/next/footer/app/apple-logo.svg', 'app') ?? ''} alt="" width="24" height="24" loading="lazy" decoding="async" />
              <span className={footerClasses.storeText}><small className={footerClasses.storeLabel}>{data.text.storeLabel}</small><strong className={footerClasses.storeName}>App Store</strong></span>
            </a>
            <a className={footerClasses.storeButton} href={googlePlayUrl} target="_blank" rel="noopener noreferrer">
              <img className={footerClasses.storeImage} src={legacyAsset('img/next/footer/app/googleplay-icon.png', 'app') ?? ''} alt="" width="24" height="24" loading="lazy" decoding="async" />
              <span className={footerClasses.storeText}><small className={footerClasses.storeLabel}>{data.text.storeLabel}</small><strong className={footerClasses.storeName}>Google Play</strong></span>
            </a>
          </div>

          <div className={footerClasses.payments} aria-label={data.text.payments}>
            {payments.map((payment) => (
              <span className={`${footerClasses.payment} ${payment.className}`} key={payment.label}>
                <img className={footerClasses.paymentImage} src={legacyAsset(`img/next/footer/payments/${payment.image}`, 'app') ?? ''} alt={payment.label} loading="lazy" decoding="async" />
              </span>
            ))}
          </div>
        </div>

        <div className={`${footerClasses.container} ${footerClasses.legal}`}>
          <p className={footerClasses.copyright}>© Vizaje-Nica, 1990—{new Date().getFullYear()}. <span>{data.copyright}</span></p>
        </div>
      </div>
    </footer>
  )
}
