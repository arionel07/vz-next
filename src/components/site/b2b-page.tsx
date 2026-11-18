'use client'

import { useEffect, useState } from 'react'

const asset = (path: string) => `/legacy-assets/app/b2b/${path}`

const business = [
  { id: 'retail', label: 'Retail', title: "Moldova's #1 beauty retail chain.", image: 'img/our-bussines/store.jpg', detail: 'A nationwide beauty retail network with curated assortments, trained teams and a strong local customer base.' },
  { id: 'distribution', label: 'Distribution', title: 'One partner. Full market coverage.', image: 'img/our-bussines/warehouse.jpg', detail: 'Import, warehousing and distribution to the key retail channels in Moldova from one accountable partner.' },
  { id: 'ecom', label: 'E-com', title: 'Over 90% of our assortment is online.', image: 'img/our-bussines/web.jpg', detail: 'A mature e-commerce channel gives brands an always-on storefront and measurable customer reach.' },
]

const brandGroups = [
  { key: 'fragrances', title: 'Fragrances', headline: 'Chanel, Dior, Guerlain and more.', tone: 'warm', items: ['Chanel', 'Dior', 'Guerlain', 'Givenchy', 'Kenzo', 'Tom Ford', 'Dolce & Gabbana', 'Lalique', 'Giorgio Armani', 'Lancôme', 'YSL', 'Valentino'] },
  { key: 'niche', title: 'Niche fragrances', headline: 'Byredo, Xerjoff, Roja and more.', tone: 'dark', items: ['Byredo', 'Xerjoff', 'Roja', 'Sospiro', 'Juliette Has a Gun', 'Atelier des Ors', 'Moresque', 'The House of Oud', 'New Notes', 'Blend Oud', 'Vilhelm', 'Ojar'] },
  { key: 'makeup', title: 'Make-up', headline: 'M·A·C, Chanel, Dior and more.', tone: 'rose', items: ['M·A·C', 'Chanel', 'Dior', 'Guerlain', 'Givenchy', 'Estée Lauder', 'Clinique', 'Clarins', 'Lancôme', 'Collistar', 'Pupa', 'Artdeco'] },
  { key: 'skincare', title: 'Skin care', headline: 'Clarins, Biotherm, Estée Lauder and more.', tone: 'blue', items: ['Clarins', 'Chanel', 'Dior', 'Guerlain', 'Givenchy', 'Estée Lauder', 'Clinique', 'Lancôme', 'Biotherm', 'Collistar', 'Korres', 'Elizabeth Arden'] },
]

const stores = [
  { name: 'Malldova', address: 'str. Arborilor 21', image: 'img/stores/store-malldova.png' },
  { name: 'Port Mall', address: 'str. Mihai Sadoveanu 42/6', image: 'img/stores/store-port-mall.png' },
  { name: 'Sun City 1', address: 'str. Puskin 32', image: 'img/stores/store-sun-city-1.png' },
  { name: 'Unic', address: 'bul. Stefan cel Mare 8', image: 'img/stores/store-unic.png' },
]

const faqs = [
  ['What is Vizaje-Nica?', 'A second-generation family company, started in 1989 and grown into the #1 retailer and distributor in beauty in Moldova.'],
  ['What do you offer to brands?', 'A 360° solution to cover the market: one point of contact, import and logistics, distribution to all key retailers, and maximum visibility for your brand.'],
  ['Which brands do you work with?', 'Over 100 global brands across fragrances, niche fragrances, make-up and skin care, and 80+ brands in our distribution portfolio.'],
  ['How big is your retail network?', '12 stores in Chisinau, with a new door opening by mid 2026, plus franchise partners, regional partners and our own e-commerce store.'],
  ['Do you handle import and logistics?', 'Yes. We act as your import and logistics partner, with our own warehouse and a fully automated IT system and ordering process.'],
  ['How do you support brands in marketing?', 'Through 360° marketing support: dedicated beauty advisors, in-store and BTL activations, CRM, PR, ATL and digital.'],
  ['How do we start working together?', 'Send us a business inquiry and tell us about your brand. Our team will get back to you to discuss the next steps.'],
] as const

