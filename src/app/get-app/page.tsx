import type { Metadata } from 'next'
import Image from 'next/image'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import styles from './page.module.css'

export async function generateMetadata(): Promise<Metadata> {
  const isRomanian = (await headers()).get('accept-language')?.toLowerCase().startsWith('ro') ?? false
  return {
    title: isRomanian ? 'Aplicația Vizaje-Nica' : 'Приложение Vizaje-Nica',
    description: isRomanian ? 'Descarcă aplicația mobilă Vizaje-Nica.' : 'Скачайте мобильное приложение Vizaje-Nica.',
    alternates: { canonical: 'https://vizaje-nica.com/get-app' },
  }
}

const appStoreUrl = 'https://apps.apple.com/ua/app/vizaje-nica/id1606198313'
const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.nicavizaje.project&hl=ru'

type PageProps = {
  searchParams: Promise<{ preview?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const [requestHeaders, params] = await Promise.all([headers(), searchParams])
  const userAgent = requestHeaders.get('user-agent') ?? ''
  const preview = params.preview === '1'

  if (!preview && /Android/i.test(userAgent)) redirect(googlePlayUrl)
  if (!preview && /iPhone|iPad|iPod/i.test(userAgent)) redirect(appStoreUrl)

  const isRomanian = (requestHeaders.get('accept-language') ?? '').toLowerCase().startsWith('ro')
  const copy = isRomanian
    ? {
        language: 'ro',
        title: 'Aplicația Vizaje-Nica',
        description: 'Scanează codul QR cu telefonul sau alege magazinul potrivit pentru dispozitivul tău.',
        qrCaption: 'Scanează pentru a descărca aplicația',
        qrAlt: 'Cod QR pentru descărcarea aplicației Vizaje-Nica',
        storesLabel: 'Magazine de aplicații',
        appStore: 'App Store',
        googlePlay: 'Google Play',
      }
    : {
        language: 'ru',
        title: 'Приложение Vizaje-Nica',
        description: 'Отсканируйте QR-код телефоном или выберите магазин для своего устройства.',
        qrCaption: 'Сканируйте, чтобы скачать приложение',
        qrAlt: 'QR-код для скачивания приложения Vizaje-Nica',
        storesLabel: 'Магазины приложений',
        appStore: 'App Store',
        googlePlay: 'Google Play',
      }

  return (
    <main className={styles.page} lang={copy.language} aria-labelledby="app-download-title">
      <div className={styles.card}>
        <Image
          className={styles.logo}
          src="/legacy-assets/app/img/icons-2/logo-2.svg"
          alt="Vizaje-Nica"
          width="54"
          height="54"
          unoptimized
        />
        <p className={styles.eyebrow}>VIZAJE-NICA</p>
        <h1 className={styles.title} id="app-download-title">{copy.title}</h1>
        <p className={styles.description}>{copy.description}</p>

        <div className={styles.qrWrap}>
          <Image
            className={styles.qr}
            src="/legacy-assets/app/img/qr-code/vizaje-nica-app.png"
            alt={copy.qrAlt}
            width="220"
            height="220"
            unoptimized
          />
          <p>{copy.qrCaption}</p>
        </div>

        <div className={styles.stores} aria-label={copy.storesLabel}>
          <a className={styles.store} href={appStoreUrl} target="_blank" rel="noopener noreferrer">
            <Image src="/legacy-assets/app/img/icons-2/appsotre-icon.png" alt="" aria-hidden="true" width="24" height="24" unoptimized />
            <span>{copy.appStore}</span>
          </a>
          <a className={styles.store} href={googlePlayUrl} target="_blank" rel="noopener noreferrer">
            <Image src="/legacy-assets/app/img/icons-2/googleplay-icon.png" alt="" aria-hidden="true" width="24" height="24" unoptimized />
            <span>{copy.googlePlay}</span>
          </a>
        </div>
      </div>
    </main>
  )
}
