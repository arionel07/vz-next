import { LocalizedLink as Link } from '@/components/site/localized-link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { getLegalPage } from '@/lib/legal-pages'
import type { StoreLocale } from '@/lib/locale-routing'


const PRIVACY_URI = 'politika-konfidentsialnosti-i-cookies'

type TocItem = { id: string; label: string }

function preparePrivacyContent(content: string) {
  let prepared = content
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '')
    .replace(/<p\b[^>]*>[\s\S]*?(?:Последнее обновление|Ultima actualizare):[\s\S]*?<\/p>/iu, '')

  let sectionNumber = 0
  const toc: TocItem[] = []
  prepared = prepared.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_match, attributes = '', heading) => {
    sectionNumber += 1
    const id = `privacy-section-${sectionNumber}`
    const safeAttributes = String(attributes).replace(/\s+id\s*=\s*(["'])[^"']*\1/i, '')
    const label = String(heading)
      .replace(/<[^>]+>/g, ' ')
      .replace(/^\s*\d+(?:\.\d+)*\.\s*/u, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (label) toc.push({ id, label })
    return `<h2${safeAttributes} id="${id}">${heading}</h2>`
  })

  return { content: prepared, toc }
}

export async function LegalPage({ uri, locale = 'ru' }: { uri: string; locale?: StoreLocale }) {
  await connection()
  const page = await getLegalPage(uri, locale)
  if (!page) notFound()

  const isPrivacy = uri === PRIVACY_URI || uri === 'politica-de-confidentialitate-si-cookies'
  const privacy = isPrivacy ? preparePrivacyContent(page.content) : { content: page.content, toc: [] }
  const text = locale === 'ro'
    ? { home: 'Acasă', updated: 'Ultima actualizare: 04.09.2026', contents: 'Cuprins' }
    : { home: 'Главная', updated: 'Последнее обновление: 04.09.2026', contents: 'Содержание' }

  return (
    <main className={`site-shell legal-page${isPrivacy ? ' legal-page-privacy' : ''}`}>
      <div className="legal-breadcrumbs"><Link href={`/${locale}`}>{text.home}</Link><span>/</span><span>{page.title}</span></div>

      <section className="legal-section" aria-labelledby="legal-title">
        <header className="legal-header">
          <p className="eyebrow">Vizaje-Nica</p>
          <h1 id="legal-title">{page.title}</h1>
          {isPrivacy ? <p>{text.updated}</p> : null}
        </header>

        {isPrivacy && privacy.toc.length ? (
          <div className="legal-layout">
            <nav className="legal-toc" aria-label="Содержание">
              <h2>{text.contents}</h2>
              <ol>
                {privacy.toc.map((item, index) => (
                  <li key={item.id} className={index === 0 ? 'is-active' : ''}>
                    <a href={`#${item.id}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.label}</strong></a>
                  </li>
                ))}
              </ol>
            </nav>
            <article className="legal-content" dangerouslySetInnerHTML={{ __html: privacy.content }} />
          </div>
        ) : (
          <article className="legal-content legal-content-simple" dangerouslySetInnerHTML={{ __html: privacy.content }} />
        )}
      </section>

    </main>
  )
}