export function B2BPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeBusiness, setActiveBusiness] = useState<string | null>(null)
  const [activeBrand, setActiveBrand] = useState<string | null>(null)
  const [videoOpen, setVideoOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [storeIndex, setStoreIndex] = useState(0)

  useEffect(() => {
    document.body.classList.toggle('b2b-menu-lock', menuOpen)
    return () => document.body.classList.remove('b2b-menu-lock')
  }, [menuOpen])

  const activeBusinessItem = business.find((item) => item.id === activeBusiness)
  const activeBrandItem = brandGroups.find((item) => item.key === activeBrand)
  const closeModal = () => { setActiveBusiness(null); setActiveBrand(null) }

  return (
    <main className="b2b-page">
      <header className="b2b-nav">
        <a className="b2b-nav__logo" href="#top" aria-label="Vizaje-Nica B2B home">
          <img src={asset('img/logo.svg')} alt="Vizaje-Nica" />
        </a>
        <nav className="b2b-nav__links" aria-label="B2B navigation">
          <a href="#business">Business</a><a href="#brands">Brands</a><a href="#stores">Stores</a><a href="#contact">Contact</a>
        </nav>
        <a className="b2b-nav__partner" href="#contact">Become a partner <span aria-hidden="true">↗</span></a>
        <button className="b2b-nav__toggle" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
          <span /><span />
        </button>
      </header>

      {menuOpen ? (
        <div className="b2b-mobile-menu" role="dialog" aria-label="B2B menu">
          <button className="b2b-mobile-menu__backdrop" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="b2b-mobile-menu__panel">
            <div className="b2b-mobile-menu__top"><img src={asset('img/logo.svg')} alt="Vizaje-Nica" /><button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>×</button></div>
            <nav aria-label="Mobile B2B navigation">{['business', 'brands', 'stores', 'contact'].map((item) => <a key={item} href={`#${item}`} onClick={() => setMenuOpen(false)}>{item[0].toUpperCase() + item.slice(1)}</a>)}</nav>
            <a className="b2b-nav__partner" href="#contact" onClick={() => setMenuOpen(false)}>Become a partner <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      ) : null}

      <section className="b2b-hero" id="top">
        <div className="b2b-hero__media" aria-hidden="true"><video autoPlay muted loop playsInline poster={asset('img/our-bussines/store.jpg')}><source src={asset('img/videos/welcome.mp4')} type="video/mp4" /></video><div /></div>
        <div className="b2b-hero__copy">
          <p className="b2b-eyebrow">WELCOME TO VIZAJE-NICA</p>
          <h1>Beauty brings people together.</h1>
          <p className="b2b-hero__description">A family-owned beauty retail and distribution partner, connecting global brands with people across Moldova since 1989.</p>
          <button className="b2b-video-trigger" type="button" onClick={() => setVideoOpen(true)}><span>Watch our story<small>1 minute</small></span><b aria-hidden="true">▶</b></button>
        </div>
        <a className="b2b-scroll-cue" href="#business" aria-label="Scroll to our business">↓</a>
      </section>

      <section className="b2b-section b2b-business" id="business">
        <div className="b2b-section__head"><p className="b2b-eyebrow">WHAT WE DO</p><h2>Our business</h2></div>
        <div className="b2b-business__grid">
          {business.map((item) => <button className="b2b-business-card" type="button" key={item.id} onClick={() => { setActiveBrand(null); setActiveBusiness(item.id) }}><div className="b2b-business-card__image"><img src={asset(item.image)} alt="" /></div><div className="b2b-business-card__copy"><p>{item.label}</p><h3>{item.title}</h3></div><span className="b2b-plus">+</span></button>)}
        </div>
      </section>

      <section className="b2b-numbers" id="company">
        <div className="b2b-section b2b-numbers__inner"><div className="b2b-section__head"><p className="b2b-eyebrow">THE COMPANY</p><h2>Vizaje-Nica<br />in numbers</h2></div><div className="b2b-number-grid"><div><strong>35</strong><p>Years of market experience.<br />A second-generation family company.</p></div><div><strong className="is-red">12</strong><p>Stores in Chisinau,<br />with a new door opening in 2026.</p></div><div><strong className="is-blue">100<span>+</span></strong><p>Global brands in our retail portfolio.</p></div><div><strong>115<span>k+</span></strong><p>Loyal customers in our client base.<br />Over 90% of our assortment is online.</p></div></div></div>
      </section>

      <section className="b2b-section b2b-brands" id="brands"><div className="b2b-section__head"><p className="b2b-eyebrow">OUR PORTFOLIO</p><h2>Brands we carry</h2></div><div className="b2b-brands__grid">{brandGroups.map((group) => <button className={`b2b-brand-card b2b-brand-card--${group.tone}`} type="button" key={group.key} onClick={() => { setActiveBusiness(null); setActiveBrand(group.key) }}><div className="b2b-brand-card__copy"><p>{group.title}</p><h3>{group.headline}</h3></div><div className="b2b-brand-card__tiles">{group.items.map((item) => <span key={item}>{item}</span>)}</div><span className="b2b-plus">+</span></button>)}</div></section>

      <section className="b2b-stores" id="stores"><div className="b2b-section b2b-stores__inner"><div className="b2b-section__head"><p className="b2b-eyebrow">OUR NETWORK</p><h2>Stores in Chisinau</h2></div><div className="b2b-stores__viewport"><div className="b2b-stores__track" style={{ transform: `translateX(calc(-${storeIndex} * (min(78vw, 390px) + 24px)))` }}>{stores.map((store) => <article className="b2b-store-card" key={store.name}><div className="b2b-store-card__media"><img src={asset(store.image)} alt={`${store.name} store`} /></div><p><strong>{store.name}.</strong> One of our 12 beauty stores in Chisinau.</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Vizaje-Nica, ${store.address}, Chisinau`)}`} target="_blank" rel="noopener">Visit the store ↗</a></article>)}</div></div><div className="b2b-stores__controls"><button type="button" disabled={storeIndex === 0} onClick={() => setStoreIndex((index) => Math.max(0, index - 1))} aria-label="Previous store">←</button><span>{String(storeIndex + 1).padStart(2, '0')} / {String(stores.length).padStart(2, '0')}</span><button type="button" disabled={storeIndex === stores.length - 1} onClick={() => setStoreIndex((index) => Math.min(stores.length - 1, index + 1))} aria-label="Next store">→</button></div></div></section>

      <section className="b2b-section b2b-offer"><div className="b2b-offer__intro"><p className="b2b-eyebrow">WHAT WE OFFER</p><h2>One partner.<br /><em>The whole market.</em></h2><p>From import and logistics to nationwide retail distribution.</p></div><div className="b2b-offer__card"><div><h3>Everything in one place</h3><ol><li><b>01</b><span>360° market coverage</span></li><li><b>02</b><span>One point of contact</span></li><li><b>03</b><span>Import &amp; logistics</span></li><li><b>04</b><span>Distribution to key retailers</span></li></ol></div><div className="b2b-offer__visual"><img src={asset('img/360.png')} alt="" /></div></div><div className="b2b-principles"><h3>Built for long-term growth.</h3><div>{[['Visibility', 'Maximum visibility and prestige image.'], ['Stability', 'Financially stable and growing local partner.'], ['Partnership', 'Long-term partnership.']].map(([title, copy]) => <article key={title}><span /><h4>{title}</h4><p>{copy}</p></article>)}</div></div></section>

      <section className="b2b-section b2b-faq" id="faq"><div className="b2b-faq__heading"><p className="b2b-eyebrow">GOOD TO KNOW</p><h2>Frequently asked questions</h2><p>Answers for brands considering a partnership with Vizaje-Nica.</p><a href="#contact">Contact us ↗</a></div><div className="b2b-faq__items">{faqs.map(([question, answer], index) => <div className={`b2b-faq-item ${openFaq === index ? 'is-open' : ''}`} key={question}><button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{question}</span><b>{openFaq === index ? '−' : '+'}</b></button>{openFaq === index ? <p>{answer}</p> : null}</div>)}</div></section>

      <section className="b2b-cta" id="contact"><div><p className="b2b-eyebrow">LET'S WORK TOGETHER</p><h2>Ready to become<br /><em>a partner?</em></h2><p>Tell us about your brand and we will get back to you to discuss the next steps.</p><a className="b2b-button b2b-button--light" href="mailto:marketing@vizaje-nica.com">Business inquiry <span aria-hidden="true">→</span></a></div></section>

      <footer className="b2b-footer"><div className="b2b-footer__top"><div><img src={asset('img/logo.svg')} alt="Vizaje-Nica" /><p>Beauty brings people together.</p></div><nav aria-label="B2B footer navigation"><a href="#business">Business</a><a href="#company">Company</a><a href="#brands">Brands</a><a href="#stores">Stores</a></nav><div><p className="b2b-eyebrow">CONTACT</p><a href="mailto:marketing@vizaje-nica.com">marketing@vizaje-nica.com</a><a href="https://www.instagram.com/vizaje_nica/" target="_blank" rel="noopener">@vizaje_nica</a></div></div><div className="b2b-footer__bottom"><span>Copyright © 2026 Vizaje-Nica.</span><span>People · Beauty · Progress</span></div></footer>

      {activeBusinessItem || activeBrandItem ? <div className="b2b-modal" role="dialog" aria-modal="true" aria-label={activeBusinessItem?.title ?? activeBrandItem?.headline} onClick={closeModal}><div className="b2b-modal__surface" onClick={(event) => event.stopPropagation()}><button type="button" className="b2b-modal__close" onClick={closeModal} aria-label="Close">×</button><p className="b2b-eyebrow">{activeBusinessItem?.label ?? activeBrandItem?.title}</p><h2>{activeBusinessItem?.title ?? activeBrandItem?.headline}</h2><p>{activeBusinessItem?.detail ?? 'A strong portfolio of trusted names, built for long-term growth and meaningful customer relationships.'}</p><button className="b2b-button b2b-button--dark" type="button" onClick={closeModal}>Close <span aria-hidden="true">×</span></button></div></div> : null}
      {videoOpen ? <div className="b2b-video-modal" role="dialog" aria-modal="true" aria-label="Vizaje-Nica story" onClick={() => setVideoOpen(false)}><div className="b2b-video-modal__surface" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setVideoOpen(false)} aria-label="Close video">×</button><video controls autoPlay playsInline poster={asset('img/our-bussines/store.jpg')}><source src={asset('img/videos/welcome.mp4')} type="video/mp4" /></video></div></div> : null}
    </main>
  )
}
