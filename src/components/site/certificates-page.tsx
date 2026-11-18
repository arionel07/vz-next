import { connection } from 'next/server'

import { getCertificatesPage } from '@/lib/certificates'
import type { StoreLocale } from '@/lib/locale-routing'

export async function CertificatesPage({ locale = 'ru' }: { locale?: StoreLocale }) {
  await connection()
  const groups = await getCertificatesPage(locale)
  const text = locale === 'ro'
    ? { eyebrow: 'Produse originale', title: 'Certificate de autenticitate', intro: 'Documente oficiale care confirmă autenticitatea produselor și statutul distribuitorilor autorizați.', documents: 'documente', open: 'Deschide documentul', empty: 'Certificatele de autenticitate nu sunt disponibile momentan.' }
    : { eyebrow: 'Оригинальная продукция', title: 'Сертификаты подлинности', intro: 'Официальные документы, подтверждающие подлинность продукции и статус авторизованных дистрибьюторов.', documents: 'документов', open: 'Открыть документ', empty: 'Сертификаты подлинности пока не опубликованы.' }

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-12 text-midnight-ink md:px-10 md:py-20">
      <header className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
        <p className="mb-4 text-xs font-medium tracking-[.15em] text-graphite uppercase">{text.eyebrow}</p>
        <h1 className="m-0 text-3xl leading-tight font-medium tracking-[-.04em] md:text-5xl">{text.title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-graphite md:text-base">{text.intro}</p>
      </header>

      {groups.length ? (
        <div className="divide-y divide-midnight-ink/15 border-y border-midnight-ink/15">
          {groups.map((group, groupIndex) => (
            <details className="group py-5 md:py-7" key={group.id}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-4 md:gap-7">
                  <span className="text-xs tabular-nums text-graphite">{String(groupIndex + 1).padStart(2, '0')}</span>
                  <span className="truncate text-lg font-medium md:text-2xl">{group.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-4 text-xs text-graphite md:text-sm">
                  {group.certificates.length} {text.documents}
                  <span className="grid size-8 place-items-center rounded-full border border-midnight-ink/20 text-lg leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </span>
              </summary>
              <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-3 lg:grid-cols-4 md:gap-5">
                {group.certificates.map((certificate, certificateIndex) => (
                  <a className="group/certificate block min-w-0" href={certificate.image} target="_blank" rel="noreferrer" key={certificate.id} aria-label={`${text.open}: ${certificate.title}`}>
                    <span className="block aspect-[4/5] overflow-hidden bg-[#f2f2f2]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="size-full object-contain p-3 transition-transform duration-300 group-hover/certificate:scale-[1.02]" src={certificate.previewImage ?? certificate.image} alt={certificate.title} loading="lazy" />
                    </span>
                    <span className="mt-3 flex items-baseline justify-between gap-2 text-sm">
                      <strong className="truncate font-medium">{certificate.title}</strong>
                      <span className="shrink-0 text-xs tabular-nums text-graphite">{String(certificateIndex + 1).padStart(2, '0')}</span>
                    </span>
                    <span className="mt-1 block text-xs text-graphite transition-colors group-hover/certificate:text-hover-cream">{text.open} ↗</span>
                  </a>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-graphite">{text.empty}</p>
      )}
    </main>
  )
}
